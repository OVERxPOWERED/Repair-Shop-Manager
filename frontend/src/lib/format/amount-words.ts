const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones === 0 ? TENS[tens] : `${TENS[tens]} ${ONES[ones]}`;
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(`${ONES[hundreds]} Hundred`);
  }
  if (remainder > 0) {
    parts.push(twoDigitsToWords(remainder));
  }
  return parts.join(" ");
}

/**
 * Converts a non-negative integer into words following the Indian numbering system:
 * Crores (1,00,00,000), Lakhs (1,00,000), Thousands (1,000), Hundreds (100).
 */
export function integerToIndianWords(n: number): string {
  if (n === 0) return "Zero";

  const parts: string[] = [];

  const crores = Math.floor(n / 10000000);
  let remainder = n % 10000000;

  if (crores > 0) {
    parts.push(`${integerToIndianWords(crores)} Crore`);
  }

  const lakhs = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  if (lakhs > 0) {
    parts.push(`${twoDigitsToWords(lakhs)} Lakh`);
  }

  const thousands = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (thousands > 0) {
    parts.push(`${twoDigitsToWords(thousands)} Thousand`);
  }

  if (remainder > 0) {
    parts.push(threeDigitsToWords(remainder));
  }

  return parts.join(" ");
}

/**
 * Converts integer paise into Indian English financial words.
 *
 * Example:
 * 129950 -> "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only"
 * 129900 -> "Rupees One Thousand Two Hundred Ninety Nine Only"
 * 50     -> "Fifty Paise Only"
 * 0      -> "Zero Rupees Only"
 */
export function amountInWords(paise: number): string {
  if (paise === 0) {
    return "Zero Rupees Only";
  }

  const isNegative = paise < 0;
  const absolutePaise = Math.abs(paise);
  const rupees = Math.floor(absolutePaise / 100);
  const remPaise = absolutePaise % 100;

  const parts: string[] = [];

  if (rupees > 0) {
    const rupeeLabel = rupees === 1 ? "Rupee" : "Rupees";
    parts.push(`${rupeeLabel} ${integerToIndianWords(rupees)}`);
  }

  if (remPaise > 0) {
    const paiseWords = twoDigitsToWords(remPaise);
    const paiseLabel = remPaise === 1 ? "Paisa" : "Paise";
    if (rupees > 0) {
      parts.push(`and ${paiseWords} ${paiseLabel}`);
    } else {
      parts.push(`${paiseWords} ${paiseLabel}`);
    }
  }

  parts.push("Only");

  const result = parts.join(" ");
  return isNegative ? `Minus ${result}` : result;
}
