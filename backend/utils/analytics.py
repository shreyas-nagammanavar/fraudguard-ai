"""
utils/analytics.py – Compute dashboard and analytics payloads from DB records.
"""

from collections import defaultdict
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy import func

from models.database import db, PredictionLog


def get_dashboard_stats():
    total = PredictionLog.query.count()
    fraud = PredictionLog.query.filter_by(is_fraud=True).count()
    safe  = total - fraud
    avg_risk = db.session.query(func.avg(PredictionLog.risk_score)).scalar() or 0
    avg_prob = db.session.query(func.avg(PredictionLog.fraud_prob)).scalar() or 0

    recent = (PredictionLog.query
              .order_by(PredictionLog.created_at.desc())
              .limit(10).all())

    return {
        'total_transactions': total,
        'fraud_count':        fraud,
        'safe_count':         safe,
        'fraud_percentage':   round((fraud / total * 100) if total else 0, 2),
        'avg_risk_score':     round(float(avg_risk), 2),
        'avg_fraud_prob':     round(float(avg_prob), 2),
        'recent_transactions': [r.to_dict() for r in recent],
    }


def get_analytics():
    rows = PredictionLog.query.all()
    if not rows:
        return _empty_analytics()

    # Hourly fraud counts
    hourly = defaultdict(lambda: {'fraud': 0, 'safe': 0})
    daily  = defaultdict(lambda: {'fraud': 0, 'safe': 0})

    amounts       = []
    fraud_amounts = []
    risk_scores   = []

    for r in rows:
        key = 'fraud' if r.is_fraud else 'safe'
        if r.tx_hour is not None:
            h = int(r.tx_hour)
            hourly[h][key] += 1
        date_key = r.created_at.strftime('%Y-%m-%d') if r.created_at else 'unknown'
        daily[date_key][key] += 1

        if r.amount:
            amounts.append(r.amount)
            if r.is_fraud:
                fraud_amounts.append(r.amount)
        if r.risk_score:
            risk_scores.append(r.risk_score)

    # Risk distribution buckets
    risk_dist = {'safe': 0, 'medium': 0, 'high': 0, 'critical': 0}
    for s in risk_scores:
        if s <= 30:   risk_dist['safe'] += 1
        elif s <= 60: risk_dist['medium'] += 1
        elif s <= 80: risk_dist['high'] += 1
        else:         risk_dist['critical'] += 1

    total  = len(rows)
    frauds = sum(1 for r in rows if r.is_fraud)

    return {
        'fraud_pct':    round(frauds / total * 100, 2) if total else 0,
        'safe_pct':     round((total - frauds) / total * 100, 2) if total else 0,
        'hourly_fraud': [
            {'hour': h, 'fraud': hourly[h]['fraud'], 'safe': hourly[h]['safe']}
            for h in range(24)
        ],
        'daily_trend': [
            {'date': d, 'fraud': v['fraud'], 'safe': v['safe']}
            for d, v in sorted(daily.items())[-30:]
        ],
        'amount_distribution': _bucket_amounts(amounts),
        'fraud_amount_distribution': _bucket_amounts(fraud_amounts),
        'risk_distribution': risk_dist,
        'top_fraud_hours': _top_hours(hourly),
        'amount_stats': {
            'mean':   round(float(np.mean(amounts)), 2)   if amounts else 0,
            'median': round(float(np.median(amounts)), 2) if amounts else 0,
            'max':    round(float(np.max(amounts)), 2)    if amounts else 0,
        },
        'suspicious_top': [
            r.to_dict() for r in
            PredictionLog.query.filter_by(is_fraud=True)
                               .order_by(PredictionLog.risk_score.desc())
                               .limit(10).all()
        ],
    }


def _bucket_amounts(amounts: list, bins: int = 20) -> list:
    if not amounts:
        return []
    arr   = np.array(amounts)
    upper = min(float(np.percentile(arr, 99)), 5000)
    edges = np.linspace(0, upper, bins + 1)
    counts, _ = np.histogram(arr, bins=edges)
    return [
        {'range': f'${int(edges[i])}-${int(edges[i+1])}', 'count': int(counts[i])}
        for i in range(bins)
    ]


def _top_hours(hourly: dict) -> list:
    items = sorted(hourly.items(), key=lambda x: x[1]['fraud'], reverse=True)
    return [{'hour': h, 'fraud_count': v['fraud']} for h, v in items[:5]]


def _empty_analytics() -> dict:
    return {
        'fraud_pct': 0, 'safe_pct': 0,
        'hourly_fraud': [], 'daily_trend': [],
        'amount_distribution': [], 'fraud_amount_distribution': [],
        'risk_distribution': {'safe': 0, 'medium': 0, 'high': 0, 'critical': 0},
        'top_fraud_hours': [], 'amount_stats': {'mean': 0, 'median': 0, 'max': 0},
        'suspicious_top': [],
    }
