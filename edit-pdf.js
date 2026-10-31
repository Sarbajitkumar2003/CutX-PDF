
"use strict";

(() => {
  const $ = id => document.getElementById(id);

  // ==============================
  // DOM ELEMENTS
  // ==============================

  const filePicker = $("filePicker");
  const fileName = $("fileName");

  const pdfCanvas = $("pdfCanvas");
  const canvasContext = pdfCanvas.getContext("2d");

  const pageContainer = $("pageContainer");
  const textLayer = $("textLayer");
  const overlay = $("overlay");
  const emptyState = $("emptyState");

  const selectedTextInput = $("selectedText");
  const replacementTextInput = $("replacementText");
  const fontFamilyInput = $("fontFamily");
  const fontSizeInput = $("fontSize");
  const textColorInput = $("textColor");
  const coverColorInput = $("coverColor");

  const selectPdfTextBtn = $("selectPdfTextBtn");
  const replaceTextBtn = $("replaceTextBtn");
  const downloadBtn = $("downloadBtn");

  const undoBtn = $("undoBtn");
  const redoBtn = $("redoBtn");

  const prevPageBtn = $("prevPageBtn");
  const nextPageBtn = $("nextPageBtn");
  const zoomInBtn = $("zoomInBtn");
  const zoomOutBtn = $("zoomOutBtn");

  const statusMessage = $("statusMessage");

  // ==============================
  // STATE
  // ==============================

  let pdfDocument = null;
  let pdfBytes = null;

  let currentPage = 1;
  let totalPages = 0;
  let zoom = 1;

  let currentViewport = null;
  let selectedTextItem = null;

  let editingItems = [];

  let undoStack = [];
  let redoStack = [];

  let selectionMode = false;
  let rendering = false;

  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  // ==============================
  // PDF.JS CONFIGURATION
  // ==============================

  if (!window.pdfjsLib || !window.PDFLib) {
    setStatus("PDF libraries could not be loaded. Refresh the page.", "error");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  // ==============================
  // STATUS
  // ==============================

  function setStatus(message, type = "normal") {
    statusMessage.textContent = message;

    statusMessage.style.color =
      type === "error" ? "#ff7180" :
      type === "success" ? "#00e5aa" :
      "#8994aa";
  }

  // ==============================
  // BUTTON STATES
  // ==============================

  function updateButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;

    downloadBtn.disabled = !pdfDocument;
    selectPdfTextBtn.disabled = !pdfDocument;

    prevPageBtn.disabled =
      !pdfDocument || currentPage <= 1;

    nextPageBtn.disabled =
      !pdfDocument || currentPage >= totalPages;

    zoomInBtn.disabled = !pdfDocument;
    zoomOutBtn.disabled = !pdfDocument;

    replaceTextBtn.disabled =
      !selectedTextItem ||
      !replacementTextInput.value.trim();

    $("pageInfo").textContent =
      `${currentPage} / ${totalPages}`;

    $("zoomValue").textContent =
      `${Math.round(zoom * 100)}%`;
  }

  // ==============================
  // HISTORY
  // ==============================

  function saveHistory() {
    undoStack.push(JSON.stringify(editingItems));

    if (undoStack.length > 50) {
      undoStack.shift();
    }

    redoStack = [];
    updateButtons();
  }

  function undo() {
    if (!undoStack.length) return;

    redoStack.push(JSON.stringify(editingItems));

    editingItems = JSON.parse(undoStack.pop());

    clearSelection();
    renderEditingItems();
    updateButtons();
  }

  function redo() {
    if (!redoStack.length) return;

    undoStack.push(JSON.stringify(editingItems));

    editingItems = JSON.parse(redoStack.pop());

    clearSelection();
    renderEditingItems();
    updateButtons();
  }

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  function clearSelection() {
    selectedTextItem = null;

    selectedTextInput.value = "";
    replacementTextInput.value = "";

    document.querySelectorAll(".pdf-text.selected")
      .forEach(element => {
        element.classList.remove("selected");
      });

    updateButtons();
  }

  // ==============================
  // LOAD PDF
  // ==============================

  filePicker.addEventListener("change", async event => {
    const file = event.target.files[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setStatus("Please select a valid PDF file.", "error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus("File size must be below 100 MB.", "error");
      return;
    }

    try {
      setStatus("Loading PDF...");

      const buffer = await file.arrayBuffer();

      pdfBytes = new Uint8Array(buffer);

      const loadingTask = pdfjsLib.getDocument({
        data: pdfBytes.slice()
      });

      pdfDocument = await loadingTask.promise;

      totalPages = pdfDocument.numPages;
      currentPage = 1;
      zoom = 1;

      editingItems = [];
      undoStack = [];
      redoStack = [];

      selectedTextItem = null;
      selectionMode = false;

      selectedTextInput.value = "";
      replacementTextInput.value = "";

      textLayer.classList.remove("active");

      selectPdfTextBtn.textContent = "Select PDF Text";

      fileName.textContent = file.name;

      emptyState.classList.add("hidden");
      pageContainer.classList.remove("hidden");

      updateButtons();

      await renderPage();

      setStatus("PDF loaded successfully.", "success");

    } catch (error) {
      console.error(error);

      pdfDocument = null;
      pdfBytes = null;

      updateButtons();

      setStatus("Unable to load this PDF.", "error");
    }
  });

  // ==============================
  // RENDER PDF PAGE
  // ==============================

  async function renderPage() {
    if (!pdfDocument || rendering) return;

    rendering = true;

    try {
      const page = await pdfDocument.getPage(currentPage);

      currentViewport = page.getViewport({
        scale: zoom
      });

      pdfCanvas.width = Math.ceil(currentViewport.width);
      pdfCanvas.height = Math.ceil(currentViewport.height);

      pdfCanvas.style.width =
        `${currentViewport.width}px`;

      pdfCanvas.style.height =
        `${currentViewport.height}px`;

      pageContainer.style.width =
        `${currentViewport.width}px`;

      pageContainer.style.height =
        `${currentViewport.height}px`;

      textLayer.style.width =
        `${currentViewport.width}px`;

      textLayer.style.height =
        `${currentViewport.height}px`;

      overlay.style.width =
        `${currentViewport.width}px`;

      overlay.style.height =
        `${currentViewport.height}px`;

      await page.render({
        canvasContext,
        viewport: currentViewport
      }).promise;

      await renderTextLayer(page);

      renderEditingItems();

      updateButtons();

    } catch (error) {
      console.error(error);

      setStatus("Error rendering PDF page.", "error");

    } finally {
      rendering = false;
    }
  }

  // ==============================
  // PDF TEXT LAYER
  // ==============================

  async function renderTextLayer(page) {
    textLayer.innerHTML = "";

    const content = await page.getTextContent();

    content.items.forEach((item, index) => {
      if (!item.str || !item.str.trim()) return;

      const tx = pdfjsLib.Util.transform(
        currentViewport.transform,
        item.transform
      );

      const angle = Math.atan2(tx[1], tx[0]);

      const fontHeight = Math.hypot(tx[2], tx[3]);

      const span = document.createElement("span");

      span.className = "pdf-text";
      span.textContent = item.str;

      span.dataset.index = index;

      const left = tx[4];
      const top = tx[5] - fontHeight;

      span.style.position = "absolute";
      span.style.left = `${left}px`;
      span.style.top = `${top}px`;

      span.style.fontSize = `${fontHeight}px`;
      span.style.fontFamily = "sans-serif";

      span.style.transformOrigin = "left top";
      span.style.transform = `rotate(${angle}rad)`;

      span.style.height = `${fontHeight * 1.3}px`;

      span.style.width =
        `${Math.max(item.width * zoom, 5)}px`;

      span.addEventListener("click", event => {
        if (!selectionMode) return;

        event.stopPropagation();

        document.querySelectorAll(".pdf-text.selected")
          .forEach(element => {
            element.classList.remove("selected");
          });

        span.classList.add("selected");

        selectText(item, span, angle);
      });

      textLayer.appendChild(span);
    });
  }

  // ==============================
  // SELECT PDF TEXT
  // ==============================

  function selectText(item, element, angle) {
    // Rotated text needs a separate rotated replacement renderer.
    if (Math.abs(angle) > 0.02) {
      setStatus(
        "Rotated text is not supported by this replacement tool yet.",
        "error"
      );
      return;
    }

    const left = parseFloat(element.style.left);
    const top = parseFloat(element.style.top);

    const width = parseFloat(element.style.width);
    const height = parseFloat(element.style.height);

    // Convert viewport coordinates to PDF coordinates.
    const bottomLeft = currentViewport.convertToPdfPoint(
      left,
      top + height
    );

    const topRight = currentViewport.convertToPdfPoint(
      left + width,
      top
    );

    const pdfX = Math.min(bottomLeft[0], topRight[0]);
    const pdfY = Math.min(bottomLeft[1], topRight[1]);

    const pdfWidth = Math.abs(
      topRight[0] - bottomLeft[0]
    );

    const pdfHeight = Math.abs(
      topRight[1] - bottomLeft[1]
    );

    selectedTextItem = {
      text: item.str,
      page: currentPage,

      pdfX,
      pdfY,
      pdfWidth,
      pdfHeight
    };

    selectedTextInput.value = item.str;
    replacementTextInput.value = item.str;

    setStatus(
      "Text selected. Enter your replacement.",
      "success"
    );

    updateButtons();
  }

  // ==============================
  // SELECTION MODE
  // ==============================

  selectPdfTextBtn.addEventListener("click", () => {
    if (!pdfDocument) return;

    selectionMode = !selectionMode;

    textLayer.classList.toggle(
      "active",
      selectionMode
    );

    selectPdfTextBtn.textContent =
      selectionMode
        ? "Stop Selecting"
        : "Select PDF Text";

    if (selectionMode) {
      setStatus(
        "Click the text you want to replace."
      );
    } else {
      setStatus("Text selection disabled.");
    }
  });

  // ==============================
  // REPLACE TEXT
  // ==============================

  replacementTextInput.addEventListener(
    "input",
    updateButtons
  );

  function applyReplacement() {
    if (!selectedTextItem) return;

    const newText = replacementTextInput.value.trim();

    if (!newText) {
      setStatus("Please enter replacement text.", "error");
      return;
    }

    const original = selectedTextItem;

    const fontSize = Math.max(
      5,
      Math.min(
        100,
        Number(fontSizeInput.value) || 14
      )
    );

    // Save history before changing the document.
    saveHistory();

    // Remove an earlier replacement at the same position.
    editingItems = editingItems.filter(item => {
      if (item.page !== original.page) return true;

      const samePosition =
        Math.abs(item.pdfX - original.pdfX) < 0.5 &&
        Math.abs(item.pdfY - original.pdfY) < 0.5;

      return !samePosition;
    });

    const replacement = {
      id: Date.now() + Math.random(),

      page: original.page,

      originalText: original.text,
      text: newText,

      pdfX: original.pdfX,
      pdfY: original.pdfY,

      pdfWidth: original.pdfWidth,
      pdfHeight: original.pdfHeight,

      fontSize,

      fontFamily: fontFamilyInput.value,
      textColor: textColorInput.value,
      coverColor: coverColorInput.value
    };

    editingItems.push(replacement);

    clearSelection();

    renderEditingItems();

    setStatus(
      "Replacement applied to preview.",
      "success"
    );
  }

  replaceTextBtn.addEventListener(
    "click",
    applyReplacement
  );

  // ==============================
  // RENDER REPLACEMENTS
  // ==============================

  function renderEditingItems() {
    overlay.innerHTML = "";

    if (!currentViewport) return;

    const pageItems = editingItems.filter(
      item => item.page === currentPage
    );

    pageItems.forEach(item => {
      // Convert stored PDF coordinates back to viewport.
      const bottomLeft =
        currentViewport.convertToViewportPoint(
          item.pdfX,
          item.pdfY
        );

      const topRight =
        currentViewport.convertToViewportPoint(
          item.pdfX + item.pdfWidth,
          item.pdfY + item.pdfHeight
        );

      const left = Math.min(
        bottomLeft[0],
        topRight[0]
      );

      const top = Math.min(
        bottomLeft[1],
        topRight[1]
      );

      const width = Math.abs(
        topRight[0] - bottomLeft[0]
      );

      const height = Math.abs(
        topRight[1] - bottomLeft[1]
      );

      // Cover original text.
      const cover = document.createElement("div");

      cover.className = "edit-cover";

      cover.style.position = "absolute";
      cover.style.left = `${left}px`;
      cover.style.top = `${top}px`;

      cover.style.width = `${width}px`;
      cover.style.height = `${height}px`;

      cover.style.backgroundColor = item.coverColor;
      cover.style.border = "none";
      cover.style.pointerEvents = "none";

      overlay.appendChild(cover);

      // Replacement text.
      const text = document.createElement("div");

      text.className = "edit-text";

      text.textContent = item.text;

      text.style.position = "absolute";
      text.style.left = `${left}px`;

      text.style.top =
        `${top + Math.max(0, (height - item.fontSize * zoom) * 0.1)}px`;

      text.style.width = `${width}px`;
      text.style.height = `${height}px`;

      text.style.fontFamily =
        item.fontFamily + ", sans-serif";

      text.style.fontSize =
        `${item.fontSize * zoom}px`;

      text.style.lineHeight = "1";
      text.style.whiteSpace = "nowrap";
      text.style.overflow = "hidden";

      text.style.color = item.textColor;

      text.style.padding = "0";
      text.style.margin = "0";
      text.style.border = "none";

      text.style.transformOrigin = "left top";
      text.style.pointerEvents = "none";

      // Fit long replacement text into the original width.
      const measureCanvas = document.createElement("canvas");
      const measureContext = measureCanvas.getContext("2d");

      measureContext.font =
        `${item.fontSize * zoom}px ${item.fontFamily}, sans-serif`;

      const measuredWidth =
        measureContext.measureText(item.text).width;

      if (measuredWidth > width && measuredWidth > 0) {
        const scaleX = width / measuredWidth;

        text.style.transform = `scaleX(${scaleX})`;
      }

      overlay.appendChild(text);
    });
  }

  // ==============================
  // PAGE CONTROLS
  // ==============================

  prevPageBtn.addEventListener("click", async () => {
    if (!pdfDocument || currentPage <= 1) return;

    currentPage--;

    clearSelection();

    await renderPage();
  });

  nextPageBtn.addEventListener("click", async () => {
    if (!pdfDocument || currentPage >= totalPages) return;

    currentPage++;

    clearSelection();

    await renderPage();
  });

  // ==============================
  // ZOOM CONTROLS
  // ==============================

  zoomInBtn.addEventListener("click", async () => {
    if (!pdfDocument || zoom >= 2.5) return;

    zoom = Math.min(2.5, zoom + 0.1);

    await renderPage();
  });

  zoomOutBtn.addEventListener("click", async () => {
    if (!pdfDocument || zoom <= 0.5) return;

    zoom = Math.max(0.5, zoom - 0.1);

    await renderPage();
  });

  // ==============================
  // COLOR CONVERSION
  // ==============================

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");

    return {
      r: parseInt(clean.substring(0, 2), 16) / 255,
      g: parseInt(clean.substring(2, 4), 16) / 255,
      b: parseInt(clean.substring(4, 6), 16) / 255
    };
  }

  // ==============================
  // DOWNLOAD EDITED PDF
  // ==============================

  async function downloadPDF() {
    if (!pdfDocument || !pdfBytes) return;

    try {
      downloadBtn.disabled = true;

      setStatus("Preparing your edited PDF...");

      const pdfLib = PDFLib;

      const pdfDoc = await pdfLib.PDFDocument.load(
        pdfBytes.slice()
      );

      const pages = pdfDoc.getPages();

      const standardFonts = {
        "Helvetica": pdfLib.StandardFonts.Helvetica,
        "Times Roman": pdfLib.StandardFonts.TimesRoman,
        "Courier": pdfLib.StandardFonts.Courier
      };

      const fontCache = {};

      for (const item of editingItems) {
        const page = pages[item.page - 1];

        if (!page) continue;

        const fontName = standardFonts[item.fontFamily]
          ? item.fontFamily
          : "Helvetica";

        if (!fontCache[fontName]) {
          fontCache[fontName] = await pdfDoc.embedFont(
            standardFonts[fontName]
          );
        }

        const font = fontCache[fontName];

        const cover = hexToRgb(item.coverColor);
        const color = hexToRgb(item.textColor);

        // Cover the original text using the same PDF rectangle.
        page.drawRectangle({
          x: item.pdfX,
          y: item.pdfY,

          width: item.pdfWidth,
          height: item.pdfHeight,

          color: pdfLib.rgb(
            cover.r,
            cover.g,
            cover.b
          ),

          borderWidth: 0
        });

        // Use the chosen font size, but shrink if text is too wide.
        let exportFontSize = Math.min(
          item.fontSize,
          item.pdfHeight
        );

        let textWidth = font.widthOfTextAtSize(
          item.text,
          exportFontSize
        );

        if (textWidth > item.pdfWidth && textWidth > 0) {
          exportFontSize *=
            item.pdfWidth / textWidth;

          textWidth = font.widthOfTextAtSize(
            item.text,
            exportFontSize
          );
        }

        const baselineY =
          item.pdfY +
          Math.max(
            0,
            (item.pdfHeight - exportFontSize) * 0.1
          );

        page.drawText(item.text, {
          x: item.pdfX,
          y: baselineY,

          size: exportFontSize,
          font,

          color: pdfLib.rgb(
            color.r,
            color.g,
            color.b
          )
        });
      }

      const output = await pdfDoc.save();

      const blob = new Blob([output], {
        type: "application/pdf"
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "CutX-Edited.pdf";

      document.body.appendChild(link);

      link.click();
      link.remove();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      setStatus(
        "Edited PDF downloaded successfully.",
        "success"
      );

    } catch (error) {
      console.error("PDF Export Error:", error);

      setStatus(
        "PDF export failed. Check browser console.",
        "error"
      );

    } finally {
      downloadBtn.disabled = !pdfDocument;
    }
  }

  downloadBtn.addEventListener(
    "click",
    downloadPDF
  );

  // ==============================
  // KEYBOARD SHORTCUTS
  // ==============================

  document.addEventListener("keydown", event => {
    const target = event.target;

    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;

    if (isTyping) return;

    if (event.ctrlKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
    }

    if (event.ctrlKey && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    }
  });

  // ==============================
  // INITIALIZE
  // ==============================

  updateButtons();

})();
