/**
 * IMEI Validation & Luhn Algorithm Check (Week 2 Spike B)
 * 
 * An IMEI is a 15-digit decimal string. The first 14 digits represent the
 * Type Allocation Code (TAC) and serial number. The 15th digit is a mandatory
 * check digit calculated via the Luhn formula (mod 10).
 */

/**
 * Validates whether a 15-digit string is a mathematically valid IMEI using the Luhn formula.
 */
export function isValidIMEI(imei: string): boolean {
  const cleaned = imei.trim().replace(/\D/g, "");
  if (cleaned.length !== 15) return false;

  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(cleaned[i], 10);
    // Double every second digit starting from index 1 (second digit)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }
    sum += digit;
  }

  return sum % 10 === 0;
}

/**
 * Computes the 15th Luhn check digit for a 14-digit partial IMEI.
 */
export function calculateIMEICheckDigit(partial14: string): number {
  const cleaned = partial14.trim().replace(/\D/g, "");
  if (cleaned.length !== 14) {
    throw new Error("Partial IMEI must be exactly 14 numeric digits");
  }

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit = Math.floor(digit / 10) + (digit % 10);
      }
    }
    sum += digit;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Formats a 15-digit IMEI with standard grouping spaces for readable display:
 * Example: 864501041234567 -> 864501 04 123456 7
 */
export function formatIMEI(imei: string): string {
  const digits = imei.replace(/\D/g, "");
  if (digits.length !== 15) return imei;
  return `${digits.slice(0, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 14)} ${digits.slice(14)}`;
}
