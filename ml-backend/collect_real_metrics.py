import json
import os
import sys

# Ensure local modules are findable
sys.path.append(os.path.dirname(__file__))

from train_model import train

def collect():
    diseases = ['diabetes', 'cvd', 'cancer', 'pneumonia']
    results = {}
    
    print("🧪 Collecting real metrics from local datasets...")
    
    for disease in diseases:
        print(f"🔄 Evaluating {disease}...")
        input_data = {
            "disease": disease,
            "modelType": "logistic_regression", # Standard baseline
            "dataSource": "kaggle"
        }
        
        # Pneumonia uses CNN/Neural Network in some configs, 
        # but let's stick to a consistent baseline for comparison 
        # or use what's best for the data.
        if disease == 'pneumonia':
             input_data["modelType"] = "neural_network"
             
        res = train(input_data)
        
        if "error" in res:
            print(f"❌ Error for {disease}: {res['error']}")
            continue
            
        results[disease] = {
            "accuracy": res["accuracy"] * 100,
            "precision": res["metrics"]["precision"] * 100,
            "recall": res["metrics"]["recall"] * 100,
            "f1": res["metrics"]["f1"] * 100,
            "samples": res["metrics"]["totalAvailable"],
            "test_samples": res["metrics"]["test_samples"]
        }
        print(f"✅ {disease} done. Acc: {results[disease]['accuracy']:.2f}%")

    output_path = os.path.join(os.path.dirname(__file__), "..", "model performance", "real_metrics.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w") as f:
        json.dump(results, f, indent=4)
    
    print(f"\n✨ Real metrics collected and saved to {output_path}")

if __name__ == "__main__":
    collect()
