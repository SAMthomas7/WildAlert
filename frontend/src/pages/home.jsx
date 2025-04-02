import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import animalsImage from '../assets/assets/animals.jpg';
import facebook from '../assets/assets/fb.jpeg';
import insta from '../assets/assets/insta.jpeg';
import twitter from '../assets/assets/twitter.jpeg';

const HomePage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate(isLoggedIn ? '/tracking' : '/login');
  };

  return (
    <div className="font-outfit min-h-screen flex flex-col bg-black text-white overflow-x-hidden w-[100vw]">
      {/* Header Section */}
      <header className="bg-black justify-between items-center fixed top-0 left-0 z-30 w-[100vw] overflow-x-hidden">
        <div className="px-12 py-6 flex justify-between items-center w-[100vw] overflow-x-hidden">
          <div className="text-4xl font-extrabold text-white">
            Wild<span className="text-red-500">Alert</span>
          </div>
          <nav className="flex space-x-8">
            <a href="#" className="text-gray-300 hover:text-red-500 text-lg">Home</a>
            <a href="#about" className="text-gray-300 hover:text-red-500 text-lg">About</a>
            <a href="#contact" className="text-gray-300 hover:text-red-500 text-lg">Contact</a>
            <button
              onClick={handleProfileClick}
              className="text-gray-300 hover:text-red-500 text-lg"
            >
              Profile
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content - Removing any padding that might cause spacing */}
      <main className="w-[100vw] m-0 p-0">
        {/* Hero Section */}
        <section 
          className="py-32 bg-cover bg-center relative w-[100vw] overflow-x-hidden"
          style={{ backgroundImage: `url(${animalsImage})`, margin: 0 }}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="max-w-7xl mx-auto text-center relative z-10 px-8">
            <h1 className="text-5xl font-extrabold mb-6 leading-tight text-white">
              Real-Time Wild Animal Detection & Alerts
            </h1>
            <p className="mb-8 text-gray-200 text-lg max-w-2xl mx-auto">
              Stay safe with instant notifications on your phone when wild animals are detected through CCTV footage in your area. Protect your community with WildAlert.
            </p>
            <div className="flex gap-6 justify-center">
              <button 
                className="text-white bg-red-500 px-8 py-3 rounded-full font-semibold hover:bg-red-400 text-lg"
                onClick={handleLoginClick}
              >
                Get Started
              </button>
              <button
                className="text-white border border-white px-8 py-3 rounded-full font-semibold hover:border-red-500 hover:text-red-500 text-lg"
                onClick={handleLoginClick}
              >
                Log In
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-gray-900 text-white w-screen m-0 p-0">
          <div className="max-w-5xl mx-auto px-8 text-center">
            <h2 className="text-6xl font-bold mb-6">About WildAlert</h2>
            <p className="text-xl leading-relaxed">
              WildAlert is an advanced detection system designed to keep communities safe by monitoring CCTV footage for wild animal activity. Our cutting-edge technology analyzes live feeds and sends instant alerts to your phone, giving you peace of mind and the ability to respond quickly. We're committed to leveraging innovation to protect lives and property from wildlife encounters.
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="contact" className="py-24 bg-black w-screen m-0 p-0">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold text-white">What Our Users Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="bg-gray-900 text-white rounded-lg p-8 shadow-lg">
                <p className="italic mb-4 text-lg">"WildAlert saved us from a bear sighting near our home. The alert came just in time!"</p>
                <p className="font-bold text-lg">- John</p>
              </div>
              <div className="bg-red-500 text-white rounded-lg p-8 shadow-lg">
                <p className="italic mb-4 text-lg">"As a park ranger, this system helps me keep visitors safe. It's incredibly reliable."</p>
                <p className="font-bold text-lg">- Emily, Park Ranger</p>
              </div>
              <div className="bg-gray-900 text-white rounded-lg p-8 shadow-lg">
                <p className="italic mb-4 text-lg">"I feel so much safer knowing I'll get an alert if a wild animal is nearby."</p>
                <p className="font-bold text-lg">- Priya</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 w-screen m-0 p-0">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="flex flex-col items-start">
            <h6 className="font-bold mb-6 text-white text-xl">WildAlert</h6>
            <p className="mb-4 text-lg">Social Media</p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                <img src={facebook} alt="Facebook" className="w-8 h-8"/>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                <img src={twitter} alt="Twitter" className="w-8 h-8"/>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                <img src={insta} alt="Instagram" className="w-8 h-8"/>
              </a>
            </div>
          </div>
          <div>
            <h6 className="font-bold mb-4 text-lg">Quick Links</h6>
            <ul>
              <li className="mb-2"><a href="#" className="hover:text-red-500 text-lg">Home</a></li>
              <li className="mb-2"><a href="#about" className="hover:text-red-500 text-lg">Summary</a></li>
              <li className="mb-2"><a href="#about" className="hover:text-red-500 text-lg">About Us</a></li>
              <li className="mb-2"><a href="#contact" className="hover:text-red-500 text-lg">Contact</a></li>
            </ul>
          </div>
          <div>
            <h6 className="font-bold mb-4 text-lg">Contact</h6>
            <ul>
              <li className="mb-2"><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 text-lg">LinkedIn</a></li>
              <li className="mb-2"><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 text-lg">Instagram</a></li>
              <li className="mb-2"><a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-red-500 text-lg">Facebook</a></li>
            </ul>
          </div>
          <div>
            <h6 className="font-bold mb-4 text-lg">Stay Updated</h6>
            <form action="your_newsletter_subscription_endpoint" method="POST">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="p-3 bg-gray-800 text-white mb-2 w-full rounded text-lg" 
                required 
              />
              <button 
                type="submit" 
                className="p-3 w-full bg-red-500 hover:bg-red-400 text-white rounded text-lg"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;