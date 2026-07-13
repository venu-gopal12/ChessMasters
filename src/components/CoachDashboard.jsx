import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SubscriptionChart from './subscription.jsx';
import Viewchart from './views.jsx';
import EarningsChart from './earnings.jsx';
import axios from "axios";
import { chessMastersBackend } from '../../config.js';

const CoachDashboard = () => {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [articles, setArticles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribedPlayers, setSubscribedPlayers] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: null, // 'article' or 'video'
    itemId: null,
    title: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesResponse, videosResponse, playersResponse, revenueResponse, profileResponse] = await Promise.all([
          axios.get(`${chessMastersBackend}/coach/articles`, {
            withCredentials: true,
          }),
          axios.get(`${chessMastersBackend}/coach/videos`,{
            withCredentials: true,
          }),
          axios.get(`${chessMastersBackend}/coach/subscribedPlayers/${coachId}`, {
            withCredentials: true,
          }),
          axios.get(`${chessMastersBackend}/coach/revenue/${coachId}`, {
            withCredentials: true,
          }),
          axios.get(`${chessMastersBackend}/coach/details`, {
            withCredentials: true,
          })
        ]);
        
        // Check if profile is completed based on profile data
        const profile = profileResponse.data;
        const isProfileComplete = 
          profile && 
          profile.quote && 
          profile.location && 
          profile.languages && 
          profile.rating && 
          profile.hourlyRate && 
          profile.aboutMe && 
          profile.playingExperience && 
          profile.teachingExperience && 
          profile.teachingMethodology;
        
        setProfileCompleted(isProfileComplete);
        
        console.log('playersResponse', playersResponse);
        
        setArticles(articlesResponse.data || []);
        setVideos(videosResponse.data || []);
        setSubscribedPlayers(playersResponse.data.subscribers);
        setRevenue(revenueResponse.data.revenue || 0);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coachId]);

  const toggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

  const handleUpdate = (type, id) => {
    // Use lowercase for the route to match your route definitions
    navigate(`/${type}-update/${id}`);
  };

  const handleDeleteClick = (type, id, title) => {
    // Open confirmation dialog
    setDeleteDialog({
      isOpen: true,
      type,
      itemId: id,
      title
    });
  };

  const confirmDelete = async () => {
    const { type, itemId } = deleteDialog;
    
    try {
      console.log(`Attempting to delete ${type} with ID:`, itemId);
      
      // Make sure endpoint is correct
      const endpoint = type === 'article' 
        ? `${chessMastersBackend}/coach/article/${itemId}` 
        : `${chessMastersBackend}/coach/video/${itemId}`;
      
      const response = await axios.delete(
        endpoint,
        {
          withCredentials: true
        }
      );
      
      console.log(`${type} deletion response:`, response.data);
      
      // Update the state to remove the deleted item
      if (type === 'article') {
        setArticles(articles.filter(article => article._id !== itemId));
      } else {
        setVideos(videos.filter(video => video._id !== itemId));
      }

      // Close the dialog
      setDeleteDialog({ isOpen: false, type: null, itemId: null, title: '' });
      
    } catch (error) {
      console.error(`Error deleting ${type}:`, error.response?.data || error);
      alert(`Failed to delete ${type}: ${error.response?.data?.message || 'Unknown error'}`);
    }
  };

  const cancelDelete = () => {
    // Just close the dialog
    setDeleteDialog({ isOpen: false, type: null, itemId: null, title: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt text-brand-ink">
      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-brand-surface rounded-xl shadow-2xl p-6 max-w-md w-full border border-brand-accent/30 animate-fadeIn">
            <h3 className="text-xl font-semibold text-red-600 mb-4">Confirm Deletion</h3>
            <p className="text-brand-muted mb-4">
              Are you sure you want to delete "<span className="font-semibold">{deleteDialog.title}</span>"?
            </p>
            <p className="text-brand-muted mb-6">
              This content will be permanently removed from your library. This action cannot be undone and will affect your analytics data and content availability to your subscribers.
            </p>
            <div className="flex space-x-4 justify-end">
              <button 
                onClick={cancelDelete}
                className="px-4 py-2 bg-brand-surfaceAlt text-brand-muted rounded-lg hover:bg-brand-actionHover transition duration-300 shadow-md"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-300 shadow-md"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header section */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-brand-action py-3 sm:py-4 px-4 sm:px-6 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <img src="/pngtree-chess-rook-front-view-png-image_7505306-2460555070.png" 
                 alt="Logo" 
                 className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Coach Dashboard</h1>
          </div>
          <div className="text-white bg-brand-success px-4 py-2 rounded-lg shadow-lg font-semibold text-sm sm:text-base">
            Revenue: ${revenue.toLocaleString()}
          </div>
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="md:hidden text-white hover:text-brand-pageAlt transition duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </motion.header>

      <div className="flex flex-col md:flex-row">
        {/* Navigation sidebar */}
        <motion.nav
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`bg-brand-surface text-white 
                      w-full md:w-64 p-6 space-y-4 sm:space-y-5 border-r border-brand-accent/20
                      ${isNavOpen ? 'block' : 'hidden'} md:block flex-shrink-0`}
        >
          <div className="flex flex-col space-y-4 sm:space-y-5">
            <Link to="/Upload" className="block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-brand-surfaceAlt hover:bg-brand-action 
                           text-white font-bold py-3 px-6 rounded-lg border border-brand-accent/30
                           transition duration-300 ease-in-out shadow-md 
                           hover:shadow-lg hover:border-brand-accent text-sm sm:text-base"
              >
                Add
              </motion.button>
            </Link>

            <Link to="/Index?role=coach" className="block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-brand-surfaceAlt hover:bg-brand-action 
                           text-white font-bold py-3 px-6 rounded-lg border border-brand-accent/30
                           transition duration-300 ease-in-out shadow-md 
                           hover:shadow-lg hover:border-brand-accent text-sm sm:text-base"
              >
                Home
              </motion.button>
            </Link>

            <Link to="/AddData" className="block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-brand-surfaceAlt hover:bg-brand-action 
                           text-white font-bold py-3 px-6 rounded-lg border border-brand-accent/30
                           transition duration-300 ease-in-out shadow-md 
                           hover:shadow-lg hover:border-brand-accent text-sm sm:text-base"
              >
                Complete Profile
              </motion.button>
            </Link>

            {/* Show Update Profile button only if profile is completed */}
            {profileCompleted && (
              <Link to="/update-profile" className="block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-brand-surfaceAlt hover:bg-brand-action 
                             text-white font-bold py-3 px-6 rounded-lg border border-brand-accent/30
                             transition duration-300 ease-in-out shadow-md 
                             hover:shadow-lg hover:border-brand-accent text-sm sm:text-base"
                >
                  Update Profile
                </motion.button>
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleAnalytics}
              className="w-full bg-brand-surfaceAlt hover:bg-brand-action 
                         text-white font-bold py-3 px-6 rounded-lg border border-brand-accent/30
                         transition duration-300 ease-in-out shadow-md 
                         hover:shadow-lg hover:border-brand-accent text-sm sm:text-base"
            >
              Analytics
            </motion.button>
          </div>
        </motion.nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Analytics section */}
          {showAnalytics && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-brand-surface rounded-lg shadow-xl p-4 border border-brand-accent/20"
                >
                  <SubscriptionChart />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-brand-surface rounded-lg shadow-xl p-4 border border-brand-accent/20"
                >
                  <Viewchart />
                </motion.div>
              </div>
            </>
          )}

          {/* Dashboard content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Subscribed Students section */}
            <motion.section
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-brand-surface p-4 sm:p-6 rounded-lg shadow-xl border border-brand-accent/30"
            >
              <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b-2 border-brand-accent pb-2 text-brand-ink">
                Subscribed Students
              </h2>
              {loading ? (
                <p>Loading...</p>
              ) : subscribedPlayers.length > 0 ? (
                <ul className="space-y-2">
                  {subscribedPlayers.map((player) => (
                    <li key={player._id} 
                        className="bg-brand-surfaceAlt/80 hover:bg-brand-surfaceAlt p-3 rounded-lg border border-brand-accent/20 hover:border-brand-accent/50 transition duration-300 ease-in-out">
                      <div className="flex flex-col gap-2">
                        <span className="text-brand-ink">{player.user.UserName} <span className="text-brand-muted">(Rating: {player.user.elo || 'N/A'})</span></span>
                        <button
                          onClick={() => navigate(`/ChessBoard?mode=coaching&coachId=${coachId}&studentId=${player.user._id}`)}
                          className="px-3 py-1.5 bg-brand-action text-white rounded-md hover:bg-brand-actionHover transition duration-300 text-sm"
                        >
                          Join Live Session
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No subscribed students available</p>
              )}
            </motion.section>

            {/* My Videos section */}
            <motion.section
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-brand-surface p-4 sm:p-6 rounded-lg shadow-xl border border-brand-accent/30"
            >
              <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b-2 border-brand-accent pb-2 text-brand-ink">
                My Videos
              </h2>
              <ul className="space-y-3">
                {loading ? (
                  <p>Loading...</p>
                ) : videos.length > 0 ? (
                  videos.map((video) => (
                    <li key={video._id} 
                        className="bg-brand-surfaceAlt/70 hover:bg-brand-surfaceAlt p-3 rounded-lg transition duration-300 ease-in-out border border-brand-accent/25 hover:border-brand-accent/50 shadow-sm">
                      <div className="flex flex-col space-y-2">
                        <Link to={`/VideoDetail/${video._id}`} 
                              className="text-brand-ink hover:text-brand-accent font-medium">
                          {video.title}
                        </Link>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleUpdate('video', video._id)}
                            className="px-3 py-1.5 bg-brand-action text-white rounded-md hover:bg-brand-actionHover transition duration-300 shadow-sm flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick('video', video._id, video.title)}
                            className="px-3 py-1.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-md hover:from-red-500 hover:to-red-600 transition duration-300 shadow-sm flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>No videos available</li>
                )}
              </ul>
            </motion.section>

            {/* My Articles section */}
            <motion.section
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="bg-brand-surface p-4 sm:p-6 rounded-lg shadow-xl border border-brand-accent/30"
            >
              <h2 className="text-lg sm:text-xl font-semibold mb-4 border-b-2 border-brand-accent pb-2 text-brand-ink">
                My Articles
              </h2>
              <ul className="space-y-3">
                {loading ? (
                  <p>Loading...</p>
                ) : articles.length > 0 ? (
                  articles.map((article) => (
                    <li key={article._id} 
                        className="bg-brand-surfaceAlt/70 hover:bg-brand-surfaceAlt p-3 rounded-lg transition duration-300 ease-in-out border border-brand-accent/25 hover:border-brand-accent/50 shadow-sm">
                      <div className="flex flex-col space-y-2">
                        <Link
                              to={`/ArticleDetail/${article._id}`}
                              state={{ returnTo: `${location.pathname}${location.search}` }}
                              className="text-brand-ink hover:text-brand-accent font-medium">
                          {article.title}
                        </Link>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleUpdate('article', article._id)}
                            className="px-3 py-1.5 bg-brand-action text-white rounded-md hover:bg-brand-actionHover transition duration-300 shadow-sm flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick('article', article._id, article.title)}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-400 to-rose-500 text-white rounded-md hover:from-rose-500 hover:to-rose-600 transition duration-300 shadow-sm flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li>No articles available</li>
                )}
              </ul>
            </motion.section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CoachDashboard;







