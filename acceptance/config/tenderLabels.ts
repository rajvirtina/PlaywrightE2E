/**
 * Shared mapping of JSON tender method keys → Japanese UI button text.
 *
 * Single source of truth — imported by NvposPosPage and PaymentPage.
 * Add new tender methods here; both page objects pick them up automatically.
 */
export const TENDER_LABELS: Record<string, string> = {
  cash:       '現金',
  creditCard: 'クレジットカード',
  eMoney:     '電子マネー',
  qrCode:     'QRコード',
  giftCard:   'ギフトカード',
  other:      'その他支払',
};
