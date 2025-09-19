// src/shared/utils/crypto.ts

/**
 * Encrypt text using simple Caesar-like shift
 */
export function encrypt(input: string, shift: number = 9): string {
    return input
      .split("")
      .map((char) => {
        if (char >= "a" && char <= "z") {
          return String.fromCharCode(((char.charCodeAt(0) - 97 + shift) % 26) + 97);
        } else if (char >= "A" && char <= "Z") {
          return String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
        } else if (char >= "0" && char <= "9") {
          return String.fromCharCode(((char.charCodeAt(0) - 48 + shift) % 10) + 48);
        }
        return char; // keep emojis, symbols, etc.
      })
      .join("");
  }
  
  /**
   * Decrypt text using reverse shift
   */
  export function decrypt(input: string, shift: number = 9): string {
    return input
      .split("")
      .map((char) => {
        if (char >= "a" && char <= "z") {
          return String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97);
        } else if (char >= "A" && char <= "Z") {
          return String.fromCharCode(((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
        } else if (char >= "0" && char <= "9") {
          return String.fromCharCode(((char.charCodeAt(0) - 48 - shift + 10) % 10) + 48);
        }
        return char;
      })
      .join("");
  }
  