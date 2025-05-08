import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import '../App.css';
import Loader from "../components/loader";

function UploadPage() {
  const [isAlertSent, setIsAlertSent] = useState(false);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [videoSrc, setVideoSrc] = useState('');
  const [isCamStarted, setIsCamStarted] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  // Set user email and handle video source when cam is started
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("User not authenticated");
      navigate("/login");
      return;
    }

    const currentUser = auth.currentUser;
    const updateVideoSrc = () => {
      if (currentUser && currentUser.email) {
        setUserEmail(currentUser.email);
        setVideoSrc(`http://localhost:5000/video_feed?email=${encodeURIComponent(currentUser.email)}&t=${Date.now()}`);
      } else {
        console.warn("User email not available");
        setVideoSrc(`http://localhost:5000/video_feed?t=${Date.now()}`);
      }
    };

    if (currentUser && currentUser.email) {
      setUserEmail(currentUser.email);
      if (isCamStarted) {
        updateVideoSrc();
      }
    } else {
      auth.onAuthStateChanged((user) => {
        if (user && user.email) {
          setUserEmail(user.email);
          if (isCamStarted) {
            updateVideoSrc();
          }
        } else if (isCamStarted) {
          updateVideoSrc();
        }
      });
    }

    // Retry video feed every 5 seconds if it fails
    let interval;
    if (isCamStarted) {
      interval = setInterval(() => {
        if (error) {
          setError(null);
          updateVideoSrc();
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [auth, navigate, isCamStarted, error]);

  const handleStartCam = () => {
    setIsCamStarted(true);
    setError(null);
    setVideoSrc(`http://localhost:5000/video_feed?email=${encodeURIComponent(userEmail || 'default@example.com')}&t=${Date.now()}`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out");
    }
  };

  const handleSendAlert = async () => {
    if (!userEmail) {
      setError("User email not available");
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
        setError("Failed to send alert");
      }
    } catch (err) {
      console.error("Error sending alert:", err);
      setError("Network error. Please check your connection and backend server.");
    }
  };

  const handleRetryFeed = () => {
    setError(null);
    setVideoSrc(`http://localhost:5000/video_feed?email=${encodeURIComponent(userEmail || 'default@example.com')}&t=${Date.now()}`);
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
            Wild animal detection is active using your webcam. Click "Start Cam" to begin. Animals are marked with green rectangles and probability scores. Automatic alerts will be sent to {userEmail || "your email"} when animals are detected for more than 5 consecutive frames.
          </p>
          <div className="flex space-x-4">
            {!isCamStarted && (
              <button
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-800 transition-colors duration-200"
                onClick={handleStartCam}
              >
                Start Cam
              </button>
            )}
            <button
              className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-800 transition-colors duration-200"
              onClick={handleSendAlert}
            >
              Send Manual Alert
            </button>
          </div>
          {isAlertSent && (
            <p className="text-green-400 font-semibold animate-pulse">
              Alert Sent Successfully!
            </p>
          )}
        </div>

        {/* Webcam Feed Container */}
        <div className="w-full max-w-4xl flex flex-col space-y-6">
          <div className="relative w-full h-auto bg-gray-800 rounded overflow-hidden">
            {isCamStarted && videoSrc && !error ? (
              <img
                src={videoSrc}
                alt="Webcam Feed with Wild Animal Detection"
                className="w-full h-full object-contain"
                style={{ aspectRatio: "16/9", maxHeight: "70vh" }}
                onError={() => {
                  console.error("Error loading webcam feed");
                  setError("Failed to load webcam feed. Retrying automatically in 5 seconds. Ensure your webcam is connected, not in use by another application, and accessible by the backend server.");
                }}
              />
            ) : isCamStarted && error ? (
              <div className="w-full flex flex-col items-center justify-center text-gray-400" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
                <img
                  src="https://via.placeholder.com/640x360.png?text=Webcam+Unavailable"
                  alt="Webcam Unavailable"
                  className="w-full h-full object-contain"
                />
                <p className="mt-2">Webcam feed unavailable. Retrying...</p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center text-gray-400" style={{ aspectRatio: "16/9", maxHeight: "70vh" }}>
                <img
                  src="https://via.placeholder.com/640x360.png?text=Press+Start+Cam"
                  alt="Press Start Cam"
                  className="w-full h-full object-contain"
                />
                <p className="mt-2">Press "Start Cam" to begin</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 p-8 rounded-lg text-white">
            <h2 className="text-xl font-semibold mb-4 text-red-500">Error</h2>
            <p className="mb-4">{error}</p>
            <div className="flex justify-end space-x-4">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors duration-200"
                onClick={handleRetryFeed}
              >
                Retry Now
              </button>
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