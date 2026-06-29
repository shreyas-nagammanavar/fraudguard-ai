"""
models/database.py – SQLAlchemy ORM models + DB initialisation.
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20),  default='analyst')   # admin | analyst
    is_active     = db.Column(db.Boolean,     default=True)
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)
    last_login    = db.Column(db.DateTime,    nullable=True)

    predictions = db.relationship('PredictionLog', backref='user', lazy='dynamic')

    def to_dict(self):
        return {
            'id':         self.id,
            'username':   self.username,
            'email':      self.email,
            'role':       self.role,
            'is_active':  self.is_active,
            'created_at': self.created_at.isoformat(),
        }


class PredictionLog(db.Model):
    __tablename__ = 'prediction_logs'

    id             = db.Column(db.Integer,  primary_key=True)
    user_id        = db.Column(db.Integer,  db.ForeignKey('users.id'), nullable=True)
    upload_batch   = db.Column(db.String(64), nullable=True)     # group by CSV upload
    transaction_id = db.Column(db.String(64))
    is_fraud       = db.Column(db.Boolean)
    fraud_prob     = db.Column(db.Float)
    risk_score     = db.Column(db.Integer)
    confidence     = db.Column(db.Float)
    risk_level     = db.Column(db.String(30))
    prediction     = db.Column(db.String(20))
    recommendation = db.Column(db.Text)
    amount         = db.Column(db.Float,    nullable=True)
    tx_hour        = db.Column(db.Float,    nullable=True)
    tx_day         = db.Column(db.Float,    nullable=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':             self.id,
            'upload_batch':   self.upload_batch,
            'transaction_id': self.transaction_id,
            'is_fraud':       self.is_fraud,
            'fraud_prob':     self.fraud_prob,
            'risk_score':     self.risk_score,
            'confidence':     self.confidence,
            'risk_level':     self.risk_level,
            'prediction':     self.prediction,
            'recommendation': self.recommendation,
            'amount':         self.amount,
            'tx_hour':        self.tx_hour,
            'tx_day':         self.tx_day,
            'created_at':     self.created_at.isoformat(),
        }


class UploadBatch(db.Model):
    __tablename__ = 'upload_batches'

    id           = db.Column(db.Integer,  primary_key=True)
    batch_id     = db.Column(db.String(64), unique=True, nullable=False)
    user_id      = db.Column(db.Integer,  db.ForeignKey('users.id'), nullable=True)
    filename     = db.Column(db.String(255))
    total_rows   = db.Column(db.Integer)
    fraud_count  = db.Column(db.Integer)
    safe_count   = db.Column(db.Integer)
    fraud_pct    = db.Column(db.Float)
    status       = db.Column(db.String(20), default='processing')  # processing|done|error
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'batch_id':    self.batch_id,
            'filename':    self.filename,
            'total_rows':  self.total_rows,
            'fraud_count': self.fraud_count,
            'safe_count':  self.safe_count,
            'fraud_pct':   self.fraud_pct,
            'status':      self.status,
            'created_at':  self.created_at.isoformat(),
        }
