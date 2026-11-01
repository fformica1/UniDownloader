// =============================================================
// UNIDOWNLOADER - MAIN ENTRY POINT
// =============================================================

(() => {
  const host = window.location.hostname.toLowerCase();
  const isAllowedHost =
    host.endsWith("multiversity.click") ||
    host.endsWith("unimercatorum.it") ||
    host.endsWith("unipegaso.it") ||
    host.endsWith("sanraffaele.roma.it") ||
    host.endsWith("uniroma5.it");

  if (!isAllowedHost) return;
  if (document.getElementById("mercatorum-downloader-root")) return;

  const UD = window.UniDownloader;
  if (!UD) {
    console.error("[UniDownloader] Moduli non caricati correttamente.");
    return;
  }

  // 1. Inizializza l'Interfaccia Utente e i controlli di posizione/drag
  UD.initUI();

  // 2. Inizializza i pulsanti e l'engine di automazione
  UD.initAutomation();

  // 3. Messaggio iniziale pulito nello stato attività
  UD.appendLog("Pronto per il download", "#94a3b8");
})();