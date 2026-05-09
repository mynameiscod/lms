import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicQuizApi } from '../../api';
import PublicLandingPage from './PublicLandingPage';
import RegistrationForm from './RegistrationForm';
import PublicQuizTaking from './PublicQuizTaking';
import PublicQuizResults from './PublicQuizResults';
import './PublicQuizPage.css';

type Stage = 'loading' | 'landing' | 'register' | 'quiz' | 'results' | 'already_taken' | 'error';

const PublicQuizPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [pageData, setPageData] = useState<any>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!slug) { setStage('error'); setErrorMsg('Invalid quiz link'); return; }
    publicQuizApi.getPage(slug).then(data => {
      if (data.message) { setErrorMsg(data.message); setStage('error'); return; }
      setPageData(data);
      // If no landing page blocks, skip straight to register
      if (!data.landingPage?.blocks?.length) {
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
          onRegistered={(subId, canTake) => {
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

export default PublicQuizPage;
