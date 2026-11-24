import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage, isConfigured } from '../lib/cloudinary.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// Lets the UI show a "connect Cloudinary" hint instead of failing on upload.
router.get('/status', requireAuth, (req, res) => {
  res.json({ configured: isConfigured() });
});

// Body: { image: "<base64 data URI>", folder?, filename? }  ->  { url }
// On success the image is also cataloged in media_assets so it shows up in the Media Library.
router.post('/image', requireAuth, async (req, res) => {
  if (!isConfigured()) {
    return res.status(400).json({ error: 'Cloudinary is not configured in server/.env' });
  }
  const { image, folder, filename } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  try {
    const uploaded = await uploadImage(image, folder || 'saint-roman');

    // Catalog it. A failure to record shouldn't fail the upload itself — the URL is already valid.
    const { error } = await supabaseAdmin.from('media_assets').insert({
      url: uploaded.url,
      public_id: uploaded.public_id,
      original_filename: filename || null,
      folder: folder || 'saint-roman',
      format: uploaded.format,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      uploaded_by: req.user?.email || null,
    });
    if (error) console.error('[upload] media_assets insert failed:', error.message);

    res.json({ url: uploaded.url });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
