"""
routes/admin.py – Admin-only user management endpoints.
"""

from flask import Blueprint, request, jsonify

from models.database import db, User
from utils.auth import admin_required, hash_password

admin_bp = Blueprint('admin', __name__)


@admin_bp.get('/admin/users')
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]})


@admin_bp.patch('/admin/users/<int:user_id>')
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json(silent=True) or {}
    if 'role' in data:
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'password' in data and data['password']:
        user.password_hash = hash_password(data['password'])
    db.session.commit()
    return jsonify({'user': user.to_dict()})


@admin_bp.delete('/admin/users/<int:user_id>')
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted'})
