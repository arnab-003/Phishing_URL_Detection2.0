"Enhanced Real-Time Phishing URL Classification Leveraging a Hybrid CNN-BiGRU Model"🚨

Real-time phishing detection using hybrid CNN+BiGRU deep learning model integrated with Chrome browser extension.

_______________________________________________________________________________________________
✨ Features

🟢 Safe Sites => No popup (silent) , Google, Amazon ✅ , prob_legit > 0.7

🟡 Suspicious => Orange warning , Odd URLs , 0.3<prob_legit<0.7

🔴 Phishing => Red danger popup , g00gle-phish.tk ❌ , prob_legit < 0.3


_______________________________________________________________________________________________
🏗️ Architecture

Browser Tab Load
       ↓
Chrome Extension (background.js)
       ↓ HTTP POST
FastAPI Backend (app.py:8000)
       ↓ CNN+BiGRU Model
inference_core.py
       ↓ JSON Response
Content Script → Risk-based Popup


Model: CNN(3,5,7) + BiGRU + 10 Features

Input: URL → Tokenizer → Padding(200) → Embedding(128)
       ↓ Parallel CNNs → MaxPool → Concat(384)
       ↓ Bidirectional GRU(256)
       ↓ + Features(64) → Dense → prob_legit ∈ [0,1]

________________________________________________________________________________________________
10 Handcrafted Features:

1.LengthOfURL 2.IsDomainIP 3.ShannonEntropy 4.HexPatternCnt 5.DomainLengthOfURL
 
6.LetterCntInURL 7.URLLetterRatio 8.DigitCntInURL 9.KolmogorovComplexity 10.Base64PatternCnt

________________________________________________________________________________________________
🚀 Quick Start

1. Backend Setup

cd phishing-backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
API Docs: http://localhost:8000/docs

2. Chrome Extension

chrome://extensions/ → Developer mode ✓

Load unpacked → phishing-extension/

Test: Visit g00gle-phish.com → Red popup!


3. Test Endpoints

curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://g00gle-secure.tk/login"}'

_______________________________________________________________________________________________
📊 Performance Metrics

Test Accuracy:  99.92%
Test Precision: 99.86%
Test Recall:    99.99%
Test AUC:       99.98%
Test F1-Score:  99.92%

_______________________________________________________________________________________________
🧠 How It Works

Example: https://myntra.com → SAFE ✅

1. Extension → POST {"url": "https://myntra.com"}
2. Features: Length=18, IsDomainIP=0, Entropy=3.2
3. CNN detects: "https", "myntra", ".com" → legit patterns
4. BiGRU: clean scheme→brand→TLD → prob_legit=0.92
5. > 0.7 threshold → "safe" → NO POPUP


Example: http://g00gle-phish123.tk → DANGER ❌

1. Features: Length=25, bad TLD=.tk, high entropy
2. CNN detects: "g00gle" (typosquat), ".tk" (suspicious)
3. BiGRU: brand→random→badTLD → prob_legit=0.12
4. < 0.3 threshold → "danger" → RED POPUP

______________________________________________________________________________________________
📁 Project Structure

PHISHING URL DETECTION/
├── phishing-backend/
│   ├── app.py              # FastAPI server
│   └── inference_core.py   # CNN+BiGRU model
├── Models/                 # Download from Releases
│   ├── bigru_model.h5
│   └── scaler.pkl
└── tokenizers (1)/         # Chrome extension
    ├── manifest.json
    ├── background.js
    └── content_script.js

_______________________________________________________________________________________________
🛠️ Tech Stack

FastAPI + Uvicorn + TensorFlow 2.15 + Keras
CNN(128 filters, kernels=[3,5,7]) + BiGRU(128)
Chrome Extension API v3
10L balanced dataset (phishing + legitimate)

_______________________________________________________________________________________________
📈 Training Details

Dataset: 827993 Lakh URLs 
Training Label Distribution:
1    0.505536
0    0.494464

Training Set: 558894 samples
Validation Set: 103500 samples
Test Set: 165599 samples
Batch Size: 128
Epochs: 15
Optimizer: Adam(lr=0.001)
Loss: Binary Crossentropy
Early Stopping: Val AUC

________________________________________________________________________________________________
🔮 Future Enhancements

   HTML/JS content analysis

   WHOIS domain age checks

   Cloud deployment (Railway/Render)

   User feedback loop

   Mobile app integration

_________________________________________________________________________________________________
📝 Acknowledgements

Built by
Arnab Deb
Aditya Kumar Das
Abhishek Kumar Gautam
Girisha Bhattar

Skills Demonstrated: Deep Learning, FastAPI, Chrome Extensions, Cybersecurity.

_________________________________________________________________________________________________
📄 License
MIT License
