import { ImageLibraryItem, ImageLibraryMetadata, ImageLibraryOrigin, ImageLibraryState } from '@/editor/types/imageLibrary';

const STORAGE_KEY = 'lume:image-library:v1';
const API_ENDPOINT = '/api/editor/library/images';

export interface AddImageLibraryItemInput {
  id?: string;
  dataUrl: string;
  thumbnailDataUrl?: string;
  origin: ImageLibraryOrigin;
  metadata: ImageLibraryMetadata;
  createdAt?: string;
  updatedAt?: string;
  hash?: string;
}

type UpdateItemFn = (item: ImageLibraryItem) => ImageLibraryItem;

interface StoredPayload {
  items: ImageLibraryItem[];
  lastSyncAt: string | null;
}

const isBrowser = typeof window !== 'undefined';

function safeDateIso(date?: string): string {
  if (!date) {
    return new Date().toISOString();
  }
  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) {
    return new Date().toISOString();
  }
  return new Date(timestamp).toISOString();
}

function sortByUpdatedAt(items: ImageLibraryItem[]): ImageLibraryItem[] {
  return [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export class ImageLibraryService {
  private state: ImageLibraryState = {
    items: [],
    isSyncing: false,
    lastSyncAt: null,
    lastSyncError: null,
  };

  private readonly listeners = new Set<() => void>();
  private syncPromise: Promise<void> | null = null;
  private hydratePromise: Promise<void> | null = null;
  private hasHydratedFromServer = false;

  constructor() {
    if (isBrowser) {
      this.loadFromStorage();
      window.addEventListener('online', this.handleOnline);
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ImageLibraryState => {
    return this.state;
  };

  getServerSnapshot = (): ImageLibraryState => ({
    items: [],
    isSyncing: false,
    lastSyncAt: null,
    lastSyncError: null,
  });

  addItem = (input: AddImageLibraryItemInput): ImageLibraryItem => {
    const now = new Date().toISOString();
    const id = input.id ?? this.generateId();

    const newItem: ImageLibraryItem = {
      id,
      dataUrl: input.dataUrl,
      thumbnailDataUrl: input.thumbnailDataUrl,
      origin: input.origin,
      metadata: {
        ...input.metadata,
      },
      createdAt: safeDateIso(input.createdAt ?? now),
      updatedAt: safeDateIso(input.updatedAt ?? now),
      hash: input.hash,
      syncedAt: null,
      pendingAction: 'create',
    };

    this.updateState((prev) => {
      const items = sortByUpdatedAt([newItem, ...prev.items.filter((item) => item.id !== id)]);
      return {
        ...prev,
        items,
        lastSyncError: null,
      };
    });

    void this.syncPendingItems();
    return newItem;
  };

  updateItem = (id: string, update: Partial<ImageLibraryItem> | UpdateItemFn): ImageLibraryItem | null => {
    let nextItem: ImageLibraryItem | null = null;

    this.updateState((prev) => {
      const items = prev.items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        const updated = typeof update === 'function' ? (update as UpdateItemFn)(item) : { ...item, ...update };
        const next: ImageLibraryItem = {
          ...item,
          ...updated,
          metadata: {
            ...item.metadata,
            ...updated.metadata,
          },
          updatedAt: safeDateIso(updated.updatedAt ?? new Date().toISOString()),
          pendingAction: item.pendingAction === 'create' ? 'create' : (updated.pendingAction ?? 'update'),
        };

        nextItem = next;
        return next;
      });

      return {
        ...prev,
        items: sortByUpdatedAt(items),
      };
    });

    if (nextItem?.pendingAction !== 'delete') {
      void this.syncPendingItems();
    }

    return nextItem;
  };

  removeItem = (id: string): void => {
    this.updateState((prev) => ({
      ...prev,
      items: prev.items
        .map((item) => (item.id === id
          ? {
              ...item,
              pendingAction: item.pendingAction === 'create' ? null : 'delete',
              updatedAt: new Date().toISOString(),
            }
          : item))
        .filter((item) => item.pendingAction !== null),
    }));

    void this.syncPendingItems();
  };

  hydrateFromServer = async (force: boolean = false): Promise<void> => {
    if (!isBrowser) {
      return;
    }

    if (this.hydratePromise) {
      return this.hydratePromise;
    }

    if (this.hasHydratedFromServer && !force) {
      return;
    }

    this.hydratePromise = (async () => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load image library (${response.status})`);
        }

        const data = await response.json();
        const remoteItems: ImageLibraryItem[] = Array.isArray(data?.items) ? data.items.map((item: ImageLibraryItem) => ({
          ...item,
          pendingAction: null,
          syncedAt: item.syncedAt ?? item.updatedAt ?? new Date().toISOString(),
        })) : [];

        this.updateState((prev) => {
          const merged = this.mergeRemoteItems(prev.items, remoteItems);
          return {
            ...prev,
            items: sortByUpdatedAt(merged),
            lastSyncAt: safeDateIso(data?.lastSyncAt) ?? new Date().toISOString(),
            lastSyncError: null,
          };
        });

        this.hasHydratedFromServer = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load image library.';
        this.updateState((prev) => ({
          ...prev,
          lastSyncError: message,
        }), { persist: false });
        throw error;
      } finally {
        this.hydratePromise = null;
      }
    })();

    return this.hydratePromise;
  };

  syncPendingItems = async (force: boolean = false): Promise<void> => {
    if (!isBrowser) {
      return;
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    if (!force && !navigator.onLine) {
      return;
    }

    const pendingItems = this.state.items.filter((item) => item.pendingAction && item.pendingAction !== 'delete');
    const deletedItems = this.state.items.filter((item) => item.pendingAction === 'delete');

    if (!force && pendingItems.length === 0 && deletedItems.length === 0) {
      return;
    }

    this.setSyncing(true);

    const payload = {
      items: pendingItems.map((item) => this.stripTransientFields(item)),
      deleteIds: deletedItems.map((item) => item.id),
    };

    this.syncPromise = (async () => {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Image library sync failed (${response.status})`);
        }

        const data = await response.json();
        const syncedItems: ImageLibraryItem[] = Array.isArray(data?.items) ? data.items.map((item: ImageLibraryItem) => ({
          ...item,
          pendingAction: null,
          syncedAt: item.syncedAt ?? new Date().toISOString(),
        })) : [];
        const deletedIds: string[] = Array.isArray(data?.deletedIds) ? data.deletedIds : [];

        this.updateState((prev) => {
          const map = new Map(prev.items.map((item) => [item.id, item]));

          syncedItems.forEach((serverItem) => {
            const existing = map.get(serverItem.id);
            const merged: ImageLibraryItem = existing
              ? {
                  ...existing,
                  ...serverItem,
                  metadata: {
                    ...existing.metadata,
                    ...serverItem.metadata,
                  },
                  pendingAction: null,
                  syncedAt: serverItem.syncedAt ?? new Date().toISOString(),
                }
              : {
                  ...serverItem,
                  pendingAction: null,
                  syncedAt: serverItem.syncedAt ?? new Date().toISOString(),
                };
            map.set(serverItem.id, merged);
          });

          deletedIds.forEach((id) => {
            map.delete(id);
          });

          return {
            ...prev,
            items: sortByUpdatedAt(Array.from(map.values())),
            lastSyncAt: safeDateIso(data?.lastSyncAt) ?? new Date().toISOString(),
            lastSyncError: null,
          };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync image library.';
        this.updateState((prev) => ({
          ...prev,
          lastSyncError: message,
        }), { persist: false });
      } finally {
        this.setSyncing(false);
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  };

  private mergeRemoteItems(localItems: ImageLibraryItem[], remoteItems: ImageLibraryItem[]): ImageLibraryItem[] {
    const map = new Map<string, ImageLibraryItem>();

    localItems.forEach((item) => {
      map.set(item.id, item);
    });

    remoteItems.forEach((remote) => {
      const existing = map.get(remote.id);
      if (!existing) {
        map.set(remote.id, {
          ...remote,
          pendingAction: null,
          syncedAt: remote.syncedAt ?? remote.updatedAt ?? new Date().toISOString(),
        });
        return;
      }

      if (existing.pendingAction && existing.pendingAction !== 'delete') {
        // Keep local unsynced changes
        return;
      }

      const localUpdated = Date.parse(existing.updatedAt);
      const remoteUpdated = Date.parse(remote.updatedAt);

      if (!Number.isNaN(remoteUpdated) && remoteUpdated >= localUpdated) {
        map.set(remote.id, {
          ...remote,
          pendingAction: null,
          syncedAt: remote.syncedAt ?? remote.updatedAt ?? existing.syncedAt ?? new Date().toISOString(),
        });
      }
    });

    return Array.from(map.values());
  }

  private stripTransientFields(item: ImageLibraryItem): Omit<ImageLibraryItem, 'pendingAction' | 'syncedAt'> {
    const { pendingAction, syncedAt, ...rest } = item;
    return rest;
  }

  private setSyncing(isSyncing: boolean) {
    this.updateState((prev) => ({
      ...prev,
      isSyncing,
    }), { persist: false });
  }

  private generateId(): string {
    if (isBrowser && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return;
      }
      const payload = JSON.parse(stored) as StoredPayload | null;
      if (!payload || !Array.isArray(payload.items)) {
        return;
      }

      this.state = {
        items: payload.items.map((item) => ({
          ...item,
          pendingAction: item.pendingAction ?? null,
          syncedAt: item.syncedAt ?? null,
        })),
        isSyncing: false,
        lastSyncAt: payload.lastSyncAt ?? null,
        lastSyncError: null,
      };
    } catch (error) {
      console.error('ImageLibraryService: failed to load from localStorage', error);
    }
  }

  private persistState(state: ImageLibraryState = this.state): void {
    if (!isBrowser) {
      return;
    }

    try {
      const payload: StoredPayload = {
        items: state.items,
        lastSyncAt: state.lastSyncAt,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('ImageLibraryService: failed to persist state', error);
    }
  }

  private updateState(updater: (prev: ImageLibraryState) => ImageLibraryState, options?: { persist?: boolean }) {
    const nextState = updater(this.state);
    this.state = nextState;
    if (options?.persist ?? true) {
      this.persistState(nextState);
    }
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('ImageLibraryService subscriber error', error);
      }
    });
  }

  private handleOnline = () => {
    void this.syncPendingItems();
  };
}

export const imageLibraryService = new ImageLibraryService();


