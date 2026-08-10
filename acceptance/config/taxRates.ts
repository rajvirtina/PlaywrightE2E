/**
 * Tax calculation configuration.
 *
 * Tax rate per item is supplied directly in transaction.json as "taxRate" (e.g. 8 or 10).
 *
 * ── TAX_ROUNDING_MODE ────────────────────────────────────────────────────────
 * Change the value below to match the POS system rounding setting:
 *
 *   'upwards'  : always round up   (Math.ceil)   e.g. 11.04 → 12
 *   'downwards': always round down (Math.floor)  e.g. 11.99 → 11
 *   'standard' : round half-up     (Math.round)  e.g. 11.45 → 11, 11.60 → 12
 */

export type TaxRoundingMode = 'upwards' | 'downwards' | 'standard';

// ── Edit this line to select the rounding method ─────────────────────────────
export const TAX_ROUNDING_MODE: TaxRoundingMode = 'upwards';

/**
 * Calculate the tax amount for a pre-tax item price.
 *
 * @param itemPrice - pre-tax price of the item
 * @param taxRate   - tax rate as a percentage number (e.g. 8 for 8%, 10 for 10%)
 */
export function deriveTaxValue(itemPrice: number, taxRate: number): number {
  const rawTax = itemPrice * taxRate / 100;
  switch (TAX_ROUNDING_MODE) {
    case 'upwards':   return Math.ceil(rawTax);
    case 'downwards': return Math.floor(rawTax);
    case 'standard':  return Math.round(rawTax);
  }
}
