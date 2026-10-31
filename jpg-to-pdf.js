"use strict";

(() => {
  const $ = id => document.getElementById(id);

  const fileInput = $("fileInput");
  const dropZone = $("dropZone");
  const previewGrid = $("previewGrid");
  const convertBtn = $("convertBtn");
  const downloadBtn = $("downloadBtn");
  const statusBox = $("status");
  const progressArea = $("progressArea");
  const progressBar = $("progressBar");
  const progressText = $("progressText");
  const progressPercent = $("progressPercent");

  let images = [];
  let generatedPdfUrl = null;
  let isProcessing = false;

  $("year").textContent = new Date().getFullYear();

  function showStatus(message, type = "") {
    statusBox.textContent = message;
    statusBox.className = "status " + type;
  }

  function updateProgress(value, message) {
    const percent = Math.max(0, Math.min(100, value));

    progressBar.style.width = percent + "%";
    progressPercent.textContent = percent + "%";

    if (message) {
      progressText.textContent = message;
    }
  }

  function updateButtons() {
    convertBtn.disabled = images.length === 0 || isProcessing;
    $("imageCount").textContent =
      images.length + (images.length === 1 ? " image selected" : " images selected");
  }

  function releaseImage(item) {
    if (item.url) {
      URL.revokeObjectURL(item.url);
    }
  }

  function clearGeneratedPdf() {
    if (generatedPdfUrl) {
      URL.revokeObjectURL(generatedPdfUrl);
      generatedPdfUrl = null;
    }

    downloadBtn.hidden = true;
  }

  function addFiles(fileList) {
    const files = Array.from(fileList);

    let added = 0;

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        continue;
      }

      if (file.size > 25 * 1024 * 1024) {
        showStatus(file.name + " is larger than 25 MB.", "error");
        continue;
      }

      const item = {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now() + Math.random()),
        file,
        url: URL.createObjectURL(file)
      };

      images.push(item);
      added++;
    }

    if (added > 0) {
      clearGeneratedPdf();
      showStatus(added + " image(s) added successfully.", "success");
      renderPreviews();
    } else if (files.length > 0) {
      showStatus("Please select valid JPG, PNG or WEBP images.", "error");
    }

    fileInput.value = "";
    updateButtons();
  }

  function renderPreviews() {
    previewGrid.innerHTML = "";

    if (images.length === 0) {
      previewGrid.innerHTML = `
        <div class="empty-state">
          Your uploaded images will appear here.
        </div>
      `;
      return;
    }

    images.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "image-card";
      card.draggable = true;
      card.dataset.id = item.id;

      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.file.name;

      const info = document.createElement("div");
      info.className = "image-info";

      const name = document.createElement("strong");
      name.textContent = item.file.name;
      name.title = item.file.name;

      const size = document.createElement("small");
      size.textContent = formatSize(item.file.size);

      info.append(name, size);

      const actions = document.createElement("div");
      actions.className = "image-actions";

      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.title = "Move up";
      up.disabled = index === 0;
      up.addEventListener("click", () => moveImage(index, -1));

      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.title = "Move down";
      down.disabled = index === images.length - 1;
      down.addEventListener("click", () => moveImage(index, 1));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Remove image";
      remove.className = "remove-btn";
      remove.addEventListener("click", () => removeImage(item.id));

      actions.append(up, down, remove);
      card.append(img, info, actions);

      card.addEventListener("dragstart", event => {
        card.classList.add("dragging");
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        previewGrid.querySelectorAll(".drag-over").forEach(element => {
          element.classList.remove("drag-over");
        });
      });

      card.addEventListener("dragover", event => {
        event.preventDefault();
        card.classList.add("drag-over");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", event => {
        event.preventDefault();
        card.classList.remove("drag-over");

        const draggedId = event.dataTransfer.getData("text/plain");
        reorderImage(draggedId, item.id);
      });

      previewGrid.appendChild(card);
    });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB";
    }
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function moveImage(index, direction) {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= images.length) return;

    [images[index], images[newIndex]] =
      [images[newIndex], images[index]];

    clearGeneratedPdf();
    renderPreviews();
  }

  function removeImage(id) {
    const index = images.findIndex(item => item.id === id);
    if (index === -1) return;

    releaseImage(images[index]);
    images.splice(index, 1);

    clearGeneratedPdf();
    renderPreviews();
    updateButtons();

    showStatus("Image removed.", "success");
  }

  function reorderImage(fromId, toId) {
    const fromIndex = images.findIndex(item => item.id === fromId);
    const toIndex = images.findIndex(item => item.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    const [item] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, item);

    clearGeneratedPdf();
    renderPreviews();
  }

  function getPageDimensions(width, height) {
    const size = $("pageSize").value;
    const orientation = $("orientation").value;

    if (size === "fit") {
      return [width, height];
    }

    const sizes = {
      a4: [595.28, 841.89],
      a3: [841.89, 1190.55],
      letter: [612, 792]
    };

    let [pageWidth, pageHeight] = sizes[size];

    const landscape =
      orientation === "landscape" ||
      (orientation === "auto" && width > height);

    if (landscape) {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }

    return [pageWidth, pageHeight];
  }

  async function imageToJpeg(item) {
    const bitmap = await createImageBitmap(item.file);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      const context = canvas.getContext("2d", {
        alpha: false
      });

      // White background preserves transparency as white in the PDF.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(result => {
          if (result) resolve(result);
          else reject(new Error("Image conversion failed."));
        }, "image/jpeg", 0.95);
      });

      return new Uint8Array(await blob.arrayBuffer());
    } finally {
      bitmap.close();
    }
  }

  async function createPDF() {
    if (!window.PDFLib) {
      throw new Error("PDF library could not load. Check your internet and reload.");
    }

    const { PDFDocument } = window.PDFLib;
    const pdfDoc = await PDFDocument.create();

    const margin = Number($("margin").value);
    const fitMode = $("imageFit").value;

    for (let i = 0; i < images.length; i++) {
      updateProgress(
        Math.round((i / images.length) * 90),
        "Processing image " + (i + 1) + " of " + images.length
      );

      const jpegBytes = await imageToJpeg(images[i]);
      const embeddedImage = await pdfDoc.embedJpg(jpegBytes);

      const originalWidth = embeddedImage.width;
      const originalHeight = embeddedImage.height;

      const [pageWidth, pageHeight] = getPageDimensions(
        originalWidth,
        originalHeight
      );

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      const availableWidth = Math.max(1, pageWidth - margin * 2);
      const availableHeight = Math.max(1, pageHeight - margin * 2);

      let drawWidth;
      let drawHeight;

      const scaleX = availableWidth / originalWidth;
      const scaleY = availableHeight / originalHeight;

      if (fitMode === "cover") {
        const scale = Math.max(scaleX, scaleY);
        drawWidth = originalWidth * scale;
        drawHeight = originalHeight * scale;
      } else {
        const scale = Math.min(scaleX, scaleY);
        drawWidth = originalWidth * scale;
        drawHeight = originalHeight * scale;
      }

      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight
      });
    }

    updateProgress(95, "Creating your PDF...");

    return await pdfDoc.save();
  }

  async function convertToPDF() {
    if (isProcessing || images.length === 0) return;

    isProcessing = true;
    updateButtons();
    clearGeneratedPdf();

    progressArea.hidden = false;
    updateProgress(0, "Starting conversion...");
    showStatus("");

    try {
      const pdfBytes = await createPDF();

      const blob = new Blob([pdfBytes], {
        type: "application/pdf"
      });

      generatedPdfUrl = URL.createObjectURL(blob);

      updateProgress(100, "PDF completed!");

      downloadBtn.hidden = false;
      showStatus("Your PDF is ready to download!", "success");
    } catch (error) {
      console.error("JPG to PDF error:", error);
      showStatus(error.message || "Something went wrong.", "error");
      progressArea.hidden = true;
    } finally {
      isProcessing = false;
      updateButtons();
    }
  }

  function downloadPDF() {
    if (!generatedPdfUrl) return;

    let filename = $("fileName").value.trim() || "CutXPDF-Images";

    filename = filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
      .replace(/\.pdf$/i, "")
      .slice(0, 80);

    const link = document.createElement("a");
    link.href = generatedPdfUrl;
    link.download = filename + ".pdf";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  $("browseBtn").addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", event => {
    addFiles(event.target.files);
  });

  dropZone.addEventListener("dragover", event => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", event => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    addFiles(event.dataTransfer.files);
  });

  $("clearBtn").addEventListener("click", () => {
    images.forEach(releaseImage);
    images = [];

    clearGeneratedPdf();
    renderPreviews();
    updateButtons();
    progressArea.hidden = true;

    showStatus("All images cleared.");
  });

  convertBtn.addEventListener("click", convertToPDF);
  downloadBtn.addEventListener("click", downloadPDF);

  window.addEventListener("beforeunload", () => {
    images.forEach(releaseImage);
    clearGeneratedPdf();
  });

  renderPreviews();
  updateButtons();
})();