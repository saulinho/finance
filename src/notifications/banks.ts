/**
 * Predefined Brazilian financial-institution apps and their Android package names.
 * Package names are best-effort and can vary by app version/region — the Config
 * screen also lets the user add a custom package manually.
 */
export type BankApp = {
  package: string;
  label: string;
};

export const KNOWN_BANKS: BankApp[] = [
  { package: 'com.nu.production', label: 'Nubank' },
  { package: 'com.itau', label: 'Itaú' },
  { package: 'com.bradesco', label: 'Bradesco' },
  { package: 'br.com.bb.android', label: 'Banco do Brasil' },
  { package: 'br.com.gabba.Caixa', label: 'Caixa' },
  { package: 'com.santander.app', label: 'Santander' },
  { package: 'br.com.intermedium', label: 'Inter' },
  { package: 'com.c6bank.app', label: 'C6 Bank' },
  { package: 'com.picpay', label: 'PicPay' },
  { package: 'com.mercadopago.wallet', label: 'Mercado Pago' },
  { package: 'br.com.neon', label: 'Neon' },
  { package: 'br.com.original.bank', label: 'Banco Original' },
];
