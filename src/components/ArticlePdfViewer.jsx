import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { chessMastersBackend } from '../../config.js';

const ArticlePdfViewer = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const viewerRef = useRef(null);
  const pdfUrl = `${chessMastersBackend}/coach/article/${id}/view`;
  const embeddedPdfUrl = `${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
  const downloadUrl = `${chessMastersBackend}/coach/article/${id}/download`;
  const backPath = location.state?.returnTo || location.state?.articleDetailPath || `/ArticleDetail/${id}`;

  const handleBack = () => {
    navigate(backPath);
  };

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return undefined;

    container.replaceChildren();

    const iframe = document.createElement('iframe');
    iframe.title = 'Article PDF viewer';
    iframe.src = embeddedPdfUrl;
    iframe.className = 'w-full h-full bg-white border-0';
    iframe.setAttribute('allowfullscreen', 'true');

    container.appendChild(iframe);

    return () => {
      if (iframe.parentNode === container) {
        container.removeChild(iframe);
      }
    };
  }, [embeddedPdfUrl]);

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <header className="flex-none flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-900 border-b border-gray-800">
        <button
          type="button"
          onClick={handleBack}
          className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm font-medium"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm font-medium"
          >
            Open PDF
          </a>
          <a
            href={downloadUrl}
            className="px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-sm font-medium"
          >
            Download
          </a>
        </div>
      </header>

      <div ref={viewerRef} className="flex-1 min-h-0 w-full bg-white overflow-hidden" />
    </div>
  );
};

export default ArticlePdfViewer;




