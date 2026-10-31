// Libraries are loaded safely: if a CDN fails, the page still works
// and we retry from backup CDNs when a tool is used.
let PDFDocument, degrees, rgb, StandardFonts;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = src;
    tag.onload = resolve;
    tag.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(tag);
  });
}

async function ensureLib(isReady, urls, name) {
  if (isReady()) return;
  for (const url of urls) {
    try {
      await loadScript(url);
      if (isReady()) return;
    } catch (error) { /* try next CDN */ }
  }
  throw new Error(
    name + " could not be loaded. Check your internet connection " +
    "or ad-blocker, then reload the page."
  );
}

async function ensureLibs(needs = ["pdflib", "pdfjs", "jszip"]) {
  if (needs.includes("pdflib")) {
    await ensureLib(() => window.PDFLib, [
      "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
      "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"
    ], "PDF library");
    ({ PDFDocument, degrees, rgb, StandardFonts } = window.PDFLib);
  }

  if (needs.includes("pdfjs")) {
    await ensureLib(() => window.pdfjsLib, [
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"
    ], "PDF.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  if (needs.includes("jszip")) {
    await ensureLib(() => window.JSZip, [
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
      "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
    ], "ZIP library");
  }

  if (needs.includes("tesseract")) {
    await ensureLib(() => window.Tesseract, [
      "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js"
    ], "OCR engine");
  }
}

// Try early so the first click is fast; failures are handled later.
ensureLibs().catch(() => {});

const groups = [
  {
    id: "organize",
    title: "Organize PDF",
    color: "#e85d98",
    tools: [
      ["Merge PDF", "Combine multiple PDFs.", "⇄", "merge"],
      ["Split PDF", "Extract selected pages.", "↗", "split"],
      ["Remove pages", "Delete unwanted pages.", "⊖", "remove"],
      ["Extract pages", "Save selected pages.", "▣", "extract"],
      ["Organize PDF", "Manage page operations.", "☷", "organize"],
      ["Scan to PDF", "Convert images to PDF.", "▧", "images"]
    ]
  },
  {
    id: "optimize",
    title: "Optimize PDF",
    color: "#4e83f7",
    tools: [
      ["Compress PDF", "Try to optimize a PDF.", "⌁", "compress"],
      ["Repair PDF", "Try to resave a readable PDF.", "⚒", "repair"],
      ["OCR PDF", "Recognize text in scanned pages.", "⌕", "ocr"]
    ]
  },
  {
  id: "to-pdf",
  title: "Convert to PDF",
  color: "#e99b45",
  tools: [
    ["JPG to PDF", "Convert JPG, PNG and WEBP images into a PDF.", "▧", "jpg-to-pdf"],
    ["WORD to PDF", "Convert DOCX documents.", "W", "word"],
    ["POWERPOINT to PDF", "Convert presentations.", "P", "powerpoint"],
    ["EXCEL to PDF", "Convert spreadsheets.", "X", "excel"],
    ["HTML to PDF", "Convert web content.", "〈〉", "html"]
  ]
},
  {
    id: "from-pdf",
    title: "Convert from PDF",
    color: "#39b98b",
    tools: [
      ["PDF to JPG", "Export pages as JPG images.", "▧", "jpg"],
      ["PDF to WORD", "Export document text.", "W", "pdfword"],
      ["PDF to POWERPOINT", "Create slide images.", "P", "pdfppt"],
      ["PDF to EXCEL", "Extract table data.", "X", "pdfexcel"],
      ["PDF to PDF/A", "Prepare archival documents.", "A", "pdfa"]
    ]
  },
  {
    id: "edit",
    title: "Edit PDF",
    color: "#9b6bfa",
    tools: [
      ["Rotate PDF", "Rotate pages by 90 degrees.", "⟳", "rotate"],
      ["Add page numbers", "Number every page.", "№", "numbers"],
      ["Add watermark", "Add text to every page.", "✎", "watermark"],
      ["Crop PDF", "Adjust page boundaries.", "⌜", "crop"],
      ["Edit PDF", "Explore editing options.", "✧", "editor"],
      ["PDF Forms", "Work with PDF forms.", "☑", "forms"]
    ]
  },
  {
    id: "security",
    title: "PDF Security",
    color: "#e66d63",
    tools: [
      ["Unlock PDF", "Open a PDF you may access.", "🔓", "unlock"],
      ["Protect PDF", "Password-protect a document.", "♙", "protect"],
      ["Sign PDF", "Add a signature.", "✍", "sign"],
      ["Redact PDF", "Remove sensitive content.", "▰", "redact"],
      ["Compare PDF", "Compare two documents.", "⇆", "compare"]
    ]
  },
  {
    id: "intelligence",
    title: "PDF Intelligence",
    color: "#20a8b5",
    tools: [
      ["AI Summarizer", "Summarize document content.", "✦", "summary"],
      ["Translate PDF", "Translate document text.", "文", "translate"],
      ["PDF to Markdown", "Export text as Markdown.", "M↓", "markdown"]
    ]
  }
];

const descriptions = Object.fromEntries(
  groups.flatMap(group =>
    group.tools.map(tool => [
      tool[3],
      { title: tool[0], description: tool[1], icon: tool[2] }
    ])
  )
);

const implemented = new Set([
  "merge", "split", "remove", "extract",
  "images", "rotate", "numbers", "watermark",
  "jpg", "compress", "repair", "crop",
  "markdown", "pdfword", "ocr"
]);

const $ = selector => document.querySelector(selector);

// Only these requested tools are locked until the planned launch date.
const comingSoonTools = new Set([
  "organize", "word", "powerpoint", "pdfppt", "excel", "pdfexcel",
  "html", "pdfa", "forms", "unlock", "protect", "sign",
  "redact", "compare", "summary", "translate"
]);
const launchTime = new Date("2027-05-04T00:00:00+05:30").getTime();
let countdownInterval = null;


let activeCategory = "all";
let searchText = "";
let activeTool = "";
let selectedFiles = [];
let previewObjectUrls = [];
let previewRenderToken = 0;
let pdfPageOrder = [];
let pdfPreviewDocument = null;
let lastDownloadBlob = null;
let lastDownloadFilename = "CutXPDF-result.pdf";
let processingProgressTimer = null;

$("#year").textContent = new Date().getFullYear();

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// Render tool cards
function renderTools() {
  const container = $("#toolGroups");
  container.innerHTML = "";

  const matchingGroups = groups.map(group => ({
    ...group,
    tools: group.tools.filter(tool => {
      const categoryMatches =
        activeCategory === "all" || activeCategory === group.id;

      const textMatches =
        `${tool[0]} ${tool[1]} ${group.title}`
          .toLowerCase()
          .includes(searchText);

      return categoryMatches && textMatches;
    })
  })).filter(group => group.tools.length);

  $("#noResults").classList.toggle(
    "hidden",
    matchingGroups.length > 0
  );

  matchingGroups.forEach((group, index) => {
    const section = document.createElement("section");
    section.className = "tool-group";
    section.style.animationDelay = `${index * 50}ms`;

    section.innerHTML = `
      <h3 class="group-title" style="--group-color:${group.color}">
        <span class="group-dot"></span>
        ${group.title}
        <span class="group-count">· ${group.tools.length} tools</span>
      </h3>

      <div class="tool-grid">
        ${group.tools.map(tool => `
          <button class="tool-card"
            data-tool="${tool[3]}"
            style="
              --tool-color:${group.color};
              --tile-color:${group.color}20;
            ">
            <span class="tool-icon">${tool[2]}</span>
            <span class="tool-copy">
              <b>${tool[0]}</b>
              <small>${tool[1]}</small>
              ${comingSoonTools.has(tool[3]) ? '<span class="soon-tag">COMING SOON</span>' : ''}
            </span>
            <span class="tool-arrow">↗</span>
          </button>
        `).join("")}
      </div>
    `;

    container.appendChild(section);
  });

 // Tool card click navigation
container.querySelectorAll("[data-tool]").forEach(button => {
  button.addEventListener("click", () => {
    const toolId = button.dataset.tool;

    // Open dedicated PDF editor page
    if (toolId === "editor") {
      window.location.href = "edit-pdf.html";
      return;
    }

    // Open dedicated JPG to PDF converter page
    if (toolId === "jpg-to-pdf") {
      window.location.href = "jpg-to-pdf.html";
      return;
    }

    // Open all other tools normally
    openTool(toolId);
  });
});
}

renderTools();

// Category filter
$("#categories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  activeCategory = button.dataset.category;

  document.querySelectorAll(".category").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  renderTools();
});

