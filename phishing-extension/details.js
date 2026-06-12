//  Details page logic

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["latestPrediction"], (res) => {
    const data = res.latestPrediction;
    const summary = document.getElementById("summary");
    const explanations = document.getElementById("explanations");
    const confidenceCanvas = document.getElementById("confidenceChart");
    const riskCanvas = document.getElementById("riskChart");

    if (!data) {
      summary.innerHTML = "<p>No prediction data found.</p>";
      explanations.innerHTML = "<p>No explanation available.</p>";
      return;
    }

    const probLegit = Number(data.prob_legit ?? 0);
    const probPhish = Math.max(0, 1 - probLegit);
    const risk = String(data.risk_level || "unknown").toLowerCase();

    let badgeClass = "suspicious";
    if (risk === "safe") badgeClass = "safe";
    else if (risk === "danger") badgeClass = "danger";

    summary.innerHTML = `
      <p><strong>URL:</strong> ${data.url || data.pageUrl || "N/A"}</p>
      <p><strong>Normalized URL:</strong> ${data.normalized_url || "N/A"}</p>
      <p><strong>Label:</strong> ${data.label || "N/A"}</p>
      <p><strong>Risk Level:</strong> <span class="badge ${badgeClass}">${risk}</span></p>
      <p><strong>Legitimacy Score:</strong> ${(probLegit * 100).toFixed(2)}%</p>
      <p><strong>Phishing Score:</strong> ${(probPhish * 100).toFixed(2)}%</p>
    `;

    const listItems = (data.explanations || [])
      .map((item) => `<li>${item}</li>`)
      .join("");

    explanations.innerHTML = `
      <ul>
        ${listItems || "<li>No explanation provided.</li>"}
      </ul>
    `;

    if (typeof Chart !== "undefined" && confidenceCanvas) {
      new Chart(confidenceCanvas, {
        type: "doughnut",
        data: {
          labels: ["Legit", "Phishing"],
          datasets: [{
            data: [probLegit * 100, probPhish * 100],
            backgroundColor: ["#22c55e", "#ef4444"],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#e5e7eb"
              }
            }
          }
        }
      });
    }

    if (typeof Chart !== "undefined" && riskCanvas) {
      new Chart(riskCanvas, {
        type: "bar",
        data: {
          labels: ["Legit", "Phishing"],
          datasets: [{
            label: "Score (%)",
            data: [probLegit * 100, probPhish * 100],
            backgroundColor: ["#3b82f6", "#f59e0b"]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              labels: {
                color: "#e5e7eb"
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: "#e5e7eb"
              },
              grid: {
                color: "#334155"
              }
            },
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                color: "#e5e7eb"
              },
              grid: {
                color: "#334155"
              }
            }
          }
        }
      });
    }
  });
});