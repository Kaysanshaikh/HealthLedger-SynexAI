import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# DATASET LINKS & INFO:
# 1. Diabetes: https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database (diabetes.csv)
# 2. Heart Disease (CVD): https://www.kaggle.com/datasets/redwankarimsony/heart-disease-data (heart_disease_data.csv)
# 3. Breast Cancer: https://www.kaggle.com/datasets/uciml/breast-cancer-wisconsin-data (data.csv)
# 4. Pneumonia: https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia (images)

def load_dataset(disease_type, data_path="datasets/", sample_count=None):
    """
    Loads and preprocesses real medical datasets from Kaggle.
    Optionally limits to sample_count rows for faster training.
    """
    if disease_type == "diabetes":
        # Pima Indians Diabetes Database
        # Columns: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI, DiabetesPedigreeFunction, Age, Outcome
        df = pd.read_csv(f"{data_path}diabetes.csv")
        X = df.drop('Outcome', axis=1)
        y = df['Outcome']
    
    elif disease_type == "cvd":
        # Heart Disease UCI
        # Columns: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal, target
        df = pd.read_csv(f"{data_path}heart_disease_data.csv")
        X = df.drop('target', axis=1)
        y = df['target']
    
    elif disease_type == "cancer":
        # Breast Cancer Wisconsin (Diagnostic)
        df = pd.read_csv(f"{data_path}breast_cancer.csv")
        # Drop ID and diagnosis (target)
        X = df.drop(['id', 'diagnosis'], axis=1)
        y = df['diagnosis'].map({'M': 1, 'B': 0})
        
    else:
        raise ValueError(f"Unknown disease type: {disease_type}")

    # Apply sample count limit if specified
    if sample_count and sample_count < len(X):
        X = X.head(sample_count)
        y = y.head(sample_count)

    # Scale the features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y

def get_train_test_split(X, y, test_size=0.2):
    return train_test_split(X, y, test_size=test_size, random_state=42)

def list_datasets(data_path="datasets/"):
    """
    Lists available datasets with metadata.
    Returns: list of dicts with file, rows, columns, size_kb info.
    """
    import os
    
    dataset_files = {
        'diabetes': 'diabetes.csv',
        'cvd': 'heart_disease_data.csv',
        'cancer': 'breast_cancer.csv'
    }
    
    results = []
    for disease, filename in dataset_files.items():
        filepath = os.path.join(data_path, filename)
        if os.path.exists(filepath):
            df = pd.read_csv(filepath)
            file_size = os.path.getsize(filepath) / 1024  # KB
            results.append({
                'disease': disease,
                'file': filename,
                'rows': len(df),
                'columns': len(df.columns),
                'column_names': df.columns.tolist(),
                'size_kb': round(file_size, 1)
            })
    
    return results
