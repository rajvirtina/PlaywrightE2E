/**
 * Pre-scaled timeout lookup for the Voyix POS test framework.
 *
 * TIMEOUT_SCALE is resolved automatically:
 *   - Windows (local dev)  → scale = 1  (fast machine, no multiplier)
 *   - Linux  (CX7 hardware) → scale = 3  (slower hardware, triple every timeout)
 *
 * Override at any time by setting TIMEOUT_SCALE in .env, e.g. TIMEOUT_SCALE=2
 *
 * Usage:
 *   import { T } from '../config/timeouts.js';
 *   await safeClick(btn, T[10000]);   // 10 000 ms on Windows, 30 000 ms on CX7
 */

const IS_HARDWARE = process.platform === 'linux';

const SCALE = process.env.TIMEOUT_SCALE !== undefined
  ? Math.max(0.1, Number(process.env.TIMEOUT_SCALE))  // explicit override wins
  : IS_HARDWARE ? 3 : 1;                               // auto-detect by platform

const s = (ms: number): number => Math.round(ms * SCALE);

export const T = {
    50:  s(50),
   100:  s(100),
   200:  s(200),
   500:  s(500),
  1000:  s(1000),
  2000:  s(2000),
  3000:  s(3000),
  5000:  s(5000),
  8000:  s(8000),
 10000:  s(10000),
 15000:  s(15000),
 20000:  s(20000),
 30000:  s(30000),
 60000:  s(60000),
} as const;

/** Scale a one-off value (for dynamic/computed timeouts). */
export const t = s;
