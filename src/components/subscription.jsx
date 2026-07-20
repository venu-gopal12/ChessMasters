// Purpose: React UI component for the Subscription experience.
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSelector} from 'react-redux';
import { chessMastersBackend } from '../../config.js';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SubscriptionChart = () => {
  const coachId = useSelector((state) => state.user.userId);
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [subscriptionData, setSubscriptionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to process subscription data
  const processSubscriptions = (subscribers) => {
    const years = {};
    
    subscribers.forEach(sub => {
      const date = new Date(sub.subscribedAt);
      const year = date.getFullYear();
      const month = date.getMonth();

      if (!years[year]) {
        years[year] = new Array(12).fill(0);
      }
      years[year][month]++;
    });

    return years;
  };

  // Generate a unique color for each year
  const generateColor = (index) => {
    const colors = [
      { bg: 'rgba(255, 99, 132, 0.8)', border: 'rgb(255, 99, 132)' },
      { bg: 'rgba(54, 162, 235, 0.8)', border: 'rgb(54, 162, 235)' },
      { bg: 'rgba(255, 206, 86, 0.8)', border: 'rgb(255, 206, 86)' },
      { bg: 'rgba(75, 192, 192, 0.8)', border: 'rgb(75, 192, 192)' },
      { bg: 'rgba(153, 102, 255, 0.8)', border: 'rgb(153, 102, 255)' },
      { bg: 'rgba(255, 159, 64, 0.8)', border: 'rgb(255, 159, 64)' }
    ];
    return colors[index % colors.length];
  };

  // Fetch subscription data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // const coachId = localStorage.getItem('userId');
        // const token = document.cookie
        //   .split('; ')
        //   .find(row => row.startsWith('authorization='))
        //   ?.split('=')[1];
    
        // console.log('Coach ID:', coachId, 'Token:', token);
    
        if (!coachId) {
          setError('Authentication required. Please login again.');
          navigate('/');
          return;
        }
    
        const response = await axios.get(
          `${chessMastersBackend}/coach/subscribedPlayers/${coachId}`,
          {
            headers: {
              // 'Authorization': `Bearer ${token}`, // Add Bearer prefix back
              'Content-Type': 'application/json'
            },
            withCredentials: true
          }
        );
    
        const processedData = processSubscriptions(response.data.subscribers);
        setSubscriptionData(processedData);
        
        const years = Object.keys(processedData);
        if (years.length > 0) {
          setSelectedYear(Math.max(...years).toString());
        }
        
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          setError('Session expired or unauthorized. Please login again.');
          navigate('/');
        } else {
          setError(error.response?.data?.message || 'Failed to fetch subscription data');
        }
        setLoading(false);
      }
    };
    

    fetchData();
  }, [navigate]);

  const getChartData = (year) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const yearIndex = Object.keys(subscriptionData)
      .sort()
      .indexOf(year);
    const colors = generateColor(yearIndex);

    return {
      labels: months,
      datasets: [
        {
          label: `Monthly Subscriptions (${year})`,
          data: subscriptionData[year] || new Array(12).fill(0),
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ],
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: window.innerWidth < 640 ? 12 : 14,
            weight: 'bold',
          },
          color: '#D7E0DC',
          padding: window.innerWidth < 640 ? 10 : 20,
        },
      },
      title: {
        display: true,
        text: `Coach Subscriptions Analysis (${selectedYear})`,
        font: {
          size: window.innerWidth < 640 ? 16 : 20,
          weight: 'bold',
        },
        color: '#F8FAFC',
        padding: {
          top: window.innerWidth < 640 ? 5 : 10,
          bottom: window.innerWidth < 640 ? 15 : 30
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(215, 224, 220, 0.18)',
        },
        ticks: {
          color: '#D7E0DC',
          font: {
            size: window.innerWidth < 640 ? 10 : 12,
          },
        }
      },
      y: {
        grid: {
          color: 'rgba(215, 224, 220, 0.18)',
        },
        ticks: {
          color: '#D7E0DC',
          font: {
            size: window.innerWidth < 640 ? 10 : 12,
          },
          stepSize: 1,
        },
        beginAtZero: true,
      },
    },
  };

  // Get available years from the subscription data
  const availableYears = Object.keys(subscriptionData).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt p-4 flex items-center justify-center">
        <div className="text-xl font-semibold text-brand-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto bg-brand-surface rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md sm:shadow-lg lg:shadow-xl overflow-hidden border border-brand-accent/30">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-ink mb-3 sm:mb-4 md:mb-6">
            Subscription Analysis
          </h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-3 sm:mb-4 md:mb-6">
            <label 
              htmlFor="year" 
              className="block text-xs sm:text-sm font-medium text-brand-muted mb-1 sm:mb-2"
            >
              Select Year:
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="block w-full pl-2 sm:pl-3 pr-8 sm:pr-10 py-1.5 sm:py-2 text-sm sm:text-base 
                border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent 
                focus:border-brand-accent rounded-md transition-all duration-200
                bg-white text-gray-800 shadow-sm"
            >
              {availableYears.length > 0 ? (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              ) : (
                <option value="">No subscription data available</option>
              )}
            </select>
          </div>

          {availableYears.length > 0 ? (
            <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 mb-4 sm:mb-6 md:mb-8">
              <Bar 
                data={getChartData(selectedYear)} 
                options={options}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="text-center py-10 text-brand-muted">
              No subscription data available to display
            </div>
          )}

          <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-xs sm:text-sm text-brand-muted">
            <p className="hidden sm:block">
              * Hover over the bars to see detailed information
            </p>
            <p className="sm:hidden">
              * Tap on the bars to see detailed information
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionChart;










