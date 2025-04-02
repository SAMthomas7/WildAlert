import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/login'; // Adjust the import path as necessary
import HomePage from './pages/home';
import UploadPage from './pages/upload';
import AssessmentPage from './pages/assessment';
import ProgressTrackingPage from './pages/tracking';
//import ResultPage from './pages/result';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} /> {/* Login Page at root */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage/>}/>
        <Route path="/assessment" element={<AssessmentPage/>}/>
        <Route path="/tracking" element={<ProgressTrackingPage/>}/>
        <Route path="/login" element={<LoginPage/>}/>
      </Routes>
    </Router>
  );
}

export default App;