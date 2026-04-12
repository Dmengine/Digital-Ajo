import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { HttpError } from "../errors/HttpError";

let configured = false;

function ensureCloudinaryConfigured() {
  if (configured) return;
  if (!env.cloudinaryConfigured()) {
    throw new HttpError(503, "Avatar upload is unavailable. Cloudinary is not configured.");
  }
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName(),
    api_key: env.cloudinaryApiKey(),
    api_secret: env.cloudinaryApiSecret(),
  });
  configured = true;
}

export async function uploadAvatarToCloudinary(imageDataUrl: string, userId: string): Promise<string> {
  ensureCloudinaryConfigured();
  const uploaded = await cloudinary.uploader.upload(imageDataUrl, {
    folder: "ajopay/avatars",
    public_id: `user-${userId}`,
    overwrite: true,
    resource_type: "image",
  });
  if (!uploaded.secure_url) {
    throw new HttpError(502, "Cloudinary upload failed");
  }
  return uploaded.secure_url;
}
