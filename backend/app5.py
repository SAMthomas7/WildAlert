from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from ultralytics import YOLO
import cv2
import os
from dotenv import load_dotenv
import threading
import time
import uuid
import platform
from concurrent.futures import ThreadPoolExecutor

# Load environment variables from .env file
load_dotenv()

# Debug: Print loaded environment variables
print(f"Email User: {os.environ.get('EMAIL_USER', 'Not found')}")
print(f"Email Password: {'[SET]' if os.environ.get('EMAIL_PASSWORD') else '[NOT SET]'}")

app = Flask(__name__)
CORS(app)

# Configure Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('EMAIL_USER', 'sam.kaimala@gmail.com')
app.config['MAIL_PASSWORD'] = os.environ.get('EMAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = app.config['MAIL_USERNAME']

print(f"Using email: {app.config['MAIL_USERNAME']}")
print("Mail password configured")

mail = Mail(app)

# Thread pool for email sending
executor = ThreadPoolExecutor(max_workers=2)

# Load the YOLO model
try:
    model = YOLO("best.pt")
    print("YOLO model loaded successfully")
except Exception as e:
    print(f"Error loading YOLO model: {e}")
    exit(1)

# Classes detected by the model
CLASSES = ["tiger", "bear", "elephant", "wild boar", "lion", "wild buffalo"]

# Track detections and email cooldowns
detection_counter = {}
last_email_sent = {}
DETECTION_THRESHOLD = 20
EMAIL_COOLDOWN = 60
CONFIDENCE_THRESHOLD = 0.5  # Filter low-confidence detections

def initialize_webcam():
    """Initialize webcam capture, trying multiple indices and backends with continuous retries."""
    print(f"Attempting to initialize webcam on {platform.system()}...")
    indices = [0, 1, 2, 3]
    max_retries = 5
    backends = [cv2.CAP_ANY]
    if platform.system() == "Windows":
        backends.append(cv2.CAP_DSHOW)
    elif platform.system() == "Linux":
        backends.append(cv2.CAP_V4L2)
    elif platform.system() == "Darwin":
        backends.append(cv2.CAP_AVFOUNDATION)

    while True:
        for backend in backends:
            backend_name = {
                cv2.CAP_ANY: "CAP_ANY",
                cv2.CAP_DSHOW: "CAP_DSHOW",
                cv2.CAP_V4L2: "CAP_V4L2",
                cv2.CAP_AVFOUNDATION: "CAP_AVFOUNDATION"
            }.get(backend, "Unknown")
            print(f"Trying backend: {backend_name}")
            for index in indices:
                for attempt in range(max_retries):
                    try:
                        cap = cv2.VideoCapture(index, backend)
                        if cap.isOpened():
                            print(f"Webcam opened successfully on index {index}, backend {backend_name}, attempt {attempt + 1}")
                            return cap
                        cap.release()
                        print(f"Attempt {attempt + 1} failed to open webcam on index {index}, backend {backend_name}")
                        time.sleep(0.5)
                    except Exception as e:
                        print(f"Error on index {index}, backend {backend_name}, attempt {attempt + 1}: {e}")
                        time.sleep(0.5)
        print("No webcam found. Retrying in 5 seconds...")
        time.sleep(5)

def send_email(recipient_email, animal_type, location="Serengeti National Park"):
    """Send email alert about detected animal."""
    try:
        print(f"Sending email to {recipient_email} about {animal_type}")
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
        msg = Message(subject=subject, recipients=[recipient_email], html=html_body)
        with app.app_context():
            mail.send(msg)
        print(f"Email sent to {recipient_email} for {animal_type}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def handle_email_alert(animal_type, email):
    """Handle email alerts with cooldown in a non-blocking thread."""
    current_time = time.time()
    if animal_type in last_email_sent and current_time - last_email_sent[animal_type] < EMAIL_COOLDOWN:
        print(f"Cooldown active for {animal_type}")
        return
    last_email_sent[animal_type] = current_time
    executor.submit(send_email, email, animal_type)

def generate_frames(user_email="default@example.com"):
    """Generate webcam frames with YOLO detection, ensuring continuous operation."""
    while True:
        cap = initialize_webcam()
        if not cap:
            print("Failed to initialize webcam. Retrying...")
            time.sleep(5)
            continue

        print(f"Streaming webcam feed for {user_email}")
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("Error: Failed to capture webcam frame. Releasing and retrying...")
                    break

                # Run YOLO detection
                start_time = time.time()
                try:
                    results = model(frame, conf=CONFIDENCE_THRESHOLD)
                except Exception as e:
                    print(f"Error running YOLO detection: {e}")
                    continue
                detection_time = time.time() - start_time
                print(f"YOLO detection took {detection_time:.2f} seconds")

                frame_detections = set()

                # Draw bounding boxes and labels
                try:
                    for result in results:
                        boxes = result.boxes.xyxy
                        confidences = result.boxes.conf
                        class_ids = result.boxes.cls
                        print(f"Processing {len(boxes)} detections with class IDs: {class_ids.tolist()}")
                        for i in range(len(boxes)):
                            try:
                                x1, y1, x2, y2 = map(int, boxes[i])
                                confidence = confidences[i]
                                class_id = int(class_ids[i])
                                if class_id < 0 or class_id >= len(CLASSES):
                                    print(f"Invalid class_id {class_id} detected, skipping")
                                    continue
                                animal_type = CLASSES[class_id]
                                label = f"{animal_type} {confidence:.2f}"
                                frame_detections.add(animal_type)
                                # Draw green rectangle and label
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                            except IndexError as e:
                                print(f"IndexError in detection processing: {e}, skipping detection {i}")
                                continue
                except Exception as e:
                    print(f"Error processing YOLO results: {e}, skipping frame")
                    continue

                # Update detection counter
                for animal in frame_detections:
                    detection_counter[animal] = detection_counter.get(animal, 0) + 1
                    if detection_counter[animal] == DETECTION_THRESHOLD:
                        print(f"Threshold reached: {animal} detected in {DETECTION_THRESHOLD} frames")
                        handle_email_alert(animal, user_email)

                # Reset counters for undetected animals
                for animal in list(detection_counter.keys()):
                    if animal not in frame_detections:
                        detection_counter[animal] = 0

                # Encode frame
                ret, buffer = cv2.imencode('.jpg', frame)
                if not ret:
                    print("Error: Failed to encode frame")
                    continue
                frame = buffer.tobytes()

                # Yield frame
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

        except Exception as e:
            print(f"Error in generate_frames: {e}")
        finally:
            if cap:
                cap.release()
                print("Webcam capture released")
            time.sleep(1)  # Brief pause before retrying

@app.route('/video_feed')
def video_feed():
    """Stream webcam feed with detections."""
    user_email = request.args.get('email', 'default@example.com')
    print(f"Webcam feed requested: email={user_email}")
    return Response(generate_frames(user_email), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/test_webcam')
def test_webcam():
    """Stream raw webcam feed for testing."""
    def gen():
        while True:
            cap = initialize_webcam()
            if not cap:
                print("Failed to initialize webcam in test_webcam. Retrying...")
                time.sleep(5)
                continue
            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        print("Error: Failed to capture webcam frame in test_webcam")
                        break
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if not ret:
                        print("Error: Failed to encode frame in test_webcam")
                        continue
                    frame = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            except Exception as e:
                print(f"Error in test_webcam: {e}")
            finally:
                if cap:
                    cap.release()
                    print("Webcam capture released in test_webcam")
                time.sleep(1)
    return Response(gen(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/send_alert', methods=['POST'])
def send_alert():
    """Manually send an alert."""
    data = request.json
    email = data.get('email')
    animal_type = data.get('animal_type', 'unspecified animal')
    location = data.get('location', 'Serengeti National Park')
    print(f"Manual alert: email={email}, animal={animal_type}")
    if not email:
        return jsonify({"success": False, "message": "Email required"}), 400
    success = send_email(email, animal_type, location)
    return jsonify({"success": success})

@app.route('/')
def index():
    """Verify server is running."""
    return "WildAlert Backend is running!"

if __name__ == '__main__':
    try:
        print(f"Starting Flask server on {platform.system()} with OpenCV version {cv2.__version__}")
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"Error starting Flask server: {e}")