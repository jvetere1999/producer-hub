import type { Product } from './types';

export const products: Product[] = [
    {
        productId: 'serum2',
        name: 'Serum 2',
        vendor: 'Xfer Records',
        category: 'Plugin',
        website: 'https://xferrecords.com/products/serum',
        icon: 'icons/products/serum2.svg'
    },
    {
        productId: 'ableton12suite',
        name: 'Ableton Live 12 Suite',
        vendor: 'Ableton',
        category: 'DAW',
        website: 'https://www.ableton.com/en/live/',
        icon: 'icons/products/ableton.svg'
    },
    {
        productId: 'reasonrack',
        name: 'Reason Rack',
        vendor: 'Reason Studios',
        category: 'DAW',
        website: 'https://www.reasonstudios.com/',
        icon: 'icons/products/reason.svg'
    },
    {
        productId: 'flstudio',
        name: 'FL Studio',
        vendor: 'Image-Line',
        category: 'DAW',
        website: 'https://www.image-line.com/fl-studio/',
        icon: 'icons/products/flstudio.svg'
    },
    {
        productId: 'logicpro',
        name: 'Logic Pro',
        vendor: 'Apple',
        category: 'DAW',
        website: 'https://www.apple.com/logic-pro/',
        icon: 'icons/products/logicpro.svg'
    }
];

export const productById = new Map(products.map((p) => [p.productId, p] as const));
