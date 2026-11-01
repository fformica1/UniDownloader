// =============================================================
// UNIDOWNLOADER - UTILITIES & HELPERS
// =============================================================

window.UniDownloader = window.UniDownloader || {};

(() => {
  const UD = window.UniDownloader;

  UD.sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  UD.isElementVisible = function (el) {
    if (!el || !el.isConnected) return false;
    try {
      if (el.offsetHeight > 0 && el.offsetWidth > 0) return true;
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return true;

      // Se le dimensioni geometriche sono 0 (es. dentro un pannello chiuso con height:0 o overflow:hidden) non è visibile
      if (rect.height === 0 || el.offsetHeight === 0) return false;

      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
    } catch (_) {
      return false;
    }
  };

  UD.isInVideoPlayer = function (el) {
    if (!el) return false;
    try {
      if (el.tagName === "VIDEO" || el.tagName === "AUDIO") return true;
      if (
        el.closest(
          "video, audio, .video-js, [class*='vjs-'], [class*='player'], [id*='player'], [class*='jwplayer'], [class*='media-player'], iframe, [class*='stepper'], [class*='tracc'], [id*='tracc'], [class*='video-wrapper'], [class*='videoplayer'], [class*='video_container'], [class*='video-container']"
        )
      ) {
        return true;
      }
      const aria = (el.getAttribute("aria-label") || "").toLowerCase();
      const title = (el.getAttribute("title") || "").toLowerCase();
      const cls = (typeof el.className === "string" ? el.className : "").toLowerCase();
      const txt = (el.innerText || "").toLowerCase().trim();
      if (
        /play|pause|volume|mute|unmute|fullscreen|playback|speed|seek|scrubber|progress|caption|subtitle|traccia\s*\d+|prossima\s*videolezione|videolezione\s*successiva|avanti|successiv[ao]/i.test(
          aria + " " + title + " " + cls
        )
      ) {
        return true;
      }
      if (/^(?:traccia\s*\d+|videolezione\s*\d+|guarda\s*videolezione|avanti|successiv[ao])$/i.test(txt)) {
        return true;
      }
    } catch (_) {}
    return false;
  };

  UD.pauseAllVideos = function () {
    try {
      const videos = document.querySelectorAll("video, audio");
      videos.forEach((v) => {
        if (!v.paused) {
          v.pause();
        }
      });
    } catch (_) {}
  };

  UD.cleanLessonTitle = function (text) {
    if (!text) return "Dispensa";

    // Suddividi in righe e filtra metadati piattaforma (badge stato, percentuali, durate)
    const rawLines = text
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const filteredLines = rawLines.filter((line) => {
      if (/^(?:completat[oa]|in corso|non avviat[oa]|visualizzat[oa]|superat[oa])$/i.test(line)) return false;
      if (/^\d{1,3}%$/.test(line)) return false;
      if (/^\d{1,2}:\d{2}(?::\d{2})?\s*(?:min)?$/i.test(line)) return false;
      return true;
    });

    if (filteredLines.length === 0) return "Dispensa";

    let clean = "";
    // Se la prima riga è solo un numero/etichetta lezione (es. "1" o "Lezione 1") e le righe successive contengono il titolo
    if (
      filteredLines.length > 1 &&
      /^(?:Lezione|Lez\.?|Lesson)?\s*\d+$/i.test(filteredLines[0])
    ) {
      const numOnly = filteredLines[0].replace(/\D/g, "");
      const remainingText = filteredLines.slice(1).join(" ");
      clean = `${numOnly} - ${remainingText}`;
    } else {
      clean = filteredLines.join(" ");
    }

    // Rimuovi eventuali badge o durate rimasti inline
    clean = clean.replace(/\b(completat[oa]|in corso|non avviat[oa]|visualizzat[oa]|superat[oa])\b/gi, "");
    clean = clean.replace(/\b\d{1,3}%\b/g, "");
    clean = clean.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:min)?\b/gi, "");

    // Preserva e normalizza il numero e nome completo della lezione (es. "1 - Titolo" o "Lezione 1: Titolo" -> "1 - Titolo")
    const numMatch = clean.match(/^(?:Lezione|Lez\.?|Lesson)?\s*(\d+)[\s\.\:\-\)\–\—]+(.*)$/i);
    if (numMatch) {
      const lessonNum = numMatch[1];
      const rest = numMatch[2].trim().replace(/^[\s\.\:\-\)\–\—]+/, "").trim();
      clean = `${lessonNum} - ${rest}`;
    }

    // Rimuovi punteggiatura residua in coda
    clean = clean.replace(/[\s\.\:\-\)\–\—]+$/, "").trim();

    // Sanifica caratteri speciali filesystem (/ \ : * ? " < > |) per compatibilità Chrome Downloads
    clean = clean.replace(/[/\\:*?"<>|]/g, " - ");
    clean = clean.replace(/\s*-\s*-\s*/g, " - ");
    clean = clean.replace(/\s+/g, " ").trim();

    return clean || "Dispensa";
  };

  UD.detectCourseName = function () {
    const selectors = [
      ".course-title",
      ".titolo-corso",
      ".titolo-insegnamento",
      ".course-name",
      "[class*='course-title']",
      "[class*='corso-title']",
      "header h1",
      "header h2",
      ".v-toolbar__title"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const txt = el?.innerText?.trim();
      if (txt && txt.length > 2 && txt.length < 90 && !/dashboard|home/i.test(txt)) {
        return txt.replace(/[/\\:*?"<>|]/g, "_").trim();
      }
    }

    const breadcrumbs = Array.from(
      document.querySelectorAll(".breadcrumb li, .breadcrumb a, .breadcrumb span, [class*='breadcrumb'] *")
    );
    for (const b of breadcrumbs) {
      const t = b.innerText?.trim();
      if (t && t.length > 3 && t.length < 80 && !/home|dashboard|corsi|insegnamenti|lezioni|laurea/i.test(t)) {
        return t.replace(/[/\\:*?"<>|]/g, "_").trim();
      }
    }

    if (document.title) {
      let t = document.title
        .replace(/universitas mercatorum/gi, "")
        .replace(/mercatorum/gi, "")
        .replace(/universit[àa] telematica pegaso/gi, "")
        .replace(/pegaso/gi, "")
        .replace(/universit[àa] telematica san raffaele/gi, "")
        .replace(/san raffaele roma/gi, "")
        .replace(/san raffaele/gi, "")
        .replace(/uniroma5/gi, "")
        .replace(/multiversity/gi, "")
        .replace(/piattaforma/gi, "")
        .replace(/e-learning/gi, "")
        .replace(/[-|_|–]/g, " ")
        .trim();
      if (t && t.length > 2) return t.replace(/[/\\:*?"<>|]/g, "_").trim();
    }

    return "Corso";
  };

  UD.getPlatformInfo = function () {
    return { name: "UniDownloader", label: "UniDownloader" };
  };

  UD.downloadViaExtension = function (url, filename, folder, waitForComplete = true) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "download_pdf", url, filename, folder, waitForComplete },
        (response) => resolve(response || { success: false })
      );
    });
  };

  UD.triggerDomDownload = function (url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  };

  // Intercettazione URL PDF
  UD.capturedUrl = null;
  const originalOpen = window.open;
  window.open = function (url) {
    if (url && (url.includes(".pdf") || url.includes("cloudfront.net"))) {
      UD.capturedUrl = url;
      return null;
    }
    return originalOpen ? originalOpen.apply(this, arguments) : null;
  };

  document.addEventListener(
    "click",
    (e) => {
      const link = e.target.closest("a[href*='.pdf'], a[href*='cloudfront.net']");
      if (link && link.href) {
        UD.capturedUrl = link.href;
      }
    },
    true
  );
})();
