import React, { useState, useEffect, useRef } from 'react';
// import "../styles/profile.css";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios'; // For API requests
import { chessMastersBackend } from '../../config.js';

// const sampleData = [
//   { name: 'Game 1', elo: 400 },
//   { name: 'Game 2', elo: 820 },
//   { name: 'Game 3', elo: 790 },
//   { name: 'Game 4', elo: 1000 },
//   { name: 'Game 5', elo: 1250 }
// ];

const CProfile = () => {
  const { coachId } = useParams();
  const [isEditing, setIsEditing] = useState({ name: false, email: false, password: false });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '********'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [eloData, setEloData] = useState([]);
  const [loading, setLoading] = useState(true); // For loading state
  const [subscribedPlayers, setSubscribedPlayers] = useState([]);
  const [updateMessage, setUpdateMessage] = useState('');
  const [deleteAccountDialog, setDeleteAccountDialog] = useState({
    isOpen: false
  });

  // Fetch player details on component mount
  useEffect(() => {
    let isMounted = true;
  
    const fetchCoachDetails = async () => {
      try {
        const response = await axios.get(`${chessMastersBackend}/auth/details`, {
          withCredentials: true,
        });
        if (isMounted) {
          const player = response.data;
          setFormData({
            name: player.UserName,
            email: player.Email,
            password: '********'
          });
          setEloData(player.eloHistory || []);
          setLoading(false);
  
          const playersResponse = await axios.get(
            `${chessMastersBackend}/coach/subscribedPlayers/${coachId}`,
            {
              withCredentials: true,
            }
          );
          console.log('playersResponse', playersResponse);
          if (isMounted) setSubscribedPlayers(playersResponse.data.subscribers);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching coach details:', error);
          setLoading(false);
        }
      }
    };
  
    fetchCoachDetails();
  
    return () => {
      isMounted = false;
    };
  }, [coachId]);
  
  const handleEdit = async (field) => {
    // If currently editing and trying to save
    if (isEditing[field]) {
      try {
        if (field === 'password') {
          await axios.put(
            `${chessMastersBackend}/coach/change-password`,
            passwordData,
            { withCredentials: true }
          );
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setFormData({
            ...formData,
            password: '********'
          });
          setUpdateMessage('Password updated successfully!');
          setTimeout(() => setUpdateMessage(''), 3000);
          setIsEditing({ ...isEditing, [field]: false });
          return;
        }

        // Map frontend field names to backend field names
        const fieldMapping = {
          name: 'UserName',
          email: 'Email'
        };
        
        // Only send the field being updated
        const updateData = {
          [fieldMapping[field]]: formData[field]
        };
        
        // Send update request to backend
        const response = await axios.put(
          `${chessMastersBackend}/coach/update-profile`,
          updateData,
          {
            withCredentials: true
          }
        );
        
        // Show success message
        setUpdateMessage(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setUpdateMessage('');
        }, 3000);
        
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        setUpdateMessage(`Failed to update ${field}. Please try again.`);
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          setUpdateMessage('');
        }, 3000);
      }
    }
    
    // Toggle editing state
    if (!isEditing[field] && field === 'password') {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setIsEditing({ ...isEditing, [field]: !isEditing[field] });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
  };

  // Scroll Refs
  const scrollLeftRef = useRef(null);
  const scrollRightRef = useRef(null);
  const coachScrollContainerRef = useRef(null);

  // Scroll Handlers
  const scrollLeft = () => {
    if (coachScrollContainerRef.current) {
      coachScrollContainerRef.current.scrollLeft -= 100;
    }
  };

  const scrollRight = () => {
    if (coachScrollContainerRef.current) {
      coachScrollContainerRef.current.scrollLeft += 100;
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountDialog({ isOpen: true });
  };

  const confirmDeleteAccount = async () => {
    try {
      // Delete the coach account through our API
      const response = await axios.delete(
        `${chessMastersBackend}/coach/delete-account`,
        {
          withCredentials: true
        }
      );
      
      // Redirect to login page after successful deletion
      if (response.status === 200) {
        window.location.href = '/'; // Redirect to login page
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setUpdateMessage('Failed to delete account. Please try again.');
      setTimeout(() => {
        setUpdateMessage('');
      }, 3000);
    }
    
    // Close the dialog
    setDeleteAccountDialog({ isOpen: false });
  };

  const cancelDeleteAccount = () => {
    // Just close the dialog
    setDeleteAccountDialog({ isOpen: false });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt">
        <div className="text-lg sm:text-xl md:text-2xl font-semibold text-brand-ink animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      {/* Delete Account Confirmation Dialog */}
      {deleteAccountDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-brand-surface rounded-xl shadow-2xl p-6 max-w-md w-full border border-brand-accent/30 animate-fadeIn">
            <h3 className="text-xl font-semibold text-red-600 mb-4">Delete Coach Account</h3>
            <p className="text-brand-muted mb-4">
              Are you sure you want to delete your coach account? This action cannot be undone.
            </p>
            <p className="text-brand-muted mb-3">
              By confirming, you understand that:
            </p>
            <ul className="list-disc list-inside text-brand-muted mb-6 space-y-2">
              <li>All your uploaded articles and educational videos will be permanently removed</li>
              <li>Your subscriber base and analytics data will be lost</li>
              <li>If you create a new account in the future, you will need to rebuild your content library and subscriber network</li>
              <li>Any revenue tracking information will be permanently deleted</li>
            </ul>
            <div className="flex space-x-4 justify-end">
              <button 
                onClick={cancelDeleteAccount}
                className="px-4 py-2 bg-brand-surfaceAlt text-brand-muted rounded-lg hover:bg-brand-actionHover transition duration-300 shadow-md"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 shadow-md"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto bg-brand-surface rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 md:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-ink mb-4 sm:mb-0">Coach Profile</h1>
            <div className="flex space-x-3 sm:space-x-4">
              <button 
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-full hover:bg-red-700 transition duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1 text-sm sm:text-base"
              >
                Delete Account
              </button>
              <Link to="/Index?role=coach" 
                    className="bg-brand-action text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full 
                             hover:bg-brand-actionHover transition duration-300 shadow-md hover:shadow-xl 
                             transform hover:-translate-y-1 text-sm sm:text-base">
                Home
              </Link>
            </div>
          </div>

          {/* Update Message */}
          {updateMessage && (
            <div className={`mb-4 p-3 rounded-lg text-center font-medium ${
              updateMessage.includes('Failed') 
                ? 'bg-red-100 text-red-800 border border-red-300' 
                : 'bg-brand-surfaceAlt text-brand-ink border border-brand-accent/40'
            }`}>
              {updateMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/1820405/profile/profile-512.jpg" 
                     alt={formData.name} 
                     className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-brand-accent shadow-lg" />
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-brand-ink">{formData.name}</h2>
                  <p className="text-base sm:text-lg text-brand-muted">Coach</p>
                </div>
              </div>

              {/* Form Fields */}
              {['name', 'email', 'password'].map((field) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium text-brand-ink capitalize">
                    {field}
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    {isEditing[field] && field === 'password' ? (
                      <div className="grid w-full gap-2">
                        {[
                          { name: 'currentPassword', placeholder: 'Current password' },
                          { name: 'newPassword', placeholder: 'New password' },
                          { name: 'confirmPassword', placeholder: 'Confirm new password' },
                        ].map((passwordField) => (
                          <input
                            key={passwordField.name}
                            type="password"
                            name={passwordField.name}
                            value={passwordData[passwordField.name]}
                            onChange={handlePasswordChange}
                            placeholder={passwordField.placeholder}
                            className="w-full mt-1 rounded-md border-brand-accent/40 
                                     shadow-sm focus:border-brand-accent focus:ring focus:ring-brand-accent/30 
                                     focus:ring-opacity-50 bg-white px-3 py-2 text-sm sm:text-base text-gray-800"
                          />
                        ))}
                      </div>
                    ) : isEditing[field] ? (
                      <input
                        type="text"
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full sm:w-auto flex-grow mt-1 rounded-md border-brand-accent/40 
                                 shadow-sm focus:border-brand-accent focus:ring focus:ring-brand-accent/30 
                                 focus:ring-opacity-50 bg-white px-3 py-2 text-sm sm:text-base text-gray-800"
                      />
                    ) : (
                      <span className="text-base sm:text-lg text-brand-ink">{formData[field]}</span>
                    )}
                    <button
                      onClick={() => handleEdit(field)}
                      className="px-4 py-2 bg-brand-surfaceAlt text-brand-muted rounded-full hover:bg-brand-actionHover 
                               transition duration-300 shadow-md hover:shadow-lg transform 
                               hover:-translate-y-1 text-sm sm:text-base w-full sm:w-auto"
                    >
                      {isEditing[field] ? 'Save' : 'Edit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-64 sm:h-80 md:h-auto bg-brand-surfaceAlt rounded-xl sm:rounded-2xl shadow-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eloData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#24314d" />
                  <XAxis 
                    dataKey="gameNumber" 
                    stroke="#3B82F6" 
                    label={{ 
                      value: "Games", 
                      position: "insideBottom", 
                      offset: -5, 
                      fill: "#F8FAFC" 
                    }} 
                  />
                  <YAxis 
                    stroke="#3B82F6" 
                    label={{ 
                      value: "ELO", 
                      angle: -90, 
                      position: "insideLeft", 
                      fill: "#F8FAFC" 
                    }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#14213D', 
                      borderColor: '#3B82F6' 
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="linear" // Ensures a straight line between points
                    dataKey="elo" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    dot={{ fill: '#3B82F6', strokeWidth: 2 }} 
                    connectNulls={true} // Ensures null or missing values are connected
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscribed Players Section */}
          <div className="mt-8 sm:mt-12 md:mt-16">
            <h2 className="text-2xl sm:text-3xl font-semibold text-brand-ink mb-4 sm:mb-6">
              Subscribed Players
            </h2>
            <div className="relative">
              <div 
                ref={coachScrollContainerRef} 
                className="flex overflow-x-auto space-x-4 sm:space-x-6 py-4 px-2 
                  scrollbar-thin scrollbar-thumb-brand-accent scrollbar-track-brand-surfaceAlt 
                  hover:scrollbar-thumb-brand-action"
              >
                {subscribedPlayers.length > 0 ? (
                  subscribedPlayers.map((player) => (
                    <div key={player._id} className="flex-none w-48 sm:w-56">
                      <div className="bg-brand-surfaceAlt rounded-lg p-4 transition duration-300 ease-in-out transform hover:scale-105">
                        <img
                          src={player.user.imageUrl || "/pngtree-chess-rook-front-view-png-image_7505306-2460555070.png"}
                          alt={player.user.UserName}
                          className="w-full h-32 sm:h-40 object-cover rounded-lg sm:rounded-xl"
                        />
                        <h3 className="text-base sm:text-xl text-center font-semibold text-brand-ink mt-2">{player.user.UserName}</h3>
                        <p className="text-brand-muted text-center mb-1">{player.user.Email}</p>
                        <p className="text-brand-muted text-center mb-4">ELO: {player.user.elo}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-brand-muted">No subscribers found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CProfile;