// Search tools
$("#searchInput").addEventListener("input", event => {
  searchText = event.target.value.trim().toLowerCase();
  renderTools();
});

// Theme toggle
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  $("#themeToggle").textContent =
    document.body.classList.contains("dark") ? "☀" : "☾";
});

// Mobile navigation
$("#menuToggle").addEventListener("click", () => {
  $("#navLinks").classList.toggle("open");
});

document.querySelectorAll("#navLinks a").forEach(link => {
  link.addEventListener("click", () => {
    $("#navLinks").classList.remove("open");
  });
});
// Modal
const modal = $("#modal");
const picker = $("#filePicker");

function openTool(id) {
   if (comingSoonTools.has(id)) {
     openComingSoon(id);
     return;
   }
   clearInterval(countdownInterval);
   $("#processBtn").style.display = "";
   $("#toolForm").style.display = "";
   $("#status").style.display = "";
   activeTool = id;
  selectedFiles = [];

  const info = descriptions[id];

  $("#modalTitle").textContent = info.title;
  $("#modalDescription").textContent = info.description;
  $("#modalIcon").textContent = info.icon;
  $("#status").textContent = "";
  $("#status").className = "";

  $("#processBtn").disabled = false;
  $("#processBtn").textContent = implemented.has(id)
    ? "Process PDF →"
    : "Check availability →";

  $("#toolForm").innerHTML = buildToolForm(id);
  function buildToolForm(id) {
  const imageMode = id === "images";

  let label = imageMode
    ? "Choose image files"
    : id === "merge"
      ? "Choose at least two PDFs"
      : "Choose a PDF file";

  let extra = "";

  if (["split", "remove", "extract"].includes(id)) {
    const isSplit = id === "split";

    extra = `
      <div class="field">
        <label for="pageRange">
          Page numbers or ranges${isSplit ? " (optional)" : ""}
        </label>

        <input
          id="pageRange"
          value="${isSplit ? "" : "1"}"
          placeholder="${isSplit
            ? "Leave empty to split every page"
            : "e.g. 1, 3-5, 8"}"
        >
      </div>
    `;
  }

  if (id === "compress") {
    extra = `
      <div class="field">
        <label for="compressMode">Compression level</label>

        <select id="compressMode">
          <option value="light">Light</option>
          <option value="balanced">Strong</option>
          <option value="max">Maximum</option>
        </select>
      </div>
    `;
  }

  if (id === "ocr") {
    extra = `
      <div class="field">
        <label for="ocrLang">Document language</label>

        <select id="ocrLang">
          <option value="eng">English</option>
          <option value="hin">Hindi</option>
          <option value="hin+eng">Hindi + English</option>
        </select>
      </div>
    `;
  }

  if (id === "crop") {
    extra = `
      ${["Top", "Bottom", "Left", "Right"].map(side => `
        <div class="field">
          <label for="crop${side}">Crop ${side} (%)</label>
          <input
            id="crop${side}"
            type="number"
            min="0"
            max="45"
            value="5"
          >
        </div>
      `).join("")}
    `;
  }

  if (id === "rotate") {
    extra = `
      <div class="field">
        <label for="rotation">Rotation</label>

        <select id="rotation">
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° clockwise</option>
        </select>
      </div>
    `;
  }

  if (id === "numbers") {
    extra = `
      <div class="field">
        <label for="numberStart">Starting number</label>
        <input
          id="numberStart"
          type="number"
          min="1"
          value="1"
        >
      </div>
    `;
  }

  if (id === "watermark") {
    extra = `
      <div class="field">
        <label for="watermarkText">Watermark text</label>
        <input
          id="watermarkText"
          value="CONFIDENTIAL"
          maxlength="80"
        >
      </div>

      <div class="field">
        <label for="watermarkOpacity">Opacity</label>

        <select id="watermarkOpacity">
          <option value="0.18">Light</option>
          <option value="0.35">Medium</option>
          <option value="0.6">Strong</option>
        </select>
      </div>
    `;
  }

  if (!implemented.has(id)) {
    extra = `
      <div class="coming-soon">
        <b>Additional processing engine required</b>
        <p>
          This tool is part of the interface, but its processing
          engine is not connected in this starter project.
        </p>
      </div>
    `;
  }

  // JPG TO PDF SETTINGS
  const conversionSettings = id === "images" ? `
    <div class="preview-settings">

      <div class="field">
        <label for="imagePaperSize">Paper size</label>

        <select id="imagePaperSize">
          <option value="a4">A4</option>
          <option value="a3">A3</option>
          <option value="letter">US Letter</option>
          <option value="legal">Legal</option>
          <option value="fit">Fit to Image</option>
        </select>
      </div>

      <div class="field">
        <label for="imageOrientation">Orientation</label>

        <select id="imageOrientation">
          <option value="auto">Auto</option>
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>

    </div>

    <div class="preview-note">
      Arrange your photos before converting.
      Each photo will be placed on its own PDF page.
    </div>
  ` : id === "jpg" ? `

    <!-- PDF TO JPG SETTINGS -->

    <div class="preview-settings">

      <div class="field">
        <label for="jpgResolution">Image resolution</label>

        <select id="jpgResolution">
          <option value="1">Standard (1×)</option>
          <option value="1.5" selected>High (1.5×)</option>
          <option value="2">Very High (2×)</option>
        </select>
      </div>

      <div class="field">
        <label for="jpgQuality">JPG quality</label>

        <select id="jpgQuality">
          <option value="0.75">75% — Smaller</option>
          <option value="0.9" selected>90% — Recommended</option>
          <option value="0.98">98% — Best</option>
        </select>
      </div>

    </div>

    <div class="preview-note">
      Select, remove and rearrange PDF pages before exporting.
    </div>

  ` : "";

  // PREVIEW AREA
  const previewArea = ["images", "jpg"].includes(id) ? `
    <div class="preview-heading">

      <h3>
        ${id === "images" ? "Photo previews" : "PDF page previews"}
      </h3>

      <span class="preview-count" id="previewCount">
        0 items
      </span>

    </div>

    <div class="media-preview-grid" id="mediaPreviewGrid">

      <div class="preview-empty">
        Your previews will appear here after selecting files.
      </div>

    </div>
  ` : "";

  return `
    <div class="drop-zone" id="dropZone">

      <div class="upload-symbol">↑</div>

      <b>${label}</b>

      <small>
        Click to browse or drag and drop files
      </small>

    </div>

    <div class="file-list" id="fileList"></div>

    ${conversionSettings}

    ${previewArea}

    ${extra}
  `;
}

  modal.classList.add("open");
  picker.value = "";

  picker.accept = id === "images"
    ? ".jpg,.jpeg,.png,.webp,image/*"
    : ".pdf,application/pdf";

  picker.multiple = ["merge", "images"].includes(id);

  const drop = $("#dropZone");

  drop.addEventListener("click", () => picker.click());

  drop.addEventListener("dragover", event => {
    event.preventDefault();
    drop.classList.add("dragover");
  });

  drop.addEventListener("dragleave", () => {
    drop.classList.remove("dragover");
  });

  drop.addEventListener("drop", event => {
    event.preventDefault();
    drop.classList.remove("dragover");
    addFiles([...event.dataTransfer.files]);
  });

  $("#processBtn").onclick = processTool;
}

