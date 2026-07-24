import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  assignmentApi, 
  Assignment, 
  AssignmentStatus, 
  AssignmentType, 
  DifficultyLevel 
} from '../../api/assignmentApi';
import { batchApi, userApi } from '../../api';
import AssignmentPreviewModal from '../AssignmentReports/AssignmentPreviewModal';
import { TECH_CATEGORIES, techDef } from '../../config/techCategories';
import './assignments.css';

// Windowed page numbers with ellipses, e.g. 1 … 4 5 [6] 7 8 … 20
const pageNumbers = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 1) return [1];
  const out: (number | '…')[] = [];
  const push = (n: number) => { if (!out.includes(n)) out.push(n); };
  push(1);
  if (page - 1 > 2) out.push('…');
  for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n++) push(n);
  if (page + 1 < totalPages - 1) out.push('…');
  push(totalPages);
  return out;
};

const ActionsDropdown: React.FC<{
  assignment: Assignment;
  onEdit: () => void;
  onPreview: () => void;
  onTry: () => void;
  onPublish: () => void;
  onViewSubmissions: () => void;
  onArchive: () => void;
  onClone: () => void;
  onDelete: () => void;
}> = ({ assignment, onEdit, onPreview, onTry, onPublish, onViewSubmissions, onArchive, onClone, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => setOpen(o => !o);

  // Position the fixed-position menu (portaled to <body>, so it escapes the table's
  // overflow) AFTER it renders — measuring its real height keeps it fully on-screen:
  // opens below when there's room, flips above near the viewport bottom, and clamps
  // so the last rows' menu is never cut off.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const mh = menuRef.current.offsetHeight;
    const mw = menuRef.current.offsetWidth || 200;
    const left = Math.max(8, Math.min(r.right - mw, window.innerWidth - mw - 8));
    const spaceBelow = window.innerHeight - r.bottom;
    let top: number;
    if (spaceBelow >= mh + 8) top = r.bottom + 4;              // room below
    else if (r.top - 4 - mh >= 8) top = r.top - 4 - mh;         // flip above
    else top = Math.max(8, window.innerHeight - mh - 8);        // clamp into view
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { const t = e.target as Node; if (ref.current?.contains(t) || menuRef.current?.contains(t)) return; setOpen(false); };
    const dismiss = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  return (
    <div className="actions-dropdown" ref={ref}>
      <button
        ref={btnRef}
        className="btn btn-icon btn-secondary"
        onClick={toggle}
        title="Actions"
      >
        ⋮
      </button>
      {open && createPortal(
        <div ref={menuRef} className="actions-dropdown-menu" style={{ position: 'fixed', top: pos.top, left: pos.left, right: 'auto', maxHeight: '85vh', overflowY: 'auto', zIndex: 3000 }}>
          <button onClick={() => { onPreview(); setOpen(false); }}>👁️ Preview</button>
          <button onClick={() => { onTry(); setOpen(false); }}>🧪 Try it (as student)</button>
          <button onClick={() => { onEdit(); setOpen(false); }}>✏️ Edit</button>
          {assignment.status === AssignmentStatus.DRAFT && (
            <button onClick={() => { onPublish(); setOpen(false); }}>🚀 Publish</button>
          )}
          {assignment.status === AssignmentStatus.PUBLISHED && (
            <>
              <button onClick={() => { onViewSubmissions(); setOpen(false); }}>👥 View Submissions</button>
              <button onClick={() => { onArchive(); setOpen(false); }}>📦 Archive</button>
            </>
          )}
          <button onClick={() => { onClone(); setOpen(false); }}>📋 Clone</button>
          <button className="danger" onClick={() => { onDelete(); setOpen(false); }}>🗑️ Delete</button>
        </div>,
        document.body,
      )}
    </div>
  );
};

const AdminAssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ success: any[]; failed: any[] } | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [techFilter, setTechFilter] = useState<string>('');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [lessonFilter, setLessonFilter] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'none' | 'language' | 'topic' | 'lesson'>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [createdByFilter, setCreatedByFilter] = useState<string>('');
  const [batches, setBatches] = useState<{ _id: string; name: string }[]>([]);
  const [creators, setCreators] = useState<{ _id: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [stats, setStats] = useState<{ totalAssignments: number; publishedAssignments: number; draftAssignments: number; byType?: { _id: string; count: number }[] } | null>(null);
  // Lightweight full set for the library meta (stat cards, tech chips, topic/lesson options).
  const [allForMeta, setAllForMeta] = useState<Assignment[]>([]);

  // Preview modal
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const SORTS: Record<string, { sortBy: string; sortOrder: 'asc' | 'desc'; label: string }> = {
    newest: { sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest First' },
    oldest: { sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest First' },
    due: { sortBy: 'dueDate', sortOrder: 'asc', label: 'Due Date' },
    points: { sortBy: 'totalPoints', sortOrder: 'desc', label: 'Highest Points' },
    title: { sortBy: 'title', sortOrder: 'asc', label: 'Title (A–Z)' },
  };
  const hasFilters = !!(search || statusFilter || typeFilter || difficultyFilter || batchFilter || languageFilter || techFilter || createdByFilter);
  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setTypeFilter(''); setDifficultyFilter('');
    setBatchFilter(''); setLanguageFilter(''); setTechFilter(''); setCreatedByFilter(''); setPage(1);
  };

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const sort = SORTS[sortOption] || SORTS.newest;
      // In grouped mode we render all matching items in collapsible sections, so
      // fetch a large page instead of paginating.
      const grouped = groupBy !== 'none';
      const response = await assignmentApi.list({
        page: grouped ? 1 : page,
        limit: grouped ? 500 : limit,
        search: search || undefined,
        status: statusFilter as AssignmentStatus || undefined,
        type: typeFilter as AssignmentType || undefined,
        difficulty: difficultyFilter as DifficultyLevel || undefined,
        batch: batchFilter || undefined,
        language: languageFilter || undefined,
        primaryTech: techFilter || undefined,
        topics: topicFilter || undefined,
        chapter: lessonFilter || undefined,
        createdBy: createdByFilter || undefined,
        sortBy: sort.sortBy,
        sortOrder: sort.sortOrder
      });
      setAssignments(response.data.data);
      setTotalPages(response.data.pagination.pages);
      setTotal(response.data.pagination.total);
    } catch (err) {
      setError('Failed to load assignments');
      console.error(err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, statusFilter, typeFilter, difficultyFilter, batchFilter, languageFilter, techFilter, topicFilter, lessonFilter, groupBy, createdByFilter, sortOption]);

  // Load batches + creators for the filters
  useEffect(() => {
    (async () => {
      try {
        const res: any = await batchApi.getBatches();
        setBatches(res.batches || res.data || res || []);
      } catch { /* non-fatal */ }
      try {
        const ures: any = await userApi.getUsers();
        const all = ures.users || ures.data || ures || [];
        setCreators(all
          .filter((u: any) => ['INSTRUCTOR', 'TENANT_ADMIN', 'SUPER_ADMIN', 'STAFF'].includes((u.role || '').toUpperCase()))
          .map((u: any) => ({ _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email })));
      } catch { /* non-fatal */ }
    })();
  }, []);

  // Load global stats for the summary cards (correct across all pages, not just this one)
  const loadStats = useCallback(async () => {
    try {
      const res = await assignmentApi.getOverallReports('dateRange=all&type=all');
      setStats(res.data.data);
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { loadStats(); }, [loadStats]);

  // Full set (unpaginated) for the library meta — refreshed alongside the table.
  const loadMeta = useCallback(async () => {
    try {
      const res = await assignmentApi.list({ limit: 500, page: 1 });
      setAllForMeta(res.data.data || []);
    } catch { /* non-fatal */ }
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // Derived library meta
  const inBatchesCount = React.useMemo(() =>
    allForMeta.filter(a => (a as any).accessibleTo === 'batch_wise' || ((a as any).selectedBatches?.length) || (a as any).batch).length,
  [allForMeta]);
  const techCounts = React.useMemo(() => {
    const m: Record<string, number> = {};
    allForMeta.forEach(a => { const k = (a as any).primaryTech || 'other'; m[k] = (m[k] || 0) + 1; });
    return m;
  }, [allForMeta]);
  const topicOptions = React.useMemo(() => {
    const s = new Set<string>(); allForMeta.forEach(a => (a.topics || []).forEach(t => t && s.add(t)));
    return [...s].sort();
  }, [allForMeta]);
  const lessonOptions = React.useMemo(() => {
    const m = new Map<string, string>();
    allForMeta.forEach(a => { const c = (a as any).chapter; if (c?._id && c?.title) m.set(c._id, c.title); });
    return [...m.entries()].sort((x, y) => x[1].localeCompare(y[1]));
  }, [allForMeta]);
  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handlePublish = async (id: string) => {
    try {
      await assignmentApi.publish(id);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await assignmentApi.archive(id);
      loadAssignments();
    } catch (err) {
      setError('Failed to archive assignment');
    }
  };

  const handleClone = async (id: string) => {
    try {
      await assignmentApi.clone(id);
      loadAssignments();
    } catch (err) {
      setError('Failed to clone assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentApi.delete(id);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Template download handler
  const handleDownloadTemplate = async (type: 'coding' | 'mcq' | 'general') => {
    try {
      await assignmentApi.downloadTemplate(type);
      setSuccessMessage(`Template downloaded successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  // CSV parsing helper
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      data.push(obj);
    }
    return data;
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setImportData(parsed);
      setShowImportModal(true);
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle import
  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setImporting(true);
    try {
      const response = await assignmentApi.importFromCSV(importData);
      setImportResult(response.data.data);
      setSuccessMessage(`Successfully imported ${response.data.data.success.length} assignments`);
      loadAssignments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import assignments');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // "May 5, 2026" + "10:30 AM" on two lines (Created On column)
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return { date: '-', time: '' };
    const d = new Date(dateString);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  // "5 days left" / "Due today" / "3 days overdue"
  const dueLabel = (dateString?: string): { text: string; overdue: boolean } | null => {
    if (!dateString) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(dateString); due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - now.getTime()) / 86400000);
    if (diff === 0) return { text: 'Due today', overdue: false };
    if (diff > 0) return { text: `${diff} day${diff === 1 ? '' : 's'} left`, overdue: false };
    return { text: `${-diff} day${diff === -1 ? '' : 's'} overdue`, overdue: true };
  };

  const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'sql', 'html', 'css'];
  const LANG_LABEL: Record<string, string> = { javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python', java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go', rust: 'Rust', sql: 'SQL', html: 'HTML', css: 'CSS' };

  const AVATAR_COLORS = ['#6366f1', '#16a34a', '#d97706', '#0ea5e9', '#ec4899', '#7c3aed'];
  const creatorName = (a: Assignment) => {
    const c: any = a.createdBy;
    if (!c || typeof c === 'string') return <span style={{ color: '#94a3b8' }}>—</span>;
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name || c.email || '—';
    const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();
    const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
    return (
      <span className="creator-cell">
        <span className="creator-avatar" style={{ background: color }}>{initials}</span>
        <span className="creator-name">{name}</span>
      </span>
    );
  };

  // Icon tile shown before an assignment's title, keyed by type.
  const TYPE_TILE: Record<string, { icon: string; bg: string; color: string }> = {
    coding: { icon: '</>', bg: '#eef2ff', color: '#6366f1' },
    mcq: { icon: '✓', bg: '#ecfeff', color: '#0891b2' },
    theory: { icon: '📖', bg: '#fef3c7', color: '#d97706' },
    project: { icon: '🗂', bg: '#f0fdf4', color: '#16a34a' },
    file_upload: { icon: '📎', bg: '#faf5ff', color: '#a855f7' },
  };
  const typeTile = (type: string) => TYPE_TILE[type] || { icon: '🌐', bg: '#eff6ff', color: '#2563eb' };

  const getStatusBadge = (status: AssignmentStatus) => {
    return <span className={`badge badge-${status}`}>{status}</span>;
  };

  const getTypeBadge = (type: AssignmentType) => {
    return <span className={`badge badge-${type}`}>{type.replace('_', ' ')}</span>;
  };

  const getDifficultyBadge = (difficulty: DifficultyLevel) => {
    return <span className={`badge badge-${difficulty}`}>{difficulty}</span>;
  };

  const actionsFor = (assignment: Assignment) => (
    <ActionsDropdown
      assignment={assignment}
      onEdit={() => navigate(`/admin/assignments/${assignment._id}/edit`)}
      onPreview={() => setPreviewId(assignment._id)}
      onTry={() => navigate(`/assignments/${assignment._id}/workspace`)}
      onPublish={() => handlePublish(assignment._id)}
      onViewSubmissions={() => navigate(`/admin/assignments/${assignment._id}/submissions`)}
      onArchive={() => handleArchive(assignment._id)}
      onClone={() => handleClone(assignment._id)}
      onDelete={() => handleDelete(assignment._id)}
    />
  );

  return (
    <div className="assignment-page">
      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success" style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 1000,
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #22c55e',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {successMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="lib-breadcrumb">LMS <span>›</span> Library <span>›</span> <b>Assignments</b></div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Assignments Library</h1>
          <p>Create, organize and reuse assignments across your courses and batches.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Template Download Dropdown */}
          <div className="dropdown" style={{ position: 'relative' }}>
            <button 
              className="btn btn-outline"
              onClick={() => {
                const dropdown = document.getElementById('template-dropdown');
                if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '10px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <span>📥</span> Download Template
            </button>
            <div 
              id="template-dropdown"
              style={{ 
                display: 'none',
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: '180px'
              }}
            >
              <button 
                onClick={() => { handleDownloadTemplate('coding'); document.getElementById('template-dropdown')!.style.display = 'none'; }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: 'none', 
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                💻 Coding Template
              </button>
              <button 
                onClick={() => { handleDownloadTemplate('mcq'); document.getElementById('template-dropdown')!.style.display = 'none'; }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: 'none', 
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                📝 MCQ Template
              </button>
              <button 
                onClick={() => { handleDownloadTemplate('general'); document.getElementById('template-dropdown')!.style.display = 'none'; }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: 'none', 
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                📄 General Template
              </button>
            </div>
          </div>
          
          {/* Import Button */}
          <button 
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 16px',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              backgroundColor: '#eff6ff',
              color: '#3b82f6',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <span>📤</span> Import CSV
          </button>

          {/* Reports Button */}
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/admin/assignments/reports')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '10px 16px',
              border: '1px solid #10b981',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <span>📊</span> Reports
          </button>
          
          <button 
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/admin/assignments/create')}
          >
            <i className="bi bi-plus-lg"></i>
            Create Assignment
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>📤 Import Assignments</h3>
              <button 
                onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            
            {!importResult ? (
              <>
                <p style={{ color: '#64748b', marginBottom: '16px' }}>
                  Found <strong>{importData.length}</strong> assignments in the CSV file.
                </p>
                
                {/* Preview table */}
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Title</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Difficulty</th>
                        <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 10).map((item, index) => (
                        <tr key={index}>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.title}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.type}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.difficulty}</td>
                          <td style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{item.totalPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.length > 10 && (
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
                      ... and {importData.length - 10} more
                    </p>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setShowImportModal(false); setImportData([]); }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      cursor: importing ? 'not-allowed' : 'pointer',
                      opacity: importing ? 0.7 : 1
                    }}
                  >
                    {importing ? 'Importing...' : `Import ${importData.length} Assignments`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#dcfce7', 
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}>
                    ✅ Successfully imported: <strong>{importResult.success.length}</strong>
                  </div>
                  {importResult.failed.length > 0 && (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#fef2f2', 
                      borderRadius: '8px'
                    }}>
                      ❌ Failed: <strong>{importResult.failed.length}</strong>
                      <ul style={{ margin: '8px 0 0 20px', fontSize: '13px' }}>
                        {importResult.failed.map((item, i) => (
                          <li key={i}>{item.title}: {item.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {(() => {
        const t = stats?.totalAssignments ?? total;
        const published = stats?.publishedAssignments ?? 0;
        const draft = stats?.draftAssignments ?? 0;
        const coding = stats?.byType?.find(x => x._id === 'coding')?.count ?? 0;
        const pct = (n: number) => (t ? Math.round((n / t) * 100 * 10) / 10 : 0);
        void coding;
        const cards = [
          { icon: '📄', tint: '#eef2ff', color: '#6366f1', value: t, label: 'Total Assignments', sub: 'All time' },
          { icon: '✅', tint: '#dcfce7', color: '#16a34a', value: published, label: 'Published', sub: 'Ready to use' },
          { icon: '📝', tint: '#fef3c7', color: '#d97706', value: draft, label: 'Drafts', sub: 'In progress' },
          { icon: '🎓', tint: '#ede9fe', color: '#7c3aed', value: inBatchesCount, label: 'In Batches', sub: 'Assigned to batches' },
        ];
        return (
          <div className="stats-grid-v2">
            {cards.map((c, i) => (
              <div className="stat-card-v2" key={i}>
                <div className="stat-icon-tile" style={{ background: c.tint, color: c.color }}>{c.icon}</div>
                <div className="stat-card-body">
                  <div className="stat-card-label">{c.label}</div>
                  <div className="stat-card-value">{c.value}</div>
                  <div className="stat-card-sub" style={{ color: c.color }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter / Group bar */}
      <div className="lib-filterbar">
        <div className="lib-fb-top">
          <div className="lib-groupby">
            <span className="lib-fb-label">Group By</span>
            <div className="lib-seg">
              {([['none', 'None'], ['language', 'Language'], ['topic', 'Topic'], ['lesson', 'Lesson']] as [any, string][]).map(([g, lbl]) => (
                <button key={g} className={groupBy === g ? 'active' : ''} onClick={() => { setGroupBy(g); setPage(1); }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div className="lib-fb-field"><label>Language</label>
            <select value={techFilter} onChange={(e) => { setTechFilter(e.target.value); setPage(1); }}>
              <option value="">All Languages</option>
              {TECH_CATEGORIES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="lib-fb-field"><label>Topic</label>
            <select value={topicFilter} onChange={(e) => { setTopicFilter(e.target.value); setPage(1); }}>
              <option value="">All Topics</option>
              {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="lib-fb-field"><label>Lesson (Chapter)</label>
            <select value={lessonFilter} onChange={(e) => { setLessonFilter(e.target.value); setPage(1); }}>
              <option value="">All Lessons</option>
              {lessonOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          </div>
          <button className="lib-morefilters" onClick={() => setShowFilters(s => !s)}>▾ More Filters</button>
        </div>
        <div className="lib-fb-bottom">
          <div className="lib-search"><span>🔍</span>
            <input type="text" placeholder="Search by title or description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="lib-clear" onClick={clearFilters}>↻ Clear</button>
          <button className="lib-filters-count">Filters ({[statusFilter, typeFilter, difficultyFilter, batchFilter, techFilter, topicFilter, lessonFilter, createdByFilter].filter(Boolean).length})</button>
        </div>
        {/* Tech category chips */}
        <div className="lib-techchips">
          {TECH_CATEGORIES.filter(t => techCounts[t.value]).map(t => (
            <button key={t.value} className={`lib-techchip ${techFilter === t.value ? 'active' : ''}`}
              onClick={() => { setTechFilter(techFilter === t.value ? '' : t.value); setPage(1); }}
              style={techFilter === t.value ? { borderColor: t.color, background: '#fff' } : undefined}>
              <span style={{ color: t.color }}>{t.icon}</span> {t.label}
              <span className="lib-techchip-count" style={{ background: t.color }}>{techCounts[t.value]}</span>
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="lib-morefilters-panel">
              <div className="filter-field">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Type</label>
                <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                  <option value="">All Types</option>
                  <option value="coding">Coding</option>
                  <option value="mcq">MCQ</option>
                  <option value="theory">Theory</option>
                  <option value="project">Project</option>
                  <option value="file_upload">File Upload</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Difficulty</label>
                <select value={difficultyFilter} onChange={(e) => { setDifficultyFilter(e.target.value); setPage(1); }}>
                  <option value="">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div className="filter-field">
                <label>Batch</label>
                <select value={batchFilter} onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }}>
                  <option value="">All Batches</option>
                  {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="filter-field">
                <label>Created By</label>
                <select value={createdByFilter} onChange={(e) => { setCreatedByFilter(e.target.value); setPage(1); }}>
                  <option value="">All Users</option>
                  {creators.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <i className="bi bi-exclamation-triangle"></i>
          {error}
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Content + sidebar */}
      <div className="lib-layout">
      <div className="lib-main">
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No Assignments Found</h3>
          <p>Create your first assignment to get started!</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/admin/assignments/create')}
          >
            <i className="bi bi-plus-lg"></i>
            Create Assignment
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="list-toolbar">
            <div className="list-toolbar-left">
              <h3>Assignments</h3>
              <span className="total-badge">{total} Total</span>
            </div>
            <div className="list-toolbar-right">
              <label className="sort-control">
                <span>Sort by</span>
                <select value={sortOption} onChange={(e) => { setSortOption(e.target.value); setPage(1); }}>
                  {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <div className="view-toggle">
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List view">☰</button>
                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid view">▦</button>
              </div>
            </div>
          </div>

          {viewMode === 'list' ? (
            <div className="form-section">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Language</th>
                    <th>Topic</th>
                    <th>Lesson (Chapter)</th>
                    <th>Difficulty</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const renderRow = (assignment: Assignment) => {
                      const created = formatDateTime(assignment.updatedAt || assignment.createdAt);
                      const tech = techDef((assignment as any).primaryTech);
                      const desc = (assignment.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                      return (
                        <tr key={assignment._id}>
                          <td className="title-cell">
                            <div className="title-main">{assignment.title}</div>
                            {desc && <div className="title-topics">{desc.slice(0, 72)}{desc.length > 72 ? '…' : ''}</div>}
                          </td>
                          <td>{tech ? <span className="lib-cell-chip" style={{ color: tech.color, background: tech.color + '18' }}>{tech.icon} {tech.label}</span> : <span className="lib-muted">—</span>}</td>
                          <td>{assignment.topics?.[0] || <span className="lib-muted">—</span>}</td>
                          <td>{(assignment as any).chapter?.title || <span className="lib-muted">—</span>}</td>
                          <td>{getDifficultyBadge(assignment.difficulty)}</td>
                          <td>{getStatusBadge(assignment.status)}</td>
                          <td>
                            <div style={{ color: '#334155', fontSize: 13 }}>{created.date}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>by {creatorName(assignment)}</div>
                          </td>
                          <td className="actions-cell">{actionsFor(assignment)}</td>
                        </tr>
                      );
                    };

                    if (groupBy === 'none') return assignments.map(renderRow);

                    // Grouped mode — collapsible section header rows within the same table.
                    const keyOf = (a: Assignment): string => {
                      if (groupBy === 'language') return (a as any).primaryTech || '__none';
                      if (groupBy === 'topic') return (a.topics && a.topics[0]) || '__none';
                      return (a as any).chapter?.title || (a as any).chapter?._id || '__none';
                    };
                    const labelOf = (k: string): string => {
                      if (k === '__none') return groupBy === 'language' ? 'Untagged' : groupBy === 'topic' ? 'No topic' : 'No lesson';
                      if (groupBy === 'language') { const d = techDef(k); return d ? `${d.icon} ${d.label}` : k; }
                      return k;
                    };
                    const groups = new Map<string, Assignment[]>();
                    assignments.forEach(a => { const k = keyOf(a); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(a); });
                    const keys = [...groups.keys()].sort((a, b) => a === '__none' ? 1 : b === '__none' ? -1 : labelOf(a).localeCompare(labelOf(b)));
                    const out: React.ReactNode[] = [];
                    keys.forEach(k => {
                      const items = groups.get(k)!;
                      const isCollapsed = !!collapsedGroups[k];
                      out.push(
                        <tr key={`grp-${k}`} onClick={() => setCollapsedGroups(p => ({ ...p, [k]: !p[k] }))} style={{ cursor: 'pointer', background: '#eef2f7' }}>
                          <td colSpan={8} style={{ fontWeight: 800, color: '#0b2e63', padding: '10px 14px' }}>
                            {isCollapsed ? '▸' : '▾'} {labelOf(k)} <span style={{ color: '#94a3b8', fontWeight: 600 }}>({items.length})</span>
                          </td>
                        </tr>
                      );
                      if (!isCollapsed) items.forEach(a => out.push(renderRow(a)));
                    });
                    return out;
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="assignments-grid">
              {assignments.map((assignment) => {
                const due = dueLabel(assignment.dueDate);
                return (
                  <div className="assignment-card" key={assignment._id}>
                    <div className="assignment-card-top">
                      {getTypeBadge(assignment.type)}
                      <div className="actions-cell">{actionsFor(assignment)}</div>
                    </div>
                    <div className="assignment-card-title">{assignment.title}</div>
                    {assignment.topics.length > 0 && (
                      <div className="assignment-card-topics">{assignment.topics.slice(0, 3).join(', ')}</div>
                    )}
                    <div className="assignment-card-meta">
                      {getDifficultyBadge(assignment.difficulty)}
                      {getStatusBadge(assignment.status)}
                      <span className="pts">{assignment.totalPoints} pts</span>
                    </div>
                    <div className="assignment-card-foot">
                      <span>📅 {formatDate(assignment.dueDate)}</span>
                      {due && <span className={`due-chip ${due.overdue ? 'overdue' : ''}`}>{due.text}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination + rows per page */}
          <div className="list-pagination">
            <span className="page-info">
              Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
            </span>
            <div className="pager">
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(1)} title="First">«</button>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
              {pageNumbers(page, totalPages).map((n, i) => (
                n === '…'
                  ? <span key={`e${i}`} style={{ padding: '6px 8px', color: '#94a3b8' }}>…</span>
                  : <button key={n} onClick={() => setPage(n as number)}
                      className="btn btn-sm"
                      style={{ minWidth: 34, fontWeight: 700, background: n === page ? '#2563eb' : '#fff', color: n === page ? '#fff' : '#334155', border: `1px solid ${n === page ? '#2563eb' : '#e5e7eb'}` }}>{n}</button>
              ))}
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} title="Last">»</button>
            </div>
            <label className="rows-per-page">
              <span>Rows per page</span>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
      </div>
      </div>

      {previewId && <AssignmentPreviewModal assignmentId={previewId} onClose={() => setPreviewId(null)} />}
    </div>
  );
};

export default AdminAssignmentList;
