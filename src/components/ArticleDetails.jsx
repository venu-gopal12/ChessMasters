// Purpose: React UI component for the Article Details experience.
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { chessMastersBackend } from '../../config.js';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [article, setArticle] = useState(null);

  const handleBack = () => {
    if (location.state?.returnTo) {
      navigate(location.state.returnTo);
      return;
    }

    navigate(`/coach/${article.coach}/CoachDashboard`);
  };

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`${chessMastersBackend}/coach/ArticleDetail/${id}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setArticle(data);
        } else {
          console.error('Failed to fetch article');
        }
      } catch (error) {
        console.error('Error fetching article:', error);
      }
    };

    fetchArticle();
  }, [id]);

  if (!article) return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt">
      <div className="animate-pulse flex space-x-2 sm:space-x-4">
        <div className="rounded-full bg-brand-action h-8 w-8 sm:h-12 sm:w-12"></div>
        <div className="rounded-full bg-brand-action h-8 w-8 sm:h-12 sm:w-12"></div>
        <div className="rounded-full bg-brand-action h-8 w-8 sm:h-12 sm:w-12"></div>
      </div>
    </div>
  );

  const downloadUrl = `${chessMastersBackend}/coach/article/${article._id}/download`;
  const isPdfArticle = [
    article.fileMimeType,
    article.fileOriginalName,
    article.filePath,
    article.cloudinaryPublicId
  ].filter(Boolean).some(value => (
    value === 'application/pdf' || /\.pdf($|[?#])/i.test(value)
  ));

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt 
                    py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <motion.button
          type="button"
          onClick={handleBack}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="mb-5 inline-flex items-center px-4 py-2 rounded-lg bg-brand-action 
                     text-white font-semibold shadow-md hover:bg-brand-actionHover 
                     focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          Back
        </motion.button>

        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-center mb-6 sm:mb-8 
                     text-brand-ink
                     leading-tight sm:leading-tight lg:leading-tight"
        >
          {article.title}
        </motion.h1>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-brand-surface shadow-lg sm:shadow-xl lg:shadow-2xl rounded-2xl sm:rounded-3xl border border-brand-accent/30
                     overflow-hidden transform hover:scale-105 transition duration-300"
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <p className="text-base sm:text-lg lg:text-xl text-brand-muted leading-relaxed 
                         mb-6 sm:mb-8 whitespace-pre-wrap">
              {article.content}
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 sm:mt-6 lg:mt-8">
              {isPdfArticle && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to={`/article-view/${article._id}`}
                    state={{
                      returnTo: location.state?.returnTo || `/ArticleDetail/${article._id}`,
                      articleDetailPath: `/ArticleDetail/${article._id}`,
                    }}
                    className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 
                             border border-transparent text-sm sm:text-base font-medium 
                             rounded-full shadow-sm text-white 
                             bg-brand-action hover:bg-brand-actionHover 
                             focus:outline-none focus:ring-2 focus:ring-offset-2 
                             focus:ring-brand-accent transition-all duration-300"
                  >
                    View Article
                  </Link>
                </motion.div>
              )}
              <motion.a 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 
                         border border-transparent text-sm sm:text-base font-medium 
                         rounded-full shadow-sm text-white 
                         bg-brand-action hover:bg-brand-actionHover 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 
                         focus:ring-brand-accent transition-all duration-300"
              >
                <svg 
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  >
                  </path>
                </svg>
                <span className="hidden sm:inline">Download Article</span>
                <span className="sm:hidden">Download</span>
              </motion.a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ArticleDetail;





