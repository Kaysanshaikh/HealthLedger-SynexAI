import sys
import json
import numpy as np
import time
import os
import logging
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, log_loss
from kaggle_loader import load_dataset, get_train_test_split

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def train(input_data):
    disease = input_data.get("disease")
    if not disease:
        return {"error": "Missing disease type in input data"}
        
    config = input_data.get("config", {})
    datasets_path = os.path.join(os.path.dirname(__file__), "datasets/")
    
    logger.info(f"🚀 Starting production training for {disease} model...")
    
    try:
        # Strict loading of real data
        X, y = load_dataset(disease, data_path=datasets_path)
        X_train, X_test, y_train, y_test = get_train_test_split(X, y)
        
        logger.info(f"✅ Dataset loaded. Training samples: {len(X_train)}")
        
    except FileNotFoundError as e:
        logger.error(f"❌ Production Error: Dataset missing for {disease}. {str(e)}")
        return {"error": f"Dataset file missing for {disease}. Please upload real Kaggle data to ml-backend/datasets/"}
    except Exception as e:
        logger.error(f"❌ Production Error: Failed to load dataset. {str(e)}")
        return {"error": f"Data loading failed: {str(e)}"}

    start_time = time.time()
    
    try:
        # Initialize model with production params
        model = LogisticRegression(
            max_iter=config.get("max_iter", 1000),
            C=config.get("C", 1.0),
            solver='lbfgs',
            multi_class='auto'
        )
        
        # Train model
        model.fit(X_train, y_train)
        
        # Evaluate on test set
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Probabilities for loss calculation
        y_prob = model.predict_proba(X_test)
        loss = log_loss(y_test, y_prob)
        
        # Extract weights (coefficients and intercepts)
        weights = {
            "coef": model.coef_.tolist(),
            "intercept": model.intercept_.tolist(),
            "feature_names": getattr(X, 'columns', []).tolist() if hasattr(X, 'columns') else []
        }
        
        end_time = time.time()
        training_time = end_time - start_time
        
        logger.info(f"✨ Training complete. Accuracy: {accuracy:.4f}, Loss: {loss:.4f}")
        
        return {
            "weights": weights,
            "accuracy": float(accuracy),
            "loss": float(loss),
            "trainingTime": training_time,
            "metrics": {
                "samples": len(X_train),
                "test_samples": len(X_test),
                "iterations": int(model.n_iter_[0])
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Training failed: {str(e)}")
        return {"error": f"Model training failed: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = train(input_data)
            print(json.dumps(result))
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON input"}))
    else:
        print(json.dumps({"error": "No input data provided"}))
