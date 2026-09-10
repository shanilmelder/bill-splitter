import '@testing-library/jest-dom/vitest';
import { randomUUID } from 'node:crypto';

// jsdom does not always expose crypto.randomUUID, which participant ids use.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, randomUUID },
    configurable: true,
  });
}
