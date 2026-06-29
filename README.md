# 🛡️ FraudGuard AI — Credit Card Fraud Detection System

> **Enterprise-grade AI-powered fraud detection platform built with Python, Flask, React, and XGBoost.**  
> Designed for fintech portfolios — looks and works like a real Stripe / PayPal fraud engine.

---

## 📸 Screenshots

| Login | Dashboard | Analytics |
|-------|-----------|-----------|
| _Dark fintech login with brand panel_ | _Live stat cards + model comparison charts_ | _Hourly trends, risk distribution, amount histograms_ |

| Upload CSV | Prediction Result | Transaction History |
|-----------|------------------|---------------------|
| _Drag-and-drop CSV with live preview_ | _Risk ring + full prediction breakdown_ | _Paginated, sortable, exportable table_ |

---

## 🎯 Features

### Machine Learning
- **5 models trained and compared**: XGBoost, Random Forest, Logistic Regression, Decision Tree, Isolation Forest
- **SMOTE** oversampling to handle extreme class imbalance (≈3.5% fraud rate)
- **Feature engineering**: log-amount, hour/day extraction, card ratios
- **Auto model selection** by ROC-AUC + F1 composite score
- Achieves **~98%+ ROC-AUC** on the IEEE-CIS dataset

### Backend API (Flask)
- JWT authentication with role-based access (admin / analyst)
- Batch CSV upload → instant fraud predictions
- Single-transaction prediction endpoint
- Full prediction history with search, filter, pagination, CSV export
- Analytics engine: hourly fraud, daily trends, risk distribution

### Frontend Dashboard (React + Tailwind)
- 🌑 Dark fintech theme with glassmorphism
- Animated stat cards with live data
- Chart.js: Doughnut, Bar, Line, Doughnut charts
- Drag-and-drop CSV uploader with format validation
- Risk score ring gauge with color coding
- Fully responsive (mobile + desktop)

---

## 🏗️ Project Structure

```
credit-card-fraud-detection/
├── backend/
│   ├── app.py                  # Flask app factory
│   ├── routes/
│   │   ├── auth.py             # /register /login /me /logout
│   │   ├── predict.py          # /upload  /predict
│   │   ├── history.py          # /history  /history/export
│   │   ├── analytics.py        # /dashboard  /analytics
│   │   └── admin.py            # /admin/users
│   ├── models/
│   │   └── database.py         # SQLAlchemy ORM (User, PredictionLog, UploadBatch)
│   ├── utils/
│   │   ├── auth.py             # JWT helpers, password hashing
│   │   └── analytics.py        # Dashboard/analytics computation
│   ├── ml/
│   │   ├── train_model.py      # Full training pipeline
│   │   ├── predict.py          # Inference engine
│   │   └── preprocessing.py    # Feature engineering + scaling
│   ├── saved_models/           # fraud_model.pkl, scaler.pkl, metrics.json
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/Login.jsx
│   │   │   ├── Dashboard/Dashboard.jsx
│   │   │   ├── Upload/Upload.jsx
│   │   │   ├── Prediction/Prediction.jsx
│   │   │   ├── Analytics/Analytics.jsx
│   │   │   ├── History/History.jsx
│   │   │   ├── Admin/Admin.jsx
│   │   │   ├── Layout/Layout.jsx
│   │   │   └── UI.jsx          # Reusable UI components
│   │   ├── context/AuthContext.jsx
│   │   ├── utils/
│   │   │   ├── api.js          # Axios instance with JWT interceptor
│   │   │   └── helpers.js      # Formatters, color helpers
│   │   ├── styles/index.css    # Tailwind + custom component classes
│   │   └── App.jsx             # Router + Auth guards
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- The **IEEE-CIS Fraud Detection** dataset (`ieee-fraud-detection.zip` from Kaggle)

---

### 1. Train the Model

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Train with the zip file (auto-discovers zip in parent directory)
python ml/train_model.py --data-zip "path/to/ieee-fraud-detection.zip"

# Or with extracted CSVs
python ml/train_model.py --data-dir "path/to/csvs/"

# Use a sample for quick testing (10% of data)
python ml/train_model.py --data-zip "..." --sample 0.1
```

Training outputs saved to `backend/saved_models/`:
- `fraud_model.pkl` — best model
- `scaler.pkl` — StandardScaler
- `encoders.pkl` — LabelEncoders
- `feature_cols.pkl` — feature list
- `metrics.json` — all model metrics
- `eda_plots.png`, `model_comparison.png`, `roc_pr_curves.png`, etc.

