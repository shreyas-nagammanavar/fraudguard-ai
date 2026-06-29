"""
routes/analytics.py – /analytics and /dashboard endpoints.
"""

import os, json
from flask import Blueprint, jsonify

from utils.auth import jwt_required
from utils.analytics import get_analytics, get_dashboard_stats

analytics_bp = Blueprint('analytics', __name__)

SAVED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'saved_models')


@analytics_bp.get('/dashboard')
@jwt_required
def dashboard():
    stats = get_dashboard_stats()
    # Attach model metrics if available
    metrics_file = os.path.join(SAVED_DIR, 'metrics.json')
    if os.path.exists(metrics_file):
        with open(metrics_file) as f:
            stats['model_metrics'] = json.load(f)
    else:
        stats['model_metrics'] = None
    return jsonify(stats)


@analytics_bp.get('/analytics')
@jwt_required
def analytics():
    return jsonify(get_analytics())


@analytics_bp.get('/model-info')
@jwt_required
def model_info():
    metrics_file = os.path.join(SAVED_DIR, 'metrics.json')
    if not os.path.exists(metrics_file):
        return jsonify({'error': 'Model not trained yet'}), 404
    with open(metrics_file) as f:
        return jsonify(json.load(f))
