// Indian numbering system: Crore, Lakh, Thousand
const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitWords(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigitWords(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(ones[h] + " Hundred");
  if (r > 0) parts.push(twoDigitWords(r));
  return parts.join(" and ");
}

export function amountInWords(amount: number): string {
  if (amount === 0) return "Rupees Zero only";

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Rupees Zero only";

  const parts: string[] = [];

  // Crore (10,000,000)
  const crore = Math.floor(rupees / 10000000);
  if (crore > 0) parts.push(threeDigitWords(crore) + " Crore");

  // Lakh (100,000)
  const lakh = Math.floor((rupees % 10000000) / 100000);
  if (lakh > 0) parts.push(twoDigitWords(lakh) + " Lakh");

  // Thousand
  const thousand = Math.floor((rupees % 100000) / 1000);
  if (thousand > 0) parts.push(twoDigitWords(thousand) + " Thousand");

  // Hundred and remainder
  const remainder = rupees % 1000;
  if (remainder > 0) parts.push(threeDigitWords(remainder));

  let result = "Rupees " + parts.join(" ");

  if (paise > 0) {
    result += " and " + twoDigitWords(paise) + " Paise";
  }

  return result + " only";
}