function openComingSoon(id) {
  clearInterval(countdownInterval);
  activeTool = id;
  selectedFiles = [];
  $("#downloadResult").hidden = true;
  const info = descriptions[id];
  $("#modalTitle").textContent = info.title;
  $("#modalDescription").textContent = info.description + " This feature is planned for release on 4 May 2027.";
  $("#modalIcon").textContent = info.icon;
  $("#status").textContent = "";
  $("#status").className = "";
  $("#status").style.display = "none";
  $("#processBtn").style.display = "none";
  $("#toolForm").style.display = "";
  $("#toolForm").innerHTML = `
    <div class="coming-countdown">
      <div class="coming-pill">⌛ COMING SOON</div>
      <p class="countdown-intro">This CutXPDF tool is under development.</p>
      <div class="countdown-grid" aria-label="Time remaining until launch">
        <div><strong id="cdDays">000</strong><span>Days</span></div>
        <div><strong id="cdHours">00</strong><span>Hours</span></div>
        <div><strong id="cdMinutes">00</strong><span>Minutes</span></div>
        <div><strong id="cdSeconds">00</strong><span>Seconds</span></div>
      </div>
      <div class="countdown-date">Planned launch: <b>4 May 2027 · 12:00 AM IST</b></div>
      <p id="cdMessage" class="countdown-message" aria-live="polite">Counting down to launch…</p>
    </div>`;
  modal.classList.add("open");
  picker.value = "";
  updateComingCountdown();
  countdownInterval = setInterval(updateComingCountdown, 1000);
}

