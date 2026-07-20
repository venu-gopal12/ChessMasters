// Purpose: React UI component for the Article Update experience.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { chessMastersBackend } from '../../config.js';

const ArticleUpdate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch article data
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await axios.get(`${chessMastersBackend}/coach/ArticleDetail/${id}`, {
          withCredentials: true
        });
        
        setArticle(response.data);
        setFormData({
          title: response.data.title,
          content: response.data.content
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching article:', error);
        setError('Failed to load article details. Please try again.');
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      // Check file type
      const fileType = selectedFile.type;
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      
      // Check file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      
      if (!validTypes.includes(fileType)) {
        setError('Please select a PDF or DOCX file.');
        e.target.value = ''; // Reset file input
        return;
      }
      
      if (selectedFile.size > maxSize) {
        setError('File size exceeds 10MB limit.');
        e.target.value = ''; // Reset file input
        return;
      }
      
      setFile(selectedFile);
      setError(''); // Clear any previous errors
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);
    setUploadProgress(0);
    // Create form data for file upload
    const updateData = new FormData();
    updateData.append('title', formData.title);
    updateData.append('content', formData.content);
    if (file) {
      updateData.append('file', file);
    }

    try {
      console.log('Sending update request with data:', {
        title: formData.title,
        content: formData.content,
        hasFile: !!file
      });
      
      const response = await axios.put(
        `${chessMastersBackend}/coach/article/${id}`,
        updateData,
        {
          headers: { 
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true,
          onUploadProgress: (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded * 100) / event.total));
            }
          }
        }
      );

      console.log('Update response:', response.data);
      setSuccessMessage('Article updated successfully!');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate(`/coach/${article.coach}/CoachDashboard`);
      }, 10);
    } catch (error) {
      console.error('Error updating article:', error.response?.data || error);
      setError(error.response?.data?.message || 'Failed to update article. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/coach/${article.coach}/CoachDashboard`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-brand-ink"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-page to-brand-pageAlt py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-brand-surface rounded-xl shadow-lg overflow-hidden border border-brand-accent/30">
        <div className="bg-brand-action px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Update Article</h1>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              {successMessage}
            </div>
          )}
          
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-brand-ink mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-brand-accent/40 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent bg-white text-gray-800"
            />
          </div>
          
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-brand-ink mb-2">
              Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={8}
              className="mt-1 block w-full px-3 py-2 border border-brand-accent/40 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent bg-white text-gray-800"
            />
          </div>
          
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-brand-ink mb-2">
              Update File (Optional)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="mt-1 block w-full px-3 py-2 border border-brand-accent/40 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent bg-white text-gray-800"
            />
            <p className="mt-1 text-sm text-brand-muted">
              Current file: {article.filePath.split(/[\/\\]/).pop()}
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              Only PDF or DOCX files up to 10MB are accepted
            </p>
          </div>
          
          {isSubmitting && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-surfaceAlt">
                <div
                  className="h-full bg-brand-action transition-all"
                  style={{ width: `${uploadProgress || 10}%` }}
                />
              </div>
              <p className="text-sm text-brand-muted">Uploading... {uploadProgress}%</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-action hover:bg-brand-actionHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent"
            >
              {isSubmitting ? 'Updating...' : 'Update Article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArticleUpdate; 






