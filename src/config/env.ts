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

const resolveCorsOrigin = (): string => {
  const explicit = process.env.CORS_ORIGIN?.trim();
  if (explicit) return explicit;

  // Render commonly exposes this service URL automatically.
  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderUrl) return renderUrl;

  // Optional aliases some deployments use.
  const frontendUrl = process.env.FRONTEND_URL?.trim();
  if (frontendUrl) return frontendUrl;

  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production") {
    throw new Error(
      "Set CORS_ORIGIN (or FRONTEND_URL). On Render you can also rely on RENDER_EXTERNAL_URL if available."
    );
  }

  return "*";
};

export const env = {
  // MVP runs in "test" mode by default (NOT production) unless explicitly set.
  // This prevents production-only fallbacks (e.g., CORS) from being triggered silently.
  nodeEnv: process.env.NODE_ENV ?? "test",
  port: Number(process.env.PORT) || 3001,
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
  twilioAccountSid: () => required("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: () => required("TWILIO_AUTH_TOKEN"),
  twilioFromNumber: () => required("TWILIO_FROM_NUMBER"),
  twilioConfigured: () =>
    Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM_NUMBER?.trim()
    ),
  corsOrigin: resolveCorsOrigin(),
};
