const required = (name: string): string => {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
};

export const env = {
  // MVP runs in "test" mode by default (NOT production) unless explicitly set.
  // This prevents production-only fallbacks (e.g., CORS) from being triggered silently.
  nodeEnv: process.env.NODE_ENV ?? "test",
  port: Number(process.env.PORT) || 3000,
  mongoUri: () => required("MONGO_URI"),
  jwtSecret: () => required("JWT_SECRET"),
  /**
   * Generic webhook secret for MVP (deposit events, etc).
   * SECURITY: webhook endpoints must be signed to prevent spoofing.
   */
  webhookSecret: () => {
    const v = process.env.WEBHOOK_SECRET?.trim();
    if (v) return v;
    const fallback = process.env.PAYSTACK_WEBHOOK_SECRET?.trim();
    if (fallback) return fallback;
    // Paystack uses the same secret key for webhook verification when PAYSTACK_WEBHOOK_SECRET isn't provided.
    return required("PAYSTACK_SECRET");
  },
  /** Required when calling Paystack-backed wallet endpoints */
  paystackSecret: () => {
    const s = required("PAYSTACK_SECRET");
    // Temporary debug: verify secret is not masked/truncated in this runtime.
    // Do NOT print the secret value; only the length.
    console.log("PAYSTACK_SECRET length:", s.length);
    return s;
  },
  paystackWebhookSecret: () =>
    process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || required("PAYSTACK_SECRET"),
  corsOrigin: (() => {
    const v = process.env.CORS_ORIGIN?.trim();
    if (v) return v;
    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new Error("CORS_ORIGIN must be set in production");
    }
    return "*";
  })(),
};