function updateComingCountdown() {
  let remaining = launchTime - Date.now();
  const put = (id, value, width) => { const el = $("#" + id); if (el) el.textContent = String(value).padStart(width, "0"); };
  if (remaining <= 0) {
    put("cdDays", 0, 3); put("cdHours", 0, 2); put("cdMinutes", 0, 2); put("cdSeconds", 0, 2);
    const msg = $("#cdMessage"); if (msg) msg.textContent = "The planned launch date has arrived. This tool still needs to be enabled in a site update.";
    clearInterval(countdownInterval); return;
  }
  const days = Math.floor(remaining / 86400000); remaining %= 86400000;
  const hours = Math.floor(remaining / 3600000); remaining %= 3600000;
  const minutes = Math.floor(remaining / 60000); const seconds = Math.floor((remaining % 60000) / 1000);
  put("cdDays", days, 3); put("cdHours", hours, 2); put("cdMinutes", minutes, 2); put("cdSeconds", seconds, 2);
  const msg = $("#cdMessage"); if (msg) msg.textContent = "Thanks for your patience — we're getting this tool ready.";
}

function closeModal() {
   modal.classList.remove("open");
   clearInterval(countdownInterval);
}

$("#closeModal").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();

  if ((event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k") {
    event.preventDefault();
    $("#searchInput").focus();
  }
});

$("#startBtn").addEventListener("click", () => openTool("merge"));

// Form for each tool
function buildToolForm(id) {
  const imageMode = id === "images";

  let label = imageMode ? "Choose image files" :
    id === "merge" ? "Choose at least two PDFs" :
    "Choose a PDF file";

  let extra = "";

  if (["split", "remove", "extract"].includes(id)) {
    const isSplit = id === "split";
    extra = `
      <div class="field">
        <label for="pageRange">Page numbers or ranges${isSplit ? " (optional)" : ""}</label>
        <input id="pageRange" value="${isSplit ? "" : "1"}"
          placeholder="${isSplit ? "Leave empty to split every page" : "e.g. 1, 3-5, 8"}">
      </div>
      <p style="margin-top:8px;color:var(--muted);font-size:10px;line-height:1.6">
        Enter page numbers starting at 1. Separate pages with commas.
        Use a hyphen for a range.
        ${isSplit ? "Each page becomes its own PDF inside a ZIP file." : ""}
      </p>
    `;
  }

  if (id === "compress") {
    extra = `
      <div class="field">
        <label for="compressMode">Compression level</label>
        <select id="compressMode">
          <option value="light">Light — keeps text, small or no savings</option>
          <option value="balanced">Strong — pages become images, smaller file</option>
          <option value="max">Maximum — lowest quality, smallest file</option>
        </select>
      </div>
      <p style="margin-top:8px;color:var(--muted);font-size:10px;line-height:1.6">
        Strong and Maximum turn each page into an image, so text can no
        longer be selected or searched.
      </p>`;
  }

  if (id === "ocr") {
    extra = `
      <div class="field">
        <label for="ocrLang">Document language</label>
        <select id="ocrLang">
          <option value="eng">English</option>
          <option value="hin">Hindi</option>
          <option value="hin+eng">Hindi + English</option>
        </select>
      </div>
      <p style="margin-top:8px;color:var(--muted);font-size:10px;line-height:1.6">
        Text is read in your browser and downloaded as a .txt file.
        The first run downloads language data, so it can take a while.
      </p>`;
  }

  if (id === "crop") {
    extra = `
      <div class="field">
        <label for="cropTop">Crop top (%)</label>
        <input id="cropTop" type="number" min="0" max="45" value="5">
      </div>
      <div class="field">
        <label for="cropBottom">Crop bottom (%)</label>
        <input id="cropBottom" type="number" min="0" max="45" value="5">
      </div>
      <div class="field">
        <label for="cropLeft">Crop left (%)</label>
        <input id="cropLeft" type="number" min="0" max="45" value="5">
      </div>
      <div class="field">
        <label for="cropRight">Crop right (%)</label>
        <input id="cropRight" type="number" min="0" max="45" value="5">
      </div>`;
  }

  if (id === "rotate") {
    extra = `
      <div class="field">
        <label for="rotation">Rotation</label>
        <select id="rotation">
          <option value="90">90° clockwise</option>
          <option value="180">180°</option>
          <option value="270">270° clockwise</option>
        </select>
      </div>`;
  }

  if (id === "numbers") {
    extra = `
      <div class="field">
        <label for="numberStart">Starting number</label>
        <input id="numberStart" type="number" min="1" value="1">
      </div>`;
  }

  if (id === "watermark") {
    extra = `
      <div class="field">
        <label for="watermarkText">Watermark text</label>
        <input id="watermarkText" value="CONFIDENTIAL" maxlength="80">
      </div>
      <div class="field">
        <label for="watermarkOpacity">Opacity</label>
        <select id="watermarkOpacity">
          <option value="0.18">Light</option>
          <option value="0.35">Medium</option>
          <option value="0.6">Strong</option>
        </select>
      </div>`;
  }

  if (!implemented.has(id)) {
    extra = `
      <div class="coming-soon">
        <b>Additional processing engine required</b>
        <p>
          This tool is part of the interface, but its processing engine
          is not connected in this starter project.
        </p>
      </div>`;
  }

  return `
    <div class="drop-zone" id="dropZone">
      <div class="upload-symbol">↑</div>
      <b>${label}</b>
      <small>Click to browse or drag and drop files</small>
    </div>
    <div class="file-list" id="fileList"></div>
    ${extra}
  `;
}

// File upload
picker.addEventListener("change", () => {
  addFiles([...picker.files]);
  picker.value = "";
});

function addFiles(files) {
  const valid = files.filter(file => {
    if (activeTool === "images") {
      return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    }

    return file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
  });

  if (!valid.length) {
    setStatus(
      activeTool === "images"
        ? "Choose JPG, PNG or WEBP images."
        : "Choose a valid PDF file.",
      "error"
    );
    return;
  }

  if (["merge", "images"].includes(activeTool)) {
    selectedFiles.push(...valid);
  } else {
    selectedFiles = [valid[0]];
  }

  renderFileList();
  setStatus("");
}

function renderFileList() {
  const list = $("#fileList");

  list.innerHTML = selectedFiles.map((file, index) => `
    <div class="file-row">
      <span class="file-badge">
        ${activeTool === "images" ? "IMG" : "PDF"}
      </span>
      <span class="file-info">
        <b>${escapeHTML(file.name)}</b>
        <small>${(file.size / 1024).toFixed(1)} KB</small>
      </span>
      <button class="remove-file" data-remove="${index}"
        aria-label="Remove file">×</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", () => {
      selectedFiles.splice(Number(button.dataset.remove), 1);
      renderFileList();
        // Show uploaded file previews
  if (activeTool === "images") {
    renderImagePreviews();
  }

  if (activeTool === "jpg") {
    renderPdfPagePreviews();
  }
  // Clean up old image preview URLs
function clearPreviewUrls() {
  previewObjectUrls.forEach(url => URL.revokeObjectURL(url));
  previewObjectUrls = [];
}

// JPG / PNG IMAGE PREVIEW
function renderImagePreviews() {
  const grid = $("#mediaPreviewGrid");
  const count = $("#previewCount");

  if (!grid) return;

  clearPreviewUrls();

  if (!selectedFiles.length) {
    grid.innerHTML = `
      <div class="preview-empty">
        Upload images to see previews.
      </div>
    `;

    if (count) count.textContent = "0 images";
    return;
  }

  if (count) {
    count.textContent = `${selectedFiles.length} images`;
  }

  grid.innerHTML = selectedFiles.map((file, index) => {
    const url = URL.createObjectURL(file);
    previewObjectUrls.push(url);

    return `
      <div class="media-preview-card">

        <img
          src="${url}"
          class="media-preview-image"
          alt="${escapeHTML(file.name)}"
        >

        <div class="preview-info">
          <b>${escapeHTML(file.name)}</b>
          <small>Image ${index + 1}</small>
        </div>

        <button
          type="button"
          class="remove-file"
          data-preview-remove="${index}"
          aria-label="Remove image"
        >×</button>

      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-preview-remove]").forEach(button => {
    button.addEventListener("click", () => {
      selectedFiles.splice(
        Number(button.dataset.previewRemove),
        1
      );

      renderFileList();
    });
  });
}


// PDF PAGE PREVIEW
async function renderPdfPagePreviews() {
  const grid = $("#mediaPreviewGrid");
  const count = $("#previewCount");

  if (!grid) return;

  const file = selectedFiles[0];

  if (!file) {
    grid.innerHTML = `
      <div class="preview-empty">
        Upload a PDF to see page previews.
      </div>
    `;

    if (count) count.textContent = "0 pages";
    return;
  }

  const token = ++previewRenderToken;

  grid.innerHTML = `
    <div class="preview-empty">
      Loading PDF page previews...
    </div>
  `;

  try {
    await ensureLibs(["pdfjs"]);

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer)
    }).promise;

    if (token !== previewRenderToken) return;

    pdfPreviewDocument = pdf;

    if (count) {
      count.textContent = `${pdf.numPages} pages`;
    }

    grid.innerHTML = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (token !== previewRenderToken) return;

      const page = await pdf.getPage(pageNumber);

      const viewport = page.getViewport({ scale: 0.45 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      if (token !== previewRenderToken) return;

      const card = document.createElement("div");
      card.className = "media-preview-card";

      const title = document.createElement("div");
      title.className = "preview-info";
      title.textContent = `Page ${pageNumber}`;

      canvas.className = "media-preview-image";

      card.appendChild(canvas);
      card.appendChild(title);

      grid.appendChild(card);
    }

  } catch (error) {
    if (token !== previewRenderToken) return;

    grid.innerHTML = `
      <div class="preview-empty">
        Could not load PDF previews.
        Please check your internet connection and PDF file.
      </div>
    `;

    console.error("PDF preview error:", error);
  }
}
    });
  });
}

function setStatus(message, type = "") {
  $("#status").textContent = message;
  $("#status").className = type;
}

