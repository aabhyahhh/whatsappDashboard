/**
 * Phone number utility functions for consistent E.164 handling
 */

/**
 * Normalize phone number to E.164 format
 * @param waId - WhatsApp ID (with or without + prefix)
 * @returns E.164 formatted phone number
 */
export const toE164 = (waId: string): string => {
  return waId.startsWith('+') ? waId : `+${waId}`;
};

/**
 * Generate all possible phone number variants for database queries
 * @param e164 - E.164 formatted phone number
 * @returns Array of phone number variants
 */
export const variants = (e164: string): string[] => {
  const bare = e164.startsWith('+') ? e164.slice(1) : e164;
  const last10 = bare.slice(-10);
  return [
    e164,           // +918130026321
    bare,           // 918130026321
    last10,         // 8130026321
    bare.startsWith('91') ? bare.slice(2) : bare  // 8130026321 (remove country code)
  ];
};

/**
 * Get the most common phone number formats for a given input
 * @param input - Any phone number format
 * @returns Object with different formats
 */
export const getPhoneFormats = (input: string) => {
  const e164 = toE164(input);
  const bare = e164.startsWith('+') ? e164.slice(1) : e164;
  const last10 = bare.slice(-10);
  
  return {
    e164,           // +918130026321
    bare,           // 918130026321
    last10,         // 8130026321
    variants: variants(e164)
  };
};
