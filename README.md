# Enhanced Real-Time Phishing URL Classification Leveraging a Hybrid CNN-BiGRU Model 🚨


Real-time phishing detection using hybrid **CNN+BiGRU** deep learning model integrated with **Chrome browser extension**.

---

## ✨ **Features**

| 🟢 **Safe Sites** | 🟡 **Suspicious** | 🔴 **Phishing** |
|-------------------|-------------------|-----------------|
| No popup (silent) | Orange warning | Red danger popup |
| Google, Amazon ✅ | Odd URLs | `g00gle-phish.tk` ❌ |
| `prob_legit > 0.7` | `0.3 < prob_legit < 0.7` | `prob_legit < 0.3` |

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
↓ + Features(64) → Dense → prob_legit 


**10 Handcrafted Features:**
1. `LengthOfURL`
2. `IsDomainIP`
3. `ShannonEntropy`
4. `HexPatternCnt`
5. `DomainLengthOfURL`
6. `LetterCntInURL`
7. `URLLetterRatio`
8. `DigitCntInURL`
9. `KolmogorovComplexity`
10. `Base64PatternCnt`

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
| Test Accuracy  | 99.92% |
| Test Precision | 99.86% |
| Test Recall    | 99.99% |
| Test AUC       | 99.98% |
| Test F1-Score  | 99.92% |

Dataset: 827,993 URLs (balanced 50.55% legit, 49.45% phishing)

---
🧠 **How It Works**
✅ SAFE: https://myntra.com
1. Extension → POST {"url": "https://myntra.com"}
2. Features: Length=18, IsDomainIP=0, Entropy=3.2
3. CNN: "https", "myntra", ".com" → legit patterns
4. BiGRU: clean scheme→brand→TLD → prob_legit=0.92
5. > 0.7 → "safe" → NO POPUP ✅

❌ DANGER: http://g00gle-phish123.tk
1. Features: Length=25, bad TLD=.tk, high entropy
2. CNN: "g00gle" (typosquat), ".tk" (suspicious)
3. BiGRU: brand→random→badTLD → prob_legit=0.12
4. < 0.3 → "danger" → RED POPUP ❌

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
827K balanced dataset

---
## 📈 Training Details

Dataset Split: Train(558K) | Val(103K) | Test(165K)
Batch Size: 128 | Epochs: 15
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







