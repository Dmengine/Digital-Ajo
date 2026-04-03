import Joi from "joi";

// MVP avatar upload uses a data URL string to avoid multipart storage.
// In production, store files in object storage (S3/GCS) and persist only the URL.
export const uploadAvatarSchema = Joi.object({
  imageDataUrl: Joi.string()
    .trim()
    .pattern(/^data:image\/[a-zA-Z0-9+.-]+;base64,/)
    .max(2_000_000)
    .required(),
});

