# Enhanced Real-Time Phishing URL Classification Leveraging a Hybrid CNN-BiGRU Model 🚨


Real-time phishing detection using hybrid **CNN+BiGRU** deep learning model integrated with **Chrome browser extension**.

---

## ✨ **Features**

| 🟢 **Safe Sites** | 🟡 **Suspicious** | 🔴 **Phishing** |
|-------------------|-------------------|-----------------|
| No popup (silent) | Orange warning | Red danger popup |
| Google, Amazon ✅ | Odd URLs | `g00gle-phish.tk` ❌ |
| `prob_legit > 0.7` | `0.3 < prob_legit < 0.7` | `prob_legit < 0.3` |

- **Detailed analysis report** showing prediction and valid reason.
- **Manual feedback option** to mark a website as **safe** or **dangerous**.
- **Risk-based popup** with clear explanation and confidence score.

---

## 🏗️ **Architecture**

Browser Tab Load
↓
Chrome Extension (background.js)
↓ HTTP POST
FastAPI Backend (app.py:8000)
↓ CNN+BiGRU Model
inference_core.py
↓ JSON Response
Content Script → Risk-based Popup


### **Model Architecture**

Input: URL → Tokenizer → Padding(200) → Embedding(128)
↓ Parallel CNNs → MaxPool → Concat(384)
↓ Bidirectional GRU(256)
 → Dense → prob_legit 

---

## 🚀 **Quick Start**

 **1. Backend Setup**

cd phishing-backend

pip install -r requirements.txt

uvicorn app:app --reload --port 8000 

API Docs: http://localhost:8000/docs 

**2. Chrome Extension**  
chrome://extensions/ → Developer mode ✓

Load unpacked → phishing-extension/

Test: Visit g00gle-phish.com → Red popup!

**3. Test Endpoints**

curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://g00gle-secure.tk/login"}'
  
---

## 📊 **Performance Metrics**

| Metric         | Value  |
| -------------- | ------ |
| Test Accuracy  | 97.82% |
| Test Precision | 97.82% |
| Test Recall    | 97.82% |
| Test AUC       | 99.87% |
| Test F1-Score  | 97.82% |

Dataset: 16Lakh+ URLs (balanced 51.9% legit, 48.1% phishing)

---
🧠 **How It Works**
✅ SAFE: https://myntra.com
1. Extension → POST {"url": "https://myntra.com"}
2. CNN: "https", "myntra", ".com" → legit patterns
3. BiGRU: clean scheme→brand→TLD → prob_legit=0.92
4. > 0.7 → "safe" → NO POPUP ✅

❌ DANGER: http://g00gle-phish123.tk
1. CNN: "g00gle" (typosquat), ".tk" (suspicious)
2. BiGRU: brand→random→badTLD → prob_legit=0.12
3. < 0.3 → "danger" → RED POPUP ❌

---

## 🎯 **Demo Test Cases**

| SAFE (No popup)    | WARNING (Orange) | DANGER (Red)    |
| ------------------ | ---------------- | --------------- |
| https://myntra.com | httpbin.org/uuid | g00gle-phish.tk |
| https://amazon.in  | example.com:8080 | 192.168.1.100   |
| https://nta.ac.in  | duckdns.org/test | paypa1-login.ml |

---
## 🛠️ Tech Stack

FastAPI + Uvicorn + TensorFlow 2.15 + Keras
CNN(128 filters, kernels=) + BiGRU(128)[3][5][8]
Chrome Extension API v3
16Lakh+ balanced dataset

---
## 📈 Training Details

Batch Size: 256 | Epochs: 15
Optimizer: Adam(lr=0.001) | Loss: Binary Crossentropy
Early Stopping: Validation AUC

---
## 🔮 Future Enhancements
HTML/JS content analysis

WHOIS domain age checks

Cloud deployment (Railway/Render)

User feedback loop

Mobile app integration

---
## 👥 Team
**Arnab Deb | Aditya Kumar Das | Abhishek Kumar Gautam | Girisha Bhattar**

Skills Demonstrated: Deep Learning, FastAPI, Chrome Extensions, Cybersecurity

---
## 📄 License
**License: MIT**

<p align="center">  <br><strong>Safe browsing starts here! 🛡️</strong> </p> 



