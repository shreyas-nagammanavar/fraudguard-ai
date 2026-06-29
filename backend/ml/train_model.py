"""
train_model.py  –  IEEE-CIS Fraud Detection Model Training Pipeline
=====================================================================
Trains multiple classifiers, compares metrics, saves the best model.

Usage:
    python train_model.py --data-zip "path/to/ieee-fraud-detection.zip"
    python train_model.py --data-dir  "path/to/csvs/"
"""

import os
import sys
import argparse
import warnings
import zipfile
import json
import time

import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve, average_precision_score
)
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

warnings.filterwarnings('ignore')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.preprocessing import preprocess

SAVED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'saved_models')
os.makedirs(SAVED_DIR, exist_ok=True)

# ──────────────────────────────────────────────────────────────────
# 1. Data Loading
# ──────────────────────────────────────────────────────────────────

def load_data(zip_path: str = None, data_dir: str = None, sample_frac: float = 1.0) -> pd.DataFrame:
    """Load train_transaction.csv (+ optional identity merge) from zip or directory."""
    print("[INFO] Loading dataset ...")

    if zip_path and os.path.exists(zip_path):
        z = zipfile.ZipFile(zip_path)
        txn = pd.read_csv(z.open('train_transaction.csv'))
        try:
            idt = pd.read_csv(z.open('train_identity.csv'))
            df = txn.merge(idt, on='TransactionID', how='left')
        except Exception:
            df = txn
    elif data_dir and os.path.isdir(data_dir):
        txn_path = os.path.join(data_dir, 'train_transaction.csv')
        idt_path = os.path.join(data_dir, 'train_identity.csv')
        txn = pd.read_csv(txn_path)
        if os.path.exists(idt_path):
            idt = pd.read_csv(idt_path)
            df = txn.merge(idt, on='TransactionID', how='left')
        else:
            df = txn
    else:
        raise FileNotFoundError("Provide --data-zip or --data-dir pointing to IEEE-CIS files.")

    if sample_frac < 1.0:
        df = df.sample(frac=sample_frac, random_state=42).reset_index(drop=True)

    print(f"   Rows: {len(df):,}  |  Fraud rate: {df['isFraud'].mean()*100:.2f}%")
    return df


# ──────────────────────────────────────────────────────────────────
# 2. EDA (saved to saved_models/)
# ──────────────────────────────────────────────────────────────────

def run_eda(df: pd.DataFrame):
    print("[INFO] Running EDA ...")
    fig, axes = plt.subplots(2, 3, figsize=(16, 10))
    fig.suptitle('IEEE-CIS Fraud Detection – EDA', fontsize=16, fontweight='bold')

    # Class distribution
    counts = df['isFraud'].value_counts()
    axes[0,0].bar(['Legitimate (0)', 'Fraud (1)'], counts.values,
                  color=['#22c55e', '#ef4444'])
    axes[0,0].set_title('Class Distribution')
    axes[0,0].set_ylabel('Count')
    for i, v in enumerate(counts.values):
        axes[0,0].text(i, v + 200, f'{v:,}', ha='center', fontweight='bold')

    # Transaction amount distribution
    axes[0,1].hist(df['TransactionAmt'].clip(0, 1000), bins=50,
                   color='#6366f1', edgecolor='white', alpha=0.8)
    axes[0,1].set_title('Transaction Amount Distribution (clipped at $1000)')
    axes[0,1].set_xlabel('Amount ($)')

    # Log amount by class
    df['log_amt_tmp'] = np.log1p(df['TransactionAmt'])
    df.groupby('isFraud')['log_amt_tmp'].plot(kind='density', ax=axes[0,2])
    axes[0,2].set_title('Log(Amount) Density by Class')
    axes[0,2].legend(['Legitimate', 'Fraud'])
    df.drop(columns=['log_amt_tmp'], inplace=True)

    # Hour of day
    df['_hour'] = (df['TransactionDT'] / 3600) % 24
    fraud_hour = df[df['isFraud']==1]['_hour'].value_counts().sort_index()
    safe_hour  = df[df['isFraud']==0]['_hour'].value_counts().sort_index()
    axes[1,0].plot(fraud_hour.index, fraud_hour.values, color='#ef4444', label='Fraud')
    axes[1,0].plot(safe_hour.index,  safe_hour.values  / safe_hour.max() * fraud_hour.max(),
                   color='#22c55e', label='Safe (scaled)')
    axes[1,0].set_title('Fraud by Hour of Day')
    axes[1,0].legend()
    df.drop(columns=['_hour'], inplace=True)

    # ProductCD
    if 'ProductCD' in df.columns:
        pc = df.groupby('ProductCD')['isFraud'].mean().sort_values(ascending=False)
        axes[1,1].bar(pc.index, pc.values * 100, color='#f59e0b')
        axes[1,1].set_title('Fraud Rate by ProductCD (%)')
        axes[1,1].set_ylabel('%')

    # Missing value heatmap (top 20 cols)
    miss = df.isnull().mean().sort_values(ascending=False)[:20]
    axes[1,2].barh(miss.index, miss.values * 100, color='#8b5cf6')
    axes[1,2].set_title('Top 20 Missing Value %')
    axes[1,2].set_xlabel('%')

    plt.tight_layout()
    path = os.path.join(SAVED_DIR, 'eda_plots.png')
    plt.savefig(path, dpi=120, bbox_inches='tight')
    plt.close()
    print(f"   EDA saved -> {path}")


