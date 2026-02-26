import { scryptAsync } from "@noble/hashes/scrypt.js";

const FAST_HASH_PREFIX = "tc-fast-v1";
const DEFAULT_ITERATIONS = 6000;
const DEFAULT_DK_LEN = 32;

type FastPasswordOptions = {
  iterations?: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    return new Uint8Array();
  }

  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    if (!Number.isFinite(byte)) {
      return new Uint8Array();
    }
    out[i / 2] = byte;
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

async function derivePbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const saltBytes = new Uint8Array(salt.length);
  saltBytes.set(salt);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFKC")),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes.buffer,
      iterations,
    },
    keyMaterial,
    DEFAULT_DK_LEN * 8,
  );

  return new Uint8Array(bits);
}

function parseFastHash(hash: string): { iterations: number; salt: Uint8Array; key: Uint8Array } | null {
  const [prefix, iterationsText, saltText, keyText] = hash.split("$");
  if (prefix !== FAST_HASH_PREFIX || !iterationsText || !saltText || !keyText) {
    return null;
  }

  const iterations = Number.parseInt(iterationsText, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return null;
  }

  try {
    return {
      iterations,
      salt: base64UrlToBytes(saltText),
      key: base64UrlToBytes(keyText),
    };
  } catch {
    return null;
  }
}

function isLikelyLegacyScryptHash(hash: string): boolean {
  if (hash.startsWith(`${FAST_HASH_PREFIX}$`)) {
    return false;
  }

  const [salt, key] = hash.split(":");
  return Boolean(salt && key);
}

async function verifyLegacyScrypt(hash: string, password: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key) {
    return false;
  }

  const expectedKey = hexToBytes(key);
  if (expectedKey.length === 0) {
    return false;
  }

  const derived = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 16384 * 16 * 2,
  });

  return constantTimeEqual(derived, expectedKey);
}

export function createPasswordHasher(options: FastPasswordOptions = {}) {
  const iterations = Math.max(1, Math.floor(options.iterations ?? DEFAULT_ITERATIONS));

  return {
    hash: async (password: string): Promise<string> => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await derivePbkdf2(password, salt, iterations);
      return `${FAST_HASH_PREFIX}$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(key)}`;
    },
    verify: async ({ hash, password }: { hash: string; password: string }): Promise<boolean> => {
      const parsedFastHash = parseFastHash(hash);
      if (parsedFastHash) {
        const derived = await derivePbkdf2(password, parsedFastHash.salt, parsedFastHash.iterations);
        return constantTimeEqual(derived, parsedFastHash.key);
      }

      if (isLikelyLegacyScryptHash(hash)) {
        return verifyLegacyScrypt(hash, password);
      }

      return false;
    },
  };
}
