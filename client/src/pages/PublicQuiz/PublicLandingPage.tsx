import React, { useState } from 'react';

interface Block {
  id: string;
  type: string;
  order: number;
  config: Record<string, any>;
}

interface Props {
  pageData: any;
  onStartQuiz: () => void;
}

const PublicLandingPage: React.FC<Props> = ({ pageData, onStartQuiz }) => {
  const { landingPage, title, quiz } = pageData;
  const primary = landingPage?.primaryColor || '#005897';
  const blocks: Block[] = [...(landingPage?.blocks || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="pq-landing">
      {/* Top nav bar */}
      <nav className="pq-landing-nav" style={{ background: primary }}>
        <div className="pq-landing-nav-inner">
          <div className="pq-landing-brand">{title}</div>
          <div className="d-flex gap-2 align-items-center">
            {landingPage?.backToHomeUrl && (
              <a href={landingPage.backToHomeUrl} className="pq-nav-home-link">← Home</a>
            )}
            <button className="btn pq-nav-cta-btn" style={{ background: '#fff', color: primary }} onClick={onStartQuiz}>
              Take the Quiz →
            </button>
          </div>
        </div>
      </nav>

      {/* Blocks */}
      {blocks.map(block => (
        <BlockRenderer key={block.id} block={block} primary={primary} onStartQuiz={onStartQuiz} quiz={quiz} />
      ))}

      {/* Floating CTA */}
      <div className="pq-landing-fixed-cta">
        <div className="pq-landing-fixed-inner">
          <div>
            <div className="pq-fixed-title">{title}</div>
            <div className="pq-fixed-meta">{quiz?.totalQuestions} questions · {quiz?.totalTime} mins</div>
          </div>
          <button className="btn pq-cta-btn" style={{ background: primary }} onClick={onStartQuiz}>
            Start the Quiz →
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Block renderer ───────────────────────────────────────────────────────────

const BlockRenderer: React.FC<{ block: Block; primary: string; onStartQuiz: () => void; quiz: any }> = ({ block, primary, onStartQuiz, quiz }) => {
  const { type, config } = block;

  switch (type) {
    case 'hero': return (
      <section
        className="pq-hero"
        style={{
          background: config.bgImage
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${config.bgImage}) center/cover`
            : config.bgColor || primary,
          color: config.textColor || '#fff'
        }}
      >
        <div className="pq-hero-content">
          <h1 className="pq-hero-title">{config.title}</h1>
          {config.subtitle && <p className="pq-hero-subtitle">{config.subtitle}</p>}
          <div className="pq-hero-meta">
            <span>📝 {quiz?.totalQuestions} Questions</span>
            <span>⏱ {quiz?.totalTime} Minutes</span>
            <span>⭐ {quiz?.totalMarks} Marks</span>
          </div>
          <button className="btn pq-hero-cta" onClick={onStartQuiz}>{config.ctaText || 'Start Quiz →'}</button>
        </div>
      </section>
    );

    case 'about': return (
      <section className="pq-about pq-section">
        <div className="pq-container">
          <div className={`pq-about-inner ${config.imagePosition === 'left' ? 'reverse' : ''}`}>
            <div className="pq-about-text">
              {config.heading && <h2 className="pq-section-heading">{config.heading}</h2>}
              <p>{config.text}</p>
              {config.buttonText && (
                <a href={config.buttonUrl || '#'} className="btn" style={{ background: primary, color: '#fff', marginTop: 16 }}>
                  {config.buttonText}
                </a>
              )}
            </div>
            {config.image && (
              <div className="pq-about-image">
                <img src={config.image} alt="About" />
              </div>
            )}
          </div>
        </div>
      </section>
    );

    case 'features': return (
      <section className="pq-features pq-section" style={{ background: '#f8fafc' }}>
        <div className="pq-container">
          {config.heading && <h2 className="pq-section-heading text-center">{config.heading}</h2>}
          <div className="pq-features-grid">
            {(config.cards || []).map((card: any, i: number) => (
              <div key={i} className="pq-feature-card">
                <div className="pq-feature-icon">{card.icon}</div>
                <div className="pq-feature-title">{card.title}</div>
                <div className="pq-feature-desc">{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    case 'testimonials': return (
      <section className="pq-testimonials pq-section">
        <div className="pq-container">
          {config.heading && <h2 className="pq-section-heading text-center">{config.heading}</h2>}
          <div className="pq-testimonials-grid">
            {(config.stories || []).map((s: any, i: number) => (
              <div key={i} className="pq-testimonial-card">
                <div className="pq-testimonial-quote">"{s.quote}"</div>
                <div className="pq-testimonial-author">
                  {s.photo && <img src={s.photo} alt={s.name} className="pq-testimonial-photo" />}
                  <div>
                    <div className="pq-testimonial-name">{s.name}</div>
                    <div className="pq-testimonial-company">{s.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    case 'stats': return (
      <section className="pq-stats pq-section" style={{ background: primary }}>
        <div className="pq-container">
          <div className="pq-stats-grid">
            {(config.items || []).map((item: any, i: number) => (
              <div key={i} className="pq-stat-item">
                <div className="pq-stat-value">{item.value}</div>
                <div className="pq-stat-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    case 'faq': return (
      <section className="pq-faq pq-section" style={{ background: '#f8fafc' }}>
        <div className="pq-container pq-container-sm">
          {config.heading && <h2 className="pq-section-heading text-center">{config.heading}</h2>}
          <FAQAccordion items={config.items || []} primary={primary} />
        </div>
      </section>
    );

    case 'custom_html': return (
      <section className="pq-custom-html pq-section">
        <div className="pq-container" dangerouslySetInnerHTML={{ __html: config.html || '' }} />
      </section>
    );

    default: return null;
  }
};

const FAQAccordion: React.FC<{ items: any[]; primary: string }> = ({ items, primary }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="pq-faq-list">
      {items.map((item, i) => (
        <div key={i} className={`pq-faq-item${open === i ? ' open' : ''}`}>
          <div className="pq-faq-q" onClick={() => setOpen(open === i ? null : i)}>
            <span>{item.question}</span>
            <span className="pq-faq-toggle">{open === i ? '−' : '+'}</span>
          </div>
          {open === i && <div className="pq-faq-a">{item.answer}</div>}
        </div>
      ))}
    </div>
  );
};

export default PublicLandingPage;
