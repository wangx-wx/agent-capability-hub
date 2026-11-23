import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const saltBytes = 16;
const keyBytes = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(saltBytes);
  const hash = scryptSync(password, salt, keyBytes);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, saltHex, hashHex] = storedHash.split(":");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
