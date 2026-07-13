import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from "react-redux";
import axios from 'axios';
import { chessMastersBackend } from '../../config.js';

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [fileType, setFileType] = useState('article');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const coachId = useSelector((state) => state.user.userId);

  const handleFileChange = (event) => {
    setSelectedFiles(event.target.files);
    setUploadMessage('');
    setUploadStatus('');
    setUploadProgress(0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedFiles) {
      const formData = new FormData();
      formData.append('file', selectedFiles[0]);
      formData.append('title', title);
      formData.append('content', content);

      try {
        setIsUploading(true);
        setUploadProgress(0);
        const endpoint = fileType === 'article'
          ? `${chessMastersBackend}/coach/addArticle`
          : `${chessMastersBackend}/coach/addVideo`;

        const response = await axios.post(endpoint, formData, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) {
              setUploadProgress(Math.round((event.loaded * 100) / event.total));
            }
          }
        });

        if (response.status >= 200 && response.status < 300) {
          setUploadMessage(`${fileType.charAt(0).toUpperCase() + fileType.slice(1)} uploaded successfully!`);
          setUploadStatus('success');
          setSelectedFiles(null);
          setTitle('');
          setContent('');
        }
      } catch (error) {
        console.error(`Error uploading ${fileType}:`, error);
        setUploadMessage(error.response?.data?.message || `Error uploading ${fileType}.`);
        setUploadStatus('error');
      } finally {
        setIsUploading(false);
      }
    } else {
      setUploadMessage('Please select a file to upload.');
      setUploadStatus('error');
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-12 bg-gradient-to-br from-brand-page to-brand-pageAlt">
      <div className="max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto bg-brand-surface 
                    rounded-xl sm:rounded-2xl shadow-xl border border-brand-accent/30 
                    p-4 sm:p-6 md:p-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-ink mb-4 sm:mb-6 text-center">
          Upload {fileType === 'article' ? 'Article' : 'Video'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm sm:text-base font-medium text-brand-ink mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border-brand-accent/40 shadow-sm 
                       focus:border-brand-accent focus:ring focus:ring-brand-accent/30 
                       focus:ring-opacity-50 bg-white p-2 sm:p-3 text-sm sm:text-base text-gray-800"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm sm:text-base font-medium text-brand-ink mb-1">
              Content/Description
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="4"
              className="mt-1 block w-full rounded-lg border-brand-accent/40 shadow-sm 
                       focus:border-brand-accent focus:ring focus:ring-brand-accent/30 
                       focus:ring-opacity-50 bg-white p-2 sm:p-3 text-sm sm:text-base text-gray-800"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-medium text-brand-ink mb-2">
              Select File
            </label>
            <div className="mt-1 flex justify-center px-4 sm:px-6 pt-4 sm:pt-5 pb-4 sm:pb-6 
                          border-2 border-brand-accent/40 border-dashed rounded-lg bg-brand-surfaceAlt/70">
              <div className="space-y-2 text-center">
                <svg className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-brand-accent" 
                     stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex flex-col sm:flex-row items-center justify-center text-sm text-brand-ink gap-2">
                  <label htmlFor="file-upload" 
                         className="relative cursor-pointer bg-brand-accentSoft rounded-md font-medium 
                                  text-brand-ink hover:text-brand-muted focus-within:outline-none 
                                  focus-within:ring-2 focus-within:ring-offset-2 
                                  focus-within:ring-brand-accent p-2">
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept={fileType === 'article' ? '.pdf,.docx' : 'video/*'}
                      onChange={handleFileChange}
                      required
                      disabled={isUploading}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-sm sm:text-base">or drag and drop</p>
                </div>
                <p className="text-xs sm:text-sm text-brand-muted">
                  {fileType === 'article' ? 'PDF or DOCX up to 10MB' : 'MP4, AVI, or MOV up to 100MB'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-4 bg-brand-accentSoft p-3 sm:p-4 rounded-lg">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="article"
                checked={fileType === 'article'}
                onChange={() => setFileType('article')}
                disabled={isUploading}
                className="form-radio text-brand-ink h-4 w-4 sm:h-5 sm:w-5"
              />
              <span className="ml-2 text-sm sm:text-base text-brand-ink">Article</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="video"
                checked={fileType === 'video'}
                onChange={() => setFileType('video')}
                disabled={isUploading}
                className="form-radio text-brand-ink h-4 w-4 sm:h-5 sm:w-5"
              />
              <span className="ml-2 text-sm sm:text-base text-brand-ink">Video</span>
            </label>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-surfaceAlt">
                <div
                  className="h-full bg-brand-action transition-all"
                  style={{ width: `${uploadProgress || 10}%` }}
                />
              </div>
              <p className="text-center text-sm text-brand-muted">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <button type="submit" 
                  disabled={isUploading}
                  className="w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent 
                           rounded-lg shadow-sm text-sm sm:text-base font-medium text-white 
                           bg-brand-action hover:bg-brand-actionHover focus:outline-none focus:ring-2 
                           focus:ring-offset-2 focus:ring-brand-accent transition duration-150 
                           ease-in-out disabled:cursor-not-allowed disabled:opacity-60">
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        {uploadMessage && (
          <p className={`mt-4 text-sm sm:text-base text-center p-2 sm:p-3 rounded-lg ${
            uploadStatus === 'success'
              ? 'text-green-700 bg-green-100'
              : 'text-red-700 bg-red-100'
          }`}>
            {uploadMessage}
          </p>
        )}

        <Link to={`/coach/${coachId}/CoachDashboard?role=coach`} 
              className="mt-4 sm:mt-6 block text-center">
          <button className="text-brand-ink hover:text-brand-muted bg-brand-accentSoft 
                           px-4 py-2 sm:px-6 sm:py-3 rounded-lg transition duration-150 
                           ease-in-out hover:bg-brand-actionHover text-sm sm:text-base w-full">
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
};

export default FileUpload;





