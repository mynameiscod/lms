import React from 'react';
import './ShareOnLinkedIn.css';

interface ShareOnLinkedInProps {
  shareToken: string;
  title: string;
  type: 'quiz' | 'assignment' | 'snippet';
  percentage?: number;
}

const ShareOnLinkedIn: React.FC<ShareOnLinkedInProps> = ({ shareToken, title, type, percentage }) => {
  const certUrl = `${window.location.origin}/certificate/${type}/${shareToken}`;

  const handleSharePost = () => {
    const url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(certUrl)}&title=${encodeURIComponent(title)}`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleAddToProfile = () => {
    const now = new Date();
    const scoreText = percentage !== undefined ? ` — ${percentage}%` : '';
    const name = encodeURIComponent(`${title}${scoreText}`);
    const url = [
      'https://www.linkedin.com/profile/add',
      '?startTask=CERTIFICATION_NAME',
      `&name=${name}`,
      `&certUrl=${encodeURIComponent(certUrl)}`,
      `&certId=${shareToken}`,
      `&issueYear=${now.getFullYear()}`,
      `&issueMonth=${now.getMonth() + 1}`,
    ].join('');
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div className="linkedin-share">
      <button className="linkedin-btn linkedin-btn--post" onClick={handleSharePost} title="Share on LinkedIn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        Share on LinkedIn
      </button>
      <button className="linkedin-btn linkedin-btn--profile" onClick={handleAddToProfile} title="Add to LinkedIn profile">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
        </svg>
        Add to Profile
      </button>
    </div>
  );
};

export default ShareOnLinkedIn;
