"""
routes/history.py – /history endpoints (list, delete, export).
"""

import csv
import io
from flask import Blueprint, request, jsonify, g, make_response

from models.database import db, PredictionLog
from utils.auth import jwt_required, admin_required

history_bp = Blueprint('history', __name__)


@history_bp.get('/history')
@jwt_required
def get_history():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search   = request.args.get('search', '')
    filter_  = request.args.get('filter', 'all')   # all | fraud | safe
    sort_by  = request.args.get('sort_by', 'created_at')
    sort_dir = request.args.get('sort_dir', 'desc')

    q = PredictionLog.query

    # Filter by fraud status
    if filter_ == 'fraud':
        q = q.filter_by(is_fraud=True)
    elif filter_ == 'safe':
        q = q.filter_by(is_fraud=False)

    # Search by transaction_id
    if search:
        q = q.filter(PredictionLog.transaction_id.ilike(f'%{search}%'))

    # Sort
    col = getattr(PredictionLog, sort_by, PredictionLog.created_at)
    q = q.order_by(col.desc() if sort_dir == 'desc' else col.asc())

    paginated = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items':      [item.to_dict() for item in paginated.items],
        'total':      paginated.total,
        'page':       paginated.page,
        'per_page':   paginated.per_page,
        'pages':      paginated.pages,
    })


@history_bp.delete('/history/<int:log_id>')
@jwt_required
def delete_log(log_id):
    log = PredictionLog.query.get_or_404(log_id)
    db.session.delete(log)
    db.session.commit()
    return jsonify({'message': 'Record deleted'})


@history_bp.delete('/history/batch/<string:batch_id>')
@jwt_required
def delete_batch(batch_id):
    deleted = PredictionLog.query.filter_by(upload_batch=batch_id).delete()
    db.session.commit()
    return jsonify({'message': f'Deleted {deleted} records'})


@history_bp.get('/history/export')
@jwt_required
def export_csv():
    filter_  = request.args.get('filter', 'all')
    q = PredictionLog.query
    if filter_ == 'fraud':
        q = q.filter_by(is_fraud=True)
    elif filter_ == 'safe':
        q = q.filter_by(is_fraud=False)
    rows = q.order_by(PredictionLog.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        'id', 'transaction_id', 'prediction', 'fraud_prob',
        'risk_score', 'confidence', 'risk_level', 'amount',
        'recommendation', 'created_at'
    ])
    writer.writeheader()
    for r in rows:
        writer.writerow({
            'id':             r.id,
            'transaction_id': r.transaction_id,
            'prediction':     r.prediction,
            'fraud_prob':     r.fraud_prob,
            'risk_score':     r.risk_score,
            'confidence':     r.confidence,
            'risk_level':     r.risk_level,
            'amount':         r.amount,
            'recommendation': r.recommendation,
            'created_at':     r.created_at.isoformat() if r.created_at else '',
        })

    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv'
    resp.headers['Content-Disposition'] = 'attachment; filename=fraud_predictions.csv'
    return resp