# ──────────────────────────────────────────────────────────────────
# 3. Model Definitions
# ──────────────────────────────────────────────────────────────────

def get_models():
    return {
        'Random Forest': RandomForestClassifier(
            n_estimators=300, max_depth=12, min_samples_split=10,
            class_weight='balanced', n_jobs=-1, random_state=42
        ),
        'XGBoost': XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            scale_pos_weight=30,
            eval_metric='auc',
            n_jobs=-1, random_state=42, verbosity=0
        ),
        'Logistic Regression': LogisticRegression(
            C=0.1, max_iter=1000, class_weight='balanced',
            solver='saga', n_jobs=-1, random_state=42
        ),
        'Decision Tree': DecisionTreeClassifier(
            max_depth=10, class_weight='balanced', random_state=42
        ),
    }


# ──────────────────────────────────────────────────────────────────
# 4. Evaluation helpers
# ──────────────────────────────────────────────────────────────────

def evaluate(model, X_test, y_test, name: str) -> dict:
    proba = model.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    metrics = {
        'name':      name,
        'accuracy':  round(accuracy_score(y_test, preds) * 100, 3),
        'precision': round(precision_score(y_test, preds, zero_division=0) * 100, 3),
        'recall':    round(recall_score(y_test, preds, zero_division=0) * 100, 3),
        'f1':        round(f1_score(y_test, preds, zero_division=0) * 100, 3),
        'roc_auc':   round(roc_auc_score(y_test, proba) * 100, 3),
        'avg_precision': round(average_precision_score(y_test, proba) * 100, 3),
    }
    return metrics, proba, preds


def plot_model_comparison(all_metrics: list):
    df_m = pd.DataFrame(all_metrics)
    metrics_cols = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc']
    x = np.arange(len(df_m))
    width = 0.15

    fig, ax = plt.subplots(figsize=(14, 6))
    colors = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6']
    for i, (col, color) in enumerate(zip(metrics_cols, colors)):
        ax.bar(x + i*width, df_m[col], width, label=col.replace('_',' ').title(), color=color)
    ax.set_xticks(x + width*2)
    ax.set_xticklabels(df_m['name'], rotation=15)
    ax.set_ylim(0, 110)
    ax.set_ylabel('Score (%)')
    ax.set_title('Model Comparison')
    ax.legend(loc='lower right')
    plt.tight_layout()
    plt.savefig(os.path.join(SAVED_DIR, 'model_comparison.png'), dpi=120)
    plt.close()


def plot_confusion_matrix(y_test, preds, name: str):
    cm = confusion_matrix(y_test, preds)
    plt.figure(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Legitimate', 'Fraud'],
                yticklabels=['Legitimate', 'Fraud'])
    plt.title(f'Confusion Matrix – {name}')
    plt.ylabel('Actual'); plt.xlabel('Predicted')
    plt.tight_layout()
    plt.savefig(os.path.join(SAVED_DIR, 'confusion_matrix.png'), dpi=120)
    plt.close()


