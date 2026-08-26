import { compare, hash } from "bcryptjs";

export const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_COST = 12;

export function isPasswordValid(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export async function hashPassword(password: string) {
  if (!isPasswordValid(password)) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!password || !passwordHash) {
    return false;
  }

  return compare(password, passwordHash);
}
