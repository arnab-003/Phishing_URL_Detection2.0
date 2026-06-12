document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const urlEl = document.getElementById("url");
  const normalizedUrlEl = document.getElementById("normalizedUrl");
  const riskEl = document.getElementById("risk");
  const scoreEl = document.getElementById("score");
  const moreInfoBtn = document.getElementById("moreInfoBtn");
  const manualActionRow = document.getElementById("manualActionRow");

//  normalize the host name
  function normalizeHostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return "";
    }
  }


  // normalize the url
  function normalizeUrl(url) {   
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    let normalized = parsed.origin + parsed.pathname;
    if (parsed.search) normalized += parsed.search;

    if (normalized.endsWith("/") && parsed.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }

    return normalized.toLowerCase();
  } catch {
    return "";
  }
}

// display the url format
function formatDisplayUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = parsed.pathname || "/";
    const search = parsed.search || "";
    return `${hostname}${pathname}${search}`;
  } catch {
    return "";
  }
}

  function clearManualButtons() {
    manualActionRow.innerHTML = "";
  }

  function createButton(label, className, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.className = className;
    btn.addEventListener("click", onClick);
    manualActionRow.appendChild(btn);
  }

  function updateManualButtons(data) {
    clearManualButtons();

    if (!data || !data.url) return;

    const risk = String(data.risk_level || data.label || "")
      .trim()
      .toLowerCase();

    const currentUrl = data.url;

    console.log("Popup risk value:", risk);
    console.log("Full prediction data:", data);

    if (risk === "safe") {
      createButton("Mark as Danger", "danger-btn", () => markRule(currentUrl, "danger"));
    } else if (risk === "danger" || risk === "phishing" || risk === "malicious") {
      createButton("Mark as Safe", "safe-btn", () => markRule(currentUrl, "safe"));
    } else if (risk === "suspicious" || risk === "suspecious" || risk === "warning") {
      createButton("Mark as Safe", "safe-btn", () => markRule(currentUrl, "safe"));
      createButton("Mark as Danger", "danger-btn", () => markRule(currentUrl, "danger"));
    }
  }

  // if not prediction done
  function renderPrediction(data) {
    if (!data) {
      statusEl.textContent = "No prediction data available.";
      urlEl.textContent = "";
      normalizedUrlEl.textContent = "";
      riskEl.textContent = "";
      scoreEl.textContent = "";
      clearManualButtons();
      return;
    }

    const currentUrl = data.url || data.pageUrl || "N/A";
    const normalized = data.normalized_url || normalizeUrl(currentUrl);
    const shortUrl = data.short_url || getShortDisplayUrl(currentUrl);

    statusEl.textContent = data.label || "Unknown";
    urlEl.textContent = `URL: ${shortUrl}`;
    normalizedUrlEl.textContent = `Normalized URL: ${normalized || "N/A"}`;
    riskEl.textContent = `Risk: ${data.risk_level || "N/A"}`;
    scoreEl.textContent = `Legitimacy: ${(Number(data.prob_legit ?? 0) * 100).toFixed(2)}%`;

    updateManualButtons(data);
  }

  function loadPrediction() {
    chrome.storage.local.get(["latestPrediction"], (res) => {
      renderPrediction(res.latestPrediction);
    });
  }

  // when server is not running 
  function markRule(url, type) {
    const hostname = normalizeHostname(url);
    if (!hostname) {
      statusEl.textContent = "Invalid URL.";
      return;
    }

    chrome.storage.local.get(["safeUrls", "dangerUrls"], (res) => {
      let safeUrls = res.safeUrls || [];
      let dangerUrls = res.dangerUrls || [];

      safeUrls = safeUrls.filter((item) => item !== hostname);
      dangerUrls = dangerUrls.filter((item) => item !== hostname);

      if (type === "safe") {
        safeUrls.push(hostname);
      } else if (type === "danger") {
        dangerUrls.push(hostname);
      }

      // explanations for marked safe or danger
      chrome.storage.local.set({ safeUrls, dangerUrls }, () => {
        statusEl.textContent =
          type === "safe"
            ? "Marked as safe manually."
            : "Marked as danger manually.";

        riskEl.textContent =
          type === "safe"
            ? `Risk: safe (manual override)`
            : `Risk: danger (manual override)`;

        console.log("Updated safeUrls:", safeUrls);
        console.log("Updated dangerUrls:", dangerUrls);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.reload(tabs[0].id);
            setTimeout(loadPrediction, 500);
          }
        });
      });
    });
  }

  loadPrediction();

  // more info bbutton
  if (moreInfoBtn) {
    moreInfoBtn.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("details.html")
      });
    });
  }

// print legitimicy score
  scoreEl.textContent =
  data.prob_legit === null || data.prob_legit === undefined
    ? "Legitimacy: N/A"
    : `Legitimacy: ${(Number(data.prob_legit) * 100).toFixed(2)}%`;  

    // when server is not available
riskEl.textContent =
  data.label === "UNAVAILABLE"
    ? "Risk: server unavailable"
    : `Risk: ${data.risk_level || "unknown"}`;
});