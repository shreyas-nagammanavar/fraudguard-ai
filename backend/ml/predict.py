"""
predict.py – Inference engine for the fraud detection model.
Loads saved artifacts once and exposes predict_transactions().
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.preprocessing import preprocess

SAVED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'saved_models')

_model       = None
_scaler      = None
_encoders    = None
_feature_cols = None


def _load_artifacts():
    global _model, _scaler, _encoders, _feature_cols
    if _model is None:
        model_path = os.path.join(SAVED_DIR, 'fraud_model.pkl')
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                "Model not found. Run `python ml/train_model.py` first.")
        _model        = joblib.load(os.path.join(SAVED_DIR, 'fraud_model.pkl'))
        _scaler       = joblib.load(os.path.join(SAVED_DIR, 'scaler.pkl'))
        _encoders     = joblib.load(os.path.join(SAVED_DIR, 'encoders.pkl'))
        _feature_cols = joblib.load(os.path.join(SAVED_DIR, 'feature_cols.pkl'))


def _risk_label(score: int) -> tuple[str, str]:
    """Return (risk_level, recommendation) for a given risk score."""
    if score <= 30:
        return 'Safe', 'Transaction appears legitimate. No action required.'
    elif score <= 60:
        return 'Medium Risk', 'Monitor transaction. Consider additional verification.'
    elif score <= 80:
        return 'High Risk', 'Flag for manual review. Send OTP verification.'
    else:
        return 'Critical Fraud', 'Immediately block transaction and notify customer.'


def predict_transactions(df: pd.DataFrame) -> list[dict]:
    """
    Run inference on a DataFrame of transactions.
    Returns a list of prediction dicts, one per row.
    """
    _load_artifacts()

    # Preserve TransactionID if present
    ids = df['TransactionID'].tolist() if 'TransactionID' in df.columns else list(range(len(df)))

    drop_cols = ['TransactionID', 'isFraud']
    X, _, _, _ = preprocess(
        df.drop(columns=[c for c in drop_cols if c in df.columns], errors='ignore'),
        scaler=_scaler, encoders=_encoders, fit=False
    )

    probas = _model.predict_proba(X)[:, 1]

    results = []
    for i, (txn_id, prob) in enumerate(zip(ids, probas)):
        risk_score = int(np.clip(prob * 100, 1, 100))
        is_fraud   = prob >= 0.5
        confidence = round(max(prob, 1 - prob) * 100, 2)
        risk_level, recommendation = _risk_label(risk_score)

        results.append({
            'transaction_id':  str(txn_id),
            'is_fraud':        bool(is_fraud),
            'fraud_prob':      round(float(prob) * 100, 3),
            'risk_score':      risk_score,
            'confidence':      confidence,
            'risk_level':      risk_level,
            'prediction':      'Fraud' if is_fraud else 'Legitimate',
            'recommendation':  recommendation,
        })
    return results


def predict_single(row: dict) -> dict:
    """Convenience wrapper for a single transaction dict."""
    df = pd.DataFrame([row])
    return predict_transactions(df)[0]
