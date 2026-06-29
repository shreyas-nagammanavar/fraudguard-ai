"""
Feature engineering and preprocessing for IEEE-CIS Fraud Detection dataset.
Handles the full 394-column transaction dataset + optional identity merge.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings
warnings.filterwarnings('ignore')

# High-value V features selected by correlation + importance analysis
V_FEATURES = [
    'V1','V2','V3','V4','V5','V6','V7','V8','V9','V10',
    'V11','V12','V13','V14','V15','V16','V17','V18','V19','V20',
    'V21','V22','V23','V24','V25','V26','V27','V28','V29','V30',
    'V31','V32','V33','V34','V35','V36','V37','V38','V39','V40',
    'V41','V42','V43','V44','V45','V46','V47','V48','V49','V50',
    'V51','V52','V53','V54','V55','V56','V57','V58','V59','V60',
    'V61','V62','V63','V64','V65','V66','V67','V68','V69','V70',
    'V71','V72','V73','V74','V75','V76','V77','V78','V79','V80',
    'V81','V82','V83','V84','V85','V86','V87','V88','V89','V90',
    'V91','V92','V93','V94','V95','V96','V97','V98','V99','V100',
    'V126','V127','V128','V129','V130','V131','V132','V133','V134',
    'V135','V136','V137','V138','V139','V140','V141','V142','V143',
    'V144','V145','V146','V147','V148','V149','V150','V151','V152',
    'V153','V154','V155','V156','V157','V158','V159','V160','V161',
    'V162','V163','V164','V165','V166','V167','V168','V169','V170',
    'V207','V208','V209','V210','V211','V212','V213','V214','V215',
    'V216','V217','V218','V219','V220','V221','V222','V223','V224',
    'V225','V226','V227','V228','V229','V230','V231','V232','V233',
    'V234','V235','V236','V237','V238','V239','V240','V241','V242',
    'V243','V244','V245','V246','V247','V248','V249','V250','V251',
    'V252','V253','V254','V255','V256','V257','V258','V259','V260',
    'V261','V262','V263','V264','V265','V266','V267','V268','V269',
    'V270','V271','V272','V273','V274','V275','V276','V277','V278',
    'V279','V280','V281','V282','V283','V284','V285','V286','V287',
    'V288','V289','V290','V291','V292','V293','V294','V295','V296',
    'V297','V298','V299','V300','V301','V302','V303','V304','V305',
    'V306','V307','V308','V309','V310','V311','V312','V313','V314',
    'V315','V316','V317','V318','V319','V320','V321','V322','V323',
    'V324','V325','V326','V327','V328','V329','V330','V331','V332',
    'V333','V334','V335','V336','V337','V338','V339',
]

CAT_FEATURES = ['ProductCD', 'card4', 'card6', 'P_emaildomain', 'R_emaildomain',
                'M1','M2','M3','M4','M5','M6','M7','M8','M9']

NUMERIC_BASE = ['TransactionDT', 'TransactionAmt',
                'card1','card2','card3','card5',
                'addr1','addr2','dist1','dist2',
                'C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13','C14',
                'D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15']


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add time-based and ratio features."""
    df = df.copy()
    # Transaction hour and day from the reference timestamp
    df['tx_hour'] = (df['TransactionDT'] / 3600) % 24
    df['tx_day']  = (df['TransactionDT'] / (3600 * 24)) % 7
    # Log-transform amount (handles skew)
    df['log_amount'] = np.log1p(df['TransactionAmt'])
    # Amount per card interaction
    df['amt_card1_ratio'] = df['TransactionAmt'] / (df['card1'].replace(0, np.nan).fillna(1))
    return df


def _encode_categoricals(df: pd.DataFrame, encoders: dict = None, fit: bool = True):
    """Label-encode categorical columns; return (df, encoders)."""
    df = df.copy()
    if encoders is None:
        encoders = {}
    for col in CAT_FEATURES:
        if col not in df.columns:
            df[col] = 'unknown'
        df[col] = df[col].astype(str).fillna('unknown')
        if fit:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col])
            encoders[col] = le
        else:
            le = encoders.get(col)
            if le is None:
                df[col] = 0
            else:
                known = set(le.classes_)
                df[col] = df[col].apply(lambda x: x if x in known else le.classes_[0])
                df[col] = le.transform(df[col])
    return df, encoders


def get_feature_columns() -> list:
    """Return the ordered list of model input features."""
    engineered = ['tx_hour', 'tx_day', 'log_amount', 'amt_card1_ratio']
    v_cols = [v for v in V_FEATURES]
    return NUMERIC_BASE + CAT_FEATURES + engineered + v_cols


def preprocess(df: pd.DataFrame,
               scaler: StandardScaler = None,
               encoders: dict = None,
               fit: bool = True):
    """
    Full preprocessing pipeline.
    Returns (X, scaler, encoders, feature_cols) when fit=True
    Returns (X, scaler, encoders, feature_cols) when fit=False (inference)
    """
    df = df.copy()

    # --- Fill missing ---
    for col in NUMERIC_BASE + V_FEATURES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(-999)
        else:
            df[col] = -999

    # --- Categoricals ---
    df, encoders = _encode_categoricals(df, encoders=encoders, fit=fit)

    # --- Feature engineering ---
    df = _engineer_features(df)

    feature_cols = get_feature_columns()
    # Ensure all columns exist
    for col in feature_cols:
        if col not in df.columns:
            df[col] = 0

    X = df[feature_cols].values.astype(np.float32)
    # Replace any remaining NaN/Inf
    X = np.nan_to_num(X, nan=-999, posinf=999, neginf=-999)

    # --- Scale ---
    if fit:
        scaler = StandardScaler()
        X = scaler.fit_transform(X)
    else:
        if scaler is not None:
            X = scaler.transform(X)

    return X, scaler, encoders, feature_cols
