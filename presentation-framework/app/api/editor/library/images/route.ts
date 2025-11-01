import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { auth } from '@/lib/auth';
import type { ImageLibraryItem, ImageLibraryMetadata, ImageLibraryOrigin } from '@/editor/types/imageLibrary';

export const runtime = 'nodejs';
export const revalidate = 0;

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

const STORAGE_VERSION = 1;
const MAX_ITEMS_PER_REQUEST = 50;

interface StoredLibraryPayload {
  version: number;
  lastSyncAt: string;
  items: ServerImageLibraryItem[];
}

type ServerImageLibraryItem = Omit<ImageLibraryItem, 'pendingAction'> & { pendingAction?: never };

interface SyncRequestBody {
  items?: Partial<ImageLibraryItem>[];
  deleteIds?: string[];
}

function getLibraryKey(userId: string): string {
  return `user:${userId}:image-library:v${STORAGE_VERSION}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseMetadata(metadata: ImageLibraryMetadata | undefined): ImageLibraryMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  const result: ImageLibraryMetadata = { ...metadata };

  if (typeof metadata.prompt === 'string') {
    result.prompt = metadata.prompt;
  } else {
    delete result.prompt;
  }

  if (typeof metadata.provider === 'string') {
    result.provider = metadata.provider;
  } else {
    delete result.provider;
  }

  if (typeof metadata.quality === 'string') {
    result.quality = metadata.quality;
  } else {
    delete result.quality;
  }

  if (typeof metadata.originalFileName === 'string') {
    result.originalFileName = metadata.originalFileName;
  } else {
    delete result.originalFileName;
  }

  if (typeof metadata.mimeType === 'string') {
    result.mimeType = metadata.mimeType;
  } else {
    delete result.mimeType;
  }

  if (typeof metadata.deckId === 'string') {
    result.deckId = metadata.deckId;
  } else {
    delete result.deckId;
  }

  if (typeof metadata.uploadedAt === 'string' && !Number.isNaN(Date.parse(metadata.uploadedAt))) {
    result.uploadedAt = new Date(metadata.uploadedAt).toISOString();
  } else if (metadata.uploadedAt) {
    delete result.uploadedAt;
  }

  if (typeof metadata.generatedAt === 'string' && !Number.isNaN(Date.parse(metadata.generatedAt))) {
    result.generatedAt = new Date(metadata.generatedAt).toISOString();
  } else if (metadata.generatedAt) {
    delete result.generatedAt;
  }

  if (metadata.tags) {
    result.tags = Array.isArray(metadata.tags)
      ? metadata.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim())
      : undefined;
  }

  if (metadata.usage === 'element' || metadata.usage === 'background') {
    result.usage = metadata.usage;
  } else {
    delete result.usage;
  }

  if (typeof metadata.sizeBytes === 'number' && Number.isFinite(metadata.sizeBytes)) {
    result.sizeBytes = Math.max(0, Math.floor(metadata.sizeBytes));
  } else {
    delete result.sizeBytes;
  }

  if (typeof metadata.width === 'number' && Number.isFinite(metadata.width)) {
    result.width = Math.max(0, Math.floor(metadata.width));
  } else {
    delete result.width;
  }

  if (typeof metadata.height === 'number' && Number.isFinite(metadata.height)) {
    result.height = Math.max(0, Math.floor(metadata.height));
  } else {
    delete result.height;
  }

  if (Array.isArray(metadata.refinementHistory)) {
    result.refinementHistory = metadata.refinementHistory
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const id = typeof entry.id === 'string' ? entry.id : `ref-${Math.random().toString(36).slice(2, 10)}`;
        const prompt = typeof entry.prompt === 'string' ? entry.prompt : '';
        if (!prompt) {
          return null;
        }
        const createdAt = typeof entry.createdAt === 'string' && !Number.isNaN(Date.parse(entry.createdAt))
          ? new Date(entry.createdAt).toISOString()
          : nowIso();
        return {
          id,
          prompt,
          createdAt,
          notes: typeof entry.notes === 'string' ? entry.notes : undefined,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }

  return result;
}

function sanitizeItem(input: Partial<ImageLibraryItem>): ServerImageLibraryItem | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const id = typeof input.id === 'string' && input.id.trim().length > 0 ? input.id.trim() : null;
  const dataUrl = typeof input.dataUrl === 'string' ? input.dataUrl : null;
  const origin = input.origin === 'upload' || input.origin === 'ai' ? (input.origin as ImageLibraryOrigin) : null;

  if (!id || !dataUrl || !origin) {
    return null;
  }

  const createdAt = typeof input.createdAt === 'string' && !Number.isNaN(Date.parse(input.createdAt))
    ? new Date(input.createdAt).toISOString()
    : nowIso();
  const updatedAt = typeof input.updatedAt === 'string' && !Number.isNaN(Date.parse(input.updatedAt))
    ? new Date(input.updatedAt).toISOString()
    : nowIso();

  return {
    id,
    dataUrl,
    thumbnailDataUrl: typeof input.thumbnailDataUrl === 'string' ? input.thumbnailDataUrl : undefined,
    origin,
    metadata: parseMetadata(input.metadata),
    createdAt,
    updatedAt,
    hash: typeof input.hash === 'string' ? input.hash : undefined,
    syncedAt: nowIso(),
  };
}

function parsePayload(raw: string | null): StoredLibraryPayload | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredLibraryPayload;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (!Array.isArray(parsed.items)) {
      return null;
    }
    const lastSyncAt = typeof parsed.lastSyncAt === 'string' && !Number.isNaN(Date.parse(parsed.lastSyncAt))
      ? new Date(parsed.lastSyncAt).toISOString()
      : nowIso();
    return {
      version: parsed.version ?? STORAGE_VERSION,
      lastSyncAt,
      items: parsed.items.map((item) => ({
        ...item,
        syncedAt: typeof item.syncedAt === 'string' ? item.syncedAt : item.updatedAt ?? lastSyncAt,
        metadata: parseMetadata(item.metadata),
      })),
    };
  } catch (error) {
    console.error('Image library: failed to parse stored payload', error);
    return null;
  }
}

export async function GET() {
  if (!redis) {
    return NextResponse.json({
      items: [],
      lastSyncAt: null,
      message: 'Redis not configured',
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const key = getLibraryKey(session.user.id);
    const raw = await redis.get(key);
    const payload = parsePayload(raw);

    if (!payload) {
      return NextResponse.json({ items: [], lastSyncAt: null });
    }

    return NextResponse.json({
      items: payload.items,
      lastSyncAt: payload.lastSyncAt,
    });
  } catch (error) {
    console.error('Image library: GET failed', error);
    return NextResponse.json({ error: 'Failed to load image library' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!redis) {
    return NextResponse.json({ error: 'Redis not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SyncRequestBody | null = null;
  try {
    body = await request.json();
  } catch (error) {
    console.warn('Image library: invalid JSON payload', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items.slice(0, MAX_ITEMS_PER_REQUEST) : [];
  const deleteIds = Array.isArray(body.deleteIds) ? body.deleteIds.map((id) => id.toString()) : [];

  const sanitizedItems = items
    .map(sanitizeItem)
    .filter((item): item is ServerImageLibraryItem => Boolean(item));

  if (sanitizedItems.length === 0 && deleteIds.length === 0) {
    return NextResponse.json({ error: 'No valid items to sync' }, { status: 400 });
  }

  const now = nowIso();
  const key = getLibraryKey(session.user.id);

  try {
    const existingRaw = await redis.get(key);
    const existingPayload = parsePayload(existingRaw);
    const existingItems = existingPayload?.items ?? [];

    const itemMap = new Map<string, ServerImageLibraryItem>();
    existingItems.forEach((item) => {
      itemMap.set(item.id, item);
    });

    sanitizedItems.forEach((item) => {
      itemMap.set(item.id, {
        ...item,
        syncedAt: now,
        updatedAt: item.updatedAt ?? now,
        metadata: parseMetadata(item.metadata),
      });
    });

    deleteIds.forEach((id) => {
      itemMap.delete(id);
    });

    const mergedItems = Array.from(itemMap.values());

    const payload: StoredLibraryPayload = {
      version: STORAGE_VERSION,
      lastSyncAt: now,
      items: mergedItems,
    };

    await redis.set(key, JSON.stringify(payload));

    const syncedIds = new Set(sanitizedItems.map((item) => item.id));
    const responseItems = mergedItems
      .filter((item) => syncedIds.has(item.id));

    return NextResponse.json({
      items: responseItems,
      deletedIds: deleteIds,
      lastSyncAt: now,
    });
  } catch (error) {
    console.error('Image library: POST failed', error);
    return NextResponse.json({ error: 'Failed to sync image library' }, { status: 500 });
  }
}


