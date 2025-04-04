from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from ultralytics import YOLO
import cv2
import os
from dotenv import load_dotenv
import threading
import time

# Load environment variables from .env file
load_dotenv()

# Debug: Print loaded environment variables
print(f"Email User loaded from env: {os.environ.get('EMAIL_USER', 'Not found')}")
print(f"Email Password loaded: {'[SET]' if os.environ.get('EMAIL_PASSWORD') else '[NOT SET]'}")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Flask-Mail with hardcoded credentials for testing
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True

# HARDCODED CREDENTIALS FOR TESTING - Replace with your actual app password
app.config['MAIL_USERNAME'] = "sam.kaimala@gmail.com"  # Replace with your Gmail address
app.config['MAIL_PASSWORD'] = ""  # Replace with your App Password
app.config['MAIL_DEFAULT_SENDER'] = app.config['MAIL_USERNAME']

print(f"Using email: {app.config['MAIL_USERNAME']}")
print("Mail password is configured as hardcoded value")

mail = Mail(app)

# Load the YOLO model
model = YOLO("best.pt")  # Ensure best.pt is in the backend folder

# Path to the video file
VIDEO_PATH = os.path.join(os.path.dirname(__file__), "../frontend/src/assets/assets/cctv.mp4")
print(f"Attempting to open video at: {VIDEO_PATH}")  # Debug the path

# Classes your model detects
CLASSES = ["tiger", "bear", "elephant", "wild boar", "lion", "wild buffalo"]

# Track detections across frames
detection_counter = {}
last_email_sent = {}
DETECTION_THRESHOLD = 20 # Number of frames before sending an alert
EMAIL_COOLDOWN = 60  # Cooldown in seconds between emails for the same animal

def send_email(recipient_email, animal_type, location="Serengeti National Park"):
    """Send email alert about detected animal using Flask-Mail."""
    try:
        print(f"Attempting to send email to {recipient_email} about {animal_type}")
        
        # Create message
        subject = f"ALERT: {animal_type.capitalize()} Detected at {location}"
        
        html_body = f"""
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <h2 style="color: #d9534f;">WildAlert: Animal Detection</h2>
          <p>This is an automated alert from the WildAlert system.</p>
          <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #d9534f;">
            <p><strong>Alert Details:</strong></p>
            <ul>
              <li><strong>Animal Detected:</strong> {animal_type.capitalize()}</li>
              <li><strong>Location:</strong> {location}</li>
              <li><strong>Time:</strong> {time.strftime('%Y-%m-%d %H:%M:%S')}</li>
            </ul>
          </div>
          <p>Please take appropriate action according to your facility's protocols.</p>
          <p>-- WildAlert System</p>
        </div>
        """
        
        # Create and send message
        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=html_body
        )
        
        mail.send(msg)
        print(f"Email alert successfully sent to {recipient_email} for {animal_type}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def handle_email_alert(animal_type, email):
    """Check if we should send an email and send it if needed."""
    current_time = time.time()
    
    # Check if we've sent an email for this animal recently
    if animal_type in last_email_sent:
        if current_time - last_email_sent[animal_type] < EMAIL_COOLDOWN:
            print(f"Still in cooldown for {animal_type}, skipping email")
            return False  # Still in cooldown period
    
    # Send email
    with app.app_context():  # Required for Flask-Mail to work in a thread
        success = send_email(email, animal_type)
        if success:
            last_email_sent[animal_type] = current_time
        return success

def generate_frames(user_email="default@example.com"):
    """Generate video frames with YOLO detection."""
    cap = cv2.VideoCapture(VIDEO_PATH)
    
    if not cap.isOpened():
        print(f"Error: Could not open video file at {VIDEO_PATH}")
        return

    print(f"Video file opened successfully! Will send alerts to: {user_email}")
    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Loop the video
            continue

        # Run YOLO detection
        results = model(frame)
        
        # Reset frame-specific counters
        frame_detections = set()

        # Draw bounding boxes and labels on the frame
        for result in results:
            boxes = result.boxes.xyxy  # Bounding box coordinates
            confidences = result.boxes.conf  # Confidence scores
            class_ids = result.boxes.cls  # Class IDs

            for i in range(len(boxes)):
                x1, y1, x2, y2 = map(int, boxes[i])
                confidence = confidences[i]
                class_id = int(class_ids[i])
                animal_type = CLASSES[class_id]
                label = f"{animal_type} {confidence:.2f}"
                
                # Add to frame detections
                frame_detections.add(animal_type)

                # Draw rectangle and label
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Update detection counter for each animal type detected in this frame
        for animal in frame_detections:
            if animal not in detection_counter:
                detection_counter[animal] = 1
            else:
                detection_counter[animal] += 1
                
                # Check if we need to send an alert
                if detection_counter[animal] == DETECTION_THRESHOLD:
                    # Send email alert in a separate thread to avoid blocking
                    print(f"DETECTION THRESHOLD REACHED: {animal} detected in {DETECTION_THRESHOLD} consecutive frames")
                    print(f"Sending alert for {animal} to {user_email}")
                    threading.Thread(target=handle_email_alert, args=(animal, user_email)).start()

        # Reset counters for animals not in this frame
        for animal in list(detection_counter.keys()):
            if animal not in frame_detections:
                detection_counter[animal] = 0

        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        frame = buffer.tobytes()

        # Yield frame in byte format for streaming
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

    cap.release()

@app.route('/video_feed')
def video_feed():
    """Stream the video with detections."""
    user_email = request.args.get('email', 'default@example.com')
    print(f"Video feed requested with email: {user_email}")
    return Response(generate_frames(user_email), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/send_alert', methods=['POST'])
def send_alert():
    """Endpoint to manually send an alert."""
    data = request.json
    email = data.get('email')
    animal_type = data.get('animal_type', 'unspecified animal')
    location = data.get('location', 'Serengeti National Park')
    
    print(f"Manual alert requested for: {email}, animal: {animal_type}")
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
        
    success = send_email(email, animal_type, location)
    return jsonify({"success": success})

@app.route('/')
def index():
    """Simple endpoint to verify server is running."""
    return "WildAlert Backend is running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)