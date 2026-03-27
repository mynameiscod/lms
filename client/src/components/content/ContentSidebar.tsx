import React, { useState, useEffect } from 'react';
import { courseApi, subjectApi, chapterApi, topicApi } from '../../api';
import { ContentType, ContentFilter } from './ContentManagementLayout';
import './ContentSidebar.css';

interface ContentTypeOption {
  id: ContentType | 'all';
  label: string;
  icon: string;
  description: string;
  category: 'general' | 'media' | 'documents' | 'interactive';
}

interface Course {
  _id: string;
  title: string;
  code: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface Chapter {
  _id: string;
  title: string;
}

interface Topic {
  _id: string;
  title: string;
}

interface ContentSidebarProps {
  selectedType: ContentType | 'all';
  onTypeSelect: (type: ContentType | 'all') => void;
  filters: ContentFilter;
  onFilterChange: (filters: ContentFilter) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onCreateNew: (contentType?: ContentType) => void;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    id: 'all',
    label: 'All Content',
    icon: '📋',
    description: 'View all content types',
    category: 'general'
  },
  {
    id: 'announcement',
    label: 'Announcements',
    icon: '📢',
    description: 'Important updates and notices',
    category: 'general'
  },
  {
    id: 'note',
    label: 'Notes',
    icon: '📝',
    description: 'Study materials and lecture notes',
    category: 'general'
  },
  {
    id: 'video',
    label: 'Videos',
    icon: '🎥',
    description: 'Video lectures and tutorials',
    category: 'media'
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: '🎵',
    description: 'Audio lectures and recordings',
    category: 'media'
  },
  {
    id: 'image',
    label: 'Images',
    icon: '🖼️',
    description: 'Diagrams, charts, and illustrations',
    category: 'media'
  },
  {
    id: 'pdf',
    label: 'PDF Files',
    icon: '📄',
    description: 'Documents, books, and handouts',
    category: 'documents'
  },
  {
    id: 'document',
    label: 'Documents',
    icon: '📋',
    description: 'Word docs, presentations, spreadsheets',
    category: 'documents'
  },
  {
    id: 'assignment',
    label: 'Assignments',
    icon: '📋',
    description: 'Homework and projects',
    category: 'interactive'
  },
  {
    id: 'snippet',
    label: 'Code Snippets',
    icon: '💻',
    description: 'Code examples and templates',
    category: 'interactive'
  },
  {
    id: 'cheatsheet',
    label: 'Cheatsheets',
    icon: '📊',
    description: 'Quick reference guides',
    category: 'interactive'
  }
];

