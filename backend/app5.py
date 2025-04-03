from flask import Flask, Response
from ultralytics import YOLO
import cv2
import os

app = Flask(__name__)

# Load the YOLO model
model = YOLO("best.pt")  # Ensure best.pt is in the backend folder

# Path to the video file
VIDEO_PATH = os.path.join(os.path.dirname(__file__), "../frontend/src/assets/assets/cctv.mp4")
print(f"Attempting to open video at: {VIDEO_PATH}")  # Debug the path

# Classes your model detects
CLASSES = ["tiger", "bear", "elephant", "wild boar", "lion", "wild buffalo"]

def generate_frames():
    """Generate video frames with YOLO detection."""
    cap = cv2.VideoCapture(VIDEO_PATH)
    
    if not cap.isOpened():
        print(f"Error: Could not open video file at {VIDEO_PATH}")
        return

    print("Video file opened successfully!")
    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Loop the video
            continue

        # Run YOLO detection
        results = model(frame)

        # Draw bounding boxes and labels on the frame
        for result in results:
            boxes = result.boxes.xyxy  # Bounding box coordinates
            confidences = result.boxes.conf  # Confidence scores
            class_ids = result.boxes.cls  # Class IDs

            for i in range(len(boxes)):
                x1, y1, x2, y2 = map(int, boxes[i])
                confidence = confidences[i]
                class_id = int(class_ids[i])
                label = f"{CLASSES[class_id]} {confidence:.2f}"

                # Draw rectangle and label
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

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
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    """Simple endpoint to verify server is running."""
    return "WildAlert Backend is running!"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)