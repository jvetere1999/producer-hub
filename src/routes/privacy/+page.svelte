<!-- src/routes/privacy/+page.svelte -->
<script lang="ts">
    import { base } from '$app/paths';
    import SEOHead from '$lib/components/SEOHead.svelte';
    import { pageMeta } from '$lib/seo';

    // Keep this current when you edit the policy.
    const lastUpdated = '2025-12-29';

    const siteName = 'Producer Hub';
    const siteUrl = 'https://producerhub.ecent.online';
    const contactEmail = 'jvetere1999@gmail.com';
</script>

<SEOHead
    title={pageMeta.privacy.title}
    description={pageMeta.privacy.description}
    path="/privacy"
/>

<main class="container">
    <h1>Privacy Policy</h1>
    <p><strong>Last updated:</strong> {lastUpdated}</p>

    <h2>Summary</h2>
    <ul>
        <li>{siteName} is a static web app and can be installed as a PWA.</li>
        <li>We store preferences (e.g., favorites, theme, filters) on your device using local storage and/or IndexedDB.</li>
        <li>We may display ads via Google AdSense.</li>
    </ul>

    <h2>Information we collect</h2>

    <h3>Information you provide</h3>
    <p>
        {siteName} does not require accounts. If you contact us by email, we receive whatever you send (such as your email
        address and message content) so we can respond.
    </p>

    <h3>Hosting and basic logs</h3>
    <p>
        When you visit the site, our hosting provider (for example, GitHub Pages and related delivery infrastructure) may
        process basic request data in server logs, such as your IP address, user-agent, requested URL, referring page, and
        timestamps. This data is generally used for reliability, security, and troubleshooting.
    </p>

    <h3>On-device storage (local storage / IndexedDB)</h3>
    <p>
        To make the app work well, we store certain preferences on your device. This may include favorites, theme settings,
        and filter/sort selections. This data stays on your device unless you clear site data in your browser or uninstall
        the PWA.
    </p>

    <h3>Service worker / offline caching (PWA)</h3>
    <p>
        If you install or use {siteName} as a PWA, a service worker may cache app assets (like HTML, CSS, JavaScript, and
        icons) to enable faster loads and offline support. Cached files are stored on your device. You can remove these by
        clearing site data or uninstalling the PWA.
    </p>

    <h2>Advertising (Google AdSense)</h2>
    <p>
        We may show ads through Google AdSense. Google and its partners may use cookies or similar technologies to serve and
        measure ads, limit repeated ads, and help personalize ads (depending on your settings, region, and available consent
        mechanisms). These technologies may collect data such as device identifiers, approximate location, pages visited,
        and ad interactions.
    </p>
    <p>
        You can manage ad personalization in your Google account ad settings, and you can opt out of some interest-based
        advertising through industry programs (for example, the opt-out tools available at aboutads.info).
    </p>

    <h2>How we use information</h2>
    <ul>
        <li>To operate and improve the app (e.g., saving your preferences on-device).</li>
        <li>To keep the site secure and reliable (e.g., abuse prevention and troubleshooting).</li>
        <li>To display and measure ads (Google AdSense), if enabled.</li>
        <li>To respond to messages you send us.</li>
    </ul>

    <h2>Sharing of information</h2>
    <p>We do not sell your personal information. We may share limited information with:</p>
    <ul>
        <li><strong>Hosting/CDN providers</strong> to deliver the site and protect it from abuse.</li>
        <li><strong>Advertising providers</strong> (Google AdSense) to display/measure ads, if enabled.</li>
        <li><strong>Authorities</strong> if required by law or to protect rights and safety.</li>
    </ul>

    <h2>Your choices</h2>
    <ul>
        <li>
            <strong>Clear site data:</strong> You can clear local storage, cached data, and cookies via your browser settings.
        </li>
        <li>
            <strong>Ads personalization:</strong> Use Google ad settings and industry opt-out tools (where available) to limit
            personalized ads.
        </li>
        <li>
            <strong>PWA removal:</strong> Uninstall the PWA to remove its stored app data (you may also need to clear site data
            in browser settings).
        </li>
    </ul>

    <h2>Children’s privacy</h2>
    <p>{siteName} is not directed to children, and we do not knowingly collect personal information from children.</p>

    <h2>Changes to this policy</h2>
    <p>We may update this policy from time to time. We will revise the “Last updated” date when changes are made.</p>

    <h2>Contact</h2>
    <p>
        Email: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>

    <hr />

    <p class="muted">
        <a href={`${base}/`}>Back to app</a>
    </p>
</main>

<style>
    .container { max-width: 860px; margin: 0 auto; padding: 24px 16px; }
    h1 { margin: 0 0 12px; }
    h2 { margin-top: 24px; }
    hr { margin: 28px 0; }
    .muted { opacity: 0.9; }
</style>