const ContentSidebar: React.FC<ContentSidebarProps> = ({
  selectedType,
  onTypeSelect,
  filters,
  onFilterChange,
  collapsed,
  onToggleCollapse,
  onCreateNew
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['content-types']));

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (filters.subjectId) {
      fetchChapters(filters.subjectId);
    } else {
      setChapters([]);
      setTopics([]);
    }
  }, [filters.subjectId]);

  useEffect(() => {
    if (filters.chapterId) {
      fetchTopics(filters.chapterId);
    } else {
      setTopics([]);
    }
  }, [filters.chapterId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseApi.getCourses();
      const courseList = Array.isArray(response) ? response : 
                        Array.isArray(response?.data?.courses) ? response.data.courses :
                        Array.isArray(response?.data) ? response.data : [];
      setCourses(courseList);
      
      if (courseList.length > 0) {
        fetchSubjects(courseList[0]._id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (courseId: string) => {
    try {
      const response = await subjectApi.getSubjectsByCourse(courseId);
      const subjectList = Array.isArray(response) ? response :
                         Array.isArray(response?.data) ? response.data : [];
      setSubjects(subjectList);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchChapters = async (subjectId: string) => {
    try {
      const response = await chapterApi.getChaptersBySubject(subjectId);
      const chapterList = Array.isArray(response) ? response :
                         Array.isArray(response?.data) ? response.data : [];
      setChapters(chapterList);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    }
  };

  const fetchTopics = async (chapterId: string) => {
    try {
      const response = await topicApi.getTopicsByChapter(chapterId);
      const topicList = Array.isArray(response) ? response :
                       Array.isArray(response?.data) ? response.data : [];
      setTopics(topicList);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSubjectChange = (subjectId: string) => {
    onFilterChange({
      ...filters,
      subjectId: subjectId || undefined,
      chapterId: undefined,
      topicId: undefined
    });
  };

  const handleChapterChange = (chapterId: string) => {
    onFilterChange({
      ...filters,
      chapterId: chapterId || undefined,
      topicId: undefined
    });
  };

  const handleTopicChange = (topicId: string) => {
    onFilterChange({
      ...filters,
      topicId: topicId || undefined
    });
  };

  const contentTypesByCategory = CONTENT_TYPES.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, ContentTypeOption[]>);

  if (collapsed) {
    return (
      <div className="content-sidebar collapsed">
        <button className="sidebar-toggle" onClick={onToggleCollapse} title="Expand Sidebar">
          ▶️
        </button>
        <div className="collapsed-content">
          {CONTENT_TYPES.slice(0, 6).map(type => (
            <button
              key={type.id}
              className={`collapsed-type-btn ${selectedType === type.id ? 'active' : ''}`}
              onClick={() => onTypeSelect(type.id)}
              title={type.label}
            >
              {type.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="content-sidebar">
      <div className="sidebar-header">
        <h3>Content Manager</h3>
        <button className="sidebar-toggle" onClick={onToggleCollapse} title="Collapse Sidebar">
          ◀️
        </button>
      </div>

      {/* Quick Create Buttons */}
      <div className="quick-create-section">
        <h4>Quick Create</h4>
        <div className="quick-create-buttons">
          <button onClick={() => onCreateNew('note')} className="quick-create-btn note">
            📝 Note
          </button>
          <button onClick={() => onCreateNew('video')} className="quick-create-btn video">
            🎥 Video
          </button>
          <button onClick={() => onCreateNew('pdf')} className="quick-create-btn pdf">
            📄 PDF
          </button>
          <button onClick={() => onCreateNew('assignment')} className="quick-create-btn assignment">
            📋 Assignment
          </button>
        </div>
      </div>

      {/* Content Types */}
      <div className="sidebar-section">
        <div 
          className="section-header" 
          onClick={() => toggleSection('content-types')}
        >
          <span>📁 Content Types</span>
          <span className={`expand-icon ${expandedSections.has('content-types') ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.has('content-types') && (
          <div className="section-content">
            {Object.entries(contentTypesByCategory).map(([category, types]) => (
              <div key={category} className="content-category">
                <div className="category-label">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </div>
                {types.map(type => (
                  <button
                    key={type.id}
                    className={`content-type-btn ${selectedType === type.id ? 'active' : ''}`}
                    onClick={() => onTypeSelect(type.id)}
                    title={type.description}
                  >
                    <span className="type-icon">{type.icon}</span>
                    <span className="type-label">{type.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization Filters */}
      <div className="sidebar-section">
        <div 
          className="section-header"
          onClick={() => toggleSection('organization')}
        >
          <span>🗂️ Organization</span>
          <span className={`expand-icon ${expandedSections.has('organization') ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.has('organization') && (
          <div className="section-content">
            {/* Subject Selection */}
            <div className="filter-group">
              <label>Subject</label>
              <select
                value={filters.subjectId || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="filter-select"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter Selection */}
            {filters.subjectId && (
              <div className="filter-group">
                <label>Chapter</label>
                <select
                  value={filters.chapterId || ''}
                  onChange={(e) => handleChapterChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Chapters</option>
                  {chapters.map(chapter => (
                    <option key={chapter._id} value={chapter._id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Topic Selection */}
            {filters.chapterId && (
              <div className="filter-group">
                <label>Topic</label>
                <select
                  value={filters.topicId || ''}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Topics</option>
                  {topics.map(topic => (
                    <option key={topic._id} value={topic._id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visibility Filters */}
      <div className="sidebar-section">
        <div 
          className="section-header"
          onClick={() => toggleSection('visibility')}
        >
          <span>👁️ Visibility</span>
          <span className={`expand-icon ${expandedSections.has('visibility') ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.has('visibility') && (
          <div className="section-content">
            <div className="filter-group">
              <label>Content Visibility</label>
              <select
                value={filters.visibility || 'all'}
                onChange={(e) => onFilterChange({
                  ...filters,
                  visibility: e.target.value as 'public' | 'subject-based' | 'all'
                })}
                className="filter-select"
              >
                <option value="all">All Content</option>
                <option value="public">Public Only</option>
                <option value="subject-based">Subject-based Only</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Publication Status</label>
              <select
                value={filters.isPublished === undefined ? 'all' : filters.isPublished ? 'published' : 'draft'}
                onChange={(e) => onFilterChange({
                  ...filters,
                  isPublished: e.target.value === 'all' ? undefined : e.target.value === 'published'
                })}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="published">Published Only</option>
                <option value="draft">Drafts Only</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="sidebar-loading">
          Loading organization data...
        </div>
      )}
    </div>
  );
};

export default ContentSidebar;