import crypto from "crypto";

export const verifyPaystackSignature = (
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string
): boolean => {
  if (!rawBody?.length || !signatureHeader) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
};
