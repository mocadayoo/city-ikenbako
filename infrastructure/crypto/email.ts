import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEmailKey(): Buffer {
  const encoded = process.env.OPINION_EMAIL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("OPINION_EMAIL_ENCRYPTION_KEY is required");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("OPINION_EMAIL_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

export function encryptEmail(email: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEmailKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(email, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((value) => value.toString("base64url")).join(".");
}

export function decryptEmail(value: string): string {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Invalid encrypted email");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEmailKey(),
    Buffer.from(ivEncoded, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
