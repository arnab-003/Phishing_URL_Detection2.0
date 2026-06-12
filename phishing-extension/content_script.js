console.log("content_script loaded on", window.location.href);
// data sends to pop up
chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
  if (!data || !data.label || !data.risk_level) return;

  const existing = document.getElementById("phish-guard-popup");
  if (existing) existing.remove();

  const isDanger = data.risk_level === "danger";
  const isSafe = data.risk_level === "safe";

  if (isSafe) {
    console.log("Safe site:", data.url);
    return;
  }

  const bgColor = isDanger ? "#b00020" : "#ff9800";   
  const titleText = isDanger
    ? "Warning: This site looks like a phishing website"
    : "Caution: This site looks suspicious";
  const borderColor = isDanger ? "#ffcccc" : "#fff3cd";

  const explanationItems = (data.explanations || [])
    .map((e) => `<li style="margin-bottom:4px;">${e}</li>`)
    .join("");

  const wrapper = document.createElement("div");
  wrapper.id = "phish-guard-popup";
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.right = "0";
  wrapper.style.zIndex = "999999";
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "center";
  wrapper.style.pointerEvents = "none";

  const box = document.createElement("div");
  box.style.maxWidth = "650px";
  box.style.margin = "16px";
  box.style.padding = "16px";
  box.style.borderRadius = "8px";
  box.style.background = bgColor;
  box.style.color = "#ffffff";
  box.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
  box.style.border = "2px solid " + borderColor;
  box.style.pointerEvents = "auto";

  box.innerHTML = `
    <div style="font-size:16px; font-weight:600; margin-bottom:8px;">
      ${titleText}
    </div>

    <div style="font-size:12px; opacity:0.95; margin-bottom:8px;">
      URL: <span style="word-break:break-all;">${data.url}</span>
    </div>

    <div style="font-size:12px; margin-bottom:8px;">
      <strong>Risk Level:</strong> ${data.risk_level} <br>
      <strong>Legitimacy Score:</strong> ${((data.prob_legit || 0) * 100).toFixed(2)}%
    </div>

    ${
      explanationItems
        ? `<ul style="font-size:13px; margin:0 0 12px 18px; padding:0;">
            ${explanationItems}
          </ul>`
        : ""
    }

    <div style="display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; margin-top:8px;">
      

      <button id="phish-guard-stay"
              style="padding:6px 12px; border-radius:4px; border:none;
                     background:#ffffff; color:${bgColor}; font-weight:500; cursor:pointer;">
        Stay here
      </button>

      <button id="phish-guard-back"
              style="padding:6px 12px; border-radius:4px; border:none;
                     background:#000000; color:#ffffff; font-weight:500; cursor:pointer;">
        Go back
      </button>
    </div>
  `;

  wrapper.appendChild(box);
  document.body.appendChild(wrapper);
// stay button and goback button
  const stayBtn = document.getElementById("phish-guard-stay");
  const backBtn = document.getElementById("phish-guard-back");
  const moreInfoBtn = document.getElementById("phish-guard-moreinfo");

  if (stayBtn) {
    stayBtn.onclick = () => {
      wrapper.remove();
    };
  }

  if (backBtn) {
    backBtn.onclick = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    };
  }

  // more info button
  if (moreInfoBtn) {
    moreInfoBtn.addEventListener("click", () => {
      console.log("More Info clicked");

      chrome.storage.local.get(["latestPrediction"], (res) => {
        console.log("Opening details with data:", res.latestPrediction);

        if (!res.latestPrediction) {
          statusEl.textContent = "No prediction data available.";
          return;
        }

        chrome.tabs.create({
          url: chrome.runtime.getURL("details.html")
        });
      });
    });
  }
});