import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# DATASET LINKS & INFO:
# 1. Diabetes: https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database (diabetes.csv)
# 2. Heart Disease (CVD): https://www.kaggle.com/datasets/redwankarimsony/heart-disease-data (heart_disease_data.csv)
# 3. Breast Cancer: https://www.kaggle.com/datasets/uciml/breast-cancer-wisconsin-data (data.csv)
# 4. Pneumonia: https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia (images)

def load_dataset(disease_type, data_path="datasets/"):
    """
    Loads and preprocesses real medical datasets from Kaggle.
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

    # Scale the features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y

def get_train_test_split(X, y, test_size=0.2):
    return train_test_split(X, y, test_size=test_size, random_state=42)
