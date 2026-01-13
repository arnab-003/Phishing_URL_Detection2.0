chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: tab.url })
  })
    .then(res => res.json())
    .then(data => {
      // data now includes: original_url, normalized_url, label, prob_legit, risk_level, explanations
      chrome.tabs.sendMessage(tabId, data, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "No content script in this tab:",
            chrome.runtime.lastError.message
          );
        }
      });
    })
    .catch(err => console.error("Predict error:", err));
});
