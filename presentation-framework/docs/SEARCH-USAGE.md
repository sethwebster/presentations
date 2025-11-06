# Search Index Usage Guide

This guide demonstrates how to use the RediSearch indexing functionality for fast deck search.

## Overview

The search implementation provides:
- **Fast full-text search** on document titles
- **Tag filtering** (AND logic - documents must have all specified tags)
- **Owner filtering** by user ID
- **Date range filtering** on creation/update timestamps
- **Pagination support** with limit and offset
- **Sorting** by relevance, title, createdAt, or updatedAt
- **Automatic fallback** to SCAN-based search when RediSearch is unavailable

## Basic Usage

### Initialize the Repository

```typescript
import { getRedis } from '@/lib/redis';
import { DocRepository } from '@/repositories/DocRepository';

const redis = getRedis();
if (!redis) {
  throw new Error('Redis not configured');
}

const repo = new DocRepository(redis);

// Create search index (call once during app initialization)
await repo.createSearchIndex();
```

### Simple Search Examples

#### Search by Title (Full-Text)

```typescript
// Find all documents with "quarterly" in the title
const docs = await repo.listDocs({
  text: 'quarterly'
});

console.log(`Found ${docs.length} documents`);
docs.forEach(doc => {
  console.log(`- ${doc.title} (${doc.id})`);
});
```

#### Filter by Tags

```typescript
// Find documents tagged with both 'sales' AND 'Q4'
const salesDocs = await repo.listDocs({
  tags: ['sales', 'Q4']
});
```

#### Filter by Owner

```typescript
// Find all documents owned by a specific user
const myDocs = await repo.listDocs({
  ownerId: 'user-123'
});
```

#### Date Range Filtering

```typescript
// Find documents updated in the last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const recentDocs = await repo.listDocs({
  dateFrom: thirtyDaysAgo.toISOString()
});
```

### Complex Queries

#### Combined Filters

```typescript
// Find sales reports from Q4, owned by user-123, updated this year
const results = await repo.listDocs({
  text: 'report',
  tags: ['sales', 'Q4'],
  ownerId: 'user-123',
  dateFrom: '2025-01-01T00:00:00Z',
  dateTo: '2025-12-31T23:59:59Z',
  limit: 10,
  offset: 0,
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});
```

### Pagination

```typescript
// Get first page (10 results)
const page1 = await repo.listDocs({
  limit: 10,
  offset: 0,
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});

// Get second page (next 10 results)
const page2 = await repo.listDocs({
  limit: 10,
  offset: 10,
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});
```

### Sorting

```typescript
// Sort by title (alphabetical)
const alphabetical = await repo.listDocs({
  sortBy: 'title',
  sortOrder: 'asc'
});

// Sort by most recently updated
const recent = await repo.listDocs({
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});

// Sort by relevance (when using text search)
const relevant = await repo.listDocs({
  text: 'sales',
  sortBy: 'relevance',
  sortOrder: 'desc'
});
```

## Advanced Usage

### Reindexing

If you need to rebuild the search index (e.g., after schema changes):

```typescript
// Reindex all existing documents
const count = await repo.reindexAll();
console.log(`Reindexed ${count} documents`);
```

### Index Information

Get statistics about the search index:

```typescript
const info = await repo.getIndexInfo();
if (info) {
  console.log('Index statistics:', info);
  console.log(`Number of documents: ${info.num_docs}`);
} else {
  console.log('RediSearch not available, using fallback mode');
}
```

## Implementation Details

### RediSearch vs Fallback Mode

The implementation automatically detects if RediSearch is available:

- **With RediSearch**: Fast indexed search using FT.SEARCH
- **Without RediSearch**: Falls back to SCAN-based search (slower, but functional)

Your code doesn't need to change based on which mode is active.

### SearchQuery Interface

```typescript
interface SearchQuery {
  text?: string;           // Full-text search in title
  tags?: string[];         // Filter by tags (AND logic)
  ownerId?: string;        // Filter by owner
  dateFrom?: string;       // Filter by date range (ISO 8601)
  dateTo?: string;
  limit?: number;          // Pagination (default: 20, max: 100)
  offset?: number;
  sortBy?: 'relevance' | 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}
```

### Performance Considerations

1. **RediSearch Mode** (when available):
   - Handles millions of documents efficiently
   - Sub-millisecond search times
   - Scales horizontally with Redis cluster

2. **Fallback Mode** (SCAN-based):
   - Works with any Redis instance
   - Slower for large datasets (O(N) scan)
   - Consider pagination to limit results

