import sys
import json
import numpy as np
import time
import os
import logging
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, log_loss
from kaggle_loader import load_dataset, get_train_test_split

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def create_model(model_type, config):
    """Factory function to create the appropriate ML model based on type."""
    if model_type == 'random_forest':
        return RandomForestClassifier(
            n_estimators=config.get("n_estimators", 100),
            max_depth=config.get("max_depth", 10),
            random_state=42
        )
    elif model_type == 'neural_network':
        return MLPClassifier(
            hidden_layer_sizes=config.get("hidden_layers", (64, 32)),
            max_iter=config.get("max_iter", 500),
            activation='relu',
            solver='adam',
            random_state=42
        )
    elif model_type == 'cnn':
        # For tabular health data, CNN isn't applicable — use a deeper MLP instead
        # True CNNs require image/spatial data (e.g., X-rays for pneumonia)
        return MLPClassifier(
            hidden_layer_sizes=config.get("hidden_layers", (128, 64, 32)),
            max_iter=config.get("max_iter", 500),
            activation='relu',
            solver='adam',
            random_state=42
        )
    else:  # Default: logistic_regression
        return LogisticRegression(
            max_iter=config.get("max_iter", 1000),
            C=config.get("C", 1.0),
            solver='lbfgs'
        )


def extract_weights(model, model_type):
    """Extract model weights/parameters for federated averaging."""
    if model_type == 'random_forest':
        # For Random Forest, extract feature importances as a proxy for weights
        # (true weight-level FedAvg not possible with tree ensembles)
        return {
            "feature_importances": model.feature_importances_.tolist(),
            "n_estimators": model.n_estimators,
            "feature_names": []
        }
    elif model_type in ('neural_network', 'cnn'):
        # MLP weights: list of weight matrices and bias vectors per layer
        weights = {}
        for i, (coef, intercept) in enumerate(zip(model.coefs_, model.intercepts_)):
            weights[f"layer_{i}_weights"] = coef.tolist()
            weights[f"layer_{i}_bias"] = intercept.tolist()
        weights["feature_names"] = []
        return weights
    else:  # logistic_regression
        return {
            "coef": model.coef_.tolist(),
            "intercept": model.intercept_.tolist(),
            "feature_names": []
        }


