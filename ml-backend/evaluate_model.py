import sys
import json
import numpy as np
import os
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from kaggle_loader import load_dataset, get_train_test_split

def evaluate(input_data):
    # In production, we'd receive weights and the target disease
    weights_data = input_data.get("model", {}).get("modelWeights")
    disease = input_data.get("disease")
    
    if not weights_data or not disease:
        return {"error": "Missing model weights or disease type for evaluation"}
        
    datasets_path = os.path.join(os.path.dirname(__file__), "datasets/")
    
    try:
        # Load the test data for this disease
        X, y = load_dataset(disease, data_path=datasets_path)
        _, X_test, _, y_test = get_train_test_split(X, y)
        
        # Initialize a new model and inject the weights
        model = LogisticRegression()
        
        # Set the dimensions (must match the loaded data)
        # Note: Weights from train_model.py are in {"coef": [...], "intercept": [...]} format
        model.coef_ = np.array(weights_data["coef"])
        model.intercept_ = np.array(weights_data["intercept"])
        model.classes_ = np.array([0, 1]) # Standard for binary classification
        
        # Predict on real test set
        y_pred = model.predict(X_test)
        
        # Calculate production metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        return {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1Score": float(f1),
            "confusionMatrix": cm,
            "samples": len(X_test)
        }
        
    except FileNotFoundError:
        return {"error": f"Evaluation dataset for {disease} not found."}
    except Exception as e:
        return {"error": f"Evaluation error: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = evaluate(input_data)
            print(json.dumps(result))
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}))
    else:
        print(json.dumps({"error": "No input data provided"}))
