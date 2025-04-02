// Loader.jsx
import React from 'react';
import './Loader.css';

const Loader = ({ size = 22, className = '' }) => {
  return (
    <div 
      className={`loader ${className}`}
      style={{ 
        width: `${size}px`,
      }}
    />
  );
};

export default Loader;