import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import '../App.css';
import Loader from "../components/loader";

function UploadPage() {
  const [isAlertSent, setIsAlertSent] = useState(false);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [videoSrc, setVideoSrc] = useState('');
  const [isWebcamOpen, setIsWebcamOpen] = useState(false); // State for webcam visibility
  const webcamRef = useRef(null); // Ref for webcam video element
  const navigate = useNavigate();
  const auth = getAuth();

  // Get authentication data
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("User is not authenticated");
      navigate("/login");
      return;
    }

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email) {
      setUserEmail(currentUser.email);
      setVideoSrc(`http://localhost:5000/video_feed?email=${encodeURIComponent(currentUser.email)}`);
    } else {
      auth.onAuthStateChanged((user) => {
        if (user && user.email) {
          setUserEmail(user.email);
          setVideoSrc(`http://localhost:5000/video_feed?email=${encodeURIComponent(user.email)}`);
        } else {
          console.warn("User email not available");
          setVideoSrc('http://localhost:5000/video_feed');
        }
      });
    }
  }, [auth, navigate]);

  // Handle webcam start
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        setIsWebcamOpen(true);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Failed to access webcam. Please allow camera permissions.");
    }
  };

  // Handle webcam close
  const closeWebcam = () => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const stream = webcamRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop()); // Stop all tracks
      webcamRef.current.srcObject = null;
    }
    setIsWebcamOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  const handleSendAlert = async () => {
    if (!userEmail) {
      setError("User email not available. Cannot send alert.");
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/send_alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          animal_type: 'detected animal',
          location: 'Serengeti National Park'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsAlertSent(true);
        setTimeout(() => setIsAlertSent(false), 3000);
      } else {
        setError("Failed to send alert. Please try again.");
      }
    } catch (err) {
      console.error("Error sending alert:", err);
      setError("Network error. Please check your connection.");
    }
  };

  return (
    <div className="font-sans bg-black text-white min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white flex justify-between items-center fixed top-0 left-0 w-screen px-9 py-4 z-30">
        <h1 className="font-bold text-3xl">
          <span className="text-white">Wild</span>
          <span className="text-red-500">Alert</span>
        </h1>
        <nav className="flex flex-grow justify-end">
          <ul className="flex space-x-6">
            <li className="text-lg font-regular hover:text-gray-400 cursor-pointer" onClick={() => navigate("/home")}>
              Home
            </li>
            <li
              className="text-lg font-regular hover:text-gray-400 cursor-pointer"
              onClick={() => window.open("https://www.linkedin.com/in/sam-thomas-6ab3a1227/", "_blank")}
              style={{ marginRight: "40px" }}
            >
              Contact
            </li>
          </ul>
        </nav>
        <div className="flex space-x-4">
          <button className="text-white border border-white px-5 py-1 rounded-full hover:bg-gray-700 transition-colors duration-200" onClick={() => navigate("/tracking")}>
            Profile
          </button>
          <button className="text-white border border-white px-5 py-1 rounded-full hover:bg-gray-700 transition-colors duration-200" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-28 pb-14 px-8">
        {/* Location Name */}
        <div className="w-full text-center mb-6">
          <h2 className="text-3xl font-semibold text-white bg-gray-900 bg-opacity-70 inline-block px-6 py-2 rounded">
            Mathura
          </h2>
        </div>

        {/* Info Text and Buttons */}
        <div className="w-full flex flex-col items-center space-y-4 mb-6">
          <p className="text-lg text-gray-300 text-center max-w-md">
            Wild animal detection is active. Automatic alerts will be sent to {userEmail || "your email"} when animals are detected for more than 5 consecutive frames.
          </p>
          <div className="flex space-x-4">
            <button
              className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-800 transition-colors duration-200"
              onClick={handleSendAlert}
            >
              Send Manual Alert
            </button>
            <button
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-800 transition-colors duration-200"
              onClick={startWebcam}
            >
              Add Camera Feed
            </button>
          </div>
          {isAlertSent && (
            <p className="text-green-400 font-semibold animate-pulse">
              Alert Sent Successfully!
            </p>
          )}
        </div>

        {/* Video Feeds Container */}
        <div className="w-full max-w-4xl flex flex-col space-y-6">
          {/* CCTV Video Feed */}
          <div className="relative w-full h-auto bg-gray-800 rounded overflow-hidden">
            {videoSrc ? (
              <img
                src={videoSrc}
                alt="CCTV Video with Wild Animal Detection"
                className="w-full h-full object-contain"
                style={{ aspectRatio: "16/9", maxHeight: "70vh" }}
                onError={() => console.error("Error loading video feed")}
              />
            ) : (
              <div className="w-full flex items-center justify-center" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
                <Loader />
              </div>
            )}
          </div>

          {/* Webcam Feed (conditionally rendered) */}
          {isWebcamOpen && (
            <div className="relative w-full h-auto bg-gray-800 rounded overflow-hidden">
              <video
                ref={webcamRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                style={{ aspectRatio: "16/9", maxHeight: "70vh" }}
              />
              <button
                className="absolute top-2 right-2 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-800 transition-colors duration-200"
                onClick={closeWebcam}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-8 rounded-lg text-white">
            <h2 className="text-xl font-semibold mb-4 text-red-500">Error</h2>
            <p className="mb-4">{error}</p>
            <div className="flex justify-end">
              <button
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors duration-200"
                onClick={() => setError(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 p-8 mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-white">WildAlert</h3>
            <div className="text-lg font-regular hover:text-gray-400 cursor-pointer" onClick={() => navigate('/home')}>
              Home
            </div>
            <div
              className="font-regular hover:text-gray-400 cursor-pointer"
              onClick={() => window.open("https://www.linkedin.com/in/sam-thomas-6ab3a1227/", "_blank")}
            >
              Contact us
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-white">Contact</h3>
            <div
              onClick={() => window.open("https://www.linkedin.com/in/sam-thomas-6ab3a1227/", "_blank")}
              className="hover:text-gray-400 cursor-pointer"
            >
              LinkedIn
            </div>
            <div onClick={() => window.open("https://www.instagram.com", "_blank")} className="hover:text-gray-400 cursor-pointer">
              Instagram
            </div>
            <div onClick={() => window.open("https://www.facebook.com", "_blank")} className="hover:text-gray-400 cursor-pointer">
              Facebook
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-white">STAY UP TO DATE</h3>
            <div className="flex mt-2">
              <input
                className="border-2 border-gray-700 bg-gray-800 text-white px-4 py-1"
                type="email"
                placeholder="Enter your email"
              />
              <button className="bg-gray-700 text-white px-4 hover:bg-gray-600">
                Submit
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default UploadPage;