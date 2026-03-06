import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './OAuthCallback.css';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const provider = searchParams.get('provider') || 'unknown';
    const username = searchParams.get('username');
    const name = searchParams.get('name');

    const providerName = provider === 'github' ? 'GitHub' : provider === 'linkedin' ? 'LinkedIn' : provider;

    if (success === 'true') {
      setStatus('success');
      const displayName = username || name || '';
      setMessage(`Successfully connected your ${providerName} account${displayName ? ` as ${displayName}` : ''}!`);
      
      // Redirect to profile page after 3 seconds
      setTimeout(() => {
        navigate('/profile', { replace: true });
      }, 3000);
    } else if (error) {
      setStatus('error');
      
      // Parse error message
      let errorMessage = `Failed to connect ${providerName} account.`;
      switch (error) {
        case 'missing_params':
          errorMessage = 'Missing required parameters from OAuth provider.';
          break;
        case 'invalid_state':
          errorMessage = 'Invalid state parameter. Please try again.';
          break;
        case 'no_token':
          errorMessage = 'Failed to receive access token from provider.';
          break;
        case 'callback_failed':
          errorMessage = 'OAuth callback processing failed. Please try again.';
          break;
        case 'user_cancelled_login':
        case 'user_cancelled_authorize':
          errorMessage = 'Authorization was cancelled.';
          break;
        default:
          errorMessage = `Error: ${error}`;
      }
      setMessage(errorMessage);
    }
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/profile', { replace: true });
  };

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-card">
        {status === 'loading' && (
          <>
            <div className="loading-spinner"></div>
            <h2>Processing Authorization...</h2>
            <p>Please wait while we complete the connection.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Connection Successful!</h2>
            <p>{message}</p>
            <small className="redirect-notice">Redirecting to your profile in a few seconds...</small>
            <button onClick={handleRetry} className="oauth-callback-btn">
              Go to Profile Now
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2>Connection Failed</h2>
            <p>{message}</p>
            <button onClick={handleRetry} className="oauth-callback-btn">
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
