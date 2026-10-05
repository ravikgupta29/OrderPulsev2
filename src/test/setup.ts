import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js';
import { server } from '../mocks/server';

// vitest-axe's own side-effect `extend-expect` entry point ships empty in
// this toolchain's build, so register the matcher directly.
expect.extend({ toHaveNoViolations });


// Polyfill for libraries that call matchMedia (not implemented in jsdom).
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
