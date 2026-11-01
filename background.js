function waitForDownloadCompletion(downloadId, timeoutMs = 30000) {
    return new Promise((resolve) => {
        let timer = null;

        function listener(delta) {
            if (delta.id === downloadId) {
                if (delta.state && delta.state.current === "complete") {
                    cleanup();
                    resolve({ complete: true });
                } else if (delta.error || (delta.state && delta.state.current === "interrupted")) {
                    cleanup();
                    resolve({ complete: false, error: delta.error?.current || "interrotto" });
                }
            }
        }

        function cleanup() {
            if (timer) clearTimeout(timer);
            chrome.downloads.onChanged.removeListener(listener);
        }

        chrome.downloads.onChanged.addListener(listener);

        timer = setTimeout(() => {
            cleanup();
            // Se scade il timeout, consideriamo avviato con successo per non bloccare
            resolve({ complete: true, timeout: true });
        }, timeoutMs);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download_pdf") {
        const url = message.url;

        // Sanifica cartella e nome file per le rigide regole di Chrome Downloads API
        let folder = (message.folder || "UniDownloader_Dispense")
            .replace(/[/\\:*?"<>|]/g, "_")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^\.+|\.+$/g, "");

        let filename = (message.filename || "dispensa.pdf")
            .replace(/[/\\:*?"<>|]/g, " - ")
            .replace(/\s*-\s*-\s*/g, " - ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^\.+|\.+$/g, "");

        const targetPath = `${folder}/${filename}`;

        console.log("[Downloader] Richiesta download:", { url, targetPath });

        chrome.downloads.download({
            url: url,
            filename: targetPath,
            conflictAction: "uniquify",
            saveAs: false
        }, async (downloadId) => {
            if (chrome.runtime.lastError) {
                console.warn("[Downloader] Download con sottocartella fallito:", chrome.runtime.lastError.message, "-> Riprovo nella cartella principale Downloads");

                // Fallback: scarica direttamente in Downloads/filename
                chrome.downloads.download({
                    url: url,
                    filename: filename,
                    conflictAction: "uniquify",
                    saveAs: false
                }, async (fbId) => {
                    if (chrome.runtime.lastError) {
                        console.error("[Downloader] Fallito anche fallback:", chrome.runtime.lastError.message);
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        console.log("[Downloader] Download fallback avviato con successo, id:", fbId);
                        if (message.waitForComplete) {
                            await waitForDownloadCompletion(fbId);
                        }
                        sendResponse({ success: true, downloadId: fbId, path: filename });
                    }
                });
            } else {
                console.log("[Downloader] Download avviato con successo in cartella, id:", downloadId);
                if (message.waitForComplete) {
                    await waitForDownloadCompletion(downloadId);
                }
                sendResponse({ success: true, downloadId: downloadId, path: targetPath });
            }
        });

        return true; // Mantiene aperta la porta per sendResponse asincrono
    }
});