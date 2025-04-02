import firebase_admin
from firebase_admin import credentials, firestore

# Load Firebase credentials
cred = credentials.Certificate("firebaseKey.json")  # Make sure this file exists
firebase_admin.initialize_app(cred)

# Firestore Database Instance
db = firestore.client()