# Integration Tests Setup Guide

## Quick Start

The integration tests require a Redis instance. Follow these steps to set up and run the tests:

### 1. Start Redis

Choose one of the following methods:

#### Option A: Docker (Recommended)
```bash
docker run -d --name lume-test-redis -p 6379:6379 redis:7-alpine
```

#### Option B: Local Redis Installation

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
```

**Windows:**
Download and install from: https://redis.io/docs/getting-started/installation/install-redis-on-windows/

### 2. Set Environment Variable

```bash
export REDIS_URL="redis://localhost:6379"
```

Or add to your `.env.local` file:
```
REDIS_URL=redis://localhost:6379
```

### 3. Verify Redis Connection

```bash
redis-cli ping
# Should return: PONG
```

### 4. Run the Tests

```bash
# Run all integration tests
npm run test:run src/__tests__/integration/

# Run specific test file
npm run test:run src/__tests__/integration/convert-identity.spec.ts

# Run with coverage
npm run test:run -- --coverage src/__tests__/integration/
```

## Test Data

The tests use isolated Redis namespaces to avoid conflicts:
- Each test run creates a unique namespace: `test:timestamp:random:`
- All keys are automatically cleaned up after each test
- Tests do not interfere with your application data

## Stopping Redis (When Done)

```bash
# If using Docker
docker stop lume-test-redis
docker rm lume-test-redis

# If using Homebrew
brew services stop redis

# If using systemd
sudo systemctl stop redis
```

## Troubleshooting

### "REDIS_URL or KV_URL environment variable is required"

**Problem**: Redis URL is not set in the environment.

**Solution**:
```bash
export REDIS_URL="redis://localhost:6379"
```

### "Connection refused" or "ECONNREFUSED"

**Problem**: Redis is not running or not accessible.

**Solutions**:
1. Check if Redis is running: `redis-cli ping`
2. Start Redis using one of the methods above
3. Verify the port (default 6379) is not blocked by firewall

### Tests are very slow

**Problem**: Network latency or Redis performance issues.

**Solutions**:
1. Use local Redis instead of remote
2. Ensure Redis is not under heavy load
3. Check if Redis persistence is enabled (can slow down tests)

### "Too many open connections"

**Problem**: Tests not properly cleaning up connections.

**Solution**:
```bash
# Clear all test keys
redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', 'test:*')))" 0

# Restart Redis
# Docker: docker restart lume-test-redis
# Homebrew: brew services restart redis
```

## CI/CD Setup

For continuous integration environments:

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      REDIS_URL: redis://localhost:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run src/__tests__/integration/
```

### GitLab CI Example

```yaml
test:
  image: node:18
  services:
    - redis:7-alpine
  variables:
    REDIS_URL: redis://redis:6379
  script:
    - npm ci
    - npm run test:run src/__tests__/integration/
```

## Development Workflow

1. **Start Redis once** at the beginning of your dev session
2. **Run tests as needed** during development
3. **Stop Redis** when done for the day

The tests are designed to be fast and isolated, so you can run them frequently during development.

## Test-Driven Development

These tests are perfect for TDD:

```bash
# Terminal 1: Watch mode for rapid feedback
npm test -- --watch src/__tests__/integration/

# Terminal 2: Your code editor
# Make changes, save, and watch tests re-run automatically
```

## Next Steps

Once you have Redis running and tests passing:

1. Read the [README.md](./README.md) for detailed test documentation
2. Review individual test files to understand test coverage
3. Add your own tests following the existing patterns
4. Run tests before committing changes

## Need Help?

If you encounter issues not covered here:

1. Check the main [README.md](./README.md) for more details
2. Review the test helper files in `src/__tests__/helpers/`
3. Check Redis logs: `redis-cli MONITOR`
4. Open an issue with test output and Redis configuration
