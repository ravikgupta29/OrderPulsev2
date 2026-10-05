import 'vitest';
import type { AxeMatchers } from 'vitest-axe/dist/matchers.js';

declare module 'vitest' {
  interface Assertion extends AxeMatchers {
    toHaveNoViolations: AxeMatchers['toHaveNoViolations'];
  }
}
