const required = (name: string): string => {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
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
    throw new Error("WEBHOOK_SECRET must be set for webhook verification");
  },
  /** Required when calling Paystack-backed wallet endpoints */
  paystackSecret: () => required("PAYSTACK_SECRET"),
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
