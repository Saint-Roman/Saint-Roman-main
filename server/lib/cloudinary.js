// Thin wrapper around Cloudinary image upload.
// Credentials come from server/.env (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
// CLOUDINARY_API_SECRET). The API secret never leaves the server — the admin frontend sends the
// image (base64 data URI) to our own /api/upload/image, and the server does the Cloudinary call.

import { v2 as cloudinary } from 'cloudinary';

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function isConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

// Accepts a base64 data URI (e.g. "data:image/png;base64,....") or a remote URL.
// Returns the uploaded image's hosted URL plus metadata (used to catalog it in media_assets).
export async function uploadImage(dataUri, folder = 'saint-roman') {
  if (!isConfigured()) throw new Error('Cloudinary is not configured in server/.env');
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
  });
  return {
    url: result.secure_url,
    public_id: result.public_id,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

// Permanently removes an image from Cloudinary by its public_id.
export async function destroyImage(publicId) {
  if (!isConfigured()) throw new Error('Cloudinary is not configured in server/.env');
  return cloudinary.uploader.destroy(publicId);
}
