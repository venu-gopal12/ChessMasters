import React, { useRef, useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import NavbarPlay from "./navbarplay.jsx";
import axios from "axios";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { toast } from 'react-toastify';
import { BarChart3, Book, GraduationCap, Play, Radio, Trophy, Users, Video, FileText } from 'lucide-react';
import { motion } from "framer-motion";
import { chessMastersBackend } from "../../config.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#FDBA74',
      },
    },
  },
};

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [details, setDetails] = useState(null);
  const [articles, setArticles] = useState(null);
  const [videos, setVideos] = useState([]);
  const [games, setGames] = useState([]);
  const [subscribedCoaches, setSubscribedCoaches] = useState([]);
  const [searchParams] = useSearchParams();
  const [isPlayer, setIsPlayer] = useState(searchParams.get('role') === 'player');
  const [learningTab, setLearningTab] = useState("videos");

  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({
    totalGamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDraw: 0,
    elo: 0,
  });

  const gameScrollContainerRef = useRef(null);
  const scrollLeftRef = useRef(null);
  const scrollRightRef = useRef(null);
  const videoScrollContainerRef = useRef(null);
  const videoScrollLeftRef = useRef(null);
  const videoScrollRightRef = useRef(null);
  const articleScrollContainerRef = useRef(null);
  const articleScrollLeftRef = useRef(null);
  const articleScrollRightRef = useRef(null);

  useEffect(() => {
    const setupScroll = (scrollContainer, scrollLeftButton, scrollRightButton) => {
      const scrollLeft = () => {
        if (scrollContainer) {
          scrollContainer.scrollBy({ left: -100, behavior: "smooth" });
        }
      };
      const scrollRight = () => {
        if (scrollContainer) {
          scrollContainer.scrollBy({ left: 100, behavior: "smooth" });
        }
      };
      if (scrollLeftButton) {
        scrollLeftButton.addEventListener("click", scrollLeft);
      }
      if (scrollRightButton) {
        scrollRightButton.addEventListener("click", scrollRight);
      }
      return () => {
        if (scrollLeftButton) {
          scrollLeftButton.removeEventListener("click", scrollLeft);
        }
        if (scrollRightButton) {
          scrollRightButton.removeEventListener("click", scrollRight);
        }
      };
    };

    const gameCleanup = setupScroll(
      gameScrollContainerRef.current,
      scrollLeftRef.current,
      scrollRightRef.current
    );
    const videoCleanup = setupScroll(
      videoScrollContainerRef.current,
      videoScrollLeftRef.current,
      videoScrollRightRef.current
    );
    const articleCleanup = setupScroll(
      articleScrollContainerRef.current,
      articleScrollLeftRef.current,
      articleScrollRightRef.current
    );

    return () => {
      gameCleanup();
      videoCleanup();
      articleCleanup();
    };
  }, []);

  useEffect(() => {
    axios
      .get(`${chessMastersBackend}/auth/details`, { withCredentials: true })
      .then((resp) => {
        setDetails(resp.data);
        setIsPlayer(resp.data.Role === "player");
  
        if (resp.data.Role === "player" || resp.data.Role === "coach"){
          axios
            .get(`${chessMastersBackend}/game/mygames`, { withCredentials: true })
            .then((resp) => {
              setGames(Array.isArray(resp.data.games) ? resp.data.games : []);
            })
            .catch((err) => {
              console.error("Error fetching user games:", err);
              setGames([]);
            });
          }
          if (resp.data.Role === "player"){
          axios
            .get(`${chessMastersBackend}/player/${resp.data._id}/subscribedCoaches`, { withCredentials: true })
            .then((resp) => {
              setSubscribedCoaches(Array.isArray(resp.data) ? resp.data : []);
            })
            .catch((err) => {
              console.error("Error fetching subscribed coaches:", err);
              setSubscribedCoaches([]);
            });

          axios
            .get(`${chessMastersBackend}/player/subscribed-articles`, { withCredentials: true })
            .then((resp) => {
              console.log('articles data', resp.data);
              setArticles(resp.data);
            })
            .catch((err) => {
              console.error("Error fetching articles:", err);
              setArticles([]);
            });
  
          axios
            .get(`${chessMastersBackend}/player/subscribed-videos`, { withCredentials: true })
            .then((resp) => {
              console.log('videos data', resp.data);
              setVideos(resp.data);
            })
            .catch((err) => {
              console.error("Error fetching videos:", err);
              setVideos([]);
            });
        } else if (resp.data.Role === "admin") {
          setArticles([]);
          setVideos([]);
          axios
            .get(`${chessMastersBackend}/admin/getvideos`, { withCredentials: true })
            .then((resp) => {
              setVideos(resp.data);
            })
            .catch((err) => {
              console.error("Error fetching Videos:", err);
              setVideos([]);
            });
        } else {
          setArticles([]);
          setVideos([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching details:", err);
      });
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${chessMastersBackend}/player/${details._id}/game-stats`, { withCredentials: true });
      console.log('stats data', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (details && isPlayer) {
      fetchStats();
    }
  }, [details, isPlayer]);

  const chartData = {
    labels: ['Wins', 'Losses', 'Draws'],
    datasets: [
      {
        data: [stats.gamesWon, stats.gamesLost, stats.gamesDraw],
        backgroundColor: ['#2563EB', '#EF4444', '#F59E0B'],
        hoverBackgroundColor: ['#1D4ED8', '#DC2626', '#D97706'],
      },
    ],
  };

  const statCards = [
    { label: "Games Played", value: stats.totalGamesPlayed },
    { label: "Wins", value: stats.gamesWon },
    { label: "Losses", value: stats.gamesLost },
    { label: "Draws", value: stats.gamesDraw },
    { label: "Rating", value: stats.elo },
  ];

  const recordVideoView = async (videoId) => {
    try {
      const response = await axios.post(
        `${chessMastersBackend}/video/${videoId}/view`,
        {},
        { withCredentials: true }
      );
      
      toast.success("View recorded");
      
      console.log("Video view recorded successfully");
      return true;
    } catch (error) {
      console.error("Error recording video view:", error);
      return false;
    }
  };

  const recordArticleView = async (articleId) => {
    try {
      const response = await axios.post(
        `${chessMastersBackend}/article/${articleId}/view`,
        {},
        { withCredentials: true }
      );
      
      toast.success("View recorded");
      
      console.log("Article view recorded successfully");
      return true;
    } catch (error) {
      console.error("Error recording article view:", error);
      return false;
    }
  };

  if (!details || !articles) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-brand-page via-brand-pageAlt to-black">
        <div className="text-base sm:text-lg md:text-xl lg:text-2xl text-brand-ink animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page via-brand-pageAlt to-black text-brand-ink">
      {isPlayer ? <NavbarPlay /> : <Navbar />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-6">
        <section className="bg-brand-surface rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 border-l-4 border-brand-success">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 lg:gap-8 items-center">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-wider text-brand-muted font-semibold mb-2">Player Dashboard</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-ink mb-3">
                Welcome back, {details.UserName}!
              </h1>
              <p className="text-sm sm:text-base text-brand-muted mb-5">
                Start a match, review your progress, and continue your coach-led chess learning.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/ChessBoard')}
                  className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-brand-success text-white font-bold rounded-lg transition-all duration-300 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-brand-success focus:ring-opacity-50 transform hover:scale-[1.02] text-sm sm:text-base"
                >
                  <Play size={18} />
                  Play Now
                </button>
                <motion.button
                  onClick={() => navigate('/rules')}
                  className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-brand-action text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:bg-brand-actionHover focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 transform hover:scale-[1.02] text-sm sm:text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Book size={18} />
                  Game Rules
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-brand-surfaceAlt border border-brand-success/50 rounded-lg p-3 text-center">
                <p className="text-xs text-brand-muted">Rating</p>
                <p className="text-xl sm:text-2xl font-bold text-brand-ink">{stats.elo}</p>
              </div>
              <div className="bg-brand-surfaceAlt border border-brand-accent/50 rounded-lg p-3 text-center">
                <p className="text-xs text-brand-muted">Wins</p>
                <p className="text-xl sm:text-2xl font-bold text-brand-ink">{stats.gamesWon}</p>
              </div>
              <div className="bg-brand-surfaceAlt border border-brand-accent/50 rounded-lg p-3 text-center">
                <p className="text-xs text-brand-muted">Games</p>
                <p className="text-xl sm:text-2xl font-bold text-brand-ink">{stats.totalGamesPlayed}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button onClick={() => navigate('/ChessBoard')} className="bg-brand-surface border border-brand-success/60 rounded-lg p-4 text-left hover:bg-brand-surfaceAlt transition-all duration-300">
            <Play className="text-brand-success mb-3" size={22} />
            <p className="font-semibold text-brand-ink">Play Online</p>
            <p className="text-xs text-brand-muted mt-1">Start a chess match</p>
          </button>
          <button onClick={() => navigate('/CoachesAvailable')} className="bg-brand-surface border border-brand-accent/60 rounded-lg p-4 text-left hover:bg-brand-surfaceAlt transition-all duration-300">
            <Users className="text-brand-accent mb-3" size={22} />
            <p className="font-semibold text-brand-ink">Find Coach</p>
            <p className="text-xs text-brand-muted mt-1">Browse coaching profiles</p>
          </button>
          <button onClick={() => navigate(`/player/${details._id}/profile`)} className="bg-brand-surface border border-brand-accent/60 rounded-lg p-4 text-left hover:bg-brand-surfaceAlt transition-all duration-300">
            <Radio className="text-brand-accent mb-3" size={22} />
            <p className="font-semibold text-brand-ink">Live Coaching</p>
            <p className="text-xs text-brand-muted mt-1">Start with a subscribed coach</p>
          </button>
          <button onClick={() => setLearningTab(videos.length > 0 ? "videos" : "articles")} className="bg-brand-surface border border-brand-success/60 rounded-lg p-4 text-left hover:bg-brand-surfaceAlt transition-all duration-300">
            <GraduationCap className="text-brand-success mb-3" size={22} />
            <p className="font-semibold text-brand-ink">View Lessons</p>
            <p className="text-xs text-brand-muted mt-1">Videos and articles</p>
          </button>
        </section>

        <section className="bg-brand-surface rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 border-l-4 border-brand-success">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-brand-success/15 text-brand-success rounded-lg p-2">
                <BarChart3 size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-brand-ink">Stats</h2>
                <p className="text-xs sm:text-sm text-brand-muted">Your chess progress at a glance</p>
              </div>
            </div>
            <button
              onClick={() => setShowStats((value) => !value)}
              className="py-2 px-4 bg-brand-action text-white font-semibold rounded-lg transition-all duration-300 hover:bg-brand-actionHover focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 text-sm"
            >
              {showStats ? "Hide Chart" : "Show Chart"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 text-center">
            {statCards.map((card) => (
              <div key={card.label} className="p-3 bg-brand-surfaceAlt rounded-lg border border-brand-accent/70">
                <p className="text-xs text-brand-muted mb-1">{card.label}</p>
                <p className="font-bold text-brand-ink text-lg sm:text-xl">{card.value}</p>
              </div>
            ))}
          </div>

          {showStats && (
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto h-48 sm:h-56 md:h-64 mt-5">
              <Pie data={chartData} options={chartOptions} />
            </div>
          )}
        </section>

        <section className="bg-brand-surface rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md 
                p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border-l-4 border-brand-success">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-brand-ink">Recent Games</h2>
              <p className="text-xs sm:text-sm text-brand-muted mt-1">Review your latest matches and learn from each result.</p>
            </div>
            <Trophy className="text-brand-success hidden sm:block" size={28} />
          </div>
          <div className="relative">
            <div ref={gameScrollContainerRef} 
                 className="flex overflow-x-auto overflow-y-hidden space-x-3 sm:space-x-4 
                          items-center px-2 sm:px-4 h-[280px]
                          scrollbar-thin scrollbar-thumb-brand-success scrollbar-track-brand-surfaceAlt">
              {games.map((game) => {
                // Determine if current user won, lost, or drew
                const isUserWhite = game.playerWhite?._id === details._id;
                const isUserBlack = game.playerBlack?._id === details._id;
                const userWon = (isUserWhite && game.winner === "White") || (isUserBlack && game.winner === "Black");
                const userLost = (isUserWhite && game.winner === "Black") || (isUserBlack && game.winner === "White");
                const isDraw = game.winner === "Draw";
                
                // Set colors based on result
                const bgGradient = userWon 
                  ? "from-brand-surfaceAlt to-brand-action" 
                  : userLost 
                    ? "from-red-900 to-red-700" 
                    : "from-yellow-900 to-yellow-700";
                
                const borderColor = userWon 
                  ? "border-brand-accent" 
                  : userLost 
                    ? "border-red-400" 
                    : "border-yellow-400";
                
                const resultColor = userWon 
                  ? "text-brand-ink" 
                  : userLost 
                    ? "text-red-300" 
                    : "text-yellow-300";
                    
                // Set result text and icon
                const resultText = userWon ? "Victory" : userLost ? "Defeat" : "Draw";
                const resultIcon = userWon 
                  ? "♔" // King for victory
                  : userLost 
                    ? "♖" // Rook for defeat
                    : "♘"; // Knight for draw
                
                // Handle player names with deleted user check
                const whitePlayerName = game.playerWhite?.UserName || "Deleted User";
                const blackPlayerName = game.playerBlack?.UserName || "Deleted User";
                
                const isWhiteDeleted = !game.playerWhite?.UserName;
                const isBlackDeleted = !game.playerBlack?.UserName;
                
                // Format date nicely
                const gameDate = new Date(game.datePlayed);
                const formattedDate = gameDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                });
                
                // Game end reason, if available (shortened to fit)
                const gameReason = game.additionalAttributes?.reason 
                  ? game.additionalAttributes.reason.toLowerCase()
                  : "";
                
                return (
                  <div key={game._id} 
                       className={`flex-shrink-0 w-64 sm:w-72 h-[240px] bg-gradient-to-br ${bgGradient} text-white 
                                rounded-xl border ${borderColor} shadow-lg overflow-hidden
                                transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
                                backdrop-blur-sm flex flex-col`}>
                    {/* Header with result */}
                    <div className={`flex items-center justify-center p-2 bg-black/30 border-b ${borderColor}`}>
                      <span className="text-xl mr-2">{resultIcon}</span>
                      <h3 className={`text-lg font-bold ${resultColor}`}>{resultText}</h3>
                    </div>
                    
                    {/* Player matchup - simplified */}
                    <div className="p-2 flex-grow-0 flex flex-col items-center border-b border-white/10">
                      <div className="flex items-center w-full justify-between">
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-white mr-1"></div>
                          <span className={`${isWhiteDeleted ? "text-yellow-300" : "text-white"} font-medium text-sm truncate max-w-[120px]`}>
                            {whitePlayerName}
                          </span>
                        </div>
                        <span className="text-white/70 text-xs">{isUserWhite ? "(You)" : ""}</span>
                      </div>
                      
                      <div className="text-xs text-brand-muted my-0.5">vs</div>
                      
                      <div className="flex items-center w-full justify-between">
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full bg-black mr-1"></div>
                          <span className={`${isBlackDeleted ? "text-yellow-300" : "text-white"} font-medium text-sm truncate max-w-[120px]`}>
                            {blackPlayerName}
                          </span>
                        </div>
                        <span className="text-white/70 text-xs">{isUserBlack ? "(You)" : ""}</span>
                      </div>
                    </div>
                    
                    {/* Game details - simplified */}
                    <div className="p-3 bg-black/20 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="text-xs text-white/80">
                          <span className="mr-1">📅</span> {formattedDate}
                        </div>
                        
                        {gameReason && (
                          <div className="text-xs text-white/80 mt-1">
                            <span className="mr-1">🏆</span> 
                            {isDraw ? `Draw by ${gameReason}` : userWon ? `Win by ${gameReason}` : `Loss by ${gameReason}`}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ViewGame/${game._id}`);
                        }}
                        className="w-full flex items-center justify-center bg-white/10 hover:bg-white/20 
                                 text-white py-2 px-3 rounded-lg transition-all duration-300
                                 group border border-white/30 hover:border-brand-accent backdrop-blur-sm
                                 font-medium mt-2"
                      >
                        <span className="group-hover:scale-110 transition-transform duration-300">♟</span>
                        <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300 text-sm">Review Game</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {isPlayer && (
          <section className="bg-brand-surface rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 border-l-4 border-brand-success">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-brand-ink">Learning</h2>
                <p className="text-xs sm:text-sm text-brand-muted mt-1">Continue lessons from your subscribed coaches.</p>
              </div>
              <div className="inline-flex rounded-lg bg-brand-surfaceAlt border border-brand-accent/30 p-1">
                <button
                  onClick={() => setLearningTab("videos")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    learningTab === "videos" ? "bg-brand-success text-white" : "text-brand-muted hover:text-white"
                  }`}
                >
                  <Video size={16} />
                  Videos
                </button>
                <button
                  onClick={() => setLearningTab("articles")}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    learningTab === "articles" ? "bg-brand-action text-white" : "text-brand-muted hover:text-white"
                  }`}
                >
                  <FileText size={16} />
                  Articles
                </button>
              </div>
            </div>

            {learningTab === "videos" ? (
              videos && videos.length > 0 ? (
                <div ref={videoScrollContainerRef} className="flex overflow-x-auto space-x-3 sm:space-x-4 items-center px-1 sm:px-2 min-h-[120px] scrollbar-thin scrollbar-thumb-brand-success scrollbar-track-brand-surfaceAlt">
                  {videos.map((video) => (
                    <Link
                      key={video._id}
                      to={`/VideoDetail/${video._id}`}
                      onClick={() => recordVideoView(video._id)}
                      className="flex-shrink-0 min-w-44 sm:min-w-56 bg-brand-success text-white font-medium sm:font-semibold p-4 rounded-lg hover:bg-green-600 transition-all duration-300 text-sm sm:text-base transform hover:scale-105"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                          <Video size={20} />
                        </span>
                        <span className="line-clamp-2 text-left leading-snug">{video.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-brand-surfaceAlt border border-brand-accent/30 rounded-lg p-5 text-center text-brand-muted">
                  No subscribed videos yet.
                </div>
              )
            ) : articles && articles.length > 0 ? (
              <div ref={articleScrollContainerRef} className="flex overflow-x-auto space-x-3 sm:space-x-4 items-center px-1 sm:px-2 min-h-[120px] scrollbar-thin scrollbar-thumb-brand-success scrollbar-track-brand-surfaceAlt">
                {articles.map((article) => (
                  <Link
                    key={article._id}
                    to={`/ArticleDetail/${article._id}`}
                    state={{ returnTo: `${location.pathname}${location.search}` }}
                    onClick={() => recordArticleView(article._id)}
                    className="flex-shrink-0 min-w-44 sm:min-w-56 bg-brand-action text-white font-medium sm:font-semibold p-4 rounded-lg hover:bg-brand-actionHover transition-all duration-300 text-sm sm:text-base transform hover:scale-105"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                        <FileText size={20} />
                      </span>
                      <span className="line-clamp-2 text-left leading-snug">{article.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-brand-surfaceAlt border border-brand-accent/30 rounded-lg p-5 text-center text-brand-muted">
                No subscribed articles yet.
              </div>
            )}
          </section>
        )}

        {isPlayer && (
          <section className="bg-gradient-to-r from-brand-surface to-brand-surfaceAlt rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md p-4 sm:p-6 lg:p-8 border-l-4 border-brand-accent">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-brand-ink">Your Coaches</h2>
                <p className="text-sm text-brand-muted mt-2">
                  Start a live coaching chess game with one of your subscribed coaches.
                </p>
              </div>
              <button
                onClick={() => navigate(`/player/${details._id}/profile`)}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-action text-white font-semibold rounded-lg transition-all duration-300 hover:bg-brand-actionHover focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50 text-sm"
              >
                View My Coaches
              </button>
            </div>

            {subscribedCoaches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subscribedCoaches.map((coach) => {
                  const coachUserId = coach.user?._id || coach._id;
                  const coachName = coach.UserName || coach.user?.UserName || "Coach";

                  return (
                    <div key={coach._id || coachUserId} className="bg-brand-surface/80 border border-brand-accent/50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={coach.imageUrl || "/pngtree-chess-rook-front-view-png-image_7505306-2460555070.png"}
                          alt={coachName}
                          className="h-14 w-14 rounded-lg object-cover border border-brand-success/50 bg-brand-surfaceAlt"
                        />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-brand-ink truncate">{coachName}</h3>
                          <p className="text-xs text-brand-accent mt-1">Subscribed coach</p>
                          <p className="text-xs text-brand-muted mt-1">Rating: {coach.rating || "N/A"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/ChessBoard?mode=coaching&coachId=${coachUserId}&studentId=${details._id}`)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-action px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-brand-actionHover focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-opacity-50"
                      >
                        <Radio size={16} />
                        Start Live Game
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-brand-surface/80 border border-brand-accent/30 rounded-lg p-5 text-center">
                <p className="text-brand-muted mb-3">No subscribed coaches found.</p>
                <button
                  onClick={() => navigate('/CoachesAvailable')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-success px-4 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-green-600"
                >
                  <Users size={16} />
                  Find Coach
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default HomePage;




