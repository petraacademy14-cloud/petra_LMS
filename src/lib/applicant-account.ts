import { randomBytes } from "node:crypto";

export function generateTemporaryApplicantPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(9);
  const randomPart = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `Petra!${bytes[0] % 10}${randomPart}`;
}
