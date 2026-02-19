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
    
    print("Dataset download complete!")

if __name__ == "__main__":
    download_datasets()
