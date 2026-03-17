const db = require('../config/database');

// Generate unique QR code number
const generateQRCodeNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `VSC${timestamp}${random}`.substring(0, 20);
};

// Generate full QR scanner path/URL and QR code image
const generateQRCodePath = (baseUrl, qrCodeNumber) => {
  const qrCodePath = `${baseUrl}/products/qrcode/${qrCodeNumber}`;
  
  // Generate QR code image URL using QR Server API
  const encodedUrl = encodeURIComponent(qrCodePath);
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
  
  return {
    qrCodeNumber: qrCodeNumber,
    qrCodePath: qrCodePath,
    qrCodeImageUrl: qrCodeImageUrl
  };
};

async function generateQRCodesForExistingProducts() {
  try {
    console.log('Starting QR code generation for existing products...');
    
    // Get base URL from environment or use default
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Get all products without QR codes (check for null, empty string, or old barcode column data)
    const products = await db('products')
      .where(function() {
        this.whereNull('qr_code')
            .orWhere('qr_code', '')
            .orWhere('qr_code', 'like', '%barcode%'); // Also update old barcode paths
      });
    
    if (products.length === 0) {
      console.log('No products found without QR codes.');
      return;
    }
    
    console.log(`Found ${products.length} products without QR codes.`);
    
    for (const product of products) {
      // Generate unique QR code
      let qrCodeData = generateQRCodePath(baseUrl, generateQRCodeNumber());
      let existingQRCode = await db('products')
        .where('qr_code', 'like', `%${qrCodeData.qrCodeNumber}%`)
        .where('id', '!=', product.id)
        .first();
      
      // Ensure QR code is unique
      while (existingQRCode) {
        qrCodeData = generateQRCodePath(baseUrl, generateQRCodeNumber());
        existingQRCode = await db('products')
          .where('qr_code', 'like', `%${qrCodeData.qrCodeNumber}%`)
          .where('id', '!=', product.id)
          .first();
      }
      
      // Update product with QR code
      await db('products')
        .where({ id: product.id })
        .update({
          qr_code: qrCodeData.qrCodePath,
          qr_code_image: qrCodeData.qrCodeImageUrl,
          updated_at: new Date()
        });
      
      console.log(`✓ Generated QR code for product #${product.id}: ${product.title}`);
    }
    
    console.log(`\n✅ Successfully generated QR codes for ${products.length} products!`);
    process.exit(0);
  } catch (error) {
    console.error('Error generating QR codes:', error);
    process.exit(1);
  }
}

// Run the script
generateQRCodesForExistingProducts();

