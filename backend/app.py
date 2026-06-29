"""
app.py – Flask application factory and entry point.
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS

from models.database import db
from routes.auth      import auth_bp
from routes.predict   import predict_bp
from routes.history   import history_bp
from routes.analytics import analytics_bp
from routes.admin     import admin_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # ── Config ──────────────────────────────────────────────────────
    app.config['SECRET_KEY']                = os.getenv('SECRET_KEY', 'fraud-detection-secret-key-change-in-prod')
    app.config['SQLALCHEMY_DATABASE_URI']   = os.getenv('DATABASE_URL', f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database.db')}")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH']        = 50 * 1024 * 1024   # 50 MB

    # ── Extensions ──────────────────────────────────────────────────
    # Allow multiple origins (local + production)
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
    CORS(app, resources={r'/*': {'origins': allowed_origins}},
         supports_credentials=True)
    db.init_app(app)

    # ── Blueprints ──────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(admin_bp)
    
    # Debug: print registered routes
    print("\n[ROUTES] Registered routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint:30s} {rule.methods} -> {rule.rule}")
    print()

    # ── Create tables ───────────────────────────────────────────────
    with app.app_context():
        db.create_all()

    # ── Health check ────────────────────────────────────────────────
    @app.get('/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'fraud-detection-api'})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'error': 'File too large (max 50 MB)'}), 413

    return app


if __name__ == '__main__':
    application = create_app()
    application.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
