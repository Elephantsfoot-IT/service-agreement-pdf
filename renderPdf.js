const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const { fillData } = require("./fillData");

async function launchBrowser() {
  const isLambda = !!process.env.AWS_EXECUTION_ENV;
  if (isLambda) {
    const chromium = require("@sparticuz/chromium");
    const puppeteer = require("puppeteer-core");
    return puppeteer.launch({
      args: [
        ...chromium.args,
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    const puppeteer = require("puppeteer");
    return puppeteer.launch({
      headless: "new",
      args: [
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
      ],
    });
  }
}


/**
 * @param {string} htmlPath  Absolute path to the HTML template
 * @param {object} data      Object to inject into {{...}} placeholders
 * @param {object} pdfOptions Puppeteer PDF options
 */
async function renderPdfFromHtmlFile(htmlPath, data = {}, pdfOptions = {}) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();

    page.on("requestfailed", r =>
      console.log("REQUEST FAILED:", r.url(), r.failure()?.errorText)
    );
    page.on("console", msg => console.log("PAGE LOG:", msg.type(), msg.text()));

    // 1) Read template
    let html = await fs.readFile(htmlPath, "utf8");

    // 2) Ensure relative assets resolve from the *original* folder
    const templateDir = path.dirname(path.resolve(htmlPath));
    const baseHref = `file://${templateDir}/`;
    if (!/<base\s+href=/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => `${m}<base href="${baseHref}">`);
    }

    // 3) Inject your data placeholders {{...}}
    html = fillData(html, data);

    // 4) Write to a temp file (Lambda: /tmp; Local: OS temp)
    const tmpDir = process.env.AWS_EXECUTION_ENV ? "/tmp" : os.tmpdir();
    const tmpHtmlPath = path.join(tmpDir, `render-${Date.now()}.html`);
    await fs.writeFile(tmpHtmlPath, html, "utf8");

    // 5) Navigate to file:// (this unlocks local resources)
    await page.goto(`file://${tmpHtmlPath}`, { waitUntil: "networkidle0" });

    // 6) Wait for fonts & images
    await page.evaluate(async () => {
      const imgPromises = Array.from(document.images)
        .map(img => (img.complete ? null : new Promise(res => (img.onload = img.onerror = res))))
        .filter(Boolean);
      await Promise.all([document.fonts?.ready, ...imgPromises].filter(Boolean));
    });

    // 7) PDF
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      ...pdfOptions,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = { renderPdfFromHtmlFile };


