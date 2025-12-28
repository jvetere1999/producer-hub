import type { Product } from './types';

export const products: Product[] = [
    {
        productId: 'serum2',
        name: 'Serum 2',
        vendor: 'Xfer Records',
        category: 'Plugin',
        website: 'https://xferrecords.com/products/serum'
    },
    {
        productId: 'ableton12suite',
        name: 'Ableton Live 12 Suite',
        vendor: 'Ableton',
        category: 'DAW',
        website: 'https://www.ableton.com/en/live/'
    },
    {
        productId: 'reasonrack',
        name: 'Reason Rack',
        vendor: 'Reason Studios',
        category: 'Rack',
        website: 'https://www.reasonstudios.com/'
    }
];

export const productById = new Map(products.map((p) => [p.productId, p] as const));
