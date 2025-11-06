Here’s a phased, “hard-to-get-wrong” implementation plan to take Lume from a single JSON blob in Redis → a CRDT-backed, content-addressed, portable format with clean exports. Each phase has: goal → outputs → step-by-step checklist → tests → rollback. You can ship this incrementally and safely.

Note: the lume: prefix in redis is used to namespace the keys for the different features of Lume, but should be done at the redis instantiation/instance level, not throughout the codebase

⸻

Phase 0 — Baseline & Freeze (1–2 days)

Goal
Inventory what you have, freeze the current JSON shape, and prepare fixtures.

Outputs
	•	schema-vCurrent.json (the exact JSON schema you persist today).
	•	10–20 anonymized golden files (real decks) saved to testdata/legacy/.
	•	A read-only “LegacyRepository” interface that loads/saves the current blob.

Checklist
	1.	Export a representative sample of decks (tiny → huge; with/without video, masks, many text layers).
	2.	Pin a schema file: derive an OpenAPI/JSON Schema from the live blob shape.
	3.	Add a LegacyRepository with:
	•	getDoc(id): Promise<LegacyDoc>
	•	putDoc(id, legacyDoc): Promise<void>
	4.	Add a snapshot test: round-trip a golden deck and byte-compare equality.

Tests (must pass)
	•	legacy-roundtrip.spec.ts: get → put → get yields deep-equal JSON.

Rollback
	•	None (read-only changes + tests).

⸻

Phase 1 — Content-Addressable Assets (no CRDT yet) (3–5 days)

Goal
Split binaries from the blob, keep exactly the same renderable state.

New Redis Keys

lume:doc:{id}:meta         // JSON: title, author, createdAt, …  (small, indexed)
lume:doc:{id}:manifest     // JSON: structure only (no base64/big binaries)
lume:doc:{id}:assets       // SET of sha256 hashes used by the doc
lume:asset:{sha}           // BINARY: raw asset (WebP/AVIF/WOFF2/MP4/…)
lume:asset:{sha}:info      // JSON: mime, w,h,duration, colorProfile, …

Outputs
	•	AssetStore (put/get by SHA-256; SETNX for dedupe).
	•	ManifestV1 schema (slides/objects/timelines referencing sha256:…).
	•	A migration script: legacy → v1(manifest + assets).
	•	A pluggable DocRepository with read path fallback:
getDoc() tries ManifestV1 first, else auto-migrates a legacy doc in memory.

Checklist
	1.	Write hashBytes(sha256) and verify against known assets.
	2.	Implement AssetStore.put(bytes) -> sha with NX to dedupe.
	3.	Write a converter: legacy JSON → {manifest, assets[]} (no behavior change).
	4.	Implement DocRepository:
	•	getDoc(id) returns {manifest, assetsInfo}; if legacy, convert in memory.
	•	saveDoc(id, manifest) writes to new keys only.
	5.	Backfill meta into lume:doc:{id}:meta with minimal fields (title, author, tags).
	6.	Create a one-shot migrator (idempotent):
	•	If :manifest key exists, skip.
	•	Else: read legacy blob, extract assets, write :manifest, :assets, lume:asset:*.

Tests
	•	convert-identity.spec.ts: render legacy vs v1 → pixel-equal on 10 golden decks.
	•	dedupe.spec.ts: uploading duplicate assets yields one :asset:{sha}.
	•	fallback-read.spec.ts: reading an unmigrated doc auto-converts in memory.

Rollback
	•	Read path still supports legacy blob; writer behind a feature flag WRITE_V1=false.

⸻

Phase 2 — Real Repository + Indexing (2–3 days)

Goal
Lock in the repo abstraction and searchability without changing UX.

Outputs
	•	DocRepository finalized: getDoc, saveDoc, listDocs, addAssets, removeAssets.
	•	RediSearch index on meta (title, tags, author, updatedAt).
	•	Basic thumbnails (thumb.webp) stored as binary: lume:doc:{id}:thumb.

