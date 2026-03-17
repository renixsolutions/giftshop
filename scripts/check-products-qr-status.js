const db = require('../config/database');

async function checkProductsQRStatus() {
  try {
    const products = await db('products').select('id', 'title', 'qr_code', 'qr_code_image');
    
    console.log(`\nTotal products in database: ${products.length}\n`);
    
    if (products.length === 0) {
      console.log('No products found in database.');
      console.log('You may need to run: npm run seed');
      return;
    }
    
    let withQRCode = 0;
    let withoutQRCode = 0;
    
    products.forEach(product => {
      if (product.qr_code && product.qr_code.trim() !== '') {
        withQRCode++;
        console.log(`✓ Product #${product.id}: "${product.title}" - Has QR Code`);
      } else {
        withoutQRCode++;
        console.log(`✗ Product #${product.id}: "${product.title}" - Missing QR Code`);
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`  Products with QR codes: ${withQRCode}`);
    console.log(`  Products without QR codes: ${withoutQRCode}`);
    
    if (withoutQRCode > 0) {
      console.log(`\nRun: npm run generate-qr to generate QR codes for missing products.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking products:', error);
    process.exit(1);
  }
}

checkProductsQRStatus();

