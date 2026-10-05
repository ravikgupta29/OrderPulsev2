import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Used by Vitest integration tests. */
export const server = setupServer(...handlers);