def plot_roc_pr(y_test, models_proba: dict):
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    colors = ['#6366f1','#22c55e','#f59e0b','#ef4444']

    for (name, proba), color in zip(models_proba.items(), colors):
        fpr, tpr, _ = roc_curve(y_test, proba)
        auc_val = roc_auc_score(y_test, proba)
        axes[0].plot(fpr, tpr, label=f'{name} (AUC={auc_val:.3f})', color=color)

        prec, rec, _ = precision_recall_curve(y_test, proba)
        ap = average_precision_score(y_test, proba)
        axes[1].plot(rec, prec, label=f'{name} (AP={ap:.3f})', color=color)

    axes[0].plot([0,1],[0,1],'k--', alpha=0.4)
    axes[0].set_title('ROC Curve'); axes[0].set_xlabel('FPR'); axes[0].set_ylabel('TPR')
    axes[0].legend()

    axes[1].set_title('Precision-Recall Curve'); axes[1].set_xlabel('Recall'); axes[1].set_ylabel('Precision')
    axes[1].legend()

    plt.tight_layout()
    plt.savefig(os.path.join(SAVED_DIR, 'roc_pr_curves.png'), dpi=120)
    plt.close()


def plot_feature_importance(model, feature_cols: list, model_name: str):
    try:
        if hasattr(model, 'feature_importances_'):
            imp = model.feature_importances_
        else:
            return
        top_n = 30
        idx = np.argsort(imp)[::-1][:top_n]
        plt.figure(figsize=(10, 8))
        plt.barh([feature_cols[i] for i in idx[::-1]], imp[idx[::-1]], color='#6366f1')
        plt.xlabel('Importance')
        plt.title(f'Top {top_n} Feature Importances – {model_name}')
        plt.tight_layout()
        plt.savefig(os.path.join(SAVED_DIR, 'feature_importance.png'), dpi=120)
        plt.close()
    except Exception:
        pass


# ──────────────────────────────────────────────────────────────────
# 5. Main Training Pipeline
# ──────────────────────────────────────────────────────────────────

