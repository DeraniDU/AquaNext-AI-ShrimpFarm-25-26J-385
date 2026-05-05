from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

model = joblib.load("../models/disease_risk_model.pkl")
le = joblib.load("../models/label_encoder.pkl")

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Disease risk prediction API running"})

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    df = pd.DataFrame([data])

    prediction = model.predict(df)[0]
    label = le.inverse_transform([prediction])[0]

    return jsonify({
        "risk_level": label
    })

if __name__ == "__main__":
    print("Starting disease risk prediction API...")
    app.run(host="127.0.0.1", port=8000, debug=True)