Checklist
	1.	Implement listDocs(q: Query) using RediSearch over meta.
	2.	Writer: persist small thumb for instant open.
	3.	Add optimistic updatedAt update on every saveDoc.
	4.	Add metrics (OpenTelemetry):
	•	repo.get.latency, repo.save.latency, asset.put.bytes, cache.hit/miss.

Tests
	•	search.spec.ts: text queries return expected doc ids.
	•	thumb.spec.ts: thumb fetch < 20ms p95 locally.

Rollback
	•	Keep LegacyRepository around; toggle via REPOSITORY_IMPL=legacy|v1.

⸻

Phase 3 — Introduce CRDT (Yjs) in Shadow Mode (4–7 days)

Goal
Model the document as a Yjs CRDT but don’t change user behavior yet. Keep JSON as the source; CRDT mirrors and proves correctness.

New Redis Keys

lume:doc:{id}:snapshot      // BINARY: Yjs snapshot (periodic)
lume:doc:{id}:broadcast     // Pub/Sub (live updates)
lume:doc:{id}:ops           // (optional) Stream for durable replay
lume:doc:{id}:presence      // Pub/Sub (awareness; not persisted)

Outputs
	•	A Yjs schema for Lume (one Y.Doc per presentation):
	•	slides: Y.Array<SlideId>
	•	slide:{id}: Y.Map with layers: Y.Array<Layer>, timeline: Y.Array<Keyframe>, background: Y.Map
	•	styles: Y.Map
	•	text:{layerId}: Y.Text for rich text bodies
	•	meta: Y.Map
	•	A CRDT relay service (Node + WS) that can:
	•	Load :snapshot (if any), otherwise build from {manifest, meta}.
	•	Accept Yjs updates, validate (ACL), publish to Redis Pub/Sub (and optionally append to Stream).
	•	Periodically snapshot Yjs state to :snapshot.

Shadow mode behavior
	•	Editor still uses the old JSON path for editing.
	•	A background “mirror” process applies JSON changes → Yjs doc, and vice-versa, then diff-checks equivalence.

Checklist
	1.	Define the mapping: ManifestV1 ⇄ Y.Doc. Write toYDoc(manifest) and toManifest(yDoc).
	2.	Build relay:
	•	join(docId, stateVector) → send diff
	•	update(docId, yUpdate) → broadcast + optional stream append
	•	Awareness (cursor/selection) via presence channel
	3.	Implement snapshotting: every N ops or M seconds → :snapshot.
	4.	Add a consistency checker in CI:
	•	Load golden manifest → Y.Doc → back to manifest → deep-equal with tolerant ordering rules.

Tests
	•	crdt-iso.spec.ts: manifest → Y → manifest equals (order-insensitive for arrays where order is not semantically important).
	•	relay-latency.spec.ts: median op latency < 50ms locally; reconnect resync works.

Rollback
	•	Entirely additive; editor still writes JSON.

⸻

Phase 4 — Flip the Editor to CRDT (with Safe Dual-Write) (5–10 days)

Goal
Make Yjs the authoritative live state. Continue to persist manifest as a snapshot for compatibility/export.

Outputs
	•	Client editor switched to a Yjs provider (WS → relay).
	•	Dual-write: on intervals (idle or every N ops), materialize manifest snapshot from Yjs to lume:doc:{id}:manifest.
	•	Assets remain content-addressed and immutable.

Checklist
	1.	Replace local state with Yjs bindings in the editor:
	•	Text layers → Y.Text.
	•	Layer arrays → Y.Array (use stable IDs).
	•	Styles/background/timelines → Y.Map / Y.Array.
	2.	Implement optimistic assets:
	•	New asset → upload to AssetStore → get sha → set reference in Yjs.
	3.	Implement undo/redo per client using Yjs transaction history (or subdocs).
	4.	Turn on dual-write:
	•	Schedule toManifest(yDoc) on idle or every N ops.
	•	Write manifest + bump lume:doc:{id}:v.
	5.	Enable presence (awareness hints) and soft-locks in UI.

