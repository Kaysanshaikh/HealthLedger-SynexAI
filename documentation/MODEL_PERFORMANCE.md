# ML Disease Prediction Models: Performance Baselines

This document outlines the validation of our federated learning model architectures using publicly available Kaggle datasets as a proxy for real hospital data. We established individual performance baselines in single local rounds before introducing federated training across institutions.

## 🔬 Model Architectures & Baselines

HealthLedger SynexAI is not limited to a single algorithm; it employs a multi-model strategy to ensure the best fit for each clinical condition.

### 1. Diabetes Prediction
*   **Model Type**: Logistic Regression / Random Forest
*   **Dataset**: Pima Indians Diabetes Dataset
*   **Parameters**: 8 clinical parameters including glucose levels, BMI, insulin, age, and blood pressure.
*   **Baseline Performance**: **71.4% Accuracy**
*   **Analysis**: This baseline accounts for a notoriously noisy dataset and provides a clear target for federated training to improve upon.

### 2. Cardiovascular Disease (CVD)
*   **Model Type**: Multi-Layer Perceptron (Neural Network)
*   **Dataset**: Cleveland Heart Disease Dataset
*   **Parameters**: 13 risk factors including cholesterol, BP, chest pain type, and max heart rate.
*   **Baseline Performance**: **80.3% Accuracy**
*   **Analysis**: This result already approaches clinically meaningful performance, establishing the threshold that our federated system is designed to push further into the mid-80s and 90s.

### 3. Cancer Risk Prediction
*   **Model Type**: Multi-Layer Perceptron (Deep Learning)
*   **Dataset**: Wisconsin Breast Cancer Dataset
*   **Parameters**: 30 morphological cell parameters for binary classification.
*   **Baseline Performance**: **96.5% Accuracy**
*   **Analysis**: Our MLP architecture is exceptionally well-suited to this task, achieving results competitive with centralized benchmarks even before federated collaboration.

### 4. Pneumonia Detection (Chest X-Ray)
*   **Model Type**: CNN / Logistic Regression on Extracted Features
*   **Dataset**: Chest X-Ray Images (Pneumonia) Dataset
*   **Parameters**: High-dimensional feature vectors extracted from radiological images.
*   **Baseline Performance**: **100% Accuracy***
*   **Analysis**: In current local testing with a focused 1,500 sample subset, the model shows perfect classification. We expect this to normalize to ~94-96% as institutional variance is introduced through federated training.

---

## 📈 Summary Table

| Disease Track | Samples | Accuracy | Precision | Recall | F1-Score |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Diabetes** | 768 | 71.4% | 0.61 | 0.52 | 0.56 |
| **CVD** | 303 | 80.3% | 0.77 | 0.91 | 0.83 |
| **Cancer** | 569 | 96.5% | 0.98 | 0.93 | 0.95 |
| **Pneumonia** | 1,500 | 100.0% | 1.00 | 1.00 | 1.00 |

*Metrics based on `real_metrics.json` evaluation performed on local institutional nodes.*
