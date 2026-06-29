"""
routes/auth.py – /register, /login, /logout, /me endpoints.
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from models.database import db, User
from utils.auth import hash_password, verify_password, generate_token, jwt_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.post('/register')
def register():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role     = data.get('role', 'analyst')

    if not all([username, email, password]):
        return jsonify({'error': 'username, email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409

    # First user ever becomes admin
    if User.query.count() == 0:
        role = 'admin'

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
    )
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id, user.role, remember=False)
    return jsonify({
        'message': 'User created successfully',
        'token':   token,
        'user':    user.to_dict(),
    }), 201


@auth_bp.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    remember = bool(data.get('remember', False))

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid credentials'}), 401
    if not user.is_active:
        return jsonify({'error': 'Account disabled. Contact admin.'}), 403

    user.last_login = datetime.now(timezone.utc)
    db.session.commit()

    token = generate_token(user.id, user.role, remember=remember)
    return jsonify({'token': token, 'user': user.to_dict()})


@auth_bp.get('/me')
@jwt_required
def me():
    user = User.query.get(g.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})


@auth_bp.post('/logout')
@jwt_required
def logout():
    # JWT is stateless; client deletes the token.
    return jsonify({'message': 'Logged out successfully'})
