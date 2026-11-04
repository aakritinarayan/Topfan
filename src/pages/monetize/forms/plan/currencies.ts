/** Item Currency Adjustments rows, captured for a $20.00 base price (aj-white-subscriptions pack, 16-currency-table). Mock data: no rates are fetched. */
const RAW = `
USD|US Dollars|$|20.00|$20.00
EUR|Euros|€|18.00|$20.00
JPY|Japanese Yen|¥|3203.00|$20.00
GBP|British Pound Sterlings|£|15.00|$20.00
CNY|Chinese Yuan|¥|135.00|$20.03
AUD|Australian Dollars|A$|29.00|$20.00
CAD|Canadian Dollars|C$|28.00|$19.86
CHF|Swiss Francs|CHF|17.00|$20.48
HKD|Hong Kong Dollars|HK$|159.00|$20.05
SGD|Singapore Dollars|S$|26.00|$20.16
INR|Indian Rupees|₹|1915.00|$20.00
KRW|South Korean Won|₩|27172.00|$20.00
SEK|Swedish Kronor|kr|197.00|$19.96
MXN|Mexican Pesos|MX$|380.00|$19.99
NZD|New Zealand Dollars|NZ$|36.00|$19.89
NOK|Norwegian Kroner|kr|187.00|$19.96
TWD|New Taiwan Dollars|NT$|662.00|$20.01
BRL|Brazilian Reais|R$|111.00|$20.04
ZAR|South African Rand|R|336.00|$20.02
PLN|Polish Złoty|zł|80.00|$20.10
DKK|Danish Kroner|kr|135.00|$20.06
IDR|Indonesian Rupiah|Rp|366325.00|$20.00
TRY|Turkish Lira|₺|1011.00|$20.01
THB|Thai Baht|฿|682.00|$20.01
ILS|Israeli New Shekels|₪|64.00|$20.00
HUF|Hungarian Forints|Ft|6568.00|$20.00
CZK|Czech Koruna|Kč|439.00|$20.02
CLP|Chilean Pesos|$|19828.00|$20.00
PHP|Philippine Pesos|₱|1283.00|$20.00
COP|Colombian Pesos|$|65584.00|$20.00
KWD|Kuwaiti Dinars|د.ك|6.00|$19.35
BHD|Bahraini Dinars|.د.ب|8.00|$21.05
OMR|Omani Rials|ر.ع.|8.00|$20.51
JOD|Jordanian Dinars|د.ا|14.00|$19.44
SAR|Saudi Riyals|ر.س|76.00|$20.05
AED|UAE Dirhams|د.إ|74.00|$19.95
QAR|Qatari Riyals|ر.ق|74.00|$20.11
RUB|Russian Rubles|₽|1645.00|$20.00
MYR|Malaysian Ringgit|RM|82.00|$19.95
VND|Vietnamese Dong|₫|520503.00|$20.00
GIP|Gibraltar Pounds|£|15.00|$20.00
KYD|Cayman Islands Dollars|$|17.00|$20.24
BND|Brunei Dollars|B$|26.00|$20.16
BGN|Bulgarian Lev|лв|35.00|$19.89
BAM|Bosnia and Herzegovina Convertible Marks|КМ|35.00|$19.77
AWG|Aruban Florins|ƒ|36.00|$19.89
BZD|Belize Dollars|BZ$|40.00|$19.80
BBD|Barbadian Dollars|Bds$|40.00|$19.90
FJD|Fijian Dollars|FJ$|45.00|$19.82
GEL|Georgian Lari|₾|52.00|$19.85
`;

export interface CurrencyRow {
  code: string;
  name: string;
  symbol: string;
  /** Adjusted displayed price for the $20.00 base. */
  price: number;
  /** Expected settlement (USD) for that price. */
  settlement: number;
}

export const CURRENCY_BASE = 20;
export const CURRENCIES: CurrencyRow[] = RAW.trim()
  .split("\n")
  .map((l) => {
    const [code, name, symbol, price, settlement] = l.split("|");
    return { code, name, symbol, price: Number(price), settlement: Number(settlement.replace("$", "")) };
  });

/** Adjusted price for another base: scaled from the captured row, rounded to a whole number (USD keeps the base). */
export const adjustedFor = (r: CurrencyRow, base: number) => (r.code === "USD" ? base : Math.round((r.price / CURRENCY_BASE) * base));
/** USD a fan's local price settles to, at the captured row's implied rate. */
export const settlementFor = (r: CurrencyRow, local: number) => (r.code === "USD" ? local : (local * r.settlement) / r.price);
