import os
import json
import uuid
import requests
import firebase_admin
from flask import Flask, request, jsonify
from flask_cors import CORS
from firebase_admin import credentials, firestore
import datetime
import asyncio


# Load Firebase credentials
cred = credentials.Certificate("firebaseKey.json")
firebase_admin.initialize_app(cred)

# Firestore
db = firestore.client()

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = "uploads"
RESPONSES_FOLDER = "responses"
COLAB_URL = "https://6349-34-19-13-178.ngrok-free.app"  # Update when ngrok restarts

# CORS Configuration
CORS(app, 
     resources={r"/*": {
         "origins": ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
         "methods": ["GET", "POST", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }})

# Ensure necessary folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESPONSES_FOLDER, exist_ok=True)

def send_audio_to_colab(file_path):
    """Sends an audio file to the Colab API for inference."""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found at {file_path}")

        full_url = f"{COLAB_URL}/predict"
        print(f"🔵 Sending request to Colab at: {full_url}")

        # Verify Colab server is running
        try:
            verify = requests.get(COLAB_URL)
            print(f"🟢 Colab server status: {verify.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"🔴 Failed to connect to Colab server: {str(e)}")
            return {"error": "Could not connect to Colab server. Ensure the notebook is running."}

        # Send audio file
        with open(file_path, "rb") as audio_file:
            files = {"audio": ("audio.wav", audio_file, "audio/wav")}
            response = requests.post(full_url, files=files)

        print(f"🟠 Colab response status: {response.status_code}")
        if response.status_code != 200:
            print(f"🔴 Colab response content: {response.text}")

        if response.status_code == 404:
            return {"error": "Colab endpoint not found. Ensure the notebook is running with the /predict endpoint."}
        elif response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Colab API error: Status {response.status_code}"}

    except Exception as e:
        print(f"🔴 Error sending to Colab: {str(e)}")
        return {"error": str(e)}

@app.route('/upload-audio', methods=['POST', 'OPTIONS'])
def upload_audio():
    """Handles audio file upload, sends to Colab, and stores results in Firebase Firestore."""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    try:
        print(f"📥 Received request: {request.form} | Files: {request.files}")

        if 'audio' not in request.files:
            print("🔴 Error: No audio file in request")
            return jsonify({'error': 'Audio file is missing'}), 400

        if 'user_id' not in request.form:
            print("🔴 Error: User ID is missing")
            return jsonify({'error': 'User ID is missing'}), 400

        user_id = request.form['user_id']
        audio_file = request.files['audio']

        # Save the audio file temporarily
        file_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.wav")
        audio_file.save(file_path)
        print(f"🟢 File saved at: {file_path}")

        # Send to Google Colab for inference
        prediction = send_audio_to_colab(file_path)

        # Delete the local temporary file after sending
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"🗑️ Temporary file deleted: {file_path}")

        # Handle Colab errors
        if "error" in prediction:
            return jsonify(prediction), 500

        # Call DeepSeek API with the prediction result
        deepseek_result = asyncio.run(suggest_speech_fluency_plan(prediction))

        # ✅ Prepare comprehensive result for Firebase
        result = {
            "user_id": user_id,
            "colab_prediction": prediction,
            "deepseek_exercises": deepseek_result,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

        # Store in Firebase Firestore
        doc_ref = db.collection("assessments").add(result)
        print(f"✅ Assessment stored in Firebase for user: {user_id}")

        # Save response as JSON file (optional, but kept for backup)
        json_filename = os.path.join(RESPONSES_FOLDER, f"{user_id}_{uuid.uuid4()}.json")
        with open(json_filename, "w") as json_file:
            json.dump(result, json_file, indent=4)

        print(f"📄 Response saved as JSON: {json_filename}")

        return jsonify({
            'colab_prediction': prediction, 
            'deepseek_exercises': deepseek_result, 
            'message': 'Audio processed successfully'
        })

    except Exception as e:
        print(f"🔴 Upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)