function parsePages(input, totalPages) {
  const pages = new Set();

  for (const part of input.split(",").map(x => x.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);

      if (!Number.isInteger(start) || !Number.isInteger(end) ||
          start < 1 || end < start || end > totalPages) {
        throw new Error(`Invalid page range: ${part}`);
      }

      for (let n = start; n <= end; n++) pages.add(n - 1);
    } else {
      const n = Number(part);

      if (!Number.isInteger(n) || n < 1 || n > totalPages) {
        throw new Error(`Invalid page number: ${part}`);
      }

      pages.add(n - 1);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

// Animated processing overlay with a progress indicator. The percentage is an
// activity indicator; actual completion is determined by the processing engine.
function startProcessingAnimation() {
  finishProcessingAnimation(false, true);
  const overlay = document.createElement("div");
  overlay.className = "processing-overlay";
  overlay.id = "processingOverlay";
  overlay.innerHTML = `
    <div class="processing-card" role="status" aria-live="polite">
      <div class="processing-orbit"><div class="processing-file">PDF</div></div>
      <div class="processing-eyebrow">CutXPDF ENGINE</div>
      <h3 id="processingTitle">Preparing your document</h3>
      <p id="processingMessage">Reading file and starting secure browser processing…</p>
      <div class="processing-track"><span id="processingBar"></span></div>
      <div class="processing-meta"><span id="processingStep">Initializing</span><strong id="processingPercent">3%</strong></div>
      <div class="processing-points"><span>✓ Browser-based</span><span>✦ Animated processing</span></div>
    </div>`;
  document.body.appendChild(overlay);
  let progress = 3;
  const messages = [
    ["Preparing your document", "Reading file and starting secure browser processing…", "Initializing"],
    ["Analyzing document", "Checking pages and preparing the PDF structure…", "Analyzing file"],
    ["Processing pages", "Applying your selected PDF operation…", "Working on pages"],
    ["Finalizing output", "Packaging your result for download…", "Finalizing"]
  ];
  processingProgressTimer = setInterval(() => {
    progress = Math.min(92, progress + (progress < 35 ? 4 : progress < 70 ? 2 : 1));
    const index = progress < 20 ? 0 : progress < 42 ? 1 : progress < 76 ? 2 : 3;
    const stage = messages[index];
    const bar = $("#processingBar");
    if (bar) bar.style.width = progress + "%";
    const percent = $("#processingPercent"); if (percent) percent.textContent = progress + "%";
    const title = $("#processingTitle"); if (title) title.textContent = stage[0];
    const message = $("#processingMessage"); if (message) message.textContent = stage[1];
    const step = $("#processingStep"); if (step) step.textContent = stage[2];
  }, 180);
}

function finishProcessingAnimation(success, silent = false) {
  if (processingProgressTimer) clearInterval(processingProgressTimer);
  processingProgressTimer = null;
  const overlay = $("#processingOverlay");
  if (!overlay) return;
  if (silent) { overlay.remove(); return; }
  const title = $("#processingTitle");
  const message = $("#processingMessage");
  const step = $("#processingStep");
  const percent = $("#processingPercent");
  const bar = $("#processingBar");
  if (success) {
    if (title) title.textContent = "Processing complete!";
    if (message) message.textContent = "Your file is ready. Your download should begin automatically.";
    if (step) step.textContent = "Complete";
    if (percent) percent.textContent = "100%";
    if (bar) bar.style.width = "100%";
    overlay.classList.add("processing-complete");
  } else {
    overlay.classList.add("processing-failed");
    if (title) title.textContent = "Processing stopped";
    if (message) message.textContent = "Check the message in the workspace and try again.";
  }
  setTimeout(() => overlay.remove(), success ? 900 : 500);
}

// Main PDF processor
async function processTool() {
  const id = activeTool;

  if (!implemented.has(id)) {
    setStatus(
      "This feature needs an additional processing engine. It is not active yet.",
      "error"
    );
    return;
  }

  if (!selectedFiles.length) {
    setStatus("Please select a file first.", "error");
    return;
  }

  if (id === "merge" && selectedFiles.length < 2) {
    setStatus("Select at least two PDFs to merge.", "error");
    return;
  }

  if (id === "images" &&
      selectedFiles.some(file => !file.type.startsWith("image/"))) {
    setStatus("Select image files only.", "error");
    return;
  }

  const button = $("#processBtn");
  button.disabled = true;
  button.textContent = "Processing…";
  setStatus("Processing in your browser. Please wait…");
  startProcessingAnimation();
  let processingSucceeded = false;

  try {
    await ensureLibs(id === "ocr"
      ? ["pdflib", "pdfjs", "jszip", "tesseract"]
      : undefined);

    if (await runSpecialTool(id)) {
      processingSucceeded = document.querySelector("#status.success") !== null;
      return;
    }

    let result;
    let filename = "cutx-pdf-result.pdf";
    let note = "";

    if (id === "images") {
      result = await imagesToPdf(selectedFiles);
      filename = "images-to-pdf.pdf";
    } else if (id === "jpg") {
      await exportPdfPagesToJpg(selectedFiles[0]);
      setStatus("Page images have been downloaded.", "success");
      processingSucceeded = true;
      return;
    } else {
      const buffers = await Promise.all(
        selectedFiles.map(file => file.arrayBuffer())
      );

      if (id === "merge") {
        const destination = await PDFDocument.create();

        for (const buffer of buffers) {
          const source = await PDFDocument.load(buffer);
          const pages = await destination.copyPages(
            source,
            source.getPageIndices()
          );

          pages.forEach(page => destination.addPage(page));
        }

        result = await destination.save();
        filename = "merged.pdf";
      }

      if (["extract", "remove"].includes(id)) {
        const source = await PDFDocument.load(buffers[0]);
        const total = source.getPageCount();

        const selected = parsePages($("#pageRange").value, total);

        if (!selected.length) {
          throw new Error("Enter at least one page number.");
        }

        const keep = id === "remove"
          ? source.getPageIndices().filter(i => !selected.includes(i))
          : selected;

        if (!keep.length) {
          throw new Error("The output cannot contain zero pages.");
        }

        const destination = await PDFDocument.create();
        const pages = await destination.copyPages(source, keep);

        pages.forEach(page => destination.addPage(page));

        result = await destination.save();

        filename = id === "remove"
          ? "pages-removed.pdf"
          : "extracted-pages.pdf";
      }

      if (id === "rotate") {
        const pdf = await PDFDocument.load(buffers[0]);
        const rotation = Number($("#rotation").value);

        pdf.getPages().forEach(page => {
          const current = page.getRotation().angle;
          page.setRotation(degrees((current + rotation) % 360));
        });

        result = await pdf.save();
        filename = "rotated.pdf";
      }

      if (id === "numbers") {
        const pdf = await PDFDocument.load(buffers[0]);
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const start = Math.max(1, Number($("#numberStart").value) || 1);

        pdf.getPages().forEach((page, index) => {
          const { width } = page.getSize();
          const text = String(start + index);
          const size = 11;

          page.drawText(text, {
            x: (width - font.widthOfTextAtSize(text, size)) / 2,
            y: 18,
            size,
            font,
            color: rgb(0.35, 0.35, 0.42)
          });
        });

        result = await pdf.save();
        filename = "numbered.pdf";
      }

      if (id === "watermark") {
        const pdf = await PDFDocument.load(buffers[0]);
        const font = await pdf.embedFont(StandardFonts.HelveticaBold);

        const text = $("#watermarkText").value.trim() || "CONFIDENTIAL";
        const opacity = Number($("#watermarkOpacity").value);

        pdf.getPages().forEach(page => {
          const { width, height } = page.getSize();
          const size = 36;
          const textWidth = font.widthOfTextAtSize(text, size);

          page.drawText(text, {
            x: Math.max(10, (width - textWidth) / 2),
            y: height / 2,
            size,
            font,
            color: rgb(0.48, 0.43, 0.75),
            opacity,
            rotate: degrees(-30)
          });
        });

        result = await pdf.save();
        filename = "watermarked.pdf";
      }

      if (id === "compress" || id === "repair") {
        const pdf = await PDFDocument.load(buffers[0]);

        result = await pdf.save({ useObjectStreams: true });
        filename = id === "compress"
          ? "optimized.pdf"
          : "repaired-copy.pdf";

        if (id === "compress") {
          const before = buffers[0].byteLength;
          if (result.length >= before) {
            throw new Error(
              "Light compression could not make this file smaller. " +
              "Try the Strong level."
            );
          }
          note = ` Size: ${formatSize(before)} → ${formatSize(result.length)}.`;
        }
      }

      if (id === "crop") {
        const pdf = await PDFDocument.load(buffers[0]);
        const read = key => Math.min(45, Math.max(0, Number($(key).value) || 0)) / 100;
        const top = read("#cropTop"), bottom = read("#cropBottom");
        const left = read("#cropLeft"), right = read("#cropRight");

        pdf.getPages().forEach(page => {
          const box = page.getMediaBox();
          page.setCropBox(
            box.x + box.width * left,
            box.y + box.height * bottom,
            box.width * (1 - left - right),
            box.height * (1 - top - bottom)
          );
        });

        result = await pdf.save();
        filename = "cropped.pdf";
      }

      if (id === "organize") {
        throw new Error(
          "Use Split, Remove Pages, Extract Pages or Rotate PDF " +
          "for the supported page operations."
        );
      }
    }

    downloadFile(
      new Blob([result], { type: "application/pdf" }),
      filename
    );

    setStatus("Success! Your PDF has been downloaded." + note, "success");
    processingSucceeded = true;
  } catch (error) {
    setStatus(
      error.message || "Could not process this file. Check the PDF and try again.",
      "error"
    );
  } finally {
    finishProcessingAnimation(processingSucceeded);
    button.disabled = false;
    button.textContent = "Process PDF →";
  }
}

// Images to PDF
async function imagesToPdf(files) {
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    let image;

    if (file.type === "image/png") {
      image = await pdf.embedPng(buffer);
    } else if (file.type === "image/jpeg") {
      image = await pdf.embedJpg(buffer);
    } else {
      const jpgBuffer = await convertImageToJpeg(file);
      image = await pdf.embedJpg(jpgBuffer);
    }

    const page = pdf.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });
  }

  return pdf.save();
}

