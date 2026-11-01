document.addEventListener("DOMContentLoaded", () => {
  const togglePanel = document.getElementById("toggle-panel");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  function updateStatusUI(isVisible) {
    if (isVisible) {
      statusDot.classList.remove("off");
      statusText.textContent = "Pannello attivo a schermo";
      statusText.style.color = "#10b981";
    } else {
      statusDot.classList.add("off");
      statusText.textContent = "Pannello nascosto";
      statusText.style.color = "#94a3b8";
    }
  }

  // Carica stato salvato in chrome.storage
  chrome.storage.local.get({ panelVisible: true }, (res) => {
    const isVisible = res.panelVisible !== false;
    togglePanel.checked = isVisible;
    updateStatusUI(isVisible);
  });

  // Gestione cambio levetta
  togglePanel.addEventListener("change", () => {
    const isVisible = togglePanel.checked;

    // Salva preferenza in locale
    chrome.storage.local.set({ panelVisible: isVisible }, () => {
      updateStatusUI(isVisible);

      // Invia messaggio a tutte le schede aperte per aggiornare la visibilità in tempo reale
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: "set_panel_visibility",
              visible: isVisible
            }).catch(() => {
              // Ignora schede che non contengono il content script
            });
          }
        });
      });
    });
  });
});
