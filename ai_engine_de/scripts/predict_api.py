from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)

# Load model
model = joblib.load("../models/disease_risk_model.pkl")
le = joblib.load("../models/label_encoder.pkl")

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
    app.run(port=8000)