/**
 * Route wrapper for the skill mapping screen.
 *
 * The curriculum comes from the URL, which is correct here: this is a staff tool operating on a
 * curriculum, and the server checks the permission. That is the opposite of the student journey,
 * where the id must come from the session.
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import SkillMapping from './index';

const SkillMappingPage: React.FC = () => {
  const { curriculumId = '' } = useParams<{ curriculumId: string }>();

  if (!curriculumId) {
    return <div style={{ padding: 24 }}><p>Open this from a curriculum to map its skills.</p></div>;
  }
  return <SkillMapping curriculumId={curriculumId} />;
};

export default SkillMappingPage;
