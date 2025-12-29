import { describe, it, expect } from 'vitest';
import {
    generateSalt,
    generateIV,
    toBase64,
    fromBase64,
    encryptJson,
    decryptJson,
    sha256,
    verifyPassphrase
} from '../storage/crypto';

describe('Crypto Utilities', () => {
    describe('generateSalt', () => {
        it('generates salt of correct length', () => {
            const salt = generateSalt(32);
            expect(salt.length).toBe(32);
        });

        it('generates different salts each time', () => {
            const salt1 = generateSalt();
            const salt2 = generateSalt();
            expect(toBase64(salt1)).not.toBe(toBase64(salt2));
        });
    });

    describe('generateIV', () => {
        it('generates 12-byte IV for AES-GCM', () => {
            const iv = generateIV();
            expect(iv.length).toBe(12);
        });
    });

    describe('Base64 encoding', () => {
        it('round-trips data correctly', () => {
            const original = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
            const encoded = toBase64(original);
            const decoded = fromBase64(encoded);

            expect(Array.from(decoded)).toEqual(Array.from(original));
        });

        it('handles empty array', () => {
            const original = new Uint8Array([]);
            const encoded = toBase64(original);
            const decoded = fromBase64(encoded);

            expect(decoded.length).toBe(0);
        });
    });

    describe('sha256', () => {
        it('produces consistent hash for same input', async () => {
            const hash1 = await sha256('test data');
            const hash2 = await sha256('test data');

            expect(hash1).toBe(hash2);
        });

        it('produces different hashes for different input', async () => {
            const hash1 = await sha256('data 1');
            const hash2 = await sha256('data 2');

            expect(hash1).not.toBe(hash2);
        });

        it('produces 64-character hex string', async () => {
            const hash = await sha256('test');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('handles ArrayBuffer input', async () => {
            const buffer = new TextEncoder().encode('test data').buffer;
            const hash = await sha256(buffer);

            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('Encryption/Decryption', () => {
        it('encrypts and decrypts JSON data', async () => {
            const data = { name: 'Test', value: 42, nested: { a: 1 } };
            const passphrase = 'test-passphrase-123';

            const envelope = await encryptJson(data, passphrase);
            const decrypted = await decryptJson(envelope, passphrase);

            expect(decrypted).toEqual(data);
        });

        it('produces valid envelope structure', async () => {
            const data = { test: true };
            const envelope = await encryptJson(data, 'password');

            expect(envelope.version).toBe(1);
            expect(envelope.kdf).toBeDefined();
            expect(envelope.kdf.algorithm).toBe('PBKDF2');
            expect(envelope.kdf.hash).toBe('SHA-256');
            expect(envelope.kdf.iterations).toBeGreaterThan(0);
            expect(envelope.kdf.salt).toBeDefined();
            expect(envelope.iv).toBeDefined();
            expect(envelope.ciphertext).toBeDefined();
        });

        it('fails to decrypt with wrong passphrase', async () => {
            const data = { secret: 'value' };
            const envelope = await encryptJson(data, 'correct-password');

            await expect(decryptJson(envelope, 'wrong-password'))
                .rejects.toThrow();
        });

        it('produces different ciphertext for same data', async () => {
            const data = { same: 'data' };
            const passphrase = 'password';

            const envelope1 = await encryptJson(data, passphrase);
            const envelope2 = await encryptJson(data, passphrase);

            // Different salt and IV means different ciphertext
            expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
        });

        it('handles empty object', async () => {
            const envelope = await encryptJson({}, 'pass');
            const decrypted = await decryptJson(envelope, 'pass');
            expect(decrypted).toEqual({});
        });

        it('handles array data', async () => {
            const data = [1, 2, 3, 'test'];
            const envelope = await encryptJson(data, 'pass');
            const decrypted = await decryptJson(envelope, 'pass');
            expect(decrypted).toEqual(data);
        });

        it('handles unicode strings', async () => {
            const data = { text: '日本語テスト 🎵 émojis' };
            const envelope = await encryptJson(data, 'password');
            const decrypted = await decryptJson(envelope, 'password');
            expect(decrypted).toEqual(data);
        });
    });

    describe('verifyPassphrase', () => {
        it('returns true for correct passphrase', async () => {
            const envelope = await encryptJson({ test: true }, 'correct');
            const result = await verifyPassphrase(envelope, 'correct');
            expect(result).toBe(true);
        });

        it('returns false for incorrect passphrase', async () => {
            const envelope = await encryptJson({ test: true }, 'correct');
            const result = await verifyPassphrase(envelope, 'incorrect');
            expect(result).toBe(false);
        });
    });
});

