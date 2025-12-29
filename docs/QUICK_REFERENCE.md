# Quick Reference

Command cheat sheet for DAW Shortcuts development.

## Prerequisites

```bash
# Ensure correct Node.js version (22.x recommended)
nvm use 22.21.1
# or check .nvmrc file
nvm use
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Start dev server and open browser
npm run dev -- --open
```

## Building

```bash
# Production build (outputs to build/)
npm run build

# Preview production build locally
npm run preview
```

## Testing

```bash
# Run all tests (type check + build + e2e)
npm run test

# Run only e2e tests (Playwright)
npm run test:e2e

# Run e2e tests with UI
npm run test:e2e:ui

# Run e2e tests in debug mode
npm run test:e2e:debug

# Show last e2e test report
npm run test:e2e:report

# Run unit tests (Vitest)
npm run test:unit
```

## Type Checking

```bash
# Type check once
npm run check

# Type check with watch mode
npm run check:watch
```

## Scripts

```bash
# Generate app icons (requires sharp)
node scripts/gen-icons.mjs

# Convert Serum power features JSON to TypeScript
node scripts/convert-serum-features.mjs
```

## Common Workflows

### Adding a New Shortcut

1. Edit `src/lib/data/{productId}.ts`
2. Add entry with required fields:
   ```typescript
   {
       id: 'productId:unique-slug',
       productId: 'productId',
       type: 'edit',
       command: 'My Command',
       keys: '⌘X',
       keysWin: 'Ctrl+X',  // optional
       context: 'When active',  // optional
       tags: ['edit'],  // optional
       group: 'Editing',  // optional
       facets: ['Editing']  // optional
   }
   ```
3. Run `npm run test` to validate

### Adding a New Power Feature

1. Edit `src/lib/data/{productId}PowerFeatures.ts`
2. Add entry with required fields:
   ```typescript
   {
       kind: 'feature',
       id: 'productId:power-unique-slug',
       productId: 'productId',
       type: 'ui',
       command: 'Feature Name',
       keys: 'Right Click',
       context: 'Location',
       tags: ['power-feature'],
       group: 'SECTION NAME',  // required
       facets: ['Workflow'],  // required (can be empty)
       note: 'Explanation...',  // optional
       default: 'OFF'  // optional
   }
   ```
3. Run `npm run test` to validate

### Adding a New Product

1. Add to `src/lib/products.ts`:
   ```typescript
   {
       productId: 'newproduct',
       name: 'New Product',
       vendor: 'Vendor Name',
       category: 'DAW'
   }
   ```
2. Create `src/lib/data/newproduct.ts` with shortcuts
3. Import in `src/lib/shortcuts.ts`
4. Run `npm run test` to validate

### Debugging Tests

```bash
# Run specific test file
npx playwright test tests/homepage.spec.ts

# Run tests matching name
npx playwright test -g "search filters"

# Run with headed browser (visible)
npx playwright test --headed

# Run with slow motion
npx playwright test --headed --slow-mo=500
```

## File Locations

| Purpose | Location |
|---------|----------|
| Shortcut data | `src/lib/data/*.ts` |
| Core modules | `src/lib/*.ts` |
| Unit tests | `src/lib/__tests__/*.test.ts` |
| E2E tests | `tests/*.spec.ts` |
| Static assets | `static/` |
| Build output | `build/` |
| Documentation | `docs/` |

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CI` | Running in CI environment | (unset) |
| `NODE_ENV` | Node environment | development |

## Troubleshooting

### Wrong Node.js Version
```bash
# Check current version
node --version

# Switch using nvm
nvm use 22.21.1
```

### Build Fails
```bash
# Clear caches and reinstall
rm -rf node_modules .svelte-kit build
npm install
npm run build
```

### Tests Fail to Start
```bash
# Install Playwright browsers
npx playwright install

# Check if port 4173 is in use
lsof -i :4173
```

