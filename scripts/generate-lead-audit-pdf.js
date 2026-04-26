/**
 * Generate PDF for Lead Module Audit Report
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  const htmlPath = path.resolve(__dirname, '../docs/LEAD_MODULE_AUDIT.html');
  const pdfPath = path.resolve(__dirname, '../docs/LEAD_MODULE_AUDIT.pdf');

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

  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', bottom: '12mm', left: '10mm', right: '10mm' },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8px;color:#999;width:100%;text-align:center;padding:0 10mm;font-family:Arial;">
      CodeBegun LMS — Lead Module Audit Report · Confidential
    </div>`,
    footerTemplate: `<div style="font-size:8px;color:#999;width:100%;text-align:center;padding:0 10mm;font-family:Arial;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;·&nbsp; April 26, 2026
    </div>`,
  });

  await browser.close();
  console.log('✅ PDF generated:', pdfPath);
}

generatePDF().catch(err => {
  console.error('❌ Error generating PDF:', err);
  process.exit(1);
});
