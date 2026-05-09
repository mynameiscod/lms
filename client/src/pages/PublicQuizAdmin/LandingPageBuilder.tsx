import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';

interface Block {
  id: string;
  type: string;
  order: number;
  config: Record<string, any>;
}

interface Props {
  landingPage: { blocks: Block[]; backToHomeUrl?: string; primaryColor?: string; fontFamily?: string };
  onChange: (val: any) => void;
}

const BLOCK_TYPES = [
  { type: 'hero', label: '🦸 Hero Banner', desc: 'Full-width banner with title, subtitle and CTA' },
  { type: 'about', label: '📖 About Section', desc: 'Text + image with optional button' },
  { type: 'features', label: '⭐ Features / Benefits', desc: 'Icon cards grid' },
  { type: 'testimonials', label: '💬 Testimonials', desc: 'Student success stories' },
  { type: 'stats', label: '📊 Stats / Numbers', desc: 'Key stats like "500+ Placed"' },
  { type: 'faq', label: '❓ FAQ', desc: 'Accordion Q&A section' },
  { type: 'custom_html', label: '🔧 Custom HTML', desc: 'Paste any HTML content' },
];

const DEFAULT_CONFIGS: Record<string, any> = {
  hero: { title: 'Test Your Skills!', subtitle: 'Take our free assessment and get placed faster.', bgColor: '#005897', ctaText: 'Start the Quiz →' },
  about: { heading: 'About This Quiz', text: 'This quiz is designed to test your fundamentals...', imagePosition: 'right' },
  features: { heading: 'Why Take This Quiz?', cards: [{ icon: '🚀', title: 'Free', desc: 'No cost, no account needed' }, { icon: '🏆', title: 'Certificate', desc: 'Get a shareable certificate' }] },
  testimonials: { heading: 'Our Successful Students', stories: [{ name: 'Student Name', company: 'Company', quote: 'This quiz helped me land my dream job!', photo: '' }] },
  stats: { items: [{ label: 'Students Placed', value: '500+' }, { label: 'Companies', value: '100+' }] },
  faq: { heading: 'Frequently Asked Questions', items: [{ question: 'Is this quiz free?', answer: 'Yes, completely free.' }] },
  custom_html: { html: '<p>Add your custom HTML content here</p>' }
};

