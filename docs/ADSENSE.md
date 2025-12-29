# Google AdSense Implementation Guide

> **Site:** https://producerhub.ecent.online/  
> **Publisher ID:** `pub-8374343652873511`  
> **Tech:** SvelteKit static site → GitHub Pages  
> **Goal:** Non-intrusive ad experience with minimal code changes

---

## Table of Contents

- [Master Checklist](#master-checklist)
- [Account & Site Approval](#1-account--site-approval-walkthrough)
- [Implementation Details](#2-implementation-details-sveltekit)
- [Non-Intrusive Ads Configuration](#3-non-intrusive-ads-configuration)
- [Required Files](#4-required-adsense-files)
- [Compliance & User Controls](#5-compliance-and-user-controls)
- [Verification Steps](#6-verification-steps)
- [Troubleshooting](#7-troubleshooting-matrix)

---

## Master Checklist

### Phase 1: Pre-Application Preparation
- [x] Site has sufficient original content (10+ pages)
- [x] Privacy Policy page live at `/privacy`
- [x] Footer link to Privacy Policy on all pages
- [x] `robots.txt` allows all crawling
- [x] `ads.txt` deployed to static folder
- [x] Site is accessible and fully functional

### Phase 2: AdSense Account Setup
- [ ] Create/access AdSense account at https://adsense.google.com
- [ ] Add site: `producerhub.ecent.online`
- [ ] Verify AdSense script is in `src/app.html`
- [ ] Deploy and wait for verification
- [ ] Complete payments profile (address, tax info)
- [ ] Submit for review

### Phase 3: After Approval
- [ ] Configure Auto ads (conservative settings)
- [ ] Disable intrusive formats (anchor, vignette)
- [ ] Set up Funding Choices for EEA/UK consent
- [ ] Monitor Core Web Vitals

---

## 1. Account & Site Approval Walkthrough

### Step 1: Create/Access AdSense Account
1. Go to https://adsense.google.com
2. Sign in with your Google account
3. If new, click "Get Started" and follow onboarding

### Step 2: Add Your Site
1. In AdSense dashboard → **Sites** → **Add site**
2. Enter: `producerhub.ecent.online`
3. The verification script is already in place (see Implementation Details)

### Step 3: Complete Payments Profile
1. Go to **Payments** → **Payment info**
2. Add your address (must match tax documents)
3. Complete tax information
4. Add payment method (after reaching $10 threshold, Google sends PIN by mail)

### Step 4: Submit for Review
- Click "Request review" after verification succeeds
- Review typically takes 1-14 days (often 24-48 hours)

### Common Rejection Reasons & Prevention

| Reason | Prevention |
|--------|------------|
| **Insufficient content** | Ensure 10+ pages with unique, valuable content |
| **Navigation issues** | Clear menu, working links, logical structure |
| **Missing policy pages** | Privacy Policy is live ✓ |
| **Under construction** | No placeholder pages, all routes functional |
| **Copied content** | All content must be original |
| **Low-value content** | Add descriptions, context, not just raw data |
| **Site not accessible** | Ensure no broken deploys, site loads fast |

---

## 2. Implementation Details (SvelteKit)

### Files Modified

#### `src/app.html`
AdSense script added in `<head>`:
```html
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8374343652873511"
        crossorigin="anonymous"></script>
```

**Why here?**
- Single injection point (no duplicates across routes)
- Loads before any route renders
- Works with SvelteKit's static adapter

#### `static/ads.txt`
```
google.com, pub-8374343652873511, DIRECT, f08c47fec0942fa0
```

**Purpose:** Declares authorization to sell ad inventory via Google.

#### `src/routes/+layout.svelte`
Added site-wide footer with Privacy Policy link:
```svelte
<footer class="site-footer">
    <div class="footer-content">
        <span>© {new Date().getFullYear()} Producer Hub</span>
        <span class="separator">•</span>
        <a href="{base}/privacy">Privacy Policy</a>
    </div>
</footer>
```

### CSP Considerations

If you add a Content Security Policy later, include:
```
script-src 'self' https://pagead2.googlesyndication.com https://www.googletagservices.com https://tpc.googlesyndication.com;
frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;
img-src 'self' data: https://pagead2.googlesyndication.com https://www.google.com;
```

---

## 3. Non-Intrusive Ads Configuration

### Recommended: Conservative Auto Ads

After approval, in AdSense:
1. Go to **Ads** → **By site** → **producerhub.ecent.online**
2. Click **Edit** (pencil icon)
3. Configure:

| Setting | Recommendation |
|---------|----------------|
| Auto ads | ON (but configured carefully) |
| In-page ads | ✅ ON |
| Anchor ads | ❌ OFF (sticky bottom ads are intrusive) |
| Side rail ads | ❌ OFF (can be distracting) |
| Vignette ads | ❌ OFF (full-page interstitials = very intrusive) |
| Ad load | Set to "Minimum" or move slider left |

### Alternative: Manual Ad Units Only

For maximum control:
1. **Ads** → **By ad unit** → **Create new ad unit**
2. Choose "Display ads" (responsive)
3. Get the ad unit code
4. Place manually in Svelte components

### Suggested Placements (Non-Intrusive)

```
┌─────────────────────────────────────┐
│           Header / Nav               │
├─────────────────────────────────────┤
│        Main Content Area            │
├─────────────────────────────────────┤
│  [Optional: Ad Unit - 728x90]       │  ← Between sections
├─────────────────────────────────────┤
│        More Content                 │
├─────────────────────────────────────┤
│        Footer                       │
│  [Ad Unit - responsive]             │  ← Above or within footer
│  Privacy Policy link                │
└─────────────────────────────────────┘
```

### Core Web Vitals Tips

- Use `loading="lazy"` on ad containers if manual
- Avoid ads above the fold on mobile
- Test with Lighthouse after enabling ads
- Monitor CLS (Cumulative Layout Shift) - reserve space for ads with min-height

---

## 4. Required AdSense Files

### ads.txt

**Location:** `static/ads.txt` → deployed to `https://producerhub.ecent.online/ads.txt`

**Current Content:**
```
google.com, pub-8374343652873511, DIRECT, f08c47fec0942fa0
```

**Format Breakdown:**
- `google.com` - Ad system domain
- `pub-8374343652873511` - Your Publisher ID
- `DIRECT` - You own this inventory directly
- `f08c47fec0942fa0` - Google's TAG-ID (standard for all publishers)

### Finding Your Publisher ID

If you need to verify or update:
1. Go to https://adsense.google.com
2. Click **Account** → **Account information**
3. Copy **Publisher ID** (format: `pub-XXXXXXXXXXXXXXXX`)

---

## 5. Compliance and User Controls

### EEA/UK Consent (GDPR)

**Required:** If you have users in EEA/UK/Switzerland, you need a Consent Management Platform (CMP).

**Google's Solution: Funding Choices + User Messaging Platform (UMP)**

1. In AdSense → **Privacy & messaging**
2. Create a **GDPR message**
3. Configure consent options
4. Google automatically serves the consent dialog to EEA/UK users

### Privacy Policy Requirements ✓

The privacy policy at `/privacy` already covers:
- ✅ What data is collected
- ✅ Google AdSense disclosure
- ✅ Cookies/tracking mention
- ✅ User choices (opt-out links)
- ✅ Contact information

### Required Disclosures

- Footer links to privacy policy on ALL pages ✓
- If using consent banner, it links to privacy policy
- "Privacy Policy" link text is clear

---

## 6. Verification Steps

### After Deploying

| URL to Test | Expected Outcome |
|-------------|------------------|
| `https://producerhub.ecent.online/ads.txt` | Shows `google.com, pub-8374343652873511, DIRECT, f08c47fec0942fa0` |
| `https://producerhub.ecent.online/` | DevTools Network shows `adsbygoogle.js` loading (200 status) |
| `https://producerhub.ecent.online/privacy` | Privacy policy page loads |
| Any page | Footer visible with "Privacy Policy" link |

### DevTools Verification

1. Open site in Chrome/Edge
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to **Network** tab → filter by `adsbygoogle`
4. Refresh page
5. Verify `adsbygoogle.js?client=ca-pub-...` loads with status 200
6. Check **Console** tab for any AdSense errors

### Command Line Test

```bash
# Test ads.txt is accessible
curl -I https://producerhub.ecent.online/ads.txt

# View ads.txt content
curl https://producerhub.ecent.online/ads.txt
```

---

## 7. Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `ads.txt` returns 404 | File not deployed or wrong path | Verify file is in `static/ads.txt`, redeploy |
| AdSense says "ads.txt not found" | Wrong publisher ID in file | Ensure ID matches exactly (no spaces, correct format) |
| `adsbygoogle.js` not loading | Script tag not in `<head>` | Check `src/app.html` has the script |
| Script loads but ads don't show | Site not approved yet OR auto-ads disabled | Wait for approval, then enable auto-ads in AdSense |
| "Site not ready" in AdSense | Verification pending | Ensure script has correct publisher ID, wait 24-48h |
| Console error: `adsbygoogle.push()` | Normal if no manual ad units | Ignore - auto ads handle this |
| Ads show but Core Web Vitals bad | Ads causing layout shift | In AdSense auto-ads settings, reduce ad density |
| Footer not showing | CSS conflict | Check if page has `height: 100vh` or similar that clips content |
| Privacy link 404 | Base path issue | Ensure `{base}` prefix in link href |
| Low fill rate | Normal initially | AdSense optimizes over time |
| Blank ad spaces | No eligible ads OR ad blockers | Test in incognito without ad blocker |

---

## Optional: Manual Ad Unit Component

For precise ad placement, create a reusable Svelte component:

```svelte
<!-- src/lib/components/AdUnit.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  export let slot: string;
  export let format: string = 'auto';
  
  onMount(() => {
    if (browser) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn('AdSense not loaded');
      }
    }
  });
</script>

<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-8374343652873511"
     data-ad-slot={slot}
     data-ad-format={format}
     data-full-width-responsive="true"></ins>

<style>
  .adsbygoogle {
    min-height: 90px;
    margin: 1rem 0;
  }
</style>
```

**Usage:**
```svelte
<script>
  import AdUnit from '$lib/components/AdUnit.svelte';
</script>

<!-- Get slot ID from AdSense when you create a new ad unit -->
<AdUnit slot="1234567890" />
```

---

## Maintenance

### Updating Publisher ID

If you need to change the Publisher ID:

1. Update `src/app.html`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-NEW_ID"
   ```

2. Update `static/ads.txt`:
   ```
   google.com, pub-NEW_ID, DIRECT, f08c47fec0942fa0
   ```

3. Deploy and wait for AdSense to re-verify

### Monitoring

- Check AdSense dashboard weekly for policy violations
- Monitor Core Web Vitals in Google Search Console
- Review ad performance and adjust density if needed

