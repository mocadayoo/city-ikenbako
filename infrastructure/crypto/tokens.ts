import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const VIEW_PROOF_VERSION = 1;

export function createOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function getViewNonceSecret(): string {
  const secret = process.env.VIEW_NONCE_SECRET;
  if (!secret) throw new Error("VIEW_NONCE_SECRET is required");
  return secret;
}

export function createViewNonce(opinionId: string, accountId: string, ttlSeconds = 300): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${opinionId}.${accountId}.${expiresAt}.${nonce}`;
  const signature = createHmac("sha256", getViewNonceSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyViewNonce(token: string, opinionId: string, accountId: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 5) return false;

  const [tokenOpinionId, tokenAccountId, expiresAt, nonce, signature] = parts;
  if (tokenOpinionId !== opinionId || tokenAccountId !== accountId || !nonce) return false;
  if (!Number.isInteger(Number(expiresAt)) || Number(expiresAt) < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = parts.slice(0, 4).join(".");
  const expected = createHmac("sha256", getViewNonceSecret()).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function createViewProofPayload(
  opinionId: string,
  accountId: string,
  occurredAt: Date,
  proofVersion = VIEW_PROOF_VERSION,
): string {
  return ["view-proof", proofVersion, opinionId, accountId, occurredAt.toISOString()].join("|");
}

export function createViewProof(
  opinionId: string,
  accountId: string,
  occurredAt: Date,
  proofVersion = VIEW_PROOF_VERSION,
): string {
  const payload = createViewProofPayload(opinionId, accountId, occurredAt, proofVersion);
  return createHmac("sha256", getViewNonceSecret()).update(payload).digest("base64url");
}

export function verifyViewProof(input: {
  opinionId: string;
  accountId: string;
  occurredAt: Date;
  signature: string;
  proofVersion: number | null;
}): boolean {
  if (input.proofVersion !== VIEW_PROOF_VERSION || Number.isNaN(input.occurredAt.getTime())) {
    return false;
  }

  const expected = createViewProof(
    input.opinionId,
    input.accountId,
    input.occurredAt,
    input.proofVersion,
  );
  const actualBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
