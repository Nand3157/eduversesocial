import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENCRYPTION_KEY } from "@/lib/meta-config";

// The key material is derived once and reused: ENCRYPTION_KEY is a server
// constant, so re-hashing it on every call only wastes cycles.
let derivedKey: Buffer | undefined;
function key() {
  if (!derivedKey) {
    if (!ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY_NOT_CONFIGURED");
    derivedKey = createHash("sha256").update(ENCRYPTION_KEY).digest();
  }
  return derivedKey;
}
export function encrypt(value: string) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`; }
export function decrypt(value: string) { const [iv, tag, ciphertext] = value.split("."); const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8"); }
