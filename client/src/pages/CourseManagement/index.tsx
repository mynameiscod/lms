import React, { useState, useEffect } from 'react';
import { courseApi, subjectApi, chapterApi, topicApi, subTopicApi, userApi } from '../../api';
import { Spinner, Alert } from '../../components/common';
import './CourseManagement.css';

interface Course {
  _id: string;
  title: string;
  code: string;
  description: string;
  category: string;
  level: string;
  instructor: { _id: string; firstName: string; lastName: string };
  duration: { value: number; unit: string };
  isPublished: boolean;
  isActive: boolean;
  subjectCount: number;
  enrollmentCount: number;
}

interface Subject {
  _id: string;
  courseId: { _id: string; title: string; code: string };
  name: string;
  code: string;
  description: string;
  order: number;
  chapterCount: number;
  isPublished: boolean;
  isActive: boolean;
}

interface Chapter {
  _id: string;
  subjectId: { _id: string; name: string; code: string };
  courseId: { _id: string; title: string; code: string };
  title: string;
  description: string;
  order: number;
  videos: Array<{ title: string; url: string; duration: number }>;
  notes: Array<{ title: string; content: string }>;
  isPublished: boolean;
  isActive: boolean;
}

interface Topic {
  _id: string;
  chapterId: { _id: string; title: string };
  subjectId: { _id: string; name: string; code: string };
  courseId: { _id: string; title: string; code: string };
  title: string;
  description: string;
  order: number;
  subTopicCount: number;
  isPublished: boolean;
  isActive: boolean;
}

