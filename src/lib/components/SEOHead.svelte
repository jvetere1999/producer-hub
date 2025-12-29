<!--
  SEO Head Component

  Renders all SEO meta tags, Open Graph, Twitter Cards, and JSON-LD structured data.
  Use in any page's <svelte:head> or wrap page content.

  Usage:
  <script>
    import SEOHead from '$lib/components/SEOHead.svelte';
  </script>

  <SEOHead
    title="Page Title"
    description="Page description"
    path="/page-path"
  />
-->
<script lang="ts">
    import { base } from '$app/paths';
    import {
        siteConfig,
        fullTitle,
        canonicalUrl,
        getOrganizationSchema,
        getWebSiteSchema
    } from '$lib/seo';

    // Props
    export let title: string;
    export let description: string;
    export let path: string = '/';
    export let keywords: string[] = [];
    export let ogType: 'website' | 'article' = 'website';
    export let ogImage: string = '';
    export let noindex: boolean = false;
    export let structuredData: object[] = [];
    export let includeWebsiteSchema: boolean = false;

    // Computed
    $: pageTitle = fullTitle(title);
    $: canonical = canonicalUrl(path, base);
    $: ogImageUrl = ogImage || `${siteConfig.url}${base}/favicon.svg`;

    // Build structured data array
    $: allStructuredData = [
        getOrganizationSchema(),
        ...(includeWebsiteSchema ? [getWebSiteSchema(base)] : []),
        ...structuredData
    ];
</script>

<svelte:head>
    <!-- Primary Meta Tags -->
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />

    {#if keywords.length > 0}
        <meta name="keywords" content={keywords.join(', ')} />
    {/if}

    {#if noindex}
        <meta name="robots" content="noindex, nofollow" />
    {:else}
        <meta name="robots" content="index, follow" />
    {/if}

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content={ogType} />
    <meta property="og:url" content={canonical} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:site_name" content={siteConfig.name} />
    <meta property="og:locale" content={siteConfig.locale} />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content={canonical} />
    <meta name="twitter:title" content={pageTitle} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={ogImageUrl} />
    {#if siteConfig.twitter}
        <meta name="twitter:site" content={siteConfig.twitter} />
        <meta name="twitter:creator" content={siteConfig.twitter} />
    {/if}

    <!-- Structured Data (JSON-LD) -->
    {#each allStructuredData as schema}
        {@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
    {/each}
</svelte:head>

