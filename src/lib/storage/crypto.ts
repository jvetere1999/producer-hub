/**
 * Crypto Utilities for Vault Encryption
 *
 * Implements PBKDF2 key derivation and AES-GCM encryption.
 * Never stores passphrases - only derived key material.
 */

import type { KDFParams, VaultEnvelope } from './vaultTypes';
import { DEFAULT_KDF_PARAMS } from './vaultTypes';

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(length: number = 32): Uint8Array {
    const salt = new Uint8Array(length);
    crypto.getRandomValues(salt);
    return salt;
}

/**
 * Generate a random IV for AES-GCM
 */
export function generateIV(): Uint8Array {
    const iv = new Uint8Array(12); // 96 bits for AES-GCM
    crypto.getRandomValues(iv);
    return iv;
}

/**
 * Convert Uint8Array to Base64 string
 */
export function toBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
}

/**
 * Convert Base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Derive an AES-GCM key from passphrase using PBKDF2
 */
export async function deriveKey(
    passphrase: string,
    salt: Uint8Array,
    iterations: number = DEFAULT_KDF_PARAMS.iterations
): Promise<CryptoKey> {
    // Import passphrase as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES-GCM key
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt JSON data and return a vault envelope
 */
export async function encryptJson<T>(
    data: T,
    passphrase: string
): Promise<VaultEnvelope> {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(passphrase, salt);

    // Encode data as JSON
    const plaintext = new TextEncoder().encode(JSON.stringify(data));

    // Encrypt with AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintext
    );

    // AES-GCM appends the auth tag to the ciphertext
    // We'll store them together for simplicity
    const ciphertextArray = new Uint8Array(ciphertext);

    return {
        version: 1,
        kdf: {
            ...DEFAULT_KDF_PARAMS,
            salt: toBase64(salt)
        },
        iv: toBase64(iv),
        ciphertext: toBase64(ciphertextArray),
        tag: '' // AES-GCM tag is included in ciphertext
    };
}

/**
 * Decrypt a vault envelope and return the JSON data
 */
export async function decryptJson<T>(
    envelope: VaultEnvelope,
    passphrase: string
): Promise<T> {
    const salt = fromBase64(envelope.kdf.salt);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.ciphertext);

    const key = await deriveKey(passphrase, salt, envelope.kdf.iterations);

    // Decrypt with AES-GCM
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    // Decode JSON
    const text = new TextDecoder().decode(plaintext);
    return JSON.parse(text) as T;
}

/**
 * Compute SHA256 hash of data
 */
export async function sha256(data: ArrayBuffer | string): Promise<string> {
    const buffer = typeof data === 'string'
        ? new TextEncoder().encode(data)
        : data;

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a passphrase against a stored envelope
 * Returns true if passphrase can decrypt the envelope
 */
export async function verifyPassphrase(
    envelope: VaultEnvelope,
    passphrase: string
): Promise<boolean> {
    try {
        await decryptJson(envelope, passphrase);
        return true;
    } catch {
        return false;
    }
}