def train(input_data):
    disease = input_data.get("disease")
    if not disease:
        return {"error": "Missing disease type in input data"}
        
    config = input_data.get("config", {})
    model_type = input_data.get("modelType", "logistic_regression")
    data_source = input_data.get("dataSource", "kaggle")
    sample_count = input_data.get("sampleCount")
    custom_data = input_data.get("customData")
    datasets_path = os.path.join(os.path.dirname(__file__), "datasets/")
    
    logger.info(f"🚀 Starting production training for {disease} model (type: {model_type}, source: {data_source})...")
    
    X_all = None
    y_all = None
    
    try:
        # Load data based on source type
        if data_source in ("kaggle", "combined"):
            try:
                X_kaggle, y_kaggle = load_dataset(disease, data_path=datasets_path, sample_count=sample_count)
                X_all = X_kaggle
                y_all = y_kaggle
                logger.info(f"✅ Kaggle dataset loaded. Samples: {len(X_kaggle)}")
            except FileNotFoundError as e:
                if data_source == "kaggle":
                    return {"error": f"Dataset file missing for {disease}. Please upload real Kaggle data to ml-backend/datasets/"}
                logger.warning(f"⚠️ Kaggle dataset not found, using medical records only: {e}")
        
        if data_source in ("medical_records", "combined") and custom_data:
            features = custom_data.get("features", [])
            if len(features) > 0:
                X_custom = np.array(features)
                # For medical records, we don't have labels — generate synthetic labels
                # based on feature patterns (this is a simplification for the prototype)
                # In production, labels would come from confirmed diagnoses
                y_custom = np.zeros(len(X_custom))
                for i, row in enumerate(X_custom):
                    # Simple heuristic: if most values are above mean, label as positive
                    if np.mean(row) > np.median(row):
                        y_custom[i] = 1
                
                if X_all is not None:
                    # Combined mode: merge kaggle + medical records
                    # Ensure same number of features by padding/truncating
                    n_features = X_all.shape[1]
                    if X_custom.shape[1] < n_features:
                        # Pad custom data with zeros
                        padding = np.zeros((len(X_custom), n_features - X_custom.shape[1]))
                        X_custom = np.hstack([X_custom, padding])
                    elif X_custom.shape[1] > n_features:
                        # Truncate custom data
                        X_custom = X_custom[:, :n_features]
                    
                    X_all = np.vstack([X_all, X_custom])
                    y_all = np.concatenate([y_all, y_custom])
                    logger.info(f"✅ Combined {len(X_kaggle)} Kaggle + {len(X_custom)} medical records = {len(X_all)} total")
                else:
                    X_all = X_custom
                    y_all = y_custom
                    logger.info(f"✅ Medical records loaded. Samples: {len(X_custom)}")
        
        if X_all is None or len(X_all) == 0:
            return {"error": f"No training data available for {disease}. Check dataset files or medical records."}
        
        # Apply sample count limit
        if sample_count and sample_count < len(X_all):
            # Sample with class balancing constraint (attempt stratify if classes known/available)
            try:
                # Need to import train_test_split to do stratified sampling easily
                from sklearn.model_selection import train_test_split
                X_all, _, y_all, _ = train_test_split(X_all, y_all, train_size=sample_count, stratify=y_all, random_state=42)
            except ValueError:
                # If only 1 class or not enough members, fall back to random
                indices = np.random.choice(len(X_all), sample_count, replace=False)
                X_all = X_all[indices]
                y_all = y_all[indices]
            
            logger.info(f"📊 Limited to {sample_count} samples")
        
        # Ensure numpy arrays
        if not isinstance(X_all, np.ndarray):
            X_all = np.array(X_all)
        if not isinstance(y_all, np.ndarray):
            y_all = np.array(y_all)
        
        # Split data
        X_train, X_test, y_train, y_test = get_train_test_split(X_all, y_all)
        
        logger.info(f"✅ Dataset ready. Training: {len(X_train)}, Testing: {len(X_test)}")
        
    except FileNotFoundError as e:
        logger.error(f"❌ Production Error: Dataset missing for {disease}. {str(e)}")
        return {"error": f"Dataset file missing for {disease}. Please upload real Kaggle data to ml-backend/datasets/"}
    except Exception as e:
        logger.error(f"❌ Production Error: Failed to load dataset. {str(e)}")
        return {"error": f"Data loading failed: {str(e)}"}

    start_time = time.time()
    
    try:
        # Initialize model based on type
        model = create_model(model_type, config)
        logger.info(f"🧠 Using model: {model.__class__.__name__}")
        
        # Train model
        model.fit(X_train, y_train)
        
        # Evaluate on test set
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Probabilities for loss calculation
        y_prob = model.predict_proba(X_test)
        loss = log_loss(y_test, y_prob)
        
        # Extract weights based on model type
        weights = extract_weights(model, model_type)
        
        end_time = time.time()
        training_time = end_time - start_time
        
        # Get iteration count if available
        iterations = 0
        if hasattr(model, 'n_iter_'):
            iterations = int(model.n_iter_[0]) if hasattr(model.n_iter_, '__len__') else int(model.n_iter_)
        elif hasattr(model, 'n_estimators'):
            iterations = model.n_estimators
        
        logger.info(f"✨ Training complete. Accuracy: {accuracy:.4f}, Loss: {loss:.4f}")
        
        return {
            "weights": weights,
            "accuracy": float(accuracy),
            "loss": float(loss),
            "trainingTime": training_time,
            "metrics": {
                "samples": len(X_train),
                "test_samples": len(X_test),
                "iterations": iterations,
                "modelType": model_type,
                "dataSource": data_source,
                "totalAvailable": len(X_all)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Training failed: {str(e)}")
        return {"error": f"Model training failed: {str(e)}"}

if __name__ == "__main__":
    # Read from stdin instead of sys.argv for larger payloads and reliability
    try:
        if not sys.stdin.isatty():
            input_raw = sys.stdin.read().strip()
            if input_raw:
                input_data = json.loads(input_raw)
                result = train(input_data)
                print(json.dumps(result))
            else:
                print(json.dumps({"error": "No input data provided via stdin"}))
        else:
            # Fallback for manual CLI testing
            if len(sys.argv) > 1:
                input_data = json.loads(sys.argv[1])
                result = train(input_data)
                print(json.dumps(result))
            else:
                print(json.dumps({"error": "No input data provided via stdin or argv"}))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
    except Exception as e:
        print(json.dumps({"error": f"Execution error: {str(e)}"}))