interface SubTopicItem {
  _id: string;
  topicId: { _id: string; title: string };
  chapterId: { _id: string; title: string };
  subjectId: { _id: string; name: string; code: string };
  courseId: { _id: string; title: string; code: string };
  title: string;
  description: string;
  order: number;
  scheduledDay: number | null;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  isPublished: boolean;
  isActive: boolean;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const CourseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'courses' | 'subjects' | 'chapters' | 'topics' | 'subtopics'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopicItem[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showSubTopicModal, setShowSubTopicModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSubTopic, setEditingSubTopic] = useState<SubTopicItem | null>(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '',
    code: '',
    description: '',
    category: '',
    level: 'beginner',
    instructor: '',
    durationValue: 3,
    durationUnit: 'months'
  });

  const [subjectForm, setSubjectForm] = useState({
    courseId: '',
    name: '',
    code: '',
    description: '',
    durationValue: 2,
    durationUnit: 'weeks'
  });

  const [chapterForm, setChapterForm] = useState({
    courseId: '',
    subjectId: '',
    title: '',
    description: '',
    estimatedDuration: 60
  });

  const [topicForm, setTopicForm] = useState({
    courseId: '',
    subjectId: '',
    chapterId: '',
    title: '',
    description: ''
  });

  const [subTopicForm, setSubTopicForm] = useState({
    courseId: '',
    subjectId: '',
    chapterId: '',
    topicId: '',
    title: '',
    description: '',
    scheduledDay: '',
    scheduledDate: '',
    startTime: '',
    endTime: '',
    durationMinutes: ''
  });

  // Filter states
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, subjectsRes, chaptersRes, topicsRes, subTopicsRes, usersRes] = await Promise.all([
        courseApi.getCourses(),
        subjectApi.getSubjects(),
        chapterApi.getChapters(),
        topicApi.getTopics(),
        subTopicApi.getSubTopics(),
        userApi.getUsers()
      ]);
      setCourses(coursesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setChapters(chaptersRes.data || []);
      setTopics(topicsRes.data || []);
      setSubTopics(subTopicsRes.data || []);
      // Filter for instructors (users who can teach)
      setInstructors(usersRes.data?.filter((u: any) => u.role?.name !== 'Student') || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Course handlers
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const courseData = {
        title: courseForm.title,
        code: courseForm.code,
        description: courseForm.description,
        category: courseForm.category,
        level: courseForm.level,
        instructor: courseForm.instructor,
        duration: {
          value: courseForm.durationValue,
          unit: courseForm.durationUnit
        }
      };

      if (editingCourse) {
        await courseApi.updateCourse(editingCourse._id, courseData);
        setSuccess('Course updated successfully');
      } else {
        await courseApi.createCourse(courseData);
        setSuccess('Course created successfully');
      }
      
      setShowCourseModal(false);
      resetCourseForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await courseApi.deleteCourse(courseId);
      setSuccess('Course deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete course');
    }
  };

  const handleToggleCourseStatus = async (course: Course, field: 'isActive' | 'isPublished') => {
    try {
      await courseApi.toggleCourseStatus(course._id, { [field]: !course[field] });
      setSuccess(`Course ${field === 'isActive' ? 'status' : 'publish state'} updated`);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update course status');
    }
  };

  // Subject handlers
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subjectData = {
        courseId: subjectForm.courseId,
        name: subjectForm.name,
        code: subjectForm.code,
        description: subjectForm.description,
        duration: {
          value: subjectForm.durationValue,
          unit: subjectForm.durationUnit
        }
      };

      if (editingSubject) {
        await subjectApi.updateSubject(editingSubject._id, subjectData);
        setSuccess('Subject updated successfully');
      } else {
        await subjectApi.createSubject(subjectData);
        setSuccess('Subject created successfully');
      }
      
      setShowSubjectModal(false);
      resetSubjectForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save subject');
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      await subjectApi.deleteSubject(subjectId);
      setSuccess('Subject deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete subject');
    }
  };

  // Chapter handlers
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const chapterData = {
        courseId: chapterForm.courseId,
        subjectId: chapterForm.subjectId,
        title: chapterForm.title,
        description: chapterForm.description,
        estimatedDuration: chapterForm.estimatedDuration
      };

      if (editingChapter) {
        await chapterApi.updateChapter(editingChapter._id, chapterData);
        setSuccess('Chapter updated successfully');
      } else {
        await chapterApi.createChapter(chapterData);
        setSuccess('Chapter created successfully');
      }
      
      setShowChapterModal(false);
      resetChapterForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) return;
    try {
      await chapterApi.deleteChapter(chapterId);
      setSuccess('Chapter deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete chapter');
    }
  };

  // Topic handlers
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const topicData = {
        courseId: topicForm.courseId,
        subjectId: topicForm.subjectId,
        chapterId: topicForm.chapterId,
        title: topicForm.title,
        description: topicForm.description
      };

      if (editingTopic) {
        await topicApi.updateTopic(editingTopic._id, topicData);
        setSuccess('Topic updated successfully');
      } else {
        await topicApi.createTopic(topicData);
        setSuccess('Topic created successfully');
      }

      setShowTopicModal(false);
      resetTopicForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save topic');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;
    try {
      await topicApi.deleteTopic(topicId);
      setSuccess('Topic deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete topic');
    }
  };

  // SubTopic handlers
  const handleCreateSubTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subTopicData: any = {
        courseId: subTopicForm.courseId,
        subjectId: subTopicForm.subjectId,
        chapterId: subTopicForm.chapterId,
        topicId: subTopicForm.topicId,
        title: subTopicForm.title,
        description: subTopicForm.description
      };
      if (subTopicForm.scheduledDay) subTopicData.scheduledDay = parseInt(subTopicForm.scheduledDay);
      if (subTopicForm.scheduledDate) subTopicData.scheduledDate = subTopicForm.scheduledDate;
      if (subTopicForm.startTime) subTopicData.startTime = subTopicForm.startTime;
      if (subTopicForm.endTime) subTopicData.endTime = subTopicForm.endTime;
      if (subTopicForm.durationMinutes) subTopicData.durationMinutes = parseInt(subTopicForm.durationMinutes);

      if (editingSubTopic) {
        await subTopicApi.updateSubTopic(editingSubTopic._id, subTopicData);
        setSuccess('Sub-topic updated successfully');
      } else {
        await subTopicApi.createSubTopic(subTopicData);
        setSuccess('Sub-topic created successfully');
      }

      setShowSubTopicModal(false);
      resetSubTopicForm();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save sub-topic');
    }
  };

  const handleDeleteSubTopic = async (subTopicId: string) => {
    if (!window.confirm('Are you sure you want to delete this sub-topic?')) return;
    try {
      await subTopicApi.deleteSubTopic(subTopicId);
      setSuccess('Sub-topic deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete sub-topic');
    }
  };

  // Form reset helpers
  const resetCourseForm = () => {
    setCourseForm({
      title: '',
      code: '',
      description: '',
      category: '',
      level: 'beginner',
      instructor: '',
      durationValue: 3,
      durationUnit: 'months'
    });
    setEditingCourse(null);
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      courseId: '',
      name: '',
      code: '',
      description: '',
      durationValue: 2,
      durationUnit: 'weeks'
    });
    setEditingSubject(null);
  };

  const resetChapterForm = () => {
    setChapterForm({
      courseId: '',
      subjectId: '',
      title: '',
      description: '',
      estimatedDuration: 60
    });
    setEditingChapter(null);
  };

  const resetTopicForm = () => {
    setTopicForm({
      courseId: '',
      subjectId: '',
      chapterId: '',
      title: '',
      description: ''
    });
    setEditingTopic(null);
  };

  const resetSubTopicForm = () => {
    setSubTopicForm({
      courseId: '',
      subjectId: '',
      chapterId: '',
      topicId: '',
      title: '',
      description: '',
      scheduledDay: '',
      scheduledDate: '',
      startTime: '',
      endTime: '',
      durationMinutes: ''
    });
    setEditingSubTopic(null);
  };

  // Edit handlers
  const openEditCourse = (course: Course) => {
    setCourseForm({
      title: course.title,
      code: course.code,
      description: course.description,
      category: course.category,
      level: course.level,
      instructor: course.instructor._id,
      durationValue: course.duration?.value || 3,
      durationUnit: course.duration?.unit || 'months'
    });
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const openEditSubject = (subject: Subject) => {
    setSubjectForm({
      courseId: subject.courseId._id,
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      durationValue: 2,
      durationUnit: 'weeks'
    });
    setEditingSubject(subject);
    setShowSubjectModal(true);
  };

  const openEditChapter = (chapter: Chapter) => {
    setChapterForm({
      courseId: chapter.courseId._id,
      subjectId: chapter.subjectId._id,
      title: chapter.title,
      description: chapter.description || '',
      estimatedDuration: 60
    });
    setEditingChapter(chapter);
    setShowChapterModal(true);
  };

  const openEditTopic = (topic: Topic) => {
    setTopicForm({
      courseId: topic.courseId._id,
      subjectId: topic.subjectId._id,
      chapterId: topic.chapterId._id,
      title: topic.title,
      description: topic.description || ''
    });
    setEditingTopic(topic);
    setShowTopicModal(true);
  };

  const openEditSubTopic = (st: SubTopicItem) => {
    setSubTopicForm({
      courseId: st.courseId._id,
      subjectId: st.subjectId._id,
      chapterId: st.chapterId._id,
      topicId: st.topicId._id,
      title: st.title,
      description: st.description || '',
      scheduledDay: st.scheduledDay != null ? String(st.scheduledDay) : '',
      scheduledDate: st.scheduledDate ? st.scheduledDate.substring(0, 10) : '',
      startTime: st.startTime || '',
      endTime: st.endTime || '',
      durationMinutes: st.durationMinutes != null ? String(st.durationMinutes) : ''
    });
    setEditingSubTopic(st);
    setShowSubTopicModal(true);
  };

  // Filtered data
  const filteredSubjects = selectedCourseFilter 
    ? subjects.filter(s => s.courseId._id === selectedCourseFilter)
    : subjects;

  const filteredChapters = selectedSubjectFilter
    ? chapters.filter(c => c.subjectId._id === selectedSubjectFilter)
    : selectedCourseFilter
      ? chapters.filter(c => c.courseId._id === selectedCourseFilter)
      : chapters;

  const filteredTopics = selectedChapterFilter
    ? topics.filter(t => t.chapterId._id === selectedChapterFilter)
    : selectedSubjectFilter
      ? topics.filter(t => t.subjectId._id === selectedSubjectFilter)
      : selectedCourseFilter
        ? topics.filter(t => t.courseId._id === selectedCourseFilter)
        : topics;

  const filteredSubTopics = selectedTopicFilter
    ? subTopics.filter(st => st.topicId._id === selectedTopicFilter)
    : selectedChapterFilter
      ? subTopics.filter(st => st.chapterId._id === selectedChapterFilter)
      : selectedCourseFilter
        ? subTopics.filter(st => st.courseId._id === selectedCourseFilter)
        : subTopics;

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="course-management">
      <div className="page-header">
        <h1>Course Management</h1>
        <p>Manage courses, subjects, and chapters</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Courses ({courses.length})
        </button>
        <button 
          className={`tab ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          Subjects ({subjects.length})
        </button>
        <button 
          className={`tab ${activeTab === 'chapters' ? 'active' : ''}`}
          onClick={() => setActiveTab('chapters')}
        >
          Chapters ({chapters.length})
        </button>
        <button 
          className={`tab ${activeTab === 'topics' ? 'active' : ''}`}
          onClick={() => setActiveTab('topics')}
        >
          Topics ({topics.length})
        </button>
        <button 
          className={`tab ${activeTab === 'subtopics' ? 'active' : ''}`}
          onClick={() => setActiveTab('subtopics')}
        >
          Sub-Topics ({subTopics.length})
        </button>
      </div>

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="tab-content">
          <div className="action-bar">
            <button className="btn-primary" onClick={() => { resetCourseForm(); setShowCourseModal(true); }}>
              + Add Course
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course._id}>
                    <td><span className="code-badge">{course.code}</span></td>
                    <td>{course.title}</td>
                    <td>
                      <span className={`status-text ${course.isActive ? 'active' : 'inactive'}`}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="status-separator">|</span>
                      <span className={`status-text ${course.isPublished ? 'published' : 'draft'}`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="action-link edit" onClick={() => openEditCourse(course)}>Edit</button>
                      <button className="action-link toggle" onClick={() => handleToggleCourseStatus(course, 'isActive')}>
                        {course.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="action-link publish" onClick={() => handleToggleCourseStatus(course, 'isPublished')}>
                        {course.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="action-link danger" onClick={() => handleDeleteCourse(course._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="tab-content">
          <div className="action-bar">
            <select 
              className="filter-select"
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => { resetSubjectForm(); setShowSubjectModal(true); }}>
              + Add Subject
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Chapters</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map(subject => (
                  <tr key={subject._id}>
                    <td>{subject.order}</td>
                    <td><span className="code-badge">{subject.code}</span></td>
                    <td>{subject.name}</td>
                    <td>{subject.courseId?.code} - {subject.courseId?.title}</td>
                    <td>{subject.chapterCount || 0}</td>
                    <td>
                      <span className={`status-badge ${subject.isActive ? 'active' : 'inactive'}`}>
                        {subject.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="action-link edit" onClick={() => openEditSubject(subject)}>Edit</button>
                      <button className="action-link danger" onClick={() => handleDeleteSubject(subject._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chapters Tab */}
      {activeTab === 'chapters' && (
        <div className="tab-content">
          <div className="action-bar">
            <select 
              className="filter-select"
              value={selectedCourseFilter}
              onChange={(e) => { setSelectedCourseFilter(e.target.value); setSelectedSubjectFilter(''); }}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            >
              <option value="">All Subjects</option>
              {(selectedCourseFilter ? subjects.filter(s => s.courseId._id === selectedCourseFilter) : subjects).map(s => (
                <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => { resetChapterForm(); setShowChapterModal(true); }}>
              + Add Chapter
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Course</th>
                  <th>Videos</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChapters.map(chapter => (
                  <tr key={chapter._id}>
                    <td>{chapter.order}</td>
                    <td>{chapter.title}</td>
                    <td>{chapter.subjectId?.code}</td>
                    <td>{chapter.courseId?.code}</td>
                    <td>{chapter.videos?.length || 0}</td>
                    <td>{chapter.notes?.length || 0}</td>
                    <td>
                      <span className={`status-badge ${chapter.isActive ? 'active' : 'inactive'}`}>
                        {chapter.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="action-link edit" onClick={() => openEditChapter(chapter)}>Edit</button>
                      <button className="action-link danger" onClick={() => handleDeleteChapter(chapter._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Topics Tab */}
      {activeTab === 'topics' && (
        <div className="tab-content">
          <div className="action-bar">
            <select 
              className="filter-select"
              value={selectedCourseFilter}
              onChange={(e) => { setSelectedCourseFilter(e.target.value); setSelectedSubjectFilter(''); setSelectedChapterFilter(''); }}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={selectedChapterFilter}
              onChange={(e) => setSelectedChapterFilter(e.target.value)}
            >
              <option value="">All Chapters</option>
              {(selectedCourseFilter 
                ? chapters.filter(ch => ch.courseId._id === selectedCourseFilter) 
                : chapters
              ).map(ch => (
                <option key={ch._id} value={ch._id}>{ch.title}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => { resetTopicForm(); setShowTopicModal(true); }}>
              + Add Topic
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Title</th>
                  <th>Chapter</th>
                  <th>Subject</th>
                  <th>Course</th>
                  <th>Sub-Topics</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map(topic => (
                  <tr key={topic._id}>
                    <td>{topic.order}</td>
                    <td>{topic.title}</td>
                    <td>{topic.chapterId?.title}</td>
                    <td>{topic.subjectId?.code}</td>
                    <td>{topic.courseId?.code}</td>
                    <td>{topic.subTopicCount || 0}</td>
                    <td>
                      <span className={`status-badge ${topic.isActive ? 'active' : 'inactive'}`}>
                        {topic.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="action-link edit" onClick={() => openEditTopic(topic)}>Edit</button>
                      <button className="action-link danger" onClick={() => handleDeleteTopic(topic._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Topics Tab */}
      {activeTab === 'subtopics' && (
        <div className="tab-content">
          <div className="action-bar">
            <select 
              className="filter-select"
              value={selectedCourseFilter}
              onChange={(e) => { setSelectedCourseFilter(e.target.value); setSelectedChapterFilter(''); setSelectedTopicFilter(''); }}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={selectedChapterFilter}
              onChange={(e) => { setSelectedChapterFilter(e.target.value); setSelectedTopicFilter(''); }}
            >
              <option value="">All Chapters</option>
              {(selectedCourseFilter 
                ? chapters.filter(ch => ch.courseId._id === selectedCourseFilter) 
                : chapters
              ).map(ch => (
                <option key={ch._id} value={ch._id}>{ch.title}</option>
              ))}
            </select>
            <select 
              className="filter-select"
              value={selectedTopicFilter}
              onChange={(e) => setSelectedTopicFilter(e.target.value)}
            >
              <option value="">All Topics</option>
              {(selectedChapterFilter 
                ? topics.filter(t => t.chapterId._id === selectedChapterFilter) 
                : topics
              ).map(t => (
                <option key={t._id} value={t._id}>{t.title}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => { resetSubTopicForm(); setShowSubTopicModal(true); }}>
              + Add Sub-Topic
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Title</th>
                  <th>Topic</th>
                  <th>Chapter</th>
                  <th>Day</th>
                  <th>Schedule</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubTopics.map(st => (
                  <tr key={st._id}>
                    <td>{st.order}</td>
                    <td>{st.title}</td>
                    <td>{st.topicId?.title}</td>
                    <td>{st.chapterId?.title}</td>
                    <td>{st.scheduledDay != null ? `Day ${st.scheduledDay}` : '-'}</td>
                    <td>
                      {st.startTime && st.endTime 
                        ? `${st.startTime} - ${st.endTime}` 
                        : st.scheduledDate 
                          ? new Date(st.scheduledDate).toLocaleDateString() 
                          : '-'}
                    </td>
                    <td>{st.durationMinutes ? `${st.durationMinutes} min` : '-'}</td>
                    <td>
                      <span className={`status-badge ${st.isActive ? 'active' : 'inactive'}`}>
                        {st.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="action-link edit" onClick={() => openEditSubTopic(st)}>Edit</button>
                      <button className="action-link danger" onClick={() => handleDeleteSubTopic(st._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? 'Edit Course' : 'Add Course'}</h2>
              <button className="close-btn" onClick={() => setShowCourseModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCourse}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course Code *</label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={e => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., JAVA-FS"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                    placeholder="e.g., Java Fullstack Development"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={courseForm.description}
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Course description..."
                  rows={3}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={e => setCourseForm({ ...courseForm, category: e.target.value })}
                    placeholder="e.g., Web Development"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Level *</label>
                  <select
                    value={courseForm.level}
                    onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Instructor *</label>
                  <select
                    value={courseForm.instructor}
                    onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })}
                    required
                  >
                    <option value="">Select Instructor</option>
                    {instructors.map(i => (
                      <option key={i._id} value={i._id}>{i.firstName} {i.lastName}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <div className="duration-input">
                    <input
                      type="number"
                      value={courseForm.durationValue}
                      onChange={e => setCourseForm({ ...courseForm, durationValue: parseInt(e.target.value) })}
                      min={1}
                    />
                    <select
                      value={courseForm.durationUnit}
                      onChange={e => setCourseForm({ ...courseForm, durationUnit: e.target.value })}
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCourseModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingCourse ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="modal-overlay" onClick={() => setShowSubjectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
              <button className="close-btn" onClick={() => setShowSubjectModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubject}>
              <div className="form-group">
                <label>Course *</label>
                <select
                  value={subjectForm.courseId}
                  onChange={e => setSubjectForm({ ...subjectForm, courseId: e.target.value })}
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Subject Code *</label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., CORE-JAVA"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={subjectForm.name}
                    onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g., Core Java"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={subjectForm.description}
                  onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  placeholder="Subject description..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <div className="duration-input">
                  <input
                    type="number"
                    value={subjectForm.durationValue}
                    onChange={e => setSubjectForm({ ...subjectForm, durationValue: parseInt(e.target.value) })}
                    min={1}
                  />
                  <select
                    value={subjectForm.durationUnit}
                    onChange={e => setSubjectForm({ ...subjectForm, durationUnit: e.target.value })}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSubjectModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingSubject ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="modal-overlay" onClick={() => setShowChapterModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingChapter ? 'Edit Chapter' : 'Add Chapter'}</h2>
              <button className="close-btn" onClick={() => setShowChapterModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateChapter}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    value={chapterForm.courseId}
                    onChange={e => {
                      setChapterForm({ ...chapterForm, courseId: e.target.value, subjectId: '' });
                    }}
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    value={chapterForm.subjectId}
                    onChange={e => setChapterForm({ ...chapterForm, subjectId: e.target.value })}
                    required
                    disabled={!chapterForm.courseId}
                  >
                    <option value="">Select Subject</option>
                    {subjects.filter(s => s.courseId._id === chapterForm.courseId).map(s => (
                      <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })}
                  placeholder="e.g., Data Types and Variables"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={chapterForm.description}
                  onChange={e => setChapterForm({ ...chapterForm, description: e.target.value })}
                  placeholder="Chapter description..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Estimated Duration (minutes)</label>
                <input
                  type="number"
                  value={chapterForm.estimatedDuration}
                  onChange={e => setChapterForm({ ...chapterForm, estimatedDuration: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowChapterModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingChapter ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTopic ? 'Edit Topic' : 'Add Topic'}</h2>
              <button className="close-btn" onClick={() => setShowTopicModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTopic}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    value={topicForm.courseId}
                    onChange={e => setTopicForm({ ...topicForm, courseId: e.target.value, subjectId: '', chapterId: '' })}
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    value={topicForm.subjectId}
                    onChange={e => setTopicForm({ ...topicForm, subjectId: e.target.value, chapterId: '' })}
                    required
                    disabled={!topicForm.courseId}
                  >
                    <option value="">Select Subject</option>
                    {subjects.filter(s => s.courseId._id === topicForm.courseId).map(s => (
                      <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Chapter *</label>
                <select
                  value={topicForm.chapterId}
                  onChange={e => setTopicForm({ ...topicForm, chapterId: e.target.value })}
                  required
                  disabled={!topicForm.subjectId}
                >
                  <option value="">Select Chapter</option>
                  {chapters.filter(ch => ch.subjectId._id === topicForm.subjectId).map(ch => (
                    <option key={ch._id} value={ch._id}>{ch.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={e => setTopicForm({ ...topicForm, title: e.target.value })}
                  placeholder="e.g., Introduction to Data Types"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={topicForm.description}
                  onChange={e => setTopicForm({ ...topicForm, description: e.target.value })}
                  placeholder="Topic description..."
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowTopicModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingTopic ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-Topic Modal */}
      {showSubTopicModal && (
        <div className="modal-overlay" onClick={() => setShowSubTopicModal(false)}>
          <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubTopic ? 'Edit Sub-Topic' : 'Add Sub-Topic'}</h2>
              <button className="close-btn" onClick={() => setShowSubTopicModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubTopic}>
              <div className="form-row">
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    value={subTopicForm.courseId}
                    onChange={e => setSubTopicForm({ ...subTopicForm, courseId: e.target.value, subjectId: '', chapterId: '', topicId: '' })}
                    required
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.code} - {c.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    value={subTopicForm.subjectId}
                    onChange={e => setSubTopicForm({ ...subTopicForm, subjectId: e.target.value, chapterId: '', topicId: '' })}
                    required
                    disabled={!subTopicForm.courseId}
                  >
                    <option value="">Select Subject</option>
                    {subjects.filter(s => s.courseId._id === subTopicForm.courseId).map(s => (
                      <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Chapter *</label>
                  <select
                    value={subTopicForm.chapterId}
                    onChange={e => setSubTopicForm({ ...subTopicForm, chapterId: e.target.value, topicId: '' })}
                    required
                    disabled={!subTopicForm.subjectId}
                  >
                    <option value="">Select Chapter</option>
                    {chapters.filter(ch => ch.subjectId._id === subTopicForm.subjectId).map(ch => (
                      <option key={ch._id} value={ch._id}>{ch.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Topic *</label>
                  <select
                    value={subTopicForm.topicId}
                    onChange={e => setSubTopicForm({ ...subTopicForm, topicId: e.target.value })}
                    required
                    disabled={!subTopicForm.chapterId}
                  >
                    <option value="">Select Topic</option>
                    {topics.filter(t => t.chapterId._id === subTopicForm.chapterId).map(t => (
                      <option key={t._id} value={t._id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={subTopicForm.title}
                  onChange={e => setSubTopicForm({ ...subTopicForm, title: e.target.value })}
                  placeholder="e.g., Primitive vs Reference Types"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={subTopicForm.description}
                  onChange={e => setSubTopicForm({ ...subTopicForm, description: e.target.value })}
                  placeholder="Sub-topic description..."
                  rows={2}
                />
              </div>
              <div className="form-section-label">Schedule (Optional)</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Day Number</label>
                  <input
                    type="number"
                    value={subTopicForm.scheduledDay}
                    onChange={e => setSubTopicForm({ ...subTopicForm, scheduledDay: e.target.value })}
                    placeholder="e.g., 1"
                    min={1}
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={subTopicForm.scheduledDate}
                    onChange={e => setSubTopicForm({ ...subTopicForm, scheduledDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={subTopicForm.startTime}
                    onChange={e => setSubTopicForm({ ...subTopicForm, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={subTopicForm.endTime}
                    onChange={e => setSubTopicForm({ ...subTopicForm, endTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (min)</label>
                  <input
                    type="number"
                    value={subTopicForm.durationMinutes}
                    onChange={e => setSubTopicForm({ ...subTopicForm, durationMinutes: e.target.value })}
                    placeholder="e.g., 45"
                    min={1}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSubTopicModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingSubTopic ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
