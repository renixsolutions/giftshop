const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  BUG_IMAGES_BUCKET,
  S3_OBJECT_ACL
} = process.env;

const region = AWS_REGION || 'eu-north-1';

// Initialize S3 client from explicit env vars (as requested).
// If you later switch to instance roles, you can remove credentials from env.
const s3 = new S3Client({
  region,
  credentials:
    AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        }
      : undefined
});

const bucket = BUG_IMAGES_BUCKET;

function getPublicUrl(key) {
  // Works for the default S3 endpoint when objects are public.
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function extensionFromContentType(contentType) {
  const t = String(contentType || '').toLowerCase();
  if (t.includes('jpeg')) return '.jpg';
  if (t.includes('png')) return '.png';
  if (t.includes('gif')) return '.gif';
  if (t.includes('webp')) return '.webp';
  if (t.includes('mp4')) return '.mp4';
  if (t.includes('webm')) return '.webm';
  // Fallback: generic extension
  return '.bin';
}

async function uploadBufferToS3({ buffer, key, contentType }) {
  if (!bucket) {
    throw new Error('Missing BUG_IMAGES_BUCKET env var.');
  }
  if (!key) {
    throw new Error('Missing S3 object key.');
  }
  if (!buffer) {
    throw new Error('Missing buffer for S3 upload.');
  }

  const baseCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || undefined
  };

  // Default to public-read so <img>/<video> previews work with a plain S3 URL.
  // If your bucket blocks ACLs, we fall back to uploading without ACL.
  const aclToUse = typeof S3_OBJECT_ACL !== 'undefined' ? S3_OBJECT_ACL : 'public-read';
  const commandInput = aclToUse ? { ...baseCommandInput, ACL: aclToUse } : baseCommandInput;

  try {
    await s3.send(new PutObjectCommand(commandInput));
  } catch (err) {
    // Most common case: bucket owner enforced / ACLs disabled
    if (typeof S3_OBJECT_ACL === 'undefined') {
      await s3.send(new PutObjectCommand(baseCommandInput));
    } else {
      throw err;
    }
  }

  return getPublicUrl(key);
}

function parseDataUrl(dataUrl) {
  // data:<mimeType>;base64,<data>
  const match = /^data:(.*?);base64,(.*)$/.exec(String(dataUrl || ''));
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
}

module.exports = {
  uploadBufferToS3,
  parseDataUrl,
  extensionFromContentType,
  getPublicUrl,
  region,
  bucket
};

