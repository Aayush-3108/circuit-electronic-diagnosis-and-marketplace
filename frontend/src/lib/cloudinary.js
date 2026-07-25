/**
 * Cloudinary unsigned upload (free tier: 25GB storage, 25GB bandwidth/month,
 * no credit card required).
 *
 * Used instead of Firebase Storage because Firebase now requires the paid
 * Blaze plan for Cloud Storage (changed Feb 2026), which conflicts with the
 * ₹0 budget constraint for this project.
 *
 * Setup:
 * 1. Sign up free at https://cloudinary.com/users/register/free
 * 2. Dashboard -> note your "Cloud name"
 * 3. Settings (gear) -> Upload -> Upload presets -> Add upload preset
 *    -> Signing Mode: Unsigned -> Save -> note the preset name
 * 4. Put both into frontend/.env:
 *      VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *      VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Uploads a single image file to Cloudinary and returns its public secure_url.
 * The backend never touches raw image bytes -- it only ever stores this URL.
 */
export async function uploadListingImage(file) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary is not configured yet (see .env.example).');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'circuit-listings');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || 'Image upload failed.');
  }

  const data = await res.json();
  return data.secure_url;
}
