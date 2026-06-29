"""
routes/predict.py – /upload and /predict endpoints.
"""

import os
import uuid
import pandas as pd
from flask import Blueprint, request, jsonify, g, current_app

from models.database import db, PredictionLog, UploadBatch
from utils.auth import jwt_required
from ml.predict import predict_transactions

predict_bp = Blueprint('predict', __name__)

ALLOWED_EXT = {'csv'}


def _allowed(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT


@predict_bp.post('/upload')
@jwt_required
def upload():
    """Upload a CSV, run predictions, store results, return summary."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if not file.filename or not _allowed(file.filename):
        return jsonify({'error': 'Only .csv files are accepted'}), 400

    try:
        df = pd.read_csv(file)
    except Exception as e:
        return jsonify({'error': f'Cannot parse CSV: {str(e)}'}), 422

    # Basic validation
    required_cols = {'TransactionDT', 'TransactionAmt'}
    missing = required_cols - set(df.columns)
    if missing:
        return jsonify({'error': f'Missing required columns: {missing}'}), 422

    batch_id = str(uuid.uuid4())

    try:
        predictions = predict_transactions(df)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

    # Persist predictions
    logs = []
    for i, pred in enumerate(predictions):
        row = df.iloc[i]
        log = PredictionLog(
            user_id=g.user_id,
            upload_batch=batch_id,
            transaction_id=pred['transaction_id'],
            is_fraud=pred['is_fraud'],
            fraud_prob=pred['fraud_prob'],
            risk_score=pred['risk_score'],
            confidence=pred['confidence'],
            risk_level=pred['risk_level'],
            prediction=pred['prediction'],
            recommendation=pred['recommendation'],
            amount=float(row.get('TransactionAmt', 0)) if 'TransactionAmt' in row else None,
            tx_hour=float((row['TransactionDT'] / 3600) % 24) if 'TransactionDT' in row else None,
            tx_day=float((row['TransactionDT'] / (3600 * 24)) % 7) if 'TransactionDT' in row else None,
        )
        logs.append(log)

    db.session.bulk_save_objects(logs)

    fraud_count = sum(1 for p in predictions if p['is_fraud'])
    batch = UploadBatch(
        batch_id=batch_id,
        user_id=g.user_id,
        filename=file.filename,
        total_rows=len(predictions),
        fraud_count=fraud_count,
        safe_count=len(predictions) - fraud_count,
        fraud_pct=round(fraud_count / len(predictions) * 100, 2) if predictions else 0,
        status='done',
    )
    db.session.add(batch)
    db.session.commit()

    return jsonify({
        'batch_id':    batch_id,
        'total':       len(predictions),
        'fraud_count': fraud_count,
        'safe_count':  len(predictions) - fraud_count,
        'fraud_pct':   batch.fraud_pct,
        'predictions': predictions,
    }), 201


@predict_bp.post('/predict')
@jwt_required
def predict_single_endpoint():
    """Predict a single transaction from JSON body."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    required = ['TransactionDT', 'TransactionAmt']
    for col in required:
        if col not in data:
            return jsonify({'error': f'Missing field: {col}'}), 422

    try:
        df = pd.DataFrame([data])
        results = predict_transactions(df)
        return jsonify(results[0])
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Prediction error: {str(e)}'}), 500
