// =============================================================
// UNIDOWNLOADER - FLOATING USER INTERFACE & DRAG CONTROLLER
// =============================================================

window.UniDownloader = window.UniDownloader || {};

(() => {
  const UD = window.UniDownloader;

  UD.initUI = function () {
    if (document.getElementById("mercatorum-downloader-root")) return;

    const platform = UD.getPlatformInfo();
    const root = document.createElement("div");
    root.id = "mercatorum-downloader-root";
    document.body.appendChild(root);

    // Inizializza visibilità memorizzata in chrome.storage
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ panelVisible: true }, (data) => {
        if (data && data.panelVisible === false) {
          root.style.display = "none";
        }
      });
    }

    // Ascolta messaggi in tempo reale dal popup dell'estensione
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg && msg.action === "set_panel_visibility") {
          root.style.display = msg.visible ? "" : "none";
          sendResponse({ success: true, visible: msg.visible });
        }
      });
    }

    const courseDetected = UD.detectCourseName();
    const defaultFolder = `${platform.name} - ${courseDetected}`;

    root.innerHTML = `
      <div id="mercatorum-downloader-box">
        <div class="m-header" id="m-toggle-min" title="Clicca per aprire o ridurre">
          <div class="m-title">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            <span>${platform.label}</span>
          </div>
        </div>
        <div class="m-body">
          <div class="m-folder-box">
            <div class="m-folder-label">Cartella di salvataggio (in Downloads)</div>
            <input class="m-folder-input" id="m-input-folder" value="${defaultFolder}" />
          </div>

          <div class="m-log-header">
            <span>Attività</span>
            <span id="m-stat-count">Scaricati: 0</span>
          </div>

          <div class="m-log" id="m-log-box"></div>

          <div class="m-toggle-row">
            <span class="m-toggle-text">Chiudi lezione e argomento dopo download</span>
            <label class="m-switch" title="Chiudi ciascuna lezione e ciascun argomento dopo averne scaricato le dispense">
              <input type="checkbox" id="m-opt-close-after" checked />
              <span class="m-slider"></span>
            </label>
          </div>

          <div class="m-actions-main">
            <button class="m-btn-auto" id="m-btn-auto-toggle">
              Avvia Download Automatico
            </button>
            <button class="m-btn-secondary" id="m-btn-pause-auto" style="display: none;">
              Pausa
            </button>
          </div>

          <div class="m-footer-donate">
            <a class="m-donate-btn" href="https://paypal.me/fformica1" target="_blank" rel="noopener noreferrer" title="Ti è stato utile? Supporta lo sviluppo con una donazione su PayPal">
              <svg viewBox="0 0 24 24"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.798.798 0 0 1 .788-.667h7.24c3.42 0 5.86 1.768 5.485 5.215-.316 2.898-2.222 5.06-5.112 5.06H9.79l-1.353 7.39a.798.798 0 0 1-.788.667l-.573-.048zM19.805 7.84c-.385 3.535-2.71 6.177-6.236 6.177h-3.55l-1.44 7.868a.798.798 0 0 0 .787.945h3.903a.798.798 0 0 0 .788-.667l1.04-5.69.066-.36a.798.798 0 0 1 .788-.666h.74c3.533 0 6.056-1.826 5.67-5.388-.178-1.636-.97-2.607-2.308-2.82z"/></svg>
              <span>Ti è stato utile? Offrimi un caffè</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Cache elementi UI
    const box = document.getElementById("mercatorum-downloader-box");
    const toggleMin = document.getElementById("m-toggle-min");
    const inputFolder = document.getElementById("m-input-folder");
    const statCountEl = document.getElementById("m-stat-count");
    const btnAutoToggle = document.getElementById("m-btn-auto-toggle");
    const btnPauseAuto = document.getElementById("m-btn-pause-auto");
    const optCloseAfter = document.getElementById("m-opt-close-after");
    const logBox = document.getElementById("m-log-box");

    UD.ui = {
      box,
      toggleMin,
      inputFolder,
      statCountEl,
      btnAutoToggle,
      btnPauseAuto,
      optCloseAfter,
      logBox
    };

    UD.appendLog = function (msg, color = "#94a3b8") {
      const d = document.createElement("div");
      d.style.color = color;
      d.innerText = msg;
      d.title = msg;
      logBox.appendChild(d);
      if (logBox.children.length > 150) logBox.firstElementChild.remove();
      logBox.scrollTop = logBox.scrollHeight;
    };

    // --- Geometria e Riposizionamento Dinamico ---
    function ensureWithinViewport() {
      const rect = box.getBoundingClientRect();
      let newLeft = rect.left;
      let newTop = rect.top;

      const maxLeft = Math.max(10, window.innerWidth - rect.width - 15);
      const maxTop = Math.max(10, window.innerHeight - rect.height - 15);

      let adjusted = false;

      // Se esce sotto dal viewport
      if (rect.bottom > window.innerHeight - 15 || newTop > maxTop) {
        newTop = maxTop;
        adjusted = true;
      }
      // Se esce sopra
      if (newTop < 10) {
        newTop = 10;
        adjusted = true;
      }
      // Se esce a destra
      if (rect.right > window.innerWidth - 15 || newLeft > maxLeft) {
        newLeft = maxLeft;
        adjusted = true;
      }
      // Se esce a sinistra
      if (newLeft < 10) {
        newLeft = 10;
        adjusted = true;
      }

      // Applica la nuova posizione corretta
      if (adjusted || (box.style.top && box.style.top !== "auto")) {
        box.style.left = `${Math.round(newLeft)}px`;
        box.style.top = `${Math.round(newTop)}px`;
        box.style.right = "auto";
        box.style.bottom = "auto";
      }
    }

    UD.ensureWithinViewport = ensureWithinViewport;

    function snapToBottomCorner() {
      const rect = box.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const isLeft = centerX < window.innerWidth / 2;

      const badgeWidth = box.offsetWidth || 180;
      const badgeHeight = box.offsetHeight || 38;

      const targetLeft = isLeft ? 20 : Math.max(10, window.innerWidth - badgeWidth - 20);
      const targetTop = Math.max(10, window.innerHeight - badgeHeight - 20);

      box.style.left = `${Math.round(targetLeft)}px`;
      box.style.top = `${Math.round(targetTop)}px`;
      box.style.right = "auto";
      box.style.bottom = "auto";
    }

    function applyPosition(left, top) {
      const rect = box.getBoundingClientRect();
      const w = rect.width || box.offsetWidth || 200;
      const h = rect.height || box.offsetHeight || 40;

      const maxLeft = Math.max(10, window.innerWidth - w - 10);
      const maxTop = Math.max(10, window.innerHeight - h - 10);
      const safeLeft = Math.min(Math.max(10, left), maxLeft);
      const safeTop = Math.min(Math.max(10, top), maxTop);

      box.style.left = `${Math.round(safeLeft)}px`;
      box.style.top = `${Math.round(safeTop)}px`;
      box.style.right = "auto";
      box.style.bottom = "auto";
    }

    function savePosition() {
      const rect = box.getBoundingClientRect();
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          panelPos: { left: rect.left, top: rect.top }
        });
      }
    }

    function toggleMinimized() {
      const isExpanding = box.classList.contains("minimized");
      box.classList.toggle("minimized");

      if (isExpanding) {
        requestAnimationFrame(() => {
          ensureWithinViewport();
          setTimeout(ensureWithinViewport, 60);
          setTimeout(() => {
            ensureWithinViewport();
            savePosition();
          }, 220);
        });
      } else {
        requestAnimationFrame(() => {
          snapToBottomCorner();
          setTimeout(() => {
            snapToBottomCorner();
            savePosition();
          }, 80);
        });
      }
    }

    // Ripristina posizione salvata
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ panelPos: null }, (res) => {
        if (res && res.panelPos) {
          applyPosition(res.panelPos.left, res.panelPos.top);
          ensureWithinViewport();
        }
      });
    }

    // --- Drag & Drop ---
    let isDragging = false;
    let hasDragged = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    toggleMin.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") || e.target.closest("a") || e.target.closest("input")) return;

      isDragging = true;
      hasDragged = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const rect = box.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      box.classList.add("dragging");
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (!hasDragged && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        hasDragged = true;
      }

      if (hasDragged) {
        applyPosition(initialLeft + dx, initialTop + dy);
      }
    });

    window.addEventListener("mouseup", () => {
      if (!isDragging) return;
      isDragging = false;
      box.classList.remove("dragging");

      if (hasDragged) {
        if (box.classList.contains("minimized")) {
          snapToBottomCorner();
          setTimeout(savePosition, 60);
        } else {
          savePosition();
        }
      } else {
        toggleMinimized();
      }
    });

    window.addEventListener("resize", () => {
      if (box.classList.contains("minimized")) {
        snapToBottomCorner();
      } else {
        ensureWithinViewport();
      }
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        if (!isDragging && !box.classList.contains("minimized")) {
          ensureWithinViewport();
        }
      });
      ro.observe(box);
    }
  };
})();
