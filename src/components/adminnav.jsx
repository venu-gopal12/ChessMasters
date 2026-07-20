// Purpose: React UI component for the Adminnav experience.
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { chessMastersBackend } from '../../config.js';

// Logout Button Component
const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(`${chessMastersBackend}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        localStorage.removeItem("userId");
        localStorage.removeItem("role");
        navigate('/');
      } else {
        console.error('Error logging out');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-red-500 to-pink-600 
                 text-white text-xs sm:text-sm font-medium rounded-md 
                 hover:from-red-600 hover:to-pink-700 transition-all duration-300 
                 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 
                 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
    >
      Logout
    </button>
  );
};

// Navbar Component
const AdminNav = () => {
  return (
    <nav className="bg-gradient-to-r from-brand-surface to-brand-surfaceAlt px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 
                    shadow-lg backdrop-blur-sm backdrop-filter">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold 
                       bg-gradient-to-r from-white to-brand-muted bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden sm:flex items-center space-x-3">
            <span className="text-white/90 text-xs sm:text-sm">
              Welcome, Admin
            </span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;




