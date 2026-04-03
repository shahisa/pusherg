# Testing Patterns

**Analysis Date:** 2026-04-03

## Project Status

**Current State:** Planning phase - no test files exist yet.

**Planned Testing:** Vitest framework (per Day 1 plan)

## Test Framework

**Runner:**
- Vitest (planned)
- Install command (from `02-DAY1-PLAN.md`): `npm install -D vitest`
- Config: Not yet created

**Assertion Library:**
- Vitest built-in assertions (expected)

**Run Commands:**
```bash
npm test              # Run all tests (planned)
npm run test:watch    # Watch mode (typical Vitest pattern)
npm run test:coverage # Coverage (typical Vitest pattern)
```

## Test File Organization

**Location:**
- Planned: `test/` directory at project root (from `01-PROJECT-OVERVIEW.md`)

**Naming:**
- Pattern: `*.test.js` (per project structure)

**Planned Structure:**
```
pusherg/
├── src/
│   ├── detect.js
│   ├── runner.js
│   └── reporter.js
└── test/
    ├── detect.test.js
    ├── runner.test.js
    └── reporter.test.js
```

## Test Structure

**Suite Organization:**
Not yet implemented - typical Vitest pattern expected:

```javascript
import { describe, it, expect } from 'vitest';

describe('detect', () => {
  it('should detect build script from package.json', () => {
    // test
  });

  it('should return null when script not found', () => {
    // test
  });
});
```

**Patterns (Expected):**
- `describe()` for grouping by module/function
- `it()` for individual test cases
- `expect()` for assertions

## Mocking

**Framework:** Vitest built-in mocking (expected)

**What to Mock:**
- File system operations (fs module)
- Child process spawning (execa)
- External commands (npm, git)

**What NOT to Mock:**
- Pure functions (detect logic)
- Data transformations
- String formatting

## Fixtures and Factories

**Test Data:**
Not yet implemented - expected pattern:

```javascript
// Mock package.json fixtures
const mockPackageJson = {
  scripts: {
    build: 'npm run build',
    test: 'vitest',
    lint: 'eslint .'
  }
};
```

**Location:**
- Inline in test files (expected for simple cases)
- Separate `test/fixtures/` directory if needed (not planned yet)

## Coverage

**Requirements:** Not specified

**View Coverage:**
```bash
npm run test:coverage  # Expected command
```

**Target Areas (Planned):**
- `src/detect.js` - Script detection logic
- `src/runner.js` - Command execution
- `src/reporter.js` - Output formatting

## Test Types

**Unit Tests:**
- Planned for core modules: `detect.js`, `runner.js`, `reporter.js`
- Scope: Pure logic, data transformations, validation
- Approach: Isolated testing with mocked dependencies

**Integration Tests:**
- Not explicitly planned in MVP
- May be needed for end-to-end hook execution

**E2E Tests:**
- Not planned for MVP
- Manual testing via `npm link` (per Day 1 plan)

## Common Patterns (Expected)

**Async Testing:**
```javascript
it('should spawn process and return output', async () => {
  const result = await runCommand('npm test');
  expect(result.success).toBe(true);
});
```

**Error Testing:**
```javascript
it('should throw when package.json missing', () => {
  expect(() => detect()).toThrow('No package.json found');
});
```

**File System Testing:**
```javascript
import { vol } from 'memfs';  // If using memfs for fs mocking

it('should read package.json from cwd', () => {
  vol.fromJSON({
    '/project/package.json': JSON.stringify({ scripts: { test: 'vitest' } })
  });
  // test
});
```

## Manual Testing Strategy (Day 1 Plan)

**Local Testing Workflow:**
```bash
# Link package globally
npm link

# Test in sample project
cd ~/some-project
pusherg init

# Verify:
# - .husky/pre-push file exists
# - File contains correct content
# - husky in devDependencies
# - Output shows detected scripts
```

## Test Coverage Gaps (Current)

**Untested Areas:**
- All application code (not written yet)

**Priority After Implementation:**
- High: `detect.js` - Core auto-detection logic
- High: `runner.js` - Command execution and error handling
- Medium: `reporter.js` - Output formatting
- Medium: `commands/init.js` - Hook installation
- Low: `commands/run.js` - Integration point (harder to unit test)

## Testing Philosophy (Inferred from Plans)

**Approach:**
- Test core logic thoroughly
- Manual testing for CLI UX and git integration
- Fast feedback via watch mode during development

**Not Testing:**
- Terminal color output (chalk)
- Spinners (ora)
- Interactive prompts (inquirer) - manual testing sufficient for MVP

---

*Testing analysis: 2026-04-03*