function convertImageToJpeg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      canvas.toBlob(async blob => {
        URL.revokeObjectURL(url);

        if (!blob) {
          reject(new Error("Image conversion failed."));
          return;
        }

        resolve(await blob.arrayBuffer());
      }, "image/jpeg", 0.92);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };

    image.src = url;
  });
}

// PDF pages to JPG images (one ZIP; browsers block many separate downloads)
async function exportPdfPagesToJpg(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const zip = new JSZip();
  const base = file.name.replace(/\.pdf$/i, "") || "document";

  for (let n = 1; n <= pdf.numPages; n++) {
    setStatus(`Rendering page ${n} of ${pdf.numPages}…`);

    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, "image/jpeg", 0.9);
    });

    if (!blob) throw new Error(`Could not export page ${n}.`);

    zip.file(`${base}-page-${n}.jpg`, await blob.arrayBuffer());
    canvas.width = canvas.height = 0;
  }

  downloadFile(await zip.generateAsync({ type: "blob" }), `${base}-images.zip`);
}

function formatSize(bytes) {
  return bytes > 1048576
    ? (bytes / 1048576).toFixed(2) + " MB"
    : (bytes / 1024).toFixed(1) + " KB";
}

// Tools that download something other than a single PDF
async function runSpecialTool(id) {
  const file = selectedFiles[0];
  const base = file ? file.name.replace(/\.pdf$/i, "") || "document" : "document";

  if (id === "split") {
    const buffer = await file.arrayBuffer();
    const source = await PDFDocument.load(buffer);
    const total = source.getPageCount();
    const input = $("#pageRange").value.trim();
    const indexes = input ? parsePages(input, total) : source.getPageIndices();

    if (!indexes.length) throw new Error("Enter at least one page number.");

    const zip = new JSZip();
    for (const i of indexes) {
      const out = await PDFDocument.create();
      const [page] = await out.copyPages(source, [i]);
      out.addPage(page);
      zip.file(`${base}-page-${i + 1}.pdf`, await out.save());
      setStatus(`Splitting page ${i + 1}…`);
    }

    downloadFile(await zip.generateAsync({ type: "blob" }), `${base}-split.zip`);
    setStatus(`Done! ${indexes.length} PDF file(s) downloaded as a ZIP.`, "success");
    return true;
  }

  if (id === "compress" && $("#compressMode").value !== "light") {
    const max = $("#compressMode").value === "max";
    const scale = max ? 1.0 : 1.4;
    const quality = max ? 0.45 : 0.65;

    const original = await file.arrayBuffer();
    const src = await pdfjsLib.getDocument({ data: original.slice(0) }).promise;
    const out = await PDFDocument.create();

    for (let n = 1; n <= src.numPages; n++) {
      setStatus(`Compressing page ${n} of ${src.numPages}…`);

      const page = await src.getPage(n);
      const base1 = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", quality));
      if (!blob) throw new Error(`Could not compress page ${n}.`);

      const image = await out.embedJpg(await blob.arrayBuffer());
      const pdfPage = out.addPage([base1.width, base1.height]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: base1.width, height: base1.height });

      canvas.width = canvas.height = 0;
    }

    const bytes = await out.save({ useObjectStreams: true });

    if (bytes.length >= original.byteLength) {
      throw new Error(
        "This PDF is already small, so compression would not help. " +
        "Your original file is unchanged."
      );
    }

    downloadFile(new Blob([bytes], { type: "application/pdf" }), `${base}-compressed.pdf`);
    setStatus(
      `Success! ${formatSize(original.byteLength)} → ${formatSize(bytes.length)}.`,
      "success"
    );
    return true;
  }

  if (id === "ocr") {
    const lang = $("#ocrLang").value;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const worker = await Tesseract.createWorker(lang);
    const parts = [];

    try {
      for (let n = 1; n <= pdf.numPages; n++) {
        setStatus(`Reading page ${n} of ${pdf.numPages} (OCR)…`);

        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const { data } = await worker.recognize(canvas);
        parts.push(`--- Page ${n} ---\n${data.text.trim()}`);
        canvas.width = canvas.height = 0;
      }
    } finally {
      await worker.terminate();
    }

    downloadFile(
      new Blob([parts.join("\n\n")], { type: "text/plain" }),
      `${base}-ocr.txt`
    );
    setStatus("Success! Recognized text has been downloaded.", "success");
    return true;
  }

  if (id === "markdown" || id === "pdfword") {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];

    for (let n = 1; n <= pdf.numPages; n++) {
      setStatus(`Reading page ${n} of ${pdf.numPages}…`);

      const content = await (await pdf.getPage(n)).getTextContent();
      const lines = [];
      let line = "";
      let lastY = null;

      for (const item of content.items) {
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line.trim());
          line = "";
        }
        line += item.str + " ";
        lastY = y;
      }
      lines.push(line.trim());
      pages.push(lines.filter(Boolean));
    }

    if (!pages.some(p => p.length)) {
      throw new Error(
        "No selectable text found. This looks like a scanned PDF, which needs OCR."
      );
    }

    if (id === "markdown") {
      const md = pages
        .map((p, i) => `## Page ${i + 1}\n\n${p.join("\n\n")}`)
        .join("\n\n---\n\n");
      downloadFile(new Blob([md], { type: "text/markdown" }), `${base}.md`);
    } else {
      const html = "<html><head><meta charset='utf-8'></head><body>" +
        pages.map((p, i) =>
          `<h3>Page ${i + 1}</h3>` + p.map(l => `<p>${escapeHTML(l)}</p>`).join("")
        ).join("<br style='page-break-after:always'>") +
        "</body></html>";
      downloadFile(new Blob([html], { type: "application/msword" }), `${base}.doc`);
    }

    setStatus("Success! Text has been exported (layout and images are not kept).", "success");
    return true;
  }

  return false;
}

// Download helper
function downloadFile(blob, filename) {
  lastDownloadBlob = blob;
  lastDownloadFilename = filename;
  const retryButton = $("#downloadResult");
  if (retryButton) {
    retryButton.hidden = false;
    retryButton.onclick = () => downloadFile(lastDownloadBlob, lastDownloadFilename);
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
