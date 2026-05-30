/**
 * HTML to PDF Converter for AI Client Hunter Documents
 * 
 * Usage: node generate-pdfs.js
 * 
 * Requires: puppeteer-core (npm install puppeteer-core)
 * Requires: Google Chrome installed at standard path
 */

const fs = require('fs');
const path = require('path');

// Try to require puppeteer-core
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch (e) {
  console.error('\n❌ puppeteer-core is not installed.');
  console.error('   Run: npm install puppeteer-core\n');
  process.exit(1);
}

// Common Chrome paths on Windows
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Chromium\\Application\\chrome.exe',
];

const DOCS_DIR = path.resolve(__dirname);
const HTML_FILES = [
  { input: 'technical-deep-dive.html', output: 'technical-deep-dive.pdf' },
  { input: 'product-overview-guide.html', output: 'product-overview-guide.pdf' },
  { input: 'ai-financial-success-guide.html', output: 'ai-financial-success-guide.pdf' },
];

async function findChrome() {
  for (const chromePath of CHROME_PATHS) {
    if (fs.existsSync(chromePath)) {
      console.log(`  ✓ Found Chrome at: ${chromePath}`);
      return chromePath;
    }
  }
  return null;
}

async function convertToPdf(browser, htmlFile, pdfFile) {
  const htmlPath = path.join(DOCS_DIR, htmlFile);
  const pdfPath = path.join(DOCS_DIR, pdfFile);
  
  if (!fs.existsSync(htmlPath)) {
    console.error(`  ✗ File not found: ${htmlFile}`);
    return false;
  }
  
  const page = await browser.newPage();
  
  // Read the HTML file and set content
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
  
  // Generate PDF
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
    preferCSSPageSize: true,
  });
  
  await page.close();
  
  const stats = fs.statSync(pdfPath);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`  ✓ Generated: ${pdfFile} (${sizeKB} KB)`);
  
  return true;
}

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  AI Client Hunter — PDF Generator');
  console.log('═══════════════════════════════════════\n');
  
  // Find Chrome
  console.log('🔍 Looking for Chrome...');
  const chromePath = await findChrome();
  if (!chromePath) {
    console.error('\n❌ Google Chrome not found.');
    console.error('   Please install Chrome or specify the path manually.\n');
    process.exit(1);
  }
  
  // Launch browser
  console.log('\n🚀 Launching headless Chrome...');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    console.error(`\n❌ Failed to launch Chrome: ${err.message}\n`);
    process.exit(1);
  }
  
  console.log('');
  
  // Convert each HTML file
  let successCount = 0;
  for (const { input, output } of HTML_FILES) {
    const ok = await convertToPdf(browser, input, output);
    if (ok) successCount++;
  }
  
  // Close browser
  await browser.close();
  
  console.log(`\n✅ Done! ${successCount}/${HTML_FILES.length} PDFs generated.`);
  console.log(`   📁 Output folder: ${DOCS_DIR}\n`);
  
  if (successCount === 0) {
    console.log('   Tip: You can also open the HTML files in Chrome and press');
    console.log('   Ctrl+P → "Save as PDF" for the same result.\n');
  }
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
});
