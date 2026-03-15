"""
Download Kaggle datasets for FL training.
Uses direct GitHub raw links and UCI archive for well-known public medical datasets.

Run: python3 ml-backend/download_datasets.py
"""
import os
import urllib.request
import sys

DATASETS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "datasets")

# Breast cancer WDBC feature column names
WDBC_FEATURES = [
    "radius_mean", "texture_mean", "perimeter_mean", "area_mean", "smoothness_mean",
    "compactness_mean", "concavity_mean", "concave points_mean", "symmetry_mean", "fractal_dimension_mean",
    "radius_se", "texture_se", "perimeter_se", "area_se", "smoothness_se",
    "compactness_se", "concavity_se", "concave points_se", "symmetry_se", "fractal_dimension_se",
    "radius_worst", "texture_worst", "perimeter_worst", "area_worst", "smoothness_worst",
    "compactness_worst", "concavity_worst", "concave points_worst", "symmetry_worst", "fractal_dimension_worst"
]

def download_file(url, filepath):
    """Download a file from URL to filepath."""
    urllib.request.urlretrieve(url, filepath)
    size = os.path.getsize(filepath)
    if size < 100:
        os.remove(filepath)
        raise Exception(f"Downloaded file too small ({size} bytes)")
    return size

def download_datasets():
    os.makedirs(DATASETS_DIR, exist_ok=True)
    
    # 1. Diabetes (Pima Indians)
    diabetes_path = os.path.join(DATASETS_DIR, "diabetes.csv")
    if not os.path.exists(diabetes_path):
        print("  Downloading diabetes.csv...")
        try:
            size = download_file(
                "https://raw.githubusercontent.com/npradaschnor/Pima-Indians-Diabetes-Dataset/master/diabetes.csv",
                diabetes_path
            )
            print(f"  diabetes.csv downloaded ({size:,} bytes)")
        except Exception as e:
            print(f"  Failed: {e}")
    else:
        print("  diabetes.csv already exists, skipping.")

    # 2. Heart Disease (UCI)
    heart_path = os.path.join(DATASETS_DIR, "heart_disease_data.csv")
    if not os.path.exists(heart_path):
        print("  Downloading heart_disease_data.csv...")
        try:
            size = download_file(
                "https://raw.githubusercontent.com/sharmaroshan/Heart-UCI-Dataset/master/heart.csv",
                heart_path
            )
            print(f"  heart_disease_data.csv downloaded ({size:,} bytes)")
        except Exception as e:
            print(f"  Failed: {e}")
    else:
        print("  heart_disease_data.csv already exists, skipping.")

    # 3. Breast Cancer Wisconsin (from UCI archive, needs header addition)
    cancer_path = os.path.join(DATASETS_DIR, "breast_cancer.csv")
    if not os.path.exists(cancer_path):
        print("  Downloading breast_cancer.csv...")
        try:
            raw_path = os.path.join(DATASETS_DIR, "_wdbc_raw.data")
            download_file(
                "https://archive.ics.uci.edu/ml/machine-learning-databases/breast-cancer-wisconsin/wdbc.data",
                raw_path
            )
            # Add headers: id, diagnosis, then 30 feature columns
            header = "id,diagnosis," + ",".join(WDBC_FEATURES)
            with open(raw_path, 'r') as f:
                data = f.read()
            with open(cancer_path, 'w') as f:
                f.write(header + "\n" + data)
            os.remove(raw_path)
            size = os.path.getsize(cancer_path)
            print(f"  breast_cancer.csv downloaded ({size:,} bytes)")
        except Exception as e:
            print(f"  Failed: {e}")
    else:
        print("  breast_cancer.csv already exists, skipping.")

    # 4. Pneumonia (Tabular synthesis)
    # Since Kaggle pneumonia datasets are predominantly X-Ray images, we generate a synthetic 
    # tabular CSV that bridges the gap for our Federated Learning numerical pipeline.
    pneumonia_path = os.path.join(DATASETS_DIR, "pneumonia.csv")
    if not os.path.exists(pneumonia_path):
        print("  Synthesizing tabular pneumonia.csv dataset...")
        try:
            import numpy as np
            import pandas as pd
            np.random.seed(42)
            n_samples = 1500
            
            # Generate feature distributions simulating healthy vs pneumonia patients
            labels = np.random.choice([0, 1], size=n_samples, p=[0.6, 0.4])
            
            fev1 = np.where(labels == 1, np.random.normal(2.1, 0.4, n_samples), np.random.normal(3.5, 0.5, n_samples))
            fvc = np.where(labels == 1, np.random.normal(2.5, 0.5, n_samples), np.random.normal(4.2, 0.6, n_samples))
            fev1_fvc = fev1 / fvc
            resp_rate = np.where(labels == 1, np.random.normal(24, 3, n_samples), np.random.normal(16, 2, n_samples))
            o2_sat = np.where(labels == 1, np.random.normal(92, 2.5, n_samples), np.random.normal(98, 1, n_samples))
            body_temp = np.where(labels == 1, np.random.normal(38.5, 0.6, n_samples), np.random.normal(36.8, 0.3, n_samples))
            wbc_count = np.where(labels == 1, np.random.normal(14.5, 2.5, n_samples), np.random.normal(7.5, 1.5, n_samples))
            crp = np.where(labels == 1, np.random.normal(85, 25, n_samples), np.random.normal(5, 3, n_samples))
            cough = np.where(labels == 1, np.random.uniform(5, 10, n_samples), np.random.uniform(0, 3, n_samples))
            chest_pain = np.where(labels == 1, np.random.uniform(3, 8, n_samples), np.random.uniform(0, 2, n_samples))
            
            # Cap realistic ranges
            o2_sat = np.clip(o2_sat, 70, 100)
            cough = np.clip(np.round(cough), 0, 10)
            chest_pain = np.clip(np.round(chest_pain), 0, 10)
            
            df_pneumonia = pd.DataFrame({
                'FEV1': fev1,
                'FVC': fvc,
                'FEV1_FVC_Ratio': fev1_fvc,
                'Respiratory_Rate': resp_rate,
                'O2_Saturation': o2_sat,
                'Body_Temp': body_temp,
                'WBC_Count': wbc_count,
                'CRP_Level': crp,
                'Cough_Severity': cough,
                'Chest_Pain_Scale': chest_pain,
                'target': labels
            })
            
            df_pneumonia.to_csv(pneumonia_path, index=False)
            print(f"  pneumonia.csv synthesized ({os.path.getsize(pneumonia_path):,} bytes)")
        except ImportError:
            print("  Failed: pandas/numpy not installed. Cannot synthesize tabular pneumonia dataset.")
        except Exception as e:
            print(f"  Failed generating pneumonia data: {e}")
    else:
        print("  pneumonia.csv already exists, skipping.")
    
    print("Dataset download complete!")

if __name__ == "__main__":
    download_datasets()
