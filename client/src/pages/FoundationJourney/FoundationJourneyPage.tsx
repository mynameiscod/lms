/**
 * Route wrapper for My Foundation Journey.
 *
 * The student comes from the session, never from the URL. Reading an id out of the address bar
 * would make one student's skill-by-skill weakness profile reachable by editing it — the server
 * refuses that, but a client that asks for it at all is one server bug away from leaking.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import FoundationJourney from './index';

const FoundationJourneyPage: React.FC = () => {
  const { user } = useAuth();
  const { curriculumId = '' } = useParams<{ curriculumId: string }>();

  const studentId = String((user as any)?.id || (user as any)?._id || '');

  if (!studentId || !curriculumId) {
    return (
      <div style={{ padding: 24 }}>
        <p>We could not work out which journey to show. Try opening it from your learning plan.</p>
      </div>
    );
  }

  return <FoundationJourney studentId={studentId} curriculumId={curriculumId} />;
};

export default FoundationJourneyPage;
