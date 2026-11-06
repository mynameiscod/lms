import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import './core/theme/codebegun-theme.css';
import './core/theme/visualizer-scoped.css';
import './core/visualizerLight.css';
import DsaVisualizerHub from './core/DsaVisualizerHub';

/**
 * DSA Visualizer, ported from DevNexus with the CodeBegun palette.
 *
 * Categories: searching, sorting and coding patterns. Data Structures and Bit Manipulation are
 * on hold for a redesign (see ON_HOLD_CATEGORIES in core/visualizerTopics.ts).
 *
 * Navigation lives in the query string (?category=&topic=), so reload, Back and shared links
 * open the same screen. ?view=playground opens the worker playground.
 */
const Playground = lazy(() => import('./core/VisualizerWorkspace'));

const DsaVisualizerPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  if (params.get('view') === 'playground') {
    return <div className="visualizer-theme"><Suspense fallback={<p role="status">Opening the playground…</p>}><Playground /></Suspense></div>;
  }
  return (
    <div className="visualizer-theme">
      <DsaVisualizerHub
        selection={{ category: params.get('category') ?? undefined, topic: params.get('topic') ?? undefined }}
        onNavigate={next => {
          const updated = new URLSearchParams(params);
          ['category', 'topic', 'view'].forEach(key => updated.delete(key));
          if (next.category) updated.set('category', next.category);
          if (next.topic) updated.set('topic', next.topic);
          setParams(updated);
        }}
      />
    </div>
  );
};

export default DsaVisualizerPage;
