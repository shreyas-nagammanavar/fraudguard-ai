"""
utils/auth.py – JWT helpers and password hashing.
"""

import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(plain: str) -> str:
    return generate_password_hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return check_password_hash(hashed, plain)


def generate_token(user_id: int, role: str, remember: bool = False) -> str:
    exp_hours = 168 if remember else 24   # 7 days or 1 day
    payload = {
        'sub':  str(user_id),  # JWT spec requires 'sub' to be a string
        'role': role,
        'iat':  datetime.now(timezone.utc),
        'exp':  datetime.now(timezone.utc) + timedelta(hours=exp_hours),
    }
    token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    # PyJWT 2.x returns string, older versions return bytes
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def decode_token(token: str) -> dict:
    return jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])


def jwt_required(f):
    """Decorator: validates Bearer JWT, injects g.user_id and g.role."""
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g
        auth = request.headers.get('Authorization', '')
        print(f"[AUTH] Authorization header: {auth[:50] if auth else 'missing'}...")  # Debug log
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        token = auth.split(' ', 1)[1]
        print(f"[AUTH] Token extracted: {token[:20]}...")  # Debug log
        try:
            data = decode_token(token)
            print(f"[AUTH] Token decoded successfully, user_id={data['sub']}")  # Debug log
            g.user_id = int(data['sub'])  # Convert back to int
            g.role    = data['role']
        except jwt.ExpiredSignatureError:
            print("[AUTH] Token expired")  # Debug log
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError as e:
            print(f"[AUTH] Invalid token: {e}")  # Debug log
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            print(f"[AUTH] Unexpected error: {e}")  # Debug log
            return jsonify({'error': 'Authentication failed'}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Decorator: validates JWT and checks admin role."""
    @wraps(f)
    @jwt_required
    def decorated(*args, **kwargs):
        from flask import g
        if g.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated
