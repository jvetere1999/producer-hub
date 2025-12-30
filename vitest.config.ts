import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        globals: false,
        environment: 'node'
    },
    resolve: {
        alias: {
            '$lib': path.resolve(__dirname, './src/lib'),
            '$app/paths': path.resolve(__dirname, './src/lib/__mocks__/paths.ts'),
            '$app/environment': path.resolve(__dirname, './src/lib/__mocks__/environment.ts')
        }
    }
});

