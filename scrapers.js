// =============================================================
// UNIDOWNLOADER - PLATFORM DOM SCRAPERS & ACCORDION CONTROLLERS
// =============================================================

window.UniDownloader = window.UniDownloader || {};

(() => {
  const UD = window.UniDownloader;

  UD.getLessonCard = function (header) {
    if (!header) return null;
    let curr = header.parentElement;
    let best = header;

    while (curr && curr !== document.body && curr !== document.documentElement) {
      const otherLessons = Array.from(curr.querySelectorAll(".cursor-pointer")).filter((el) => {
        if (el === header) return false;
        const txt = el.innerText?.trim();
        return txt && (/^\d+\s*[\-\.\:\)]/i.test(txt) || /^Lezione\s+\d+/i.test(txt));
      });

      if (otherLessons.length > 0) {
        break;
      }

      best = curr;

      if (
        curr.classList.contains("border") ||
        curr.classList.contains("bg-white") ||
        curr.classList.contains("rounded") ||
        curr.classList.contains("v-expansion-panel") ||
        curr.tagName === "LI"
      ) {
        return curr;
      }

      curr = curr.parentElement;
    }

    return best || header.parentElement || header;
  };

  UD.isLessonOpen = function (lesson) {
    if (!lesson || !lesson.header) return false;
    const header = lesson.header;

    const svg = header.querySelector("svg, [id*='chevron']");
    if (svg) {
      const html = svg.outerHTML || "";
      if (
        html.includes("chevron-up") ||
        html.includes("2713.707") ||
        html.includes("rotate-180") ||
        svg.classList?.contains("rotate-180") ||
        svg.getAttribute("transform")?.includes("180")
      ) {
        return true;
      }
      if (
        html.includes("chevron-down") ||
        html.includes("2705.707") ||
        html.includes("rotate-0") ||
        svg.classList?.contains("rotate-0")
      ) {
        return false;
      }
    }

    if (header.getAttribute("aria-expanded") === "true") return true;
    if (header.getAttribute("aria-expanded") === "false") return false;

    const card = lesson.card || UD.getLessonCard(header);
    const elementsToCheck = [card, header.nextElementSibling].filter(Boolean);
    for (const container of elementsToCheck) {
      const rows = Array.from(container.querySelectorAll("div, li, p, a, button")).filter(
        (el) => !header.contains(el) && UD.isElementVisible(el)
      );
      for (const r of rows) {
        const t = r.innerText?.trim() || "";
        if (/dispensa|videolezione|materiale\s*didattico/i.test(t)) {
          return true;
        }
      }
    }

    return false;
  };

  UD.openLesson = async function (lesson) {
    if (!lesson || !lesson.header) return false;
    if (UD.isInVideoPlayer(lesson.header)) return false;

    if (UD.isLessonOpen(lesson)) {
      UD.pauseAllVideos();
      return true;
    }

    lesson.header.scrollIntoView({ behavior: "auto", block: "center" });
    await UD.sleep(200);

    lesson.header.click();
    UD.pauseAllVideos();

    let start = Date.now();
    while (Date.now() - start < 800) {
      await UD.sleep(100);
      if (UD.isLessonOpen(lesson)) {
        await UD.sleep(350);
        UD.pauseAllVideos();
        return true;
      }
    }

    const rect = lesson.header.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    lesson.header.dispatchEvent(new MouseEvent("mousedown", opts));
    lesson.header.dispatchEvent(new MouseEvent("mouseup", opts));
    lesson.header.dispatchEvent(new MouseEvent("click", opts));

    const chevron = lesson.header.querySelector("svg, [id*='chevron']");
    if (chevron) {
      chevron.dispatchEvent(new MouseEvent("click", opts));
      try { chevron.click(); } catch (_) {}
    }

    start = Date.now();
    while (Date.now() - start < 1200) {
      await UD.sleep(120);
      if (UD.isLessonOpen(lesson)) {
        await UD.sleep(350);
        UD.pauseAllVideos();
        return true;
      }
    }

    UD.pauseAllVideos();
    return UD.isLessonOpen(lesson);
  };

  UD.closeLesson = async function (lesson) {
    if (!lesson || !lesson.header) return;
    if (UD.isInVideoPlayer(lesson.header)) return;

    if (!UD.isLessonOpen(lesson)) {
      return;
    }

    lesson.header.scrollIntoView({ behavior: "auto", block: "center" });
    await UD.sleep(150);

    lesson.header.click();

    let start = Date.now();
    while (Date.now() - start < 900) {
      await UD.sleep(100);
      if (!UD.isLessonOpen(lesson)) break;
    }
    await UD.sleep(250);
    UD.pauseAllVideos();
  };

  UD.isAccordionOpen = function (header) {
    if (!header) return false;
    const svg = header.querySelector("svg, [id*='chevron']");
    if (svg) {
      const html = svg.outerHTML || "";
      if (
        html.includes("chevron-up") ||
        html.includes("2713.707") ||
        html.includes("rotate-180") ||
        svg.classList?.contains("rotate-180") ||
        svg.getAttribute("transform")?.includes("180")
      ) {
        return true;
      }
      if (
        html.includes("chevron-down") ||
        html.includes("2705.707") ||
        html.includes("rotate-0") ||
        svg.classList?.contains("rotate-0")
      ) {
        return false;
      }
    }

    if (header.getAttribute("aria-expanded") === "true") return true;
    if (header.getAttribute("aria-expanded") === "false") return false;

    const parentContainer = header.closest(".relative, .v-expansion-panel, .border, .card") || header.parentElement;
    if (parentContainer) {
      const visibleLessons = Array.from(parentContainer.querySelectorAll(".cursor-pointer")).filter((el) => {
        if (el === header) return false;
        const txt = el.innerText?.trim();
        return UD.isElementVisible(el) && (/^\d+\s*[\-\.\:\)]/i.test(txt) || /^Lezione\s+\d+/i.test(txt));
      });
      if (visibleLessons.length > 0) return true;
    }

    return false;
  };

  UD.openAccordion = async function (header, maxWaitMs = 2500) {
    if (!header) return true;
    if (UD.isInVideoPlayer(header)) return false;
    if (UD.isAccordionOpen(header)) {
      UD.pauseAllVideos();
      return true;
    }

    const clickTarget = header.querySelector(".cursor-pointer") || header;
    clickTarget.scrollIntoView({ behavior: "auto", block: "center" });
    await UD.sleep(200);

    clickTarget.click();
    if (clickTarget !== header) {
      try { header.click(); } catch (_) {}
    }
    UD.pauseAllVideos();

    let start = Date.now();
    while (Date.now() - start < 800) {
      await UD.sleep(100);
      if (UD.isAccordionOpen(header)) {
        await UD.sleep(400);
        UD.pauseAllVideos();
        return true;
      }
    }

    const rect = clickTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    clickTarget.dispatchEvent(new MouseEvent("mousedown", opts));
    clickTarget.dispatchEvent(new MouseEvent("mouseup", opts));
    clickTarget.dispatchEvent(new MouseEvent("click", opts));

    const chevron = header.querySelector("svg, [id*='chevron']");
    if (chevron) {
      chevron.dispatchEvent(new MouseEvent("click", opts));
      try { chevron.click(); } catch (_) {}
    }

    start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await UD.sleep(150);
      if (UD.isAccordionOpen(header)) {
        await UD.sleep(500);
        UD.pauseAllVideos();
        return true;
      }
    }

    UD.pauseAllVideos();
    return UD.isAccordionOpen(header);
  };

  UD.closeAccordion = async function (header) {
    if (!header) return true;
    if (UD.isInVideoPlayer(header)) return false;
    if (!UD.isAccordionOpen(header)) return true;

    header.scrollIntoView({ behavior: "auto", block: "center" });
    await UD.sleep(200);

    header.click();

    let start = Date.now();
    while (Date.now() - start < 800) {
      await UD.sleep(100);
      if (!UD.isAccordionOpen(header)) {
        await UD.sleep(350);
        UD.pauseAllVideos();
        return true;
      }
    }

    const rect = header.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    header.dispatchEvent(new MouseEvent("mousedown", opts));
    header.dispatchEvent(new MouseEvent("mouseup", opts));
    header.dispatchEvent(new MouseEvent("click", opts));

    const chevron = header.querySelector("svg, [id*='chevron']");
    if (chevron) {
      chevron.dispatchEvent(new MouseEvent("click", opts));
      try { chevron.click(); } catch (_) {}
    }

    start = Date.now();
    while (Date.now() - start < 1200) {
      await UD.sleep(120);
      if (!UD.isAccordionOpen(header)) {
        await UD.sleep(350);
        UD.pauseAllVideos();
        return true;
      }
    }

    UD.pauseAllVideos();
    return !UD.isAccordionOpen(header);
  };

  UD.findMacroArgomenti = function () {
    const macros = [];

    const isLessonTxt = (txt) =>
      /^\d+/i.test(txt) ||
      /^(?:Lezione|Lez\.?|Lesson)/i.test(txt) ||
      /^(?:Dispensa|Approfondimento|Esercitazione|Test|Verifica|Laboratorio|Materiale|Riepilogo|Conclusioni)/i.test(txt);

    const containers = Array.from(
      document.querySelectorAll("div.relative.capitalize, div[class*='capitalize']")
    );
    for (const c of containers) {
      if (c.closest("#mercatorum-downloader-root")) continue;
      if (UD.isInVideoPlayer(c)) continue;
      const header = c.querySelector(".cursor-pointer") || c;
      if (UD.isInVideoPlayer(header)) continue;
      const txt = header.innerText?.split(/[\r\n]+/)[0]?.trim();
      if (!txt || isLessonTxt(txt)) continue;
      if (!macros.some((m) => m.title === txt)) {
        macros.push({
          container: c,
          header: header,
          title: txt
        });
      }
    }

    const allPointers = Array.from(
      document.querySelectorAll(".cursor-pointer, .v-expansion-panel-header, [class*='accordion-header']")
    );
    for (const el of allPointers) {
      if (el.closest("#mercatorum-downloader-root")) continue;
      if (UD.isInVideoPlayer(el)) continue;
      const txt = el.innerText?.split(/[\r\n]+/)[0]?.trim();
      if (!txt || isLessonTxt(txt)) continue;
      if (/^(?:chiudi|apri|indietro|avanti|logout|esci|profilo|cerca|salva|invia|filtra|download)$/i.test(txt)) continue;

      const hasChevron = el.querySelector("svg, [id*='chevron'], [class*='chevron']");
      const isTopicWord = /^(?:Argomento|Modulo|Unità|Unita|Capitolo|Parte)\s*\d+/i.test(txt);

      if (isTopicWord || (hasChevron && (el.closest(".v-expansion-panel") || el.classList.contains("capitalize")))) {
        if (!macros.some((m) => m.title === txt)) {
          const container = el.closest(".relative, .v-expansion-panel, .border, .card") || el.parentElement;
          macros.push({
            container: container,
            header: el,
            title: txt
          });
        }
      }
    }

    return macros;
  };

  UD.findLessons = function (container = document) {
    const candidates = Array.from(
      container.querySelectorAll(".cursor-pointer, .v-expansion-panel-header, [class*='accordion-header']")
    );
    const lessons = [];

    for (const el of candidates) {
      if (el.closest("#mercatorum-downloader-root")) continue;
      if (UD.isInVideoPlayer(el)) continue;
      const txt = el.innerText?.trim();
      if (!txt) continue;

      // Salta macro argomenti e pulsanti generici
      if (/^(?:Argomento|Modulo|Unità|Unita|Capitolo|Parte)\s*\d+/i.test(txt)) continue;
      if (/^(?:chiudi|apri|indietro|avanti|logout|esci|profilo|cerca|salva|invia|filtra|download|scarica|visualizza)$/i.test(txt)) continue;
      // Salta bottoni del player o delle videolezioni
      if (/^(?:videolezione|video\s*lezione|guarda\s*videolezione|traccia\s*\d+|play|pause)/i.test(txt)) continue;

      const isLesson =
        /^\d+/i.test(txt) ||
        /^(?:Lezione|Lez\.?|Lesson)/i.test(txt) ||
        /^(?:Dispensa|Approfondimento|Esercitazione|Test|Verifica|Laboratorio|Materiale|Riepilogo|Conclusioni)/i.test(txt);

      if (isLesson) {
        const rawTitle = UD.cleanLessonTitle(txt);
        const card = UD.getLessonCard(el);

        if (!lessons.some((l) => l.rawTitle === rawTitle)) {
          lessons.push({
            header: el,
            card: card,
            rawTitle: rawTitle
          });
        }
      }
    }

    return lessons;
  };

  UD.waitForLessonsInMacro = async function (macro, maxWaitMs = 3500) {
    if (!macro || !macro.container) return [];

    let lessons = UD.findLessons(macro.container);
    if (lessons.length > 0) return lessons;

    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await UD.sleep(250);
      lessons = UD.findLessons(macro.container);
      if (lessons.length > 0) return lessons;

      const parentContainer =
        macro.header.closest(".relative, .v-expansion-panel, .border, .card") || macro.header.parentElement;
      if (parentContainer && parentContainer !== macro.container) {
        lessons = UD.findLessons(parentContainer);
        if (lessons.length > 0) return lessons;
      }

      if (Date.now() - start > 1500 && Date.now() - start < 1900) {
        if (!UD.isAccordionOpen(macro.header)) {
          await UD.openAccordion(macro.header);
        }
      }
    }

    return lessons;
  };

  UD.findAllOpenDispense = function () {
    const results = [];
    const allLessons = UD.findLessons(document);

    for (const lesson of allLessons) {
      const container = lesson.card || lesson.header.parentElement;
      const elementsToSearch = [container, lesson.header.nextElementSibling].filter(Boolean);

      let url = null;
      let actionBtn = null;

      for (const c of elementsToSearch) {
        const directLink = c.querySelector("a[href*='.pdf'], a[href*='cloudfront.net'], a[href*='dispensa'], a[href*='material']");
        if (directLink && directLink.href && !directLink.href.endsWith("#") && !directLink.href.startsWith("javascript:")) {
          url = directLink.href;
        }

        const rows = Array.from(c.querySelectorAll("div, li, tr, p, button, a")).filter(
          (r) => UD.isElementVisible(r) && /dispensa|materiale\s*didattico/i.test(r.innerText || "")
        );
        for (const r of rows) {
          if (!url) {
            const a = r.querySelector("a[href*='.pdf'], a[href*='cloudfront.net'], a[href]");
            if (a && a.href && !a.href.endsWith("#") && !a.href.startsWith("javascript:")) {
              url = a.href;
            }
          }
          if (!actionBtn) {
            const btn = r.querySelector("button, a") || (r.tagName === "BUTTON" || r.tagName === "A" ? r : null);
            if (btn && /visualizza|scarica/i.test(btn.innerText || "")) {
              actionBtn = btn;
            }
          }
        }

        if (!url && !actionBtn) {
          const btns = Array.from(c.querySelectorAll("button, a")).filter(
            (b) => UD.isElementVisible(b) && /visualizza|scarica dispensa/i.test(b.innerText || "")
          );
          if (btns.length > 0) actionBtn = btns[0];
        }

        if (url || actionBtn) break;
      }

      if (url || actionBtn) {
        results.push({
          lesson: lesson,
          title: lesson.rawTitle,
          url: url,
          actionBtn: actionBtn,
          container: container
        });
      }
    }

    if (results.length === 0) {
      const orphanPdf = Array.from(
        document.querySelectorAll("a[href*='.pdf'], a[href*='cloudfront.net']")
      ).filter((a) => a.href && !a.href.endsWith("#") && !a.href.startsWith("javascript:") && UD.isElementVisible(a));

      const allVisibleRows = Array.from(document.querySelectorAll("div, li, tr, p")).filter((r) => UD.isElementVisible(r));
      const orphanDispRow = allVisibleRows.find((r) => {
        const t = r.innerText?.trim() || "";
        return /dispensa/i.test(t) && t.length < 150 && (r.querySelector("a, button") || /visualizza|scarica/i.test(t));
      });

      if (orphanPdf.length > 0 || orphanDispRow || UD.capturedUrl) {
        let url = UD.capturedUrl || (orphanPdf.length > 0 ? orphanPdf[0].href : null);
        let actionBtn = null;
        if (!url && orphanDispRow) {
          actionBtn = orphanDispRow.querySelector("button, a");
        }

        let title = "Dispensa Lezione";
        const refEl = orphanDispRow || actionBtn || (orphanPdf.length > 0 ? orphanPdf[0] : null);
        let curr = refEl?.parentElement;
        while (curr && curr !== document.body && title === "Dispensa Lezione") {
          const headings = Array.from(curr.querySelectorAll("h1, h2, h3, h4, span, div, p"));
          for (const h of headings) {
            const t = h.innerText?.trim();
            if (t && (/^\d+\s*[\-\.\:\)]/i.test(t) || /^Lezione\s+\d+/i.test(t)) && t.length < 120) {
              title = UD.cleanLessonTitle(t);
              break;
            }
          }
          curr = curr.parentElement;
        }

        results.push({
          lesson: null,
          title: title,
          url: url,
          actionBtn: actionBtn,
          container: refEl?.parentElement || document.body
        });
      }
    }

    return results;
  };

  UD.findNextUndownloadedDispensa = function () {
    const allDispense = UD.findAllOpenDispense();
    if (allDispense.length === 0) return null;

    for (const item of allDispense) {
      if (item.url && UD.downloadedUrls && UD.downloadedUrls.has(item.url)) {
        continue;
      }
      const cleanTitle = UD.cleanLessonTitle(item.title);
      const isAlreadySaved =
        UD.downloadedFilenames &&
        Array.from(UD.downloadedFilenames).some((fn) => fn.includes(cleanTitle));
      if (isAlreadySaved && item.url && UD.downloadedUrls && UD.downloadedUrls.has(item.url)) {
        continue;
      }

      return item;
    }

    return null;
  };
})();
