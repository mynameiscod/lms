/**
 * Render docs/MODULE_OVERVIEW.html → docs/MODULE_OVERVIEW.pdf
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generatePDF() {
  const htmlPath = path.resolve(__dirname, '../docs/MODULE_OVERVIEW.html');
  const pdfPath = path.resolve(__dirname, '../docs/MODULE_OVERVIEW.pdf');

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
    margin: { top: '0mm', bottom: '12mm', left: '0mm', right: '0mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size:8px;color:#9aa6b8;width:100%;text-align:center;padding:0 10mm;font-family:Arial;">
      Codebegun LMS — System Module Overview &nbsp;·&nbsp; Page <span class="pageNumber"></span> of <span class="totalPages"></span> &nbsp;·&nbsp; 24 Jun 2026 · Confidential
    </div>`,
  });

  await browser.close();
  const kb = (fs.statSync(pdfPath).size / 1024).toFixed(0);
  console.log(`✅ PDF generated: ${pdfPath} (${kb} KB)`);
}

generatePDF().catch(err => {
  console.error('❌ Error generating PDF:', err);
  process.exit(1);
});
