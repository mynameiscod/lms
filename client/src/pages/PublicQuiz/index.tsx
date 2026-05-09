import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicQuizApi } from '../../api';
import PublicLandingPage from './PublicLandingPage';
import RegistrationForm from './RegistrationForm';
import PublicQuizTaking from './PublicQuizTaking';
import PublicQuizResults from './PublicQuizResults';
import './PublicQuizPage.css';

type Stage = 'loading' | 'landing' | 'register' | 'quiz' | 'results' | 'already_taken' | 'pre_registered' | 'closed' | 'error';

const PublicQuizPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [pageData, setPageData] = useState<any>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [preRegData, setPreRegData] = useState<{ opensAt: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!slug) { setStage('error'); setErrorMsg('Invalid quiz link'); return; }
    publicQuizApi.getPage(slug).then(data => {
      if (data.message) { setErrorMsg(data.message); setStage('error'); return; }
      setPageData(data);
      // Inject Meta Pixel if configured
      if (data.metaPixelId) {
        injectMetaPixel(data.metaPixelId);
      }
      if (!data.isOpen && data.closesAt && new Date(data.closesAt) < new Date()) {
        setStage('closed');
      } else if (!data.landingPage?.blocks?.length) {
        setStage('register');
      } else {
        setStage('landing');
      }
    }).catch(e => { setErrorMsg(e.message); setStage('error'); });
  }, [slug]);

  const primaryColor = pageData?.landingPage?.primaryColor || '#005897';

  if (stage === 'loading') {
    return (
      <div className="pq-public-loading">
        <div className="pq-public-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="pq-public-error">
        <div className="pq-public-error-icon">🔗</div>
        <h2>Quiz Not Available</h2>
        <p>{errorMsg || 'This quiz link is invalid or no longer active.'}</p>
      </div>
    );
  }

  if (stage === 'closed') {
    return (
      <div className="pq-public-already-taken">
        <div className="pq-public-already-icon">🔒</div>
        <h2>Quiz Closed</h2>
        <p>This quiz has ended and is no longer accepting submissions.</p>
        {pageData?.landingPage?.backToHomeUrl && (
          <a href={pageData.landingPage.backToHomeUrl} className="btn btn-primary mt-3">← Back to Home</a>
        )}
      </div>
    );
  }

  if (stage === 'already_taken') {
    return (
      <div className="pq-public-already-taken">
        <div className="pq-public-already-icon">✅</div>
        <h2>Already Submitted</h2>
        <p>You've already taken this quiz. Your form submission has been recorded.<br/>We track repeat interest — thank you for your enthusiasm!</p>
        {pageData?.landingPage?.backToHomeUrl && (
          <a href={pageData.landingPage.backToHomeUrl} className="btn btn-primary mt-3">← Back to Home</a>
        )}
      </div>
    );
  }

  if (stage === 'pre_registered') {
    const opensAt = preRegData?.opensAt ? new Date(preRegData.opensAt) : null;
    return (
      <div className="pq-public-already-taken">
        <div className="pq-public-already-icon">🗓️</div>
        <h2>You're Registered!</h2>
        <p>{preRegData?.message}</p>
        {opensAt && (
          <div className="pq-opens-at-box">
            <strong>Quiz opens:</strong><br />
            {opensAt.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            &nbsp;at&nbsp;
            {opensAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <p className="text-muted small mt-3">Bookmark this page and return when the quiz opens to start immediately.</p>
        {pageData?.landingPage?.backToHomeUrl && (
          <a href={pageData.landingPage.backToHomeUrl} className="btn btn-outline-secondary mt-2">← Back to Home</a>
        )}
      </div>
    );
  }

  return (
    <div className="pq-public-page" style={{ '--pq-primary': primaryColor, fontFamily: pageData?.landingPage?.fontFamily || undefined } as any}>
      {stage === 'landing' && pageData && (
        <PublicLandingPage
          pageData={pageData}
          onStartQuiz={() => setStage('register')}
        />
      )}

      {stage === 'register' && pageData && (
        <RegistrationForm
          title={pageData.title}
          quizInfo={pageData.quiz}
          form={pageData.registrationForm}
          primaryColor={primaryColor}
          slug={slug!}
          onRegistered={(subId, canTake, reason, opensAt, message) => {
            if (reason === 'not_open_yet') {
              setPreRegData({ opensAt: opensAt!, message: message! });
              setStage('pre_registered');
              return;
            }
            if (!canTake) { setStage('already_taken'); return; }
            setSubmissionId(subId);
            setStage('quiz');
          }}
          backToHomeUrl={pageData.landingPage?.backToHomeUrl}
        />
      )}

      {stage === 'quiz' && submissionId && (
        <PublicQuizTaking
          submissionId={submissionId}
          primaryColor={primaryColor}
          onCompleted={() => setStage('results')}
        />
      )}

      {stage === 'results' && submissionId && (
        <PublicQuizResults
          submissionId={submissionId}
          primaryColor={primaryColor}
          backToHomeUrl={pageData?.landingPage?.backToHomeUrl}
        />
      )}
    </div>
  );
};

/** Inject Meta Pixel tracking script (only once per page load) */
function injectMetaPixel(pixelId: string) {
  if ((window as any).__fbqInjected) return;
  (window as any).__fbqInjected = true;
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId.replace(/[^0-9]/g, '')}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
}

export default PublicQuizPage;