const LandingPageBuilder: React.FC<Props> = ({ landingPage, onChange }) => {
  const [editingBlock, setEditingBlock] = useState<string | null>(null);

  const update = (partial: Partial<typeof landingPage>) => onChange({ ...landingPage, ...partial });

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: uuid(),
      type,
      order: landingPage.blocks.length,
      config: { ...DEFAULT_CONFIGS[type] }
    };
    update({ blocks: [...landingPage.blocks, newBlock] });
    setEditingBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    update({ blocks: landingPage.blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })) });
    if (editingBlock === id) setEditingBlock(null);
  };

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const blocks = [...landingPage.blocks];
    const idx = blocks.findIndex(b => b.id === id);
    if (dir === 'up' && idx > 0) [blocks[idx - 1], blocks[idx]] = [blocks[idx], blocks[idx - 1]];
    if (dir === 'down' && idx < blocks.length - 1) [blocks[idx], blocks[idx + 1]] = [blocks[idx + 1], blocks[idx]];
    update({ blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  };

  const updateBlockConfig = (id: string, cfg: any) => {
    update({ blocks: landingPage.blocks.map(b => b.id === id ? { ...b, config: cfg } : b) });
  };

  return (
    <div className="lpb-wrap">
      {/* Page-level settings */}
      <div className="card p-3 mb-4">
        <h5 className="mb-3">Page Settings</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Back to Home URL</label>
            <input className="form-control" placeholder="https://your-website.com" value={landingPage.backToHomeUrl || ''} onChange={e => update({ backToHomeUrl: e.target.value })} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Primary Color</label>
            <div className="d-flex gap-2 align-items-center">
              <input type="color" className="form-control form-control-color" value={landingPage.primaryColor || '#005897'} onChange={e => update({ primaryColor: e.target.value })} />
              <input className="form-control" value={landingPage.primaryColor || '#005897'} onChange={e => update({ primaryColor: e.target.value })} style={{ width: 100 }} />
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label">Font Family (optional)</label>
            <select className="form-select" value={landingPage.fontFamily || ''} onChange={e => update({ fontFamily: e.target.value })}>
              <option value="">Default</option>
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Poppins', sans-serif">Poppins</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Montserrat', sans-serif">Montserrat</option>
            </select>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Block list */}
        <div className="col-md-7">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0">Sections ({landingPage.blocks.length})</h5>
          </div>

          {landingPage.blocks.length === 0 && (
            <div className="lpb-empty">Add sections from the right panel to build your landing page.</div>
          )}

          {landingPage.blocks.map((block, idx) => (
            <div key={block.id} className={`lpb-block-row${editingBlock === block.id ? ' editing' : ''}`}>
              <div className="lpb-block-info" onClick={() => setEditingBlock(editingBlock === block.id ? null : block.id)}>
                <span className="lpb-block-type-icon">{BLOCK_TYPES.find(b => b.type === block.type)?.label.split(' ')[0]}</span>
                <div>
                  <div className="lpb-block-label">{BLOCK_TYPES.find(b => b.type === block.type)?.label.slice(2) || block.type}</div>
                  <div className="lpb-block-preview">{block.config.title || block.config.heading || block.type}</div>
                </div>
              </div>
              <div className="lpb-block-controls">
                <button className="btn btn-xs btn-outline-secondary" onClick={() => moveBlock(block.id, 'up')} disabled={idx === 0}>↑</button>
                <button className="btn btn-xs btn-outline-secondary" onClick={() => moveBlock(block.id, 'down')} disabled={idx === landingPage.blocks.length - 1}>↓</button>
                <button className="btn btn-xs btn-outline-danger" onClick={() => removeBlock(block.id)}>✕</button>
              </div>

              {editingBlock === block.id && (
                <div className="lpb-block-editor" onClick={e => e.stopPropagation()}>
                  <BlockConfigEditor type={block.type} config={block.config} onChange={cfg => updateBlockConfig(block.id, cfg)} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add block palette */}
        <div className="col-md-5">
          <h5 className="mb-3">Add Section</h5>
          <div className="lpb-palette">
            {BLOCK_TYPES.map(bt => (
              <div key={bt.type} className="lpb-palette-item" onClick={() => addBlock(bt.type)}>
                <div className="lpb-palette-label">{bt.label}</div>
                <div className="lpb-palette-desc">{bt.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Per-block config editors ─────────────────────────────────────────────────

const BlockConfigEditor: React.FC<{ type: string; config: any; onChange: (c: any) => void }> = ({ type, config, onChange }) => {
  const set = (key: string, val: any) => onChange({ ...config, [key]: val });

  switch (type) {
    case 'hero': return (
      <div className="row g-2">
        <div className="col-12"><label className="form-label">Title</label><input className="form-control" value={config.title || ''} onChange={e => set('title', e.target.value)} /></div>
        <div className="col-12"><label className="form-label">Subtitle</label><textarea className="form-control" rows={2} value={config.subtitle || ''} onChange={e => set('subtitle', e.target.value)} /></div>
        <div className="col-6"><label className="form-label">Background Color</label><div className="d-flex gap-2"><input type="color" className="form-control form-control-color" value={config.bgColor || '#005897'} onChange={e => set('bgColor', e.target.value)} /><input className="form-control" value={config.bgColor || ''} onChange={e => set('bgColor', e.target.value)} /></div></div>
        <div className="col-6"><label className="form-label">Background Image URL (optional)</label><input className="form-control" placeholder="https://..." value={config.bgImage || ''} onChange={e => set('bgImage', e.target.value)} /></div>
        <div className="col-6"><label className="form-label">CTA Button Text</label><input className="form-control" value={config.ctaText || ''} onChange={e => set('ctaText', e.target.value)} /></div>
        <div className="col-6"><label className="form-label">Text Color</label><input type="color" className="form-control form-control-color" value={config.textColor || '#ffffff'} onChange={e => set('textColor', e.target.value)} /></div>
      </div>
    );

    case 'about': return (
      <div className="row g-2">
        <div className="col-12"><label className="form-label">Heading</label><input className="form-control" value={config.heading || ''} onChange={e => set('heading', e.target.value)} /></div>
        <div className="col-12"><label className="form-label">Text Content</label><textarea className="form-control" rows={4} value={config.text || ''} onChange={e => set('text', e.target.value)} /></div>
        <div className="col-6"><label className="form-label">Image URL</label><input className="form-control" value={config.image || ''} onChange={e => set('image', e.target.value)} /></div>
        <div className="col-6"><label className="form-label">Image Position</label><select className="form-select" value={config.imagePosition || 'right'} onChange={e => set('imagePosition', e.target.value)}><option value="left">Left</option><option value="right">Right</option></select></div>
        <div className="col-6"><label className="form-label">Button Text (optional)</label><input className="form-control" value={config.buttonText || ''} onChange={e => set('buttonText', e.target.value)} /></div>
        <div className="col-6"><label className="form-label">Button URL</label><input className="form-control" value={config.buttonUrl || ''} onChange={e => set('buttonUrl', e.target.value)} /></div>
      </div>
    );

    case 'features': return (
      <div>
        <label className="form-label">Heading</label>
        <input className="form-control mb-2" value={config.heading || ''} onChange={e => set('heading', e.target.value)} />
        <label className="form-label">Feature Cards</label>
        {(config.cards || []).map((card: any, i: number) => (
          <div key={i} className="lpb-array-item">
            <input className="form-control form-control-sm mb-1" placeholder="Icon (emoji)" value={card.icon || ''} onChange={e => { const c = [...config.cards]; c[i] = { ...c[i], icon: e.target.value }; set('cards', c); }} />
            <input className="form-control form-control-sm mb-1" placeholder="Title" value={card.title || ''} onChange={e => { const c = [...config.cards]; c[i] = { ...c[i], title: e.target.value }; set('cards', c); }} />
            <input className="form-control form-control-sm" placeholder="Description" value={card.desc || ''} onChange={e => { const c = [...config.cards]; c[i] = { ...c[i], desc: e.target.value }; set('cards', c); }} />
            <button className="btn btn-xs btn-outline-danger mt-1" onClick={() => set('cards', config.cards.filter((_: any, j: number) => j !== i))}>Remove</button>
          </div>
        ))}
        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => set('cards', [...(config.cards || []), { icon: '✅', title: '', desc: '' }])}>+ Add Card</button>
      </div>
    );

    case 'testimonials': return (
      <div>
        <label className="form-label">Heading</label>
        <input className="form-control mb-2" value={config.heading || ''} onChange={e => set('heading', e.target.value)} />
        {(config.stories || []).map((s: any, i: number) => (
          <div key={i} className="lpb-array-item">
            <input className="form-control form-control-sm mb-1" placeholder="Name" value={s.name || ''} onChange={e => { const arr = [...config.stories]; arr[i] = { ...arr[i], name: e.target.value }; set('stories', arr); }} />
            <input className="form-control form-control-sm mb-1" placeholder="Company" value={s.company || ''} onChange={e => { const arr = [...config.stories]; arr[i] = { ...arr[i], company: e.target.value }; set('stories', arr); }} />
            <textarea className="form-control form-control-sm mb-1" rows={2} placeholder="Quote" value={s.quote || ''} onChange={e => { const arr = [...config.stories]; arr[i] = { ...arr[i], quote: e.target.value }; set('stories', arr); }} />
            <input className="form-control form-control-sm" placeholder="Photo URL (optional)" value={s.photo || ''} onChange={e => { const arr = [...config.stories]; arr[i] = { ...arr[i], photo: e.target.value }; set('stories', arr); }} />
            <button className="btn btn-xs btn-outline-danger mt-1" onClick={() => set('stories', config.stories.filter((_: any, j: number) => j !== i))}>Remove</button>
          </div>
        ))}
        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => set('stories', [...(config.stories || []), { name: '', company: '', quote: '', photo: '' }])}>+ Add Story</button>
      </div>
    );

    case 'stats': return (
      <div>
        {(config.items || []).map((item: any, i: number) => (
          <div key={i} className="d-flex gap-2 mb-2 align-items-center">
            <input className="form-control form-control-sm" placeholder="Value e.g. 500+" value={item.value || ''} onChange={e => { const a = [...config.items]; a[i] = { ...a[i], value: e.target.value }; set('items', a); }} />
            <input className="form-control form-control-sm" placeholder="Label e.g. Students Placed" value={item.label || ''} onChange={e => { const a = [...config.items]; a[i] = { ...a[i], label: e.target.value }; set('items', a); }} />
            <button className="btn btn-xs btn-outline-danger" onClick={() => set('items', config.items.filter((_: any, j: number) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => set('items', [...(config.items || []), { value: '', label: '' }])}>+ Add Stat</button>
      </div>
    );

    case 'faq': return (
      <div>
        <label className="form-label">Heading</label>
        <input className="form-control mb-2" value={config.heading || ''} onChange={e => set('heading', e.target.value)} />
        {(config.items || []).map((item: any, i: number) => (
          <div key={i} className="lpb-array-item">
            <input className="form-control form-control-sm mb-1" placeholder="Question" value={item.question || ''} onChange={e => { const a = [...config.items]; a[i] = { ...a[i], question: e.target.value }; set('items', a); }} />
            <textarea className="form-control form-control-sm" rows={2} placeholder="Answer" value={item.answer || ''} onChange={e => { const a = [...config.items]; a[i] = { ...a[i], answer: e.target.value }; set('items', a); }} />
            <button className="btn btn-xs btn-outline-danger mt-1" onClick={() => set('items', config.items.filter((_: any, j: number) => j !== i))}>Remove</button>
          </div>
        ))}
        <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => set('items', [...(config.items || []), { question: '', answer: '' }])}>+ Add FAQ</button>
      </div>
    );

    case 'custom_html': return (
      <div>
        <label className="form-label">HTML Content</label>
        <textarea className="form-control font-monospace" rows={8} value={config.html || ''} onChange={e => set('html', e.target.value)} />
        <div className="form-text">Paste any HTML. This renders as-is on the landing page.</div>
      </div>
    );

    default: return <div>Unknown block type</div>;
  }
};

export default LandingPageBuilder;
