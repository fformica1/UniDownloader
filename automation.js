// =============================================================
// UNIDOWNLOADER - AUTOMATION & DOWNLOAD ENGINE
// =============================================================

window.UniDownloader = window.UniDownloader || {};

(() => {
  const UD = window.UniDownloader;

  UD.isDownloading = false;
  UD.isAutoRunning = false;
  UD.isAutoPaused = false;
  UD.abortAutoRequested = false;
  UD.scaricati = 0;
  UD.currentDownloadIndex = 1;
  UD.downloadedUrls = new Set();
  UD.downloadedFilenames = new Set();

  UD.processAndDownloadDispensa = async function (dispensaItem, isManual = false) {
    if (UD.isDownloading) return false;
    UD.isDownloading = true;

    try {
      if (!dispensaItem.url && dispensaItem.actionBtn) {
        if (
          dispensaItem.actionBtn.tagName === "A" &&
          dispensaItem.actionBtn.href &&
          !dispensaItem.actionBtn.href.startsWith("javascript:") &&
          !dispensaItem.actionBtn.href.endsWith("#")
        ) {
          dispensaItem.url = dispensaItem.actionBtn.href;
        } else {
          UD.capturedUrl = null;
          dispensaItem.actionBtn.scrollIntoView({ behavior: "auto", block: "center" });
          await UD.sleep(150);
          dispensaItem.actionBtn.click();

          let waitAttempts = 0;
          while (!UD.capturedUrl && waitAttempts < 16) {
            await UD.sleep(250);
            waitAttempts++;

            if (waitAttempts === 8 && !UD.capturedUrl) {
              try {
                dispensaItem.actionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                dispensaItem.actionBtn.click();
              } catch (_) {}
            }

            if (!UD.capturedUrl && dispensaItem.container) {
              const newLink = dispensaItem.container.querySelector(
                "a[href*='.pdf'], a[href*='cloudfront.net'], a[href*='dispensa'], a[href*='material']"
              );
              if (newLink && newLink.href && !newLink.href.endsWith("#")) {
                UD.capturedUrl = newLink.href;
              }
            }

            if (!UD.capturedUrl) {
              const iframe = document.querySelector("iframe[src*='.pdf'], embed[src*='.pdf']");
              if (iframe && iframe.src) {
                UD.capturedUrl = iframe.src;
              }
            }
          }

          if (UD.capturedUrl) {
            dispensaItem.url = UD.capturedUrl;
          } else {
            return false;
          }
        }
      }

      if (!dispensaItem.url) {
        if (isManual) alert("Nessun link PDF rilevato per questa lezione.");
        return false;
      }

      if (UD.downloadedUrls.has(dispensaItem.url)) {
        return true;
      }

      const inputFolder = UD.ui?.inputFolder;
      const targetFolder = inputFolder?.value.trim() || `${UD.getPlatformInfo().name} - ${UD.detectCourseName()}`;

      // Numerazione consecutiva progressiva da 01 all'ultimo numero disponibile per tutto il corso
      const prefix = String(UD.currentDownloadIndex).padStart(2, "0");
      const cleanTitle = UD.cleanLessonTitle(dispensaItem.title);
      const finalFilename = `${prefix} - ${cleanTitle}.pdf`;

      if (UD.downloadedFilenames.has(finalFilename)) {
        return true;
      }

      const res = await UD.downloadViaExtension(dispensaItem.url, finalFilename, targetFolder, true);
      if (res && res.success) {
        UD.scaricati++;
        UD.downloadedUrls.add(dispensaItem.url);
        UD.downloadedFilenames.add(finalFilename);
        UD.appendLog(`Scaricato [${prefix}]: ${cleanTitle}`, "#4ade80");
      } else {
        UD.triggerDomDownload(dispensaItem.url, finalFilename);
        UD.scaricati++;
        UD.downloadedUrls.add(dispensaItem.url);
        UD.downloadedFilenames.add(finalFilename);
        UD.appendLog(`Scaricato [${prefix}]: ${cleanTitle}`, "#4ade80");
      }

      UD.currentDownloadIndex++;
      if (UD.ui?.statCountEl) {
        UD.ui.statCountEl.innerText = `Scaricati: ${UD.scaricati}`;
      }

      return true;
    } catch (err) {
      console.error("[Downloader] Errore nel download:", err);
      UD.appendLog(`Errore: ${err.message}`, "#f87171");
      return false;
    } finally {
      UD.capturedUrl = null;
      UD.isDownloading = false;
    }
  };

  UD.waitWhilePaused = async function () {
    while (UD.isAutoPaused && !UD.abortAutoRequested) {
      await UD.sleep(300);
    }
  };

  UD.startAutoWorkflow = async function () {
    const ui = UD.ui;
    if (!ui) return;

    UD.isAutoRunning = true;
    UD.isAutoPaused = false;
    UD.abortAutoRequested = false;
    UD.scaricati = 0;
    UD.currentDownloadIndex = 1;
    UD.downloadedUrls.clear();
    UD.downloadedFilenames.clear();

    ui.btnAutoToggle.innerText = "Interrompi Download";
    ui.btnAutoToggle.classList.add("active");
    ui.btnPauseAuto.style.display = "flex";
    ui.btnPauseAuto.innerText = "Pausa";
    UD.ensureWithinViewport?.();

    UD.appendLog("Avvio download automatico...", "#df5a4c");

    const beforeUnloadListener = (e) => {
      e.preventDefault();
      e.returnValue = "Download in corso. Se esci o ricarichi la pagina, il download verrà interrotto!";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", beforeUnloadListener);

    try {
      let initialMacros = UD.findMacroArgomenti();

      // Ignora sempre il primo elemento (il tuo nome) e inizia a contare dal secondo come fosse il primo
      if (initialMacros.length > 1) {
        initialMacros = initialMacros.slice(1);
      }

      // 1. Chiusura preventiva di tutti i macro-argomenti aperti prima di avviare il download
      UD.appendLog("Reset iniziale: chiusura argomenti aperti...", "#94a3b8");
      UD.pauseAllVideos?.();

      for (const m of initialMacros) {
        if (UD.abortAutoRequested) break;
        if (UD.isAccordionOpen(m.header) && !UD.isInVideoPlayer(m.header)) {
          await UD.closeAccordion(m.header);
          await UD.sleep(200);
        }
      }

      await UD.sleep(400);
      UD.pauseAllVideos?.();

      const macroTitles = initialMacros.map((m) => m.title);

      if (macroTitles.length > 0) {
        for (let mIdx = 0; mIdx < macroTitles.length; mIdx++) {
          if (UD.abortAutoRequested) break;
          await UD.waitWhilePaused();

          const targetTitle = macroTitles[mIdx];
          let liveMacros = UD.findMacroArgomenti();
          if (liveMacros.length > 1) {
            liveMacros = liveMacros.slice(1);
          }
          const currentMacro =
            liveMacros.find((m) => m.title === targetTitle) ||
            liveMacros[mIdx] ||
            initialMacros[mIdx];

          if (!currentMacro || !currentMacro.header) continue;

          await UD.openAccordion(currentMacro.header);
          await UD.sleep(600);
          UD.pauseAllVideos?.();

          let lessons = await UD.waitForLessonsInMacro(currentMacro, 4500);
          if (lessons.length === 0) {
            // Riprova apertura con click mirato
            const clickEl = currentMacro.header.querySelector(".cursor-pointer") || currentMacro.header;
            clickEl.click();
            await UD.sleep(800);
            UD.pauseAllVideos?.();
            lessons = await UD.waitForLessonsInMacro(currentMacro, 3500);
          }

          if (lessons.length === 0) {
            continue;
          }

          for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
            if (UD.abortAutoRequested) break;
            await UD.waitWhilePaused();

            const lessonRef = lessons[lIdx];
            const cleanTitle = UD.cleanLessonTitle(lessonRef.rawTitle);

            const liveLesson =
              UD.findLessons(currentMacro.container).find((l) => UD.cleanLessonTitle(l.rawTitle) === cleanTitle) ||
              UD.findLessons(document).find((l) => UD.cleanLessonTitle(l.rawTitle) === cleanTitle) ||
              lessonRef;

            liveLesson.header.scrollIntoView({ behavior: "auto", block: "center" });
            liveLesson.header.classList.add("m-active-processing-target");

            // 1. Apri la lezione
            await UD.openLesson(liveLesson);
            await UD.sleep(300);

            // 2. Cerca la dispensa
            let foundDispensa = null;
            let attempts = 0;
            const maxAttempts = 30;

            while (!foundDispensa && attempts < maxAttempts && !UD.abortAutoRequested) {
              await UD.waitWhilePaused();
              await UD.sleep(250);
              attempts++;

              const cardDispenses = UD.findAllOpenDispense().filter(
                (d) =>
                  d.lesson === liveLesson ||
                  (liveLesson.card && liveLesson.card.contains(d.container)) ||
                  (liveLesson.header.parentElement && liveLesson.header.parentElement.contains(d.container))
              );

              if (cardDispenses.length > 0) {
                foundDispensa = cardDispenses[0];
              }

              if (!foundDispensa && attempts === 12) {
                if (!UD.isLessonOpen(liveLesson)) {
                  await UD.openLesson(liveLesson);
                }
              }
            }

            // 3. Scarica la dispensa
            if (foundDispensa) {
              const success = await UD.processAndDownloadDispensa(foundDispensa, false);
              if (!success) {
                UD.appendLog(`[Riprovo download] ${cleanTitle}`, "#fbbf24");
                await UD.sleep(700);
                await UD.processAndDownloadDispensa(foundDispensa, false);
              }
            } else {
              UD.appendLog(`[Nessuna dispensa] ${cleanTitle}`, "#94a3b8");
            }

            // 4. Chiudi la lezione prima di passare alla successiva
            if (ui.optCloseAfter?.checked) {
              const toClose =
                UD.findLessons(currentMacro.container).find((l) => UD.cleanLessonTitle(l.rawTitle) === cleanTitle) ||
                UD.findLessons(document).find((l) => UD.cleanLessonTitle(l.rawTitle) === cleanTitle) ||
                liveLesson;
              await UD.closeLesson(toClose);
              await UD.sleep(350);
            }

            liveLesson.header.classList.remove("m-active-processing-target");
            await UD.sleep(300);
          }

          // Chiusura argomento terminato
          if (ui.optCloseAfter?.checked) {
            const liveMacroToClose =
              UD.findMacroArgomenti().find((m) => m.title === targetTitle) || currentMacro;
            await UD.closeAccordion(liveMacroToClose.header);
            await UD.sleep(600);
          }
        }
      } else {
        const allLessons = UD.findLessons(document);

        for (let lIdx = 0; lIdx < allLessons.length; lIdx++) {
          if (UD.abortAutoRequested) break;
          await UD.waitWhilePaused();

          const lesson = allLessons[lIdx];
          const cleanTitle = UD.cleanLessonTitle(lesson.rawTitle);

          const liveLesson =
            UD.findLessons(document).find((l) => UD.cleanLessonTitle(l.rawTitle) === cleanTitle) || lesson;

          liveLesson.header.scrollIntoView({ behavior: "auto", block: "center" });
          liveLesson.header.classList.add("m-active-processing-target");

          await UD.openLesson(liveLesson);
          await UD.sleep(300);

          let foundDispensa = null;
          let attempts = 0;
          while (!foundDispensa && attempts < 30 && !UD.abortAutoRequested) {
            await UD.waitWhilePaused();
            await UD.sleep(250);
            attempts++;

            const anyNew = UD.findNextUndownloadedDispensa();
            if (anyNew) foundDispensa = anyNew;

            if (!foundDispensa && attempts === 12) {
              if (!UD.isLessonOpen(liveLesson)) {
                await UD.openLesson(liveLesson);
              }
            }
          }

          if (foundDispensa) {
            const success = await UD.processAndDownloadDispensa(foundDispensa, false);
            if (!success) {
              UD.appendLog(`[Riprovo download] ${cleanTitle}`, "#fbbf24");
              await UD.sleep(700);
              await UD.processAndDownloadDispensa(foundDispensa, false);
            }
          } else {
            UD.appendLog(`[Nessuna dispensa] ${cleanTitle}`, "#94a3b8");
          }

          if (ui.optCloseAfter?.checked) {
            const toClose =
              UD.findLessons(document).find((l) => UD.cleanLessonTitle(l.rawTitle) === cleanTitle) || liveLesson;
            await UD.closeLesson(toClose);
            await UD.sleep(350);
          }

          liveLesson.header.classList.remove("m-active-processing-target");
          await UD.sleep(300);
        }
      }

      if (UD.abortAutoRequested) {
        UD.appendLog(`Automazione interrotta (${UD.scaricati} dispense salvate)`, "#fbbf24");
      } else {
        UD.appendLog(`Download completato! (${UD.scaricati} dispense salvate)`, "#4ade80");
      }
    } catch (err) {
      console.error("[Downloader] Errore automazione:", err);
      UD.appendLog(`Errore: ${err.message}`, "#f87171");
    } finally {
      window.removeEventListener("beforeunload", beforeUnloadListener);
      UD.isAutoRunning = false;
      UD.isAutoPaused = false;
      UD.abortAutoRequested = false;
      ui.btnAutoToggle.innerText = "Avvia Download Automatico";
      ui.btnAutoToggle.classList.remove("active");
      ui.btnPauseAuto.style.display = "none";
      UD.ensureWithinViewport?.();

      document.querySelectorAll(".m-active-processing-target").forEach((el) => {
        el.classList.remove("m-active-processing-target");
      });
    }
  };

  UD.initAutomation = function () {
    const ui = UD.ui;
    if (!ui) return;

    ui.btnAutoToggle.onclick = () => {
      if (UD.isAutoRunning) {
        UD.abortAutoRequested = true;
        UD.appendLog("Interruzione download in corso...", "#fbbf24");
      } else {
        UD.startAutoWorkflow();
      }
    };

    ui.btnPauseAuto.onclick = () => {
      if (!UD.isAutoRunning) return;
      UD.isAutoPaused = !UD.isAutoPaused;
      if (UD.isAutoPaused) {
        ui.btnPauseAuto.innerText = "Riprendi";
        UD.appendLog("Automazione in pausa", "#facc15");
      } else {
        ui.btnPauseAuto.innerText = "Pausa";
        UD.appendLog("Automazione ripresa", "#4ade80");
      }
    };
  };
})();