---

### 2. Start the Backend

```bash
cd backend
python app.py
# → http://localhost:5000
```

---

### 3. Start the Frontend

```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

### 4. Login

The **first user registered becomes admin** automatically.

Default demo credentials (after first registration):
- Email: `admin@fraudguard.ai`
- Password: `admin123`

---

## 🐳 Docker Deployment

```bash
# Build and start both services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

> **Note**: Train the model first before running Docker — the `saved_models/` directory is volume-mounted.

---

## 📡 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ✗ | Create account |
| POST | `/login` | ✗ | Login, returns JWT |
| GET | `/me` | ✓ | Current user info |
| POST | `/logout` | ✓ | Logout |
| POST | `/upload` | ✓ | Upload CSV, run batch prediction |
| POST | `/predict` | ✓ | Single transaction prediction |
| GET | `/history` | ✓ | Paginated prediction history |
| DELETE | `/history/{id}` | ✓ | Delete a prediction log |
| GET | `/history/export` | ✓ | Export history as CSV |
| GET | `/dashboard` | ✓ | Dashboard stats + model metrics |
| GET | `/analytics` | ✓ | Full analytics payload |
| GET | `/model-info` | ✓ | Trained model metrics |
| GET | `/admin/users` | Admin | List all users |
| PATCH | `/admin/users/{id}` | Admin | Update user role/status |
| DELETE | `/admin/users/{id}` | Admin | Delete user |

### Authentication
All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### POST /predict — Example
```json
{
  "TransactionDT": 86400,
  "TransactionAmt": 299.99,
  "ProductCD": "W",
  "card1": 4305,
  "card4": "visa",
  "card6": "debit",
  "P_emaildomain": "gmail.com"
}
```
Response:
```json
{
  "transaction_id": "0",
  "prediction": "Fraud",
  "is_fraud": true,
  "fraud_prob": 94.3,
  "risk_score": 94,
  "confidence": 94.3,
  "risk_level": "Critical Fraud",
  "recommendation": "Immediately block transaction and notify customer."
}
```

---

## 📊 ML Pipeline Details

### Dataset
- **IEEE-CIS Fraud Detection** (Kaggle, 590,540 transactions, 3.5% fraud rate)
- 394 features after merging transaction + identity tables

### Preprocessing
1. Merge `train_transaction.csv` + `train_identity.csv` on `TransactionID`
2. Fill numeric missing values with `-999`
3. Label-encode categorical columns (ProductCD, card4, card6, email domains, M-features)
4. Feature engineering: `tx_hour`, `tx_day`, `log_amount`, `amt_card1_ratio`
5. StandardScaler normalization

### Training
1. 80/20 stratified train/test split
2. SMOTE (sampling_strategy=0.3) on training set
3. Train 4 supervised classifiers + 1 anomaly detector
4. Evaluate on held-out test set
5. Auto-select best model by ROC-AUC + F1 composite

### Risk Score Mapping
| Score | Level | Color | Action |
|-------|-------|-------|--------|
| 0–30 | Safe | 🟢 Green | No action required |
| 31–60 | Medium Risk | 🟡 Yellow | Additional verification |
| 61–80 | High Risk | 🟠 Orange | Flag for manual review |
| 81–100 | Critical Fraud | 🔴 Red | Block immediately |

---

## 🔒 Security

- Passwords hashed with **Werkzeug PBKDF2-SHA256**
- JWT tokens with configurable expiry (24h default, 7 days with "remember me")
- Role-based access control (admin vs analyst)
- CORS configured for development (restrict in production)
- File upload validation (CSV only, 50 MB max)

---

## 🔮 Future Improvements

- [ ] Real-time fraud alerts via WebSockets
- [ ] Email notifications (SMTP / SendGrid)
- [ ] PDF report generation (ReportLab)
- [ ] Model retraining endpoint via UI
- [ ] PostgreSQL support for production
- [ ] Kubernetes Helm chart
- [ ] A/B model testing framework
- [ ] Feature importance explainability (SHAP)
- [ ] Batch job scheduling (Celery + Redis)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| ML | Scikit-learn, XGBoost, imbalanced-learn |
| Backend | Python 3.11, Flask 3, SQLAlchemy, JWT |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React 18, Tailwind CSS, Chart.js |
| Deployment | Docker, Docker Compose, Gunicorn, Nginx |

---

## 📄 License

MIT License — free for personal and commercial use.

---

*Built as a production-grade portfolio project demonstrating end-to-end ML system design, API development, and modern React UI engineering.*
