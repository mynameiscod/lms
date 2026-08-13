import React from 'react';
import './authSplit.css';

/**
 * The split-screen shell behind CareerPilot login and signup: the pitch on the left,
 * whatever form the page needs on the right.
 *
 * Both auth screens share it so they cannot drift apart — a member who bounces between
 * "log in" and "create account" should not feel like they changed product.
 *
 * On narrow screens the FORM comes first and the pitch follows. Someone who already has
 * an account should not have to scroll past an advert to reach the password box.
 */

/* ─────────────────────────────────────────────────────────────────────────────
 * MARKETING CLAIMS — read before editing.
 *
 * This is a public page that sells a ₹1,599 membership, so every number here is a
 * promise to someone deciding whether to spend money. On 2026-07-30 the partner-college
 * and success-story blocks on the signup page were emptied for exactly this reason:
 * they were placeholder copy from a mockup rather than real relationships.
 *
 * The same test applies to everything below. Each is isolated so it can be corrected in
 * one line, and every block hides itself when emptied rather than breaking the layout.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Floating cards over the illustration. Empty the array to hide them. */
const FLOAT_STATS: { ic: string; tone: string; value: string; label: string }[] = [
  { ic: 'bi-people-fill', tone: 'blue', value: '100K+', label: 'Students' },
  { ic: 'bi-briefcase-fill', tone: 'violet', value: '500+', label: 'Hiring Partners' },
  { ic: 'bi-award-fill', tone: 'amber', value: '95%', label: 'Placement Rate' },
];

/** The social-proof card under the feature list. Set to null to hide it. */
const TRUST_CARD: { headline: string; more: string } | null = {
  headline: '100K+ students trust CodeBegun',
  more: '+10K',
};

/** Employers named in the "our learners get placed at" strip. Empty to hide the strip. */
const PLACED_AT: { name: string; glyph?: string }[] = [
  { name: 'Microsoft', glyph: '⊞' },
  { name: 'amazon' },
  { name: 'Adobe', glyph: 'A' },
  { name: 'Google' },
  { name: 'TATA', glyph: '◈' },
];

/** What the product does. Copy, not claims — safe to edit freely. */
const FEATURES: { ic: string; tone: string; title: string; desc: string }[] = [
  { ic: 'bi-graph-up-arrow', tone: 'blue', title: 'Industry Relevant Courses', desc: 'Curated by experts to make you job ready' },
  { ic: 'bi-code-slash', tone: 'violet', title: 'Practice & Improve', desc: 'DSA, mock tests, projects & real-world challenges' },
  { ic: 'bi-trophy-fill', tone: 'amber', title: 'Placement Support', desc: 'Resume, interviews & referrals to top companies' },
];

const AV_COLORS = ['#2563EB', '#7C3AED', '#059669', '#DB2777'];

/** Trust strip under the form card. */
const BADGES: { ic: string; tone: string; title: string; sub: string }[] = [
  { ic: 'bi-shield-check', tone: 'green', title: 'Secure & Safe', sub: 'Your data is protected' },
  { ic: 'bi-mortarboard-fill', tone: 'blue', title: 'Trusted by 100K+', sub: 'Students across India' },
  { ic: 'bi-headset', tone: 'teal', title: '24/7 Support', sub: "We're here to help" },
];

/**
 * Optional hero photograph. Drop a cut-out PNG at client/public/careerpilot-hero.png
 * and it appears; until then the gradient blob and floating cards stand on their own,
 * so a missing file never leaves a broken image icon on the login screen.
 */
const HERO_PHOTO = '/careerpilot-hero.png';

export const BrandWordmark: React.FC = () => (
  <div className="as-logo">
    <div className="wm">CODE<span className="mk">B</span>BEGUN</div>
    <div className="tag">Build Skills. Crack Interviews. Get Hired.</div>
  </div>
);

const AuthSplit: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="as-page">
    <div className="as-shell">

      {/* ── the pitch ── */}
      <div className="as-left">
        <BrandWordmark />

        <div className="as-hero">
          <h1>Learn Today.<br /><span className="b">Build Tomorrow.</span><br />Lead Your Future.</h1>
          <p className="lead">
            CareerPilot by CodeBegun is your all-in-one platform to learn, practice,
            and get placed in top tech companies.
          </p>

          <div className="as-feats">
            {FEATURES.map(f => (
              <div className="as-feat" key={f.title}>
                <div className={`ic t-${f.tone}`} aria-hidden="true"><i className={`bi ${f.ic}`} /></div>
                <div>
                  <b>{f.title}</b>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {TRUST_CARD && (
            <div className="as-trust">
              <span className="em" aria-hidden="true"><i className="bi bi-star-fill" /></span>
              <div className="tx">
                <b>{TRUST_CARD.headline}</b>
                <div className="as-avs">
                  {AV_COLORS.map((c, i) => (
                    <i key={c} style={{ background: c, zIndex: AV_COLORS.length - i }}>
                      {String.fromCharCode(65 + i)}
                    </i>
                  ))}
                  <span className="more">{TRUST_CARD.more}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* illustration — decorative only, hidden from screen readers */}
        <div className="as-art" aria-hidden="true">
          <div className="as-arc" />
          <div className="as-blob" />
          <img
            className="as-photo" src={HERO_PHOTO} alt=""
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="as-spark" style={{ left: 18, top: 96, fontSize: 16 }}>✦</span>
          <span className="as-spark" style={{ right: 34, top: 148 }}>✦</span>
          <span className="as-spark" style={{ left: 44, bottom: 128, fontSize: 11 }}>✦</span>
          <span className="as-spark" style={{ right: 12, bottom: 178, fontSize: 15 }}>✦</span>
        </div>

        {!!FLOAT_STATS.length && (
          <div className="as-floats">
            {FLOAT_STATS.map(s => (
              <div className="as-float" key={s.label}>
                <span className={`fi t-${s.tone}`} aria-hidden="true"><i className={`bi ${s.ic}`} /></span>
                <span><b>{s.value}</b><span>{s.label}</span></span>
              </div>
            ))}
          </div>
        )}

        {!!PLACED_AT.length && (
          <div className="as-wave">
            <svg viewBox="0 0 800 92" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,52 C150,4 330,4 470,34 C600,62 700,68 800,44 L800,92 L0,92 Z" fill="#1E6BD6" opacity=".9" />
              <path d="M0,64 C150,20 330,20 470,48 C600,74 700,80 800,58 L800,92 L0,92 Z" fill="#0B2A5B" />
            </svg>
            <div className="as-placed">
              <div className="cap">Our learners get placed at</div>
              <div className="as-marks">
                {PLACED_AT.map(m => (
                  <span className="as-mark" key={m.name}>
                    {m.glyph && <span className="g" aria-hidden="true">{m.glyph}</span>}{m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── the form ── */}
      <div className="as-right">
        <div className="as-form">
          {children}
          <div className="as-badges">
            {BADGES.map(b => (
              <div className="as-badge" key={b.title}>
                <span className={`bdg t-${b.tone}`} aria-hidden="true"><i className={`bi ${b.ic}`} /></span>
                <span><b>{b.title}</b><span>{b.sub}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  </div>
);

/** The small circular brand mark that sits above each form's heading. */
export const FormMark: React.FC = () => (
  <div className="as-mark-circle"><span>B</span></div>
);

export default AuthSplit;
