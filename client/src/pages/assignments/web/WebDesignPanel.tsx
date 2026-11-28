import React, { useState } from 'react';
import { WebAssignmentConfig, WebCheckResult, googleFontsLink, copyText, absoluteAssetUrl } from './webStack';

/**
 * The design brief as a student (or a trainer marking) sees it: the mockups to match, the images to use
 * with a copy button for each link, the palette as swatches, the fonts with their <link> line, and the
 * checklist — ticked or crossed when there are results.
 */
const WebDesignPanel: React.FC<{
  web: WebAssignmentConfig;
  results?: WebCheckResult[];
  /** Hide the checklist (it is shown elsewhere on that screen). */
  hideChecklist?: boolean;
}> = ({ web, results, hideChecklist }) => {
  const [copied, setCopied] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    if (await copyText(text)) { setCopied(key); window.setTimeout(() => setCopied(c => (c === key ? '' : c)), 1400); }
  };
  const fontLink = googleFontsLink(web.fonts || []);
  const resultOf = (id: string) => results?.find(r => r.id === id);
  const copyBtn = (k: string, text: string, label = 'Copy') => (
    <button type="button" className={`wd-copy${copied === k ? ' done' : ''}`} onClick={() => copy(k, text)}>
      <i className={`bi ${copied === k ? 'bi-check2' : 'bi-clipboard'}`} aria-hidden /> {copied === k ? 'Copied' : label}
    </button>
  );

  return (
    <div className="wd">
      {web.brief?.trim() && (
        <section className="wd-sec">
          <h4><i className="bi bi-card-text" aria-hidden /> Design brief</h4>
          <div className="wd-brief">{web.brief}</div>
        </section>
      )}

      {(web.referenceImages || []).length > 0 && (
        <section className="wd-sec">
          <h4><i className="bi bi-image" aria-hidden /> Match this design</h4>
          <div className="wd-refs">
            {web.referenceImages.map((r, i) => (
              <figure key={i} className="wd-ref">
                <button type="button" onClick={() => setZoom(absoluteAssetUrl(r.url))} title="Open full size">
                  <img src={absoluteAssetUrl(r.url)} alt={r.name || `Reference ${i + 1}`} loading="lazy" />
                </button>
                <figcaption>{r.name || `Reference ${i + 1}`}{r.note ? ` — ${r.note}` : ''}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {(web.assets || []).length > 0 && (
        <section className="wd-sec">
          <h4><i className="bi bi-images" aria-hidden /> Images to use</h4>
          <p className="wd-hint">Copy a link into <code>&lt;img src="…"&gt;</code> or a CSS <code>url(…)</code>.</p>
          <ul className="wd-assets">
            {web.assets.map((a, i) => {
              const url = absoluteAssetUrl(a.url);
              return (
                <li key={i}>
                  <img src={url} alt="" loading="lazy" />
                  <div className="wd-asset-main">
                    <strong>{a.name || `Image ${i + 1}`}</strong>
                    {a.note && <span>{a.note}</span>}
                    <code title={url}>{url}</code>
                  </div>
                  {copyBtn(`a${i}`, url, 'Copy link')}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(web.colors || []).length > 0 && (
        <section className="wd-sec">
          <h4><i className="bi bi-palette" aria-hidden /> Colours</h4>
          <div className="wd-colors">
            {web.colors.map((c, i) => (
              <button key={i} type="button" className="wd-color" onClick={() => copy(`c${i}`, c.hex)} title="Copy the colour code">
                <span className="wd-swatch" style={{ background: c.hex }} />
                <span className="wd-color-text"><strong>{c.name || 'Colour'}</strong><code>{copied === `c${i}` ? 'Copied' : c.hex}</code></span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(web.fonts || []).length > 0 && (
        <section className="wd-sec">
          <h4><i className="bi bi-fonts" aria-hidden /> Fonts</h4>
          <div className="wd-fonts">
            {web.fonts.map((f, i) => (
              <div key={i} className="wd-font">
                <strong>{f.family}</strong>
                <span>weights {f.weights.replace(/;/g, ', ')}</span>
                {copyBtn(`f${i}`, `font-family: '${f.family}', sans-serif;`, 'Copy CSS')}
              </div>
            ))}
          </div>
          {fontLink && (
            <div className="wd-snippet">
              <code>{fontLink}</code>
              {copyBtn('fl', fontLink, 'Copy <link>')}
            </div>
          )}
        </section>
      )}

      {!hideChecklist && (web.requirements || []).length > 0 && (
        <section className="wd-sec">
          <h4><i className="bi bi-list-check" aria-hidden /> Your page must have</h4>
          <ul className="wd-checks">
            {web.requirements.map(r => {
              const res = resultOf(r.id);
              return (
                <li key={r.id} className={res ? (res.passed ? 'ok' : 'no') : ''}>
                  <i className={`bi ${res ? (res.passed ? 'bi-check-circle-fill' : 'bi-x-circle-fill') : 'bi-circle'}`} aria-hidden />
                  <span>{r.text}{res && !res.passed && res.detail ? <em> — {res.detail}</em> : null}</span>
                  <b>{r.points} pt{r.points === 1 ? '' : 's'}</b>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {zoom && (
        <div className="wd-zoom" role="dialog" aria-label="Reference image" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Reference, full size" />
          <button type="button" aria-label="Close"><i className="bi bi-x-lg" /></button>
        </div>
      )}
    </div>
  );
};

export default WebDesignPanel;
