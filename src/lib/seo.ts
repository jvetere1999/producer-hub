/**
 * SEO Configuration for Producer Hub
 * Centralized metadata, structured data, and SEO utilities
 */

// ===========================================
// Site Configuration
// ===========================================

export const siteConfig = {
    name: 'Producer Hub',
    tagline: 'Master Your DAW, Faster',
    url: 'https://producerhub.ecent.online',
    description: 'Free keyboard shortcuts, workflow guides, and production tips for Ableton Live, FL Studio, Logic Pro, Serum, and more. Learn music production faster.',
    author: 'Producer Hub',
    email: 'jvetere1999@gmail.com',
    twitter: '', // Add if you have one: '@producerhub'
    locale: 'en_US',
    themeColor: '#3b82f6',
};

// ===========================================
// Page Metadata Types
// ===========================================

export interface PageMeta {
    title: string;
    description: string;
    canonical?: string;
    keywords?: string[];
    ogType?: 'website' | 'article';
    ogImage?: string;
    noindex?: boolean;
}

// ===========================================
// Default Metadata Templates
// ===========================================

/**
 * Generates full title with site name suffix
 */
export function fullTitle(pageTitle: string): string {
    if (pageTitle === siteConfig.name) {
        return `${siteConfig.name} | ${siteConfig.tagline}`;
    }
    return `${pageTitle} | ${siteConfig.name}`;
}

/**
 * Generates canonical URL
 */
export function canonicalUrl(path: string, base: string = ''): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${siteConfig.url}${base}${cleanPath}`;
}

// ===========================================
// Page Metadata Definitions
// ===========================================

export const pageMeta: Record<string, PageMeta> = {
    home: {
        title: 'Producer Hub',
        description: 'Free keyboard shortcuts, workflow guides, and tips for Ableton Live, FL Studio, Logic Pro, Serum, and Reason. Master your DAW and produce music faster.',
        keywords: [
            'DAW shortcuts',
            'music production',
            'Ableton Live shortcuts',
            'FL Studio shortcuts',
            'Logic Pro shortcuts',
            'Serum tutorial',
            'learn music production',
            'producer tools',
            'audio production',
            'beat making'
        ],
        ogType: 'website',
    },
    privacy: {
        title: 'Privacy Policy',
        description: 'Privacy Policy for Producer Hub covering data collection, cookies, advertising, and your choices.',
        noindex: false,
    },
    // Future pages - add as you create them
    abletonShortcuts: {
        title: 'Ableton Live 12 Keyboard Shortcuts',
        description: 'Complete list of 200+ Ableton Live 12 keyboard shortcuts for Mac and Windows. Speed up your workflow with essential hotkeys for editing, navigation, and mixing.',
        keywords: ['Ableton Live shortcuts', 'Ableton hotkeys', 'Ableton keyboard commands', 'Ableton Live 12'],
    },
    flStudioShortcuts: {
        title: 'FL Studio Keyboard Shortcuts',
        description: 'Master FL Studio with 300+ keyboard shortcuts. Complete reference for playlist, piano roll, mixer, and browser navigation on Mac and Windows.',
        keywords: ['FL Studio shortcuts', 'FL Studio hotkeys', 'FL Studio keyboard', 'Image-Line shortcuts'],
    },
    serumGuide: {
        title: 'Serum Synth Power Features Guide',
        description: 'Unlock Serum\'s full potential with this guide to wavetables, modulation, effects, and sound design techniques for electronic music production.',
        keywords: ['Serum synth', 'Serum tutorial', 'wavetable synthesis', 'sound design', 'Xfer Serum'],
    },
    reasonShortcuts: {
        title: 'Reason Studios Keyboard Shortcuts',
        description: 'Complete Reason DAW keyboard shortcuts reference. Navigate the rack, sequencer, and mixer faster with these essential hotkeys.',
        keywords: ['Reason shortcuts', 'Reason DAW', 'Reason Studios hotkeys'],
    },
};

// ===========================================
// Structured Data (JSON-LD)
// ===========================================

/**
 * Organization schema for the site
 */
export function getOrganizationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
        logo: `${siteConfig.url}/favicon.svg`,
        description: siteConfig.description,
        sameAs: [
            // Add social profiles if you have them
        ],
    };
}

/**
 * WebSite schema with SearchAction for sitelinks search box
 */
export function getWebSiteSchema(base: string = '') {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url: `${siteConfig.url}${base}/`,
        description: siteConfig.description,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteConfig.url}${base}/?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    };
}

/**
 * SoftwareApplication schema for the PWA
 */
export function getSoftwareAppSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: siteConfig.name,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web, iOS, Android, Windows, macOS',
        description: siteConfig.description,
        url: siteConfig.url,
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        aggregateRating: undefined, // Add when you have reviews
    };
}

/**
 * HowTo schema for shortcut/workflow pages
 */
export function getHowToSchema(name: string, description: string, steps: { name: string; text: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name,
        description,
        step: steps.map((step, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: step.name,
            text: step.text,
        })),
    };
}

/**
 * ItemList schema for shortcut reference pages
 */
export function getItemListSchema(name: string, items: { name: string; description: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        numberOfItems: items.length,
        itemListElement: items.slice(0, 100).map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            description: item.description,
        })),
    };
}

/**
 * BreadcrumbList schema
 */
export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// ===========================================
// Content Strategy Keywords
// ===========================================

export const topicClusters = {
    abletonLive: {
        pillar: 'Ableton Live Shortcuts & Workflow',
        keywords: [
            'ableton live shortcuts',
            'ableton keyboard shortcuts',
            'ableton live 12 shortcuts',
            'ableton workflow tips',
            'ableton live tutorial',
            'ableton editing shortcuts',
            'ableton arrangement view',
            'ableton session view',
        ],
    },
    flStudio: {
        pillar: 'FL Studio Shortcuts & Production',
        keywords: [
            'fl studio shortcuts',
            'fl studio keyboard shortcuts',
            'fl studio piano roll shortcuts',
            'fl studio playlist shortcuts',
            'fl studio mixer shortcuts',
            'fl studio workflow',
            'fruity loops shortcuts',
        ],
    },
    serum: {
        pillar: 'Serum Sound Design',
        keywords: [
            'serum synth',
            'serum tutorial',
            'serum wavetable',
            'serum sound design',
            'serum presets',
            'serum modulation',
            'xfer serum tips',
        ],
    },
    logicPro: {
        pillar: 'Logic Pro Workflow',
        keywords: [
            'logic pro shortcuts',
            'logic pro x shortcuts',
            'logic pro keyboard shortcuts',
            'logic pro workflow',
            'garageband to logic',
        ],
    },
    musicAnalysis: {
        pillar: 'Music Analysis & Ear Training',
        keywords: [
            'analyze music',
            'music analysis',
            'ear training',
            'reference tracks',
            'music theory for producers',
            'audio analysis',
        ],
    },
    productionFundamentals: {
        pillar: 'Music Production Basics',
        keywords: [
            'learn music production',
            'music production for beginners',
            'how to produce music',
            'home studio setup',
            'mixing basics',
            'mastering basics',
        ],
    },
};

