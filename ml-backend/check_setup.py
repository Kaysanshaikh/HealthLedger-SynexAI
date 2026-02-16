import sys
import json

def check_setup():
    try:
        import pandas
        import numpy
        import sklearn
        return {"available": True}
    except ImportError:
        return {"available": False}

if __name__ == "__main__":
    print(json.dumps(check_setup()))
