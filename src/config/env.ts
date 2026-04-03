const required = (name: string): string => {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
};

const paystackKey = (): string => {
  // Some environments mask variables named PAYSTACK_SECRET to "...".
  // Support a safer alias while remaining backward-compatible.
  const alias = process.env.AJOPAY_PAYSTACK_KEY?.trim();
  if (alias) return alias;
  return required("PAYSTACK_SECRET");
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
    return paystackKey();
  },
  /** Required when calling Paystack-backed wallet endpoints */
  paystackSecret: () => paystackKey(),
  paystackWebhookSecret: () =>
    process.env.PAYSTACK_WEBHOOK_SECRET?.trim() || paystackKey(),
  corsOrigin: (() => {
    const v = process.env.CORS_ORIGIN?.trim();
    if (v) return v;
    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new Error("CORS_ORIGIN must be set in production");
    }
    return "*";
  })(),
};