def train(zip_path: str = None, data_dir: str = None, sample_frac: float = 1.0):
    t0 = time.time()

    df = load_data(zip_path=zip_path, data_dir=data_dir, sample_frac=sample_frac)
    run_eda(df)

    y = df['isFraud'].values
    X, scaler, encoders, feature_cols = preprocess(df.drop(columns=['isFraud', 'TransactionID'],
                                                            errors='ignore'), fit=True)

    print(f"   Features: {len(feature_cols)}")

    # ── Train / Test split ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42)

    # ── SMOTE on training set ──
    print("[INFO] Applying SMOTE ...")
    smote = SMOTE(sampling_strategy=0.3, k_neighbors=5, random_state=42)
    X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)
    print(f"   After SMOTE - Fraud: {y_train_sm.sum():,} / Total: {len(y_train_sm):,}")

    # ── Train models ──
    models = get_models()
    all_metrics = []
    all_proba   = {}
    trained_models = {}

    for name, model in models.items():
        print(f"\n[TRAIN] Training {name} ...")
        t1 = time.time()
        model.fit(X_train_sm, y_train_sm)
        elapsed = round(time.time() - t1, 1)
        metrics, proba, preds = evaluate(model, X_test, y_test, name)
        all_metrics.append(metrics)
        all_proba[name] = proba
        trained_models[name] = model
        print(f"   Done: {name} in {elapsed}s  |  F1={metrics['f1']:.2f}%  ROC-AUC={metrics['roc_auc']:.2f}%  Recall={metrics['recall']:.2f}%")

    # ── Isolation Forest (anomaly detection – no SMOTE) ──
    print(f"\n[TRAIN] Training Isolation Forest ...")
    iso = IsolationForest(n_estimators=200, contamination=0.035,
                          n_jobs=-1, random_state=42)
    iso.fit(X_train)
    iso_raw  = iso.decision_function(X_test)
    iso_proba = (iso_raw - iso_raw.min()) / (iso_raw.max() - iso_raw.min() + 1e-9)
    iso_proba = 1 - iso_proba            # flip: high score = more anomalous
    iso_preds = (iso_proba >= 0.6).astype(int)
    iso_metrics = {
        'name':      'Isolation Forest',
        'accuracy':  round(accuracy_score(y_test, iso_preds) * 100, 3),
        'precision': round(precision_score(y_test, iso_preds, zero_division=0) * 100, 3),
        'recall':    round(recall_score(y_test, iso_preds, zero_division=0) * 100, 3),
        'f1':        round(f1_score(y_test, iso_preds, zero_division=0) * 100, 3),
        'roc_auc':   round(roc_auc_score(y_test, iso_proba) * 100, 3),
        'avg_precision': round(average_precision_score(y_test, iso_proba) * 100, 3),
    }
    all_metrics.append(iso_metrics)
    all_proba['Isolation Forest'] = iso_proba
    print(f"   Done: Isolation Forest  |  F1={iso_metrics['f1']:.2f}%  ROC-AUC={iso_metrics['roc_auc']:.2f}%")

    # ── Select best model (by ROC-AUC, supervised only) ──
    supervised = [m for m in all_metrics if m['name'] != 'Isolation Forest']
    best_meta  = max(supervised, key=lambda m: (m['roc_auc'] + m['f1']))
    best_name  = best_meta['name']
    best_model = trained_models[best_name]
    print(f"\n[BEST] Best model: {best_name}  (ROC-AUC={best_meta['roc_auc']:.2f}%  F1={best_meta['f1']:.2f}%)")

    # Confusion matrix & classification report for best model
    best_proba = all_proba[best_name]
    best_preds = (best_proba >= 0.5).astype(int)
    plot_confusion_matrix(y_test, best_preds, best_name)
    print("\nClassification Report:\n")
    print(classification_report(y_test, best_preds,
                                 target_names=['Legitimate', 'Fraud']))

    # ── Plots ──
    plot_model_comparison(all_metrics)
    plot_roc_pr(y_test, all_proba)
    plot_feature_importance(best_model, feature_cols, best_name)

    # ── Persist ──
    joblib.dump(best_model, os.path.join(SAVED_DIR, 'fraud_model.pkl'))
    joblib.dump(scaler,     os.path.join(SAVED_DIR, 'scaler.pkl'))
    joblib.dump(encoders,   os.path.join(SAVED_DIR, 'encoders.pkl'))
    joblib.dump(feature_cols, os.path.join(SAVED_DIR, 'feature_cols.pkl'))

    # Save all metrics to JSON for dashboard
    metrics_payload = {
        'best_model':   best_name,
        'models':       all_metrics,
        'best_metrics': best_meta,
        'train_time_s': round(time.time() - t0, 1),
        'n_features':   len(feature_cols),
        'train_samples': int(len(y_train_sm)),
        'test_samples':  int(len(y_test)),
        'fraud_rate_pct': round(float(y.mean()) * 100, 3),
    }
    with open(os.path.join(SAVED_DIR, 'metrics.json'), 'w') as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"\n[DONE] Training complete in {round(time.time()-t0,1)}s")
    print(f"   Artifacts saved to: {os.path.abspath(SAVED_DIR)}")
    return metrics_payload


# ──────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train IEEE-CIS Fraud Detection models')
    parser.add_argument('--data-zip',  type=str, default=None)
    parser.add_argument('--data-dir',  type=str, default=None)
    parser.add_argument('--sample',    type=float, default=1.0,
                        help='Fraction of data to use (0-1). Default: 1.0')
    args = parser.parse_args()

    # Auto-discover zip if neither flag provided
    if args.data_zip is None and args.data_dir is None:
        candidate = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 '..', '..', '..', 'ieee-fraud-detection.zip')
        candidate = os.path.normpath(candidate)
        if os.path.exists(candidate):
            args.data_zip = candidate
        else:
            print("[WARN] No dataset path provided. Use --data-zip or --data-dir")
            sys.exit(1)

    train(zip_path=args.data_zip, data_dir=args.data_dir, sample_frac=args.sample)