3. **Best Practices**:
   - Use specific filters to narrow results
   - Always set a reasonable `limit`
   - Create the search index once at app startup
   - Reindex only when necessary (schema changes, data migrations)

## Environment Setup

### Redis with RediSearch Module

For production, install Redis with RediSearch:

```bash
# Using Docker
docker run -d -p 6379:6379 redis/redis-stack-server:latest

# Or using Redis Cloud (includes RediSearch)
# Set REDIS_URL to your Redis Cloud connection string
```

### Redis without RediSearch

The implementation works with any Redis instance. If RediSearch is not available, it automatically falls back to SCAN-based search:

```bash
# Standard Redis (fallback mode)
docker run -d -p 6379:6379 redis:latest
```

## API Reference

### DocRepository Methods

#### `listDocs(query?: SearchQuery): Promise<ManifestMeta[]>`

Search for documents matching the query parameters.

**Parameters:**
- `query` - Optional search query object (empty query returns all docs)

**Returns:**
- Array of document metadata matching the query

#### `createSearchIndex(): Promise<boolean>`

Create or update the search index. Call once during app initialization.

**Returns:**
- `true` if index was created/updated
- `false` if RediSearch is unavailable

#### `reindexAll(): Promise<number>`

Reindex all existing documents.

**Returns:**
- Number of documents indexed/counted

#### `getIndexInfo(): Promise<Record<string, any> | null>`

Get statistics about the search index.

**Returns:**
- Index information object, or `null` if RediSearch unavailable

## Examples

### Building a Search UI

```typescript
import { useState } from 'react';
import { DocRepository } from '@/repositories/DocRepository';
import { getRedis } from '@/lib/redis';

export function SearchBar() {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    const redis = getRedis();
    const repo = new DocRepository(redis);

    const docs = await repo.listDocs({
      text: query,
      limit: 20,
      sortBy: 'relevance'
    });

    setResults(docs);
  }

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search presentations..."
        />
        <button type="submit">Search</button>
      </form>

      <ul>
        {results.map(doc => (
          <li key={doc.id}>
            <h3>{doc.title}</h3>
            <p>{doc.description}</p>
            <div>Tags: {doc.tags?.join(', ')}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Tag-Based Filtering

```typescript
export async function getDocumentsByTags(tags: string[]) {
  const redis = getRedis();
  const repo = new DocRepository(redis);

  return await repo.listDocs({
    tags,
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });
}

// Usage
const salesDocs = await getDocumentsByTags(['sales', 'quarterly']);
```

### User's Recent Documents

```typescript
export async function getUserRecentDocs(userId: string, days: number = 30) {
  const redis = getRedis();
  const repo = new DocRepository(redis);

  const since = new Date();
  since.setDate(since.getDate() - days);

  return await repo.listDocs({
    ownerId: userId,
    dateFrom: since.toISOString(),
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 50
  });
}

// Usage
const myRecentDocs = await getUserRecentDocs('user-123', 7);
```

## Troubleshooting

### Search Returns No Results

1. Check if documents exist:
   ```typescript
   const count = await repo.reindexAll();
   console.log(`Found ${count} documents`);
   ```

2. Verify search query:
   ```typescript
   // Try empty query to get all documents
   const all = await repo.listDocs({});
   console.log(`Total documents: ${all.length}`);
   ```

3. Check if filters are too restrictive:
   ```typescript
   // Remove filters one at a time to isolate the issue
   const results = await repo.listDocs({
     text: 'report'
     // tags: ['sales'], // Try without tags first
   });
   ```

### Slow Search Performance

1. **Enable RediSearch** if not already enabled
2. **Use pagination** to limit results:
   ```typescript
   await repo.listDocs({ limit: 20 });
   ```
3. **Add specific filters** to narrow the search:
   ```typescript
   await repo.listDocs({
     ownerId: 'user-123',  // Filter by owner first
     text: 'report'
   });
   ```

### Index Out of Sync

If the search index is out of sync with actual data:

```typescript
// Rebuild the index
await repo.reindexAll();
```

## Migration Guide

If you're migrating from an older search implementation:

1. **Create the index** (one-time setup):
   ```typescript
   await repo.createSearchIndex();
   ```

2. **Reindex existing documents**:
   ```typescript
   const count = await repo.reindexAll();
   console.log(`Reindexed ${count} documents`);
   ```

3. **Update search calls** to use the new API:
   ```typescript
   // Old
   const docs = await searchDocs(query);

   // New
   const docs = await repo.listDocs({ text: query });
   ```
