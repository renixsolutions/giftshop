const multer = require('multer');
const path = require('path');

// Keep files in memory; the controller uploads buffers to S3.
const storage = multer.memoryStorage();

// File filter - allow product images + a single mp4 video
const fileFilter = (req, file, cb) => {
  const lowerOriginal = String(file.originalname || '').toLowerCase();
  const ext = path.extname(lowerOriginal);
  const mimetype = String(file.mimetype || '').toLowerCase();

  const isImage =
    ['.jpeg', '.jpg', '.png', '.gif', '.webp'].includes(ext) ||
    mimetype.startsWith('image/');

  const isMp4 = ext === '.mp4' || mimetype === 'video/mp4' || mimetype.includes('mp4');
  const isWebm = ext === '.webm' || mimetype === 'video/webm' || mimetype.includes('webm');

  if (isImage || isMp4 || isWebm) {
    return cb(null, true);
  }

  cb(
    new Error(
      'Invalid file type. Allowed: images (jpeg/jpg/png/gif/webp) and mp4 video.'
    )
  );
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    // Keep this high enough for videos; images are typically much smaller.
    fileSize: 50 * 1024 * 1024 // 50MB max per file
  },
  fileFilter: fileFilter
});

module.exports = upload;