Tests
	•	collab-typing.spec.ts: two clients edit text simultaneously; results converge deterministically.
	•	dualwrite-restart.spec.ts: restart relay; clients reconnect; manifest snapshot remains consistent.
	•	undo-redo.spec.ts: local undo doesn’t rewind other users’ changes (per-client history).

Rollback
	•	Feature flag EDITOR_BACKEND=yjs|json. Keep JSON editor path for 1–2 versions.

⸻

Phase 5 — Portable Formats (.lumez single-file + .lume.zip) (4–7 days)

Goal
Export/import stable, portable files (no Base64), built from the CRDT snapshot.

Outputs
	•	.lumez (CBOR + Zstd) packer/unpacker:
	•	Header: LUMEZ\0 | v=01 | flags | u32 rawCborLen | zstdFrame…
	•	CBOR map:

{
  schema:{version, engineMin},
  meta:{…},
  manifest:{…},          // from CRDT snapshot
  assets:{ "sha256:…": h'…' }, // raw binaries as byte strings
  thumb:h'…',
  integrity:{algo:"sha256", cborHash:h'…'},
  signature?:{alg:"ed25519", sig:h'…', kid:"…"},
  license?:{…} // optional DRM envelope (Phase 6)
}


	•	.lume.zip (project flavor): manifest.json (Deflate) + /assets/<sha> (Store) + /thumb.webp.

Checklist
	1.	Implement exportLumez(docId):
	•	Read Yjs snapshot → manifest.
	•	Collect referenced assets by hash from Redis.
	•	Pack CBOR (no Base64) → zstd level 6.
	•	(Optional) Sign (Ed25519) and embed signature.
	2.	Implement importLumez(file):
	•	Verify header/integrity; verify signature if present.
	•	Unpack → upsert assets by hash (SETNX); create new doc id; load into Yjs.
	3.	Same for ZIP flavor.
	4.	Add worker-based decode on the client (zstd WASM + cbor-x), createImageBitmap for images.

Tests
	•	export-import-e2e.spec.ts: export → delete doc → import → pixel-equal render vs original.
	•	integrity.spec.ts: tampered file is rejected.
	•	size-performance.spec.ts: compare .lumez vs .zip sizes and load times.

Rollback
	•	Export/import are additive features. No risk to editor.

⸻

Phase 6 — (Optional) DRM / Provenance (3–5 days)

Goal
Add provenance (signatures) and optional encrypted assets for shared files.

Outputs
	•	Ed25519 signing during export; JWKS for public verification.
	•	Envelope encryption for assets section:
	•	k_file (random) → encrypt assets with XChaCha20-Poly1305 or AES-GCM.
	•	k_file encrypted with license key k_lic returned from your entitlement service.
	•	License claims: {sub, docId, exp, device?, rights:["view","edit"], …} signed by your issuer.

Checklist
	1.	Implement sign(bytes) and verify(bytes, sig, kid).
	2.	Implement encryptAssets(assets, k_file) + wrap(k_file, k_lic).
	3.	Modify importer to:
	•	Validate license with your service.
	•	Unwrap, decrypt, then continue import.

Tests
	•	license-expiry.spec.ts: expired licenses rejected.
	•	watermark.spec.ts: invisible watermark (optional) embeds sub+docId.

Rollback
	•	Keep DRM optional; export without DRM is default.

⸻

Phase 7 — Full Data Migration & Cleanup (2–4 days)

Goal
Backfill all existing docs to v1 storage and Yjs snapshots; remove legacy writes.

Outputs
	•	A batch migrator (idempotent, resumable) with progress logging.
	•	Metrics & dashboards for migration rate, failures, and size deltas.

Checklist
	1.	Iterate all doc ids:
	•	If :manifest missing → convert from legacy → write :manifest, :assets, :meta.
	•	If :snapshot missing → build Yjs from manifest → store.
	2.	Verify each migrated doc by:
	•	Rendering slide 1 → compare to pre-migration PNG (store baseline first).
	•	Hash-comparing toManifest(Y(doc)) vs stored manifest.
	3.	Turn off legacy writer (WRITE_V1=true, WRITE_LEGACY=false).
	4.	After soak (e.g., 2 weeks), delete legacy blobs with backup TTL.

Tests
	•	migration-e2e.spec.ts: spot-check 100% of docs for structural equality and first slide render match.
	•	canary.spec.ts: open/import/export on random migrated docs.

Rollback
	•	Keep backups of legacy blobs for 30–60 days; flip REPOSITORY_IMPL back if needed.

⸻

Developer “Do/Don’t” Guardrails (make it impossible to get wrong)

Do
	•	Always reference assets by content hash (sha256:<hex>).
	•	Use Yjs updates only for live edits; never mutate assets in place.
	•	Snapshot Yjs to :snapshot on idle or every N updates.
	•	Keep manifest as an authoritative snapshot for export & compatibility.

Don’t
	•	Don’t re-compress already-compressed assets (WebP/AVIF/WOFF2/MP4) in ZIP—use Store.
	•	Don’t embed Base64 in JSON.
	•	Don’t block on DRM during live editing; enforce at export/import or via server ACL.

⸻

Acceptance Gates (per phase)
	•	P1 Gate: pixel-equal renders between legacy and v1 for 95%+ of golden decks; remaining diffs audited & waived.
	•	P3 Gate: manifest ⇄ Y.Doc round-trip equals (structural).
	•	P4 Gate: Two clients edit the same text box for 60s → no divergence; op p95 < 150ms; reconnect resync < 1s.
	•	P5 Gate: .lumez export/import round-trip yields pixel-equal slide 1; pack time < 2s for 100 slides on dev laptop.

⸻

Minimal Interfaces (copy/paste skeletons)

// repositories.ts
export interface DocRepository {
  getMeta(id: string): Promise<Meta>
  getManifest(id: string): Promise<ManifestV1>
  saveManifest(id: string, manifest: ManifestV1): Promise<void>
  listDocs(q: Query): Promise<DocSummary[]>
}

export interface AssetStore {
  put(bytes: Uint8Array): Promise<string> // returns sha256
  get(sha: string): Promise<Uint8Array | null>
  info(sha: string): Promise<AssetInfo | null>
}

// crdt.ts
export interface CollabProvider {
  join(docId: string, stateVector?: Uint8Array): Promise<Uint8Array> // diff
  applyUpdate(docId: string, update: Uint8Array): Promise<void>
  snapshot(docId: string): Promise<void>
}


⸻

Observability to add now
	•	Repo: latency histograms, sizes, error rates.
	•	CRDT: ops/sec, update byte size, reconnect count, snapshot size/interval.
	•	Export: pack time, output size, first-paint time on import.
	•	Migration: processed/min, failures, retry queue length.

Dashboards: “Open latency by deck size”, “Ops p95”, “Snapshot catch-up bytes”.

⸻

Risk Register & Mitigations
	•	Schema drift → lock schema.version; write a migrator per bump; CI tests cover legacy → v1 → yjs.
	•	Large assets (>100 MB) → chunking in AssetStore (:chunk:{i}); stream to client.
	•	CRDT bloat → periodic compaction via fresh snapshot; limit history depth.
	•	Multi-region lag → colocate relay + Redis per region; hash-tag keys {docId}; optionally Streams for replay.

⸻

TL;DR
	1.	Split assets (P1),
	2.	finalize repo & search (P2),
	3.	add Yjs in shadow (P3),
	4.	flip editor to CRDT with dual-write (P4),
	5.	ship .lumez/.lume.zip (P5),
	6.	optional DRM (P6),
	7.	migrate & clean (P7).