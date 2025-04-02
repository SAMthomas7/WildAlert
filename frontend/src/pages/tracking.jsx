import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import "../App.css";

function ProfilePage() {
  const navigate = useNavigate();
  const db = getFirestore();
  const auth = getAuth();

  // State setup
  const [userId, setUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Profile data state with added location field
  const [profileData, setProfileData] = useState({
    name: "John Doe",
    email: "johndoe@example.com",
    gender: "Not provided",
    age: "Not provided",
    dob: "Not provided",
    location: "Not provided", // New field
    profilePic: null,
  });

  // Fetch user ID and profile data from Firebase Auth and Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setProfileData((prevData) => ({
          ...prevData,
          name: user.displayName || "John Doe",
          email: user.email || "johndoe@example.com",
          profilePic: user.photoURL || null,
        }));

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfileData((prevData) => ({
              ...prevData,
              gender: userData.gender || "Not provided",
              age: userData.age || "Not provided",
              dob: userData.dob || "Not provided",
              location: userData.location || "Not provided", // Fetch location
            }));
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("Failed to fetch user profile data.");
        }
      } else {
        setError("User not logged in");
        navigate("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  // Handle input changes in edit mode
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Handle profile picture upload
  const handleFileChange = (e) => {
    setProfileData((prevData) => ({
      ...prevData,
      profilePic: URL.createObjectURL(e.target.files[0]),
    }));
  };

  // Save profile data to Firestore
  const handleSave = async () => {
    if (!userId) return;

    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(
        userDocRef,
        {
          gender: profileData.gender,
          age: profileData.age,
          dob: profileData.dob,
          location: profileData.location, // Save location
        },
        { merge: true }
      );
      setIsEditing(false);
      setError(null);
    } catch (err) {
      console.error("Error saving profile data:", err);
      setError("Failed to save profile data.");
    }
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

  if (loading) {
    return (
      <div className="font-sans bg-black text-white min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

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
            <li
              className="text-lg font-regular hover:text-gray-400 cursor-pointer"
              onClick={() => navigate("/home")}
            >
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
          <button
            className="text-white border border-white px-5 py-1 rounded-full hover:bg-gray-700 transition-colors duration-200"
            onClick={() => navigate("/tracking")}
          >
            Profile
          </button>
          <button
            className="text-white border border-white px-5 py-1 rounded-full hover:bg-gray-700 transition-colors duration-200"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-10 mt-20">
        <div className="bg-gray-800 border border-gray-700 p-8 rounded-lg shadow-md flex items-center space-x-8 relative w-full max-w-2xl">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            {profileData.profilePic ? (
              <img
                src={profileData.profilePic}
                alt="Profile"
                className="w-24 h-24 rounded-full border border-gray-600 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 shadow-lg">
                No Image
              </div>
            )}
            {isEditing && (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mt-2 text-sm text-gray-300"
              />
            )}
          </div>

          {/* Edit/Save Buttons */}
          <div className="absolute top-4 right-4 flex space-x-2">
            {isEditing ? (
              <>
                <button
                  className="bg-green-600 text-white px-3 py-1 text-sm hover:bg-green-700 transition"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button
                  className="bg-gray-600 text-white px-3 py-1 text-sm hover:bg-gray-500 transition"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="bg-red-600 text-white px-3 py-1 text-sm hover:bg-red-700 transition"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
          </div>

          {/* Profile Details */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white">{profileData.name}</h2>
            <div className="mt-4 space-y-2">
              <p className="text-gray-300">
                <strong>Email:</strong> {profileData.email}
              </p>
              {isEditing ? (
                <>
                  <p className="text-gray-300">
                    <strong>Gender:</strong>{" "}
                    <input
                      type="text"
                      name="gender"
                      value={profileData.gender}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                  </p>
                  <p className="text-gray-300">
                    <strong>Age:</strong>{" "}
                    <input
                      type="text"
                      name="age"
                      value={profileData.age}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                  </p>
                  <p className="text-gray-300">
                    <strong>DOB:</strong>{" "}
                    <input
                      type="date"
                      name="dob"
                      value={profileData.dob}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                  </p>
                  <p className="text-gray-300">
                    <strong>Location:</strong>{" "}
                    <input
                      type="text"
                      name="location"
                      value={profileData.location}
                      onChange={handleChange}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                    />
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-300">
                    <strong>Gender:</strong> {profileData.gender}
                  </p>
                  <p className="text-gray-300">
                    <strong>Age:</strong> {profileData.age}
                  </p>
                  <p className="text-gray-300">
                    <strong>DOB:</strong> {profileData.dob}
                  </p>
                  <p className="text-gray-300">
                    <strong>Location:</strong> {profileData.location}
                  </p>
                </>
              )}
            </div>
          </div>
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
                className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
                onClick={() => setError(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;