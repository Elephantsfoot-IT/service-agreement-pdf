// zip -r ../service-agreement-pdf.zip .
const dotenv = require("dotenv");
const path = require("path");
const { renderPdfFromHtmlFile } = require("./renderPdf");
const { uploadPdfAndGetUrl } = require("./s3Upload");


exports.handler = async (event) => {
  dotenv.config();
  try {
    const htmlPath = path.resolve(__dirname, "service-agreement.html");
    const pdfBuffer = await renderPdfFromHtmlFile(htmlPath, event.data);
    const result = await uploadPdfAndGetUrl(pdfBuffer);
    return {
      statusCode: 200,
      result : result.presignedUrl
    };
  } catch (error) {
    console.error("PDF generation/upload error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};


