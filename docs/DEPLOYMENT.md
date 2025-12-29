# Deployment Guide

This guide covers deploying Producer Hub to GitHub Pages, including common issues and their solutions.

---

## Table of Contents

- [GitHub Pages Subpath Primer](#github-pages-subpath-primer)
- [Static Assets & Icons](#static-assets--icons)
- [PWA Configuration](#pwa-configuration)
- [CI/CD & Playwright](#cicd--playwright)
- [Local Testing with Base Path](#local-testing-with-base-path)
- [Validation Checklist](#validation-checklist)
- [Troubleshooting](#troubleshooting)

---

## GitHub Pages Subpath Primer

### The Problem

GitHub Pages serves repository sites at a subpath: `https://<user>.github.io/<repo>/`

This means:
- Absolute-root URLs like `/icons/products/ableton.svg` → **404**
- The correct URL is `/<repo>/icons/products/ableton.svg`

### SvelteKit Solution

SvelteKit handles this via `base` path configuration:

**`svelte.config.js`:**
```javascript
const basePath = process.env.BASE_PATH ?? '';

kit: {
    paths: {
        base: dev ? '' : basePath
    }
}
```

**Build command:**
```bash
BASE_PATH=/your-repo-name npm run build
```

### Using Base Path in Code

**In Svelte components:**
```svelte
<script>
    import { base } from '$app/paths';
</script>

<a href="{base}/">Home</a>
<img src="{base}/icons/products/ableton.svg" alt="Ableton" />
```

**In TypeScript:**
```typescript
import { base } from '$app/paths';
const iconUrl = `${base}/icons/products/ableton.svg`;
```

### Common Mistakes

| Wrong | Correct |
|-------|---------|
| `href="/"` | `href="{base}/"` |
| `src="/icons/..."` | `src="{base}/icons/..."` |
| Hardcoded absolute paths | Use `$app/paths` base |

---

## Static Assets & Icons

### Directory Structure

```
static/
├── favicon.svg
├── manifest.webmanifest
├── robots.txt
├── ads.txt
└── icons/
    └── products/
        ├── ableton.svg
        ├── flstudio.svg
        ├── reason.svg
        └── serum2.svg
```

### Icon URL Patterns

| Environment | Icon URL |
|-------------|----------|
| Local dev | `/icons/products/ableton.svg` |
| GitHub Pages | `/repo-name/icons/products/ableton.svg` |
| Custom domain | `/icons/products/ableton.svg` |

### Product Registry Icon Paths

In `src/lib/products.ts`, icons are defined with absolute paths:

```typescript
{
    productId: 'flstudio',
    name: 'FL Studio',
    icon: '/icons/products/flstudio.svg'  // Needs base prefix at runtime
}
```

The `productById` function should prepend `base` when returning icons to components.

### Verifying Icons in DevTools

1. Open site in browser
2. DevTools → Network tab → filter "svg"
3. Refresh page
4. Check each icon returns **200 OK**
5. For images: `img.naturalWidth > 0` means it loaded

---

## PWA Configuration

### Manifest Location

**File:** `static/manifest.webmanifest`

The manifest must be served from the correct path:

| Environment | Manifest URL |
|-------------|--------------|
| Local | `/manifest.webmanifest` |
| GitHub Pages | `/repo-name/manifest.webmanifest` |

### Service Worker Scope

**Key concepts:**
- Service worker scope = the path it can control
- SW registered at `/repo-name/sw.js` can only control `/repo-name/*`
- The `start_url` in manifest must be within SW scope

### Why Install Prompt May Not Appear

| Issue | Cause | Fix |
|-------|-------|-----|
| No install prompt | SW not controlling page | Reload after first visit |
| "Site cannot be installed" | Invalid manifest paths | Check `start_url` and `scope` in manifest |
| SW registration fails | Wrong SW path | Verify SW path includes base |
| Icons 404 in manifest | Absolute paths without base | Update manifest icon paths |

### Manifest Checklist

```json
{
  "name": "Producer Hub",
  "start_url": "/",        // Adjusted by build for base path
  "scope": "/",            // Adjusted by build for base path
  "display": "standalone",
  "icons": [...]           // Must be valid URLs after deployment
}
```

### Verifying PWA Status

1. DevTools → Application tab → Manifest
   - Should show "Installable" or explain why not
2. DevTools → Application tab → Service Workers
   - Status should be "activated and is running"
3. Lighthouse → PWA audit
   - Run to check all PWA requirements

---

## CI/CD & Playwright

### How CI Works

1. **Build** (`npm run build`) - Creates static site in `build/`
2. **Sitemap** (`postbuild`) - Generates `sitemap.xml`
3. **E2E Tests** (`npm run test:e2e`) - Playwright tests against built site

### Common CI Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| 404 for icons | Base path not set in build | Ensure `BASE_PATH` env var in workflow |
| "Element not found" | Content not rendered (CSR vs SSR) | Enable SSR (`ssr: true` in layout) |
| SW not controlling | First visit, no SW yet | Tests should account for SW lifecycle |
| Timeout waiting for element | Slow hydration or missing content | Check if content is SSR'd |

### Playwright Traces & Screenshots

When tests fail, artifacts are saved:

```
test-results/
└── test-name-chromium/
    ├── trace.zip        # Full trace (open with: npx playwright show-trace trace.zip)
    └── screenshot.png   # Failure screenshot
```

**View trace:**
```bash
npx playwright show-trace test-results/test-name-chromium/trace.zip
```

### Testing with Base Path Locally

```bash
# Build with base path (simulates GitHub Pages)
BASE_PATH=/producer-hub npm run build

# Preview the build
npm run preview

# Run E2E tests against preview
npm run test:e2e
```

---

## Local Testing with Base Path

### Quick Commands

```bash
# Standard local dev (no base path)
npm run dev

# Build for GitHub Pages
npm run build:pages
# Equivalent to: BASE_PATH=/producer-hub npm run build

# Preview the GitHub Pages build
npm run preview

# Full test including E2E
npm run test
```

### Simulating GitHub Pages Locally

1. Build with base path:
   ```bash
   BASE_PATH=/producer-hub npm run build
   ```

2. Serve with a local server:
   ```bash
   npm run preview
   ```

3. Open: `http://localhost:4173/producer-hub/`

4. Verify:
   - All pages load
   - Icons appear (not 404)
   - PWA install prompt appears (may need reload)
   - Footer links work

---

## Validation Checklist

Run these commands in order before pushing:

```bash
# 1. Install dependencies
npm ci

# 2. Type check
npm run check

# 3. Unit tests
npm run test:unit

# 4. Build (includes sitemap generation)
npm run build

# 5. Preview and manually verify
npm run preview
# Open http://localhost:4173 and check:
# - [ ] Homepage loads
# - [ ] Icons visible (DevTools → Network → filter svg → all 200)
# - [ ] Privacy page accessible
# - [ ] Footer links work
# - [ ] Theme toggle works

# 6. E2E tests
npm run test:e2e

# 7. Full validation (runs all of the above)
npm run test
```

### Post-Deploy Verification

After deploying to GitHub Pages:

| Check | URL | Expected |
|-------|-----|----------|
| Homepage | `https://producerhub.ecent.online/` | Loads, no console errors |
| Icons | DevTools Network tab | All return 200 |
| robots.txt | `/robots.txt` | Shows sitemap reference |
| sitemap.xml | `/sitemap.xml` | Valid XML with page URLs |
| ads.txt | `/ads.txt` | Shows publisher ID |
| PWA | DevTools → Application | Manifest valid, SW active |
| Lighthouse | DevTools → Lighthouse | Performance > 90, PWA passes |

---

## Troubleshooting

### Icons Return 404

**Symptom:** Icons don't load, Network tab shows 404

**Cause:** Absolute path without base prefix

**Fix:**
1. Check `src/lib/products.ts` - icon paths should work with base
2. In components, use:
   ```svelte
   <img src="{base}{product.icon}" />
   ```

### PWA Not Installing

**Symptom:** No install prompt, "Site cannot be installed"

**Debug:**
1. DevTools → Application → Manifest → Check for errors
2. DevTools → Application → Service Workers → Check status
3. Run Lighthouse PWA audit

**Common fixes:**
- Wait for SW to activate (reload page)
- Check manifest `start_url` is valid
- Verify icons in manifest are accessible

### E2E Tests Fail with "Element not visible"

**Symptom:** Playwright can't find elements that exist in browser

**Cause:** SSR is disabled, content only renders client-side

**Fix:**
1. Enable SSR in `src/routes/+layout.js`:
   ```javascript
   export const ssr = true;
   ```
2. Ensure no browser-only code runs at module level

### Build Fails with "Cannot find module"

**Symptom:** Import errors during build

**Fix:**
1. Run `npm run prepare` (syncs SvelteKit)
2. Check import paths are correct
3. Verify file exists at specified path

### Service Worker Not Updating

**Symptom:** Old content after deploy

**Fix:**
1. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
2. DevTools → Application → Service Workers → Update
3. Clear site data and reload

