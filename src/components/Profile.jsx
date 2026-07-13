import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { chessMastersBackend } from '../../config.js';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState({
    name: false,
    email: false,
    password: false
  });
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
  const [showPasswordFields, setShowPasswordFields] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [eloData, setEloData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribedCoaches, setSubscribedCoaches] = useState([]);
  const [currentPlayerId, setCurrentPlayerId] = useState(id);
  const [updateMessage, setUpdateMessage] = useState('');
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    coachId: null,
    coachName: '',
    daysRemaining: 0
  });
  const [deleteAccountDialog, setDeleteAccountDialog] = useState({
    isOpen: false
  });

  useEffect(() => {
    let isMounted = true;

    const fetchPlayerDetails = async () => {

      
      try {
        // Request user details
        const response = await axios.get(`${chessMastersBackend}/auth/details`, {
          withCredentials: true,
          // headers: { 
          //   Authorization: `Bearer ${token}`
          // }
        });
        
        console.log("User details response:", response.data); // Debugging Log
        if (isMounted) {
          const player = response.data;
          setCurrentPlayerId(player._id);
          setFormData({
            name: player.UserName,
            email: player.Email,
            password: '********'
          });
          setEloData(player.eloHistory || []);
          
          // Only fetch subscribed coaches if we have a user ID
          if (player._id) {
            try {
              const coachesResponse = await axios.get(
                `${chessMastersBackend}/player/${player._id}/subscribedCoaches`,
                {
                  // headers: { Authorization: `Bearer ${token}` },
                  withCredentials: true,
                }
              );
              if (isMounted) {
                console.log('Subscribed coaches:', coachesResponse.data);
                setSubscribedCoaches(coachesResponse.data);
              }
            } catch (coachError) {
              console.error('Error fetching subscribed coaches:', coachError);
            }
          }
          
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching player details:', error);
          if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
          }
          setLoading(false);
        }
      }
    };

    fetchPlayerDetails();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = async (field) => {
    if (!isEditing[field] && field === 'password') {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordFields({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
      });
    }

    // If currently editing and trying to save
    if (isEditing[field]) {
      try {
        if (field === 'password') {
          if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setUpdateMessage('Please fill all password fields.');
            setTimeout(() => setUpdateMessage(''), 3000);
            return;
          }

          if (passwordData.newPassword !== passwordData.confirmPassword) {
            setUpdateMessage('New password and confirm password do not match.');
            setTimeout(() => setUpdateMessage(''), 3000);
            return;
          }

          await axios.put(
            `${chessMastersBackend}/player/change-password`,
            passwordData,
            {
              withCredentials: true
            }
          );

          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
          setUpdateMessage('Password changed successfully!');
          setTimeout(() => {
            setUpdateMessage('');
          }, 3000);
          setIsEditing({ ...isEditing, [field]: false });
          return;
        }

        // Map frontend field names to backend field names
        const fieldMapping = {
          name: 'UserName',
          email: 'Email',
          password: 'Password'
        };
        
        // Only send the field being updated
        const updateData = {
          [fieldMapping[field]]: formData[field]
        };
        
        // Send update request to backend
        const response = await axios.put(
          `${chessMastersBackend}/player/update-profile`,
          updateData,
          {
            withCredentials: true
          }
        );
        
        // If password was updated, reset it to asterisks in the UI
        if (field === 'password') {
          setFormData({
            ...formData,
            password: '********'
          });
        }
        
        // Show success message
        setUpdateMessage(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setUpdateMessage('');
        }, 3000);
        
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        setUpdateMessage(error.response?.data?.message || `Failed to update ${field}. Please try again.`);
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          setUpdateMessage('');
        }, 3000);
      }
    }
    
    // Toggle editing state
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

  const togglePasswordVisibility = (field) => {
    setShowPasswordFields({
      ...showPasswordFields,
      [field]: !showPasswordFields[field]
    });
  };

  const coachScrollContainerRef = useRef(null);

  const handleUnsubscribe = async (coachUserId) => {
    // Debugging Log
    console.log("Attempting to unsubscribe from coach userId:", coachUserId);

    try {
      const response = await axios.post(
        `${chessMastersBackend}/player/unsubscribe`,
        { coachId: coachUserId },  // Send the user ID of the coach
        {
          withCredentials: true
        }
      );
      
      console.log("Unsubscribe response:", response.data);
      
      // Update the UI by removing the unsubscribed coach
      setSubscribedCoaches((coaches) => coaches.filter(coach => coach.user._id !== coachUserId));

    } catch (error) {
      console.error('Error unsubscribing from coach:', error);
      setUpdateMessage('Failed to unsubscribe. Please try again.');
      setTimeout(() => setUpdateMessage(''), 3000);
    }
  };

  const handleUnsubscribeClick = (coachUserId, coachName, subscribedAt) => {
    // Calculate days remaining in subscription
    let daysRemaining = 0;
    
    if (subscribedAt) {
      const subscriptionDate = new Date(subscribedAt);
      const today = new Date();
      
      // Assume subscription is for 30 days from the subscription date
      const subscriptionEndDate = new Date(subscriptionDate);
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);
      
      // Calculate days remaining (round down to nearest whole day)
      daysRemaining = Math.max(0, Math.floor((subscriptionEndDate - today) / (1000 * 60 * 60 * 24)));
    } else {
      // Default to -1 days if subscribedAt is null
      daysRemaining = -1;
    }
    
    // Show custom confirmation dialog
    setConfirmationDialog({
      isOpen: true,
      coachId: coachUserId,
      coachName: coachName,
      daysRemaining: daysRemaining
    });
  };

  const confirmUnsubscribe = () => {
    // Call the existing unsubscribe handler with the coach ID from state
    handleUnsubscribe(confirmationDialog.coachId);
    // Close the dialog
    setConfirmationDialog({ isOpen: false, coachId: null, coachName: '', daysRemaining: 0 });
  };

  const cancelUnsubscribe = () => {
    // Just close the dialog
    setConfirmationDialog({ isOpen: false, coachId: null, coachName: '', daysRemaining: 0 });
  };

  const handleDeleteAccount = () => {
    setDeleteAccountDialog({ isOpen: true });
  };

  const confirmDeleteAccount = async () => {
    try {
      // First unsubscribe from all coaches
      for (const coach of subscribedCoaches) {
        await handleUnsubscribe(coach.user._id);
      }
      
      // Then delete the account
      const response = await axios.delete(
        `${chessMastersBackend}/player/delete-account`,
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
    <div translate="no" className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      {/* Delete Account Confirmation Dialog */}
      {deleteAccountDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-brand-surface rounded-xl shadow-2xl p-6 max-w-md w-full border border-brand-accent/30 animate-fadeIn">
            <h3 className="text-xl font-semibold text-red-600 mb-4">Delete Account</h3>
            <p className="text-brand-muted mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <p className="text-brand-muted mb-6">
              By confirming, you understand that:
            </p>
            <ul className="list-disc list-inside text-brand-muted mb-6 space-y-2">
              <li>You will need to register again to use our services</li>
              <li>All active subscriptions will be automatically terminated</li>
              <li>Subscription fees are non-refundable</li>
              <li>Your account data and history will be permanently removed</li>
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
      
      {/* Confirmation Dialog */}
      {confirmationDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-brand-surface rounded-xl shadow-2xl p-6 max-w-md w-full border border-brand-accent/30 animate-fadeIn">
            <h3 className="text-xl font-semibold text-brand-ink mb-1">Confirm Unsubscription</h3>
            <h4 className="text-brand-muted font-medium mb-4">{confirmationDialog.coachName}</h4>
            <p className="text-brand-muted mb-3">
              You have <span className="text-brand-ink font-bold">{confirmationDialog.daysRemaining} days</span> remaining in your subscription.
            </p>
            <p className="text-brand-muted mb-6">
              Are you sure you want to unsubscribe from coach <span className="text-brand-ink font-semibold">{confirmationDialog.coachName}</span>? You will lose access to all premium articles and videos. 
              Please note that your subscription payment for the current period will not be refunded.
            </p>
            <div className="flex space-x-4 justify-end">
              <button 
                onClick={cancelUnsubscribe}
                className="px-4 py-2 bg-brand-surfaceAlt text-brand-muted rounded-lg hover:bg-brand-actionHover transition duration-300 shadow-md"
              >
                Cancel
              </button>
              <button 
                onClick={confirmUnsubscribe}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 shadow-md"
              >
                Unsubscribe
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto bg-brand-surface rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          {/* Header Section with Home and Delete Account buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 md:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-ink mb-4 sm:mb-0">Player Profile</h1>
            <div className="flex space-x-3 sm:space-x-4">
              <button 
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-lg hover:bg-red-700 transition duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1 text-sm sm:text-base"
              >
                Delete Account
              </button>
              <Link to="/Index?role=player" className="bg-brand-action text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-brand-actionHover transition duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1 text-sm sm:text-base">
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

          {/* Profile Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img 
                  src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/1820405/profile/profile-512.jpg" 
                  alt={formData.name} 
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-4 border-brand-accent shadow-lg"
                />
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-brand-ink">{formData.name}</h2>
                  <p className="text-base sm:text-lg text-brand-muted">Player</p>
                </div>
              </div>

              {/* Form Fields */}
              {['name', 'email', 'password'].map((field) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium text-brand-ink capitalize">
                    {field}
                  </label>
                  <div className={`flex flex-col ${field === 'password' && isEditing[field] ? 'items-stretch space-y-3' : 'sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0'} ${field === 'password' && !isEditing[field] ? '' : 'sm:space-x-3'}`}>
                    {isEditing[field] && field === 'password' ? (
                      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                          { name: 'currentPassword', placeholder: 'Current password' },
                          { name: 'newPassword', placeholder: 'New password' },
                          { name: 'confirmPassword', placeholder: 'Confirm new password' },
                        ].map((passwordField) => (
                          <div key={passwordField.name} className="relative">
                            <input
                              type={showPasswordFields[passwordField.name] ? 'text' : 'password'}
                              name={passwordField.name}
                              value={passwordData[passwordField.name]}
                              onChange={handlePasswordChange}
                              placeholder={passwordField.placeholder}
                              className="w-full rounded-md border-brand-accent/40 bg-white text-gray-800 shadow-sm focus:border-brand-accent focus:ring focus:ring-brand-accent/30 focus:ring-opacity-50 px-3 py-2 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(passwordField.name)}
                              className="absolute inset-y-0 right-2 flex items-center text-brand-muted transition hover:text-brand-ink"
                              aria-label={showPasswordFields[passwordField.name] ? 'Hide password' : 'Show password'}
                            >
                              {showPasswordFields[passwordField.name] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : isEditing[field] ? (
                      <input
                        type="text"
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full sm:w-auto flex-grow mt-1 rounded-md border-brand-accent/40 bg-white text-gray-800 shadow-sm focus:border-brand-accent focus:ring focus:ring-brand-accent/30 focus:ring-opacity-50 px-3 py-2"
                      />
                    ) : field === 'password' ? null : (
                      <span className="text-base sm:text-lg text-brand-ink">{formData[field]}</span>
                    )}
                    <button
                      onClick={() => handleEdit(field)}
                      className="px-4 py-2 bg-brand-surfaceAlt text-brand-muted rounded-lg hover:bg-brand-actionHover transition duration-300 shadow-md hover:shadow-lg w-full sm:w-auto"
                    >
                      {isEditing[field] ? (field === 'password' ? 'Save Password' : 'Save') : (field === 'password' ? 'Change Password' : 'Edit')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ELO Chart Section */}
            <div className="h-64 sm:h-80 md:h-auto bg-brand-surfaceAlt rounded-xl shadow-lg p-4">
              {eloData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={eloData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#24314d" />
                    <XAxis dataKey="gameNumber" stroke="#3B82F6" />
                    <YAxis stroke="#3B82F6" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#14213D', 
                        borderColor: '#3B82F6'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="linear"
                      dataKey="elo" 
                      stroke="#3B82F6" 
                      strokeWidth={2} 
                      dot={{ fill: '#3B82F6', strokeWidth: 2 }} 
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-brand-accent/30 text-brand-muted">
                  No rating history yet.
                </div>
              )}
            </div>
          </div>

          {/* Coaches Section */}
          <div className="mt-8 sm:mt-12 md:mt-16">
            <h2 className="text-2xl sm:text-3xl font-semibold text-brand-ink mb-6">
              Subscribed Coaches
            </h2>
            <div className="relative">
              <div 
                ref={coachScrollContainerRef} 
                className="flex overflow-x-auto space-x-4 sm:space-x-6 py-4 px-2 
                  scrollbar-thin scrollbar-thumb-brand-accent scrollbar-track-brand-surfaceAlt
                  hover:scrollbar-thumb-brand-action"
              >
                {subscribedCoaches.length > 0 ? (
                  subscribedCoaches.map((coach) => {
                    return (
                      <div key={coach._id} className="flex-none w-48 sm:w-56">
                        <div className="bg-brand-surfaceAlt rounded-lg p-4 transition duration-300 ease-in-out transform hover:scale-105">
                          <img
                            src={coach.imageUrl || "/pngtree-chess-rook-front-view-png-image_7505306-2460555070.png"}
                            alt={coach.UserName}
                            className="w-full h-32 sm:h-40 object-cover rounded-lg sm:rounded-xl"
                          />
                          <h3 className="text-base sm:text-xl text-center font-semibold text-brand-ink mt-2">{coach.UserName}</h3>
                          <p className="text-brand-muted text-center mb-4">Rating: {coach.rating || 'N/A'}</p>
                          <button
                            onClick={() => navigate(`/ChessBoard?mode=coaching&coachId=${coach.user._id}&studentId=${currentPlayerId}`)}
                            className="w-full bg-brand-action text-white py-2 rounded-lg hover:bg-brand-actionHover 
                              transition duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 mb-2"
                          >
                            Start Live Coaching Game
                          </button>
                          <button 
                            onClick={() => handleUnsubscribeClick(coach.user._id, coach.UserName, coach.subscribedAt)}
                            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 
                              transition duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1"
                          >
                            Unsubscribe
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-brand-muted">No subscribed coaches found.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;







