
/* ==========================================
   CUTX PDF - PDF ENGINE
   File: pdf-engine.js
   ========================================== */

(function CutXPDFEngine() {
    "use strict";

    // Keep variables private to avoid global naming conflicts.
    const filePicker = document.getElementById("filePicker");
    const processBtn = document.getElementById("processBtn");
    const statusBox = document.getElementById("status");

    let selectedFiles = [];

    /* ---------- STATUS MESSAGE ---------- */

    function showStatus(message, type = "info") {
        if (!statusBox) {
            console.log(`[CutX PDF ${type}] ${message}`);
            return;
        }

        statusBox.textContent = message;
        statusBox.className = `status ${type}`;
        statusBox.setAttribute("role", "status");
        statusBox.setAttribute("aria-live", "polite");
    }

    /* ---------- DOWNLOAD HELPER ---------- */

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    /* ---------- PDF LIBRARY ---------- */

    function getPDFLib() {
        if (window.PDFLib?.PDFDocument) {
            return window.PDFLib;
        }

        throw new Error(
            "The PDF library could not be found. Check your internet connection and reload CutX PDF."
        );
    }

    /* ---------- ZIP LIBRARY ---------- */

    function getJSZip() {
        if (window.JSZip) {
            return window.JSZip;
        }

        throw new Error(
            "The ZIP library could not be found. Reload the page and try again."
        );
    }

    /* ---------- VALIDATE PDF FILES ---------- */

    function validatePDF(file) {
        return Boolean(
            file &&
            (
                file.type === "application/pdf" ||
                /\.pdf$/i.test(file.name)
            )
        );
    }

    /* ---------- FILE SELECTION ---------- */

    if (filePicker) {
        filePicker.addEventListener("change", function (event) {
            const files = Array.from(event.target.files || []);

            if (files.length === 0) {
                selectedFiles = [];
                showStatus("Please select PDF files.", "error");
                return;
            }

            const invalidFiles = files.filter(file => !validatePDF(file));

            if (invalidFiles.length > 0) {
                selectedFiles = [];
                filePicker.value = "";

                showStatus(
                    "Some selected files are not PDFs. Please select valid PDF files only.",
                    "error"
                );
                return;
            }

            selectedFiles = files;

            showStatus(
                `${selectedFiles.length} PDF file(s) selected successfully.`,
                "success"
            );
        });
    } else {
        console.warn('CutX PDF: Element "#filePicker" was not found.');
    }

    /* ---------- MERGE PDFs ---------- */

    async function mergePDFs(files) {
        if (!files || files.length < 2) {
            throw new Error("Select at least two PDF files to merge.");
        }

        const { PDFDocument } = getPDFLib();
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFDocument.load(bytes);

            const pages = await mergedPdf.copyPages(
                pdf,
                pdf.getPageIndices()
            );

            pages.forEach(page => mergedPdf.addPage(page));
        }

        return mergedPdf.save();
    }

    /* ---------- SPLIT PDF ---------- */

    async function splitPDF(file) {
        if (!file || !validatePDF(file)) {
            throw new Error("Please select a valid PDF file.");
        }

        const { PDFDocument } = getPDFLib();
        const bytes = await file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(bytes);
        const results = [];

        for (let i = 0; i < sourcePdf.getPageCount(); i++) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(sourcePdf, [i]);

            newPdf.addPage(page);

            results.push({
                filename: `cutx-pdf-page-${i + 1}.pdf`,
                bytes: await newPdf.save()
            });
        }

        if (results.length === 0) {
            throw new Error("No pages were found in this PDF.");
        }

        return results;
    }

    /* ---------- COMPRESS / RESAVE PDF ---------- */

    async function compressPDF(file) {
        if (!file || !validatePDF(file)) {
            throw new Error("Please select a valid PDF file.");
        }

        const { PDFDocument } = getPDFLib();
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);

        // Re-saving does not guarantee that the PDF will become smaller.
        return pdf.save({ useObjectStreams: true });
    }

    /* ---------- PROCESS BUTTON ---------- */

    if (processBtn) {
        processBtn.addEventListener("click", async function () {
            if (selectedFiles.length === 0) {
                showStatus(
                    "Please select your PDF file(s) first.",
                    "error"
                );
                return;
            }

            const originalText = processBtn.textContent;

            processBtn.disabled = true;
            processBtn.textContent = "Processing...";

            try {
                showStatus(
                    "Processing your PDF securely in your browser...",
                    "info"
                );

                const toolName = (
                    document.body.dataset.tool || "merge"
                ).toLowerCase();

                if (toolName === "merge") {
                    const mergedBytes = await mergePDFs(selectedFiles);

                    downloadBlob(
                        new Blob([mergedBytes], {
                            type: "application/pdf"
                        }),
                        "cutx-pdf-merged.pdf"
                    );

                    showStatus(
                        "Success! Your merged PDF is ready to download.",
                        "success"
                    );

                } else if (toolName === "compress") {
                    if (selectedFiles.length !== 1) {
                        throw new Error(
                            "Select exactly one PDF to compress."
                        );
                    }

                    const originalSize = selectedFiles[0].size;
                    const bytes = await compressPDF(selectedFiles[0]);

                    downloadBlob(
                        new Blob([bytes], {
                            type: "application/pdf"
                        }),
                        "cutx-pdf-compressed.pdf"
                    );

                    const resultSize = bytes.length;
                    const before = formatSize(originalSize);
                    const after = formatSize(resultSize);

                    if (resultSize < originalSize) {
                        showStatus(
                            `PDF processed successfully. File size: ${before} → ${after}.`,
                            "success"
                        );
                    } else {
                        showStatus(
                            `PDF re-saved successfully (${after}), but the file did not become smaller. This tool currently re-saves the PDF rather than applying image compression.`,
                            "info"
                        );
                    }

                } else if (toolName === "split") {
                    if (selectedFiles.length !== 1) {
                        throw new Error(
                            "Select exactly one PDF to split."
                        );
                    }

                    const pages = await splitPDF(selectedFiles[0]);
                    const JSZip = getJSZip();
                    const zip = new JSZip();

                    for (const page of pages) {
                        zip.file(page.filename, page.bytes);
                    }

                    const zipBlob = await zip.generateAsync({
                        type: "blob"
                    });

                    const baseName = selectedFiles[0].name
                        .replace(/\.pdf$/i, "")
                        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

                    downloadBlob(
                        zipBlob,
                        `${baseName || "document"}-cutx-split.zip`
                    );

                    showStatus(
                        `Success! ${pages.length} page PDF(s) are ready in your ZIP download.`,
                        "success"
                    );

                } else {
                    throw new Error(
                        `The "${toolName}" tool is not implemented in this PDF engine yet.`
                    );
                }

            } catch (error) {
                console.error("CutX PDF error:", error);

                showStatus(
                    error.message ||
                    "Something went wrong. Please check the PDF and try again.",
                    "error"
                );

            } finally {
                processBtn.disabled = false;
                processBtn.textContent = originalText || "Process PDF";
            }
        });
    } else {
        console.warn('CutX PDF: Element "#processBtn" was not found.');
    }

    /* ---------- FILE SIZE FORMAT ---------- */

    function formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1048576) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / 1048576).toFixed(2)} MB`;
    }

    /* ---------- INITIALIZATION ---------- */

    showStatus(
        "CutX PDF is ready. Select your PDF to begin.",
        "info"
    );

})();
