/**
 * Generate PDF from PRODUCT_DOCUMENTATION.html using Puppeteer
 * Run: node scripts/generate-pdf-docs.js
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  const htmlPath = path.resolve(__dirname, '../docs/PRODUCT_DOCUMENTATION.html');
  const pdfPath = path.resolve(__dirname, '../docs/PRODUCT_DOCUMENTATION.pdf');

  if (!fs.existsSync(htmlPath)) {
    console.error('HTML file not found:', htmlPath);
    process.exit(1);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Load the HTML file
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  // Inject print styles: hide sidebar and nav for PDF
  await page.addStyleTag({
    content: `
      .sidebar, .top-nav { display: none !important; }
      .main { margin-left: 0 !important; margin-top: 0 !important; padding: 1.5rem !important; }
      body { font-size: 12px; }
      .hero { border-radius: 0; }
      .screenshot { display: none !important; }
      .screenshot-grid { display: none !important; }
      @page { margin: 15mm; }
    `
  });

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size:9px;color:#666;width:100%;text-align:center;padding:0 15mm;">
        LMS SaaS Platform — Product Documentation
      </div>`,
    footerTemplate: `
      <div style="font-size:9px;color:#666;width:100%;text-align:center;padding:0 15mm;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span> · Generated April 2026
      </div>`,
  });

  await browser.close();

  const stats = fs.statSync(pdfPath);
  const sizeKB = Math.round(stats.size / 1024);
  console.log(`\n✅ PDF generated successfully!`);
  console.log(`   Path: ${pdfPath}`);
  console.log(`   Size: ${sizeKB} KB`);
}

generatePDF().catch(err => {
  console.error('Error generating PDF:', err.message);
  process.exit(1);
});
