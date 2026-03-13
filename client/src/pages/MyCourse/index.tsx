import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentApi, subjectApi, chapterApi, progressApi, quizApi, interviewQuestionApi } from '../../api';
import { contentAPI } from '../../api/contentAPI';
import { assignmentApi } from '../../api/assignmentApi';
import { Spinner, Alert } from '../../components/common';
import WeekNavigator from '../../components/dashboard/WeekNavigator';
import './MyCourse.css';

interface Video {
  title: string;
  url: string;
  duration: number;
  order: number;
}

interface Note {
  title: string;
  content: string;
  attachmentUrl?: string;
  order: number;
}

interface Chapter {
  _id: string;
  title: string;
  description: string;
  order: number;
  videos: Video[];
  notes: Note[];
  quizId?: string;
  quizzes?: Quiz[];
  content?: ChapterContent[]; // Notes and cheatsheets
  assignmentIds: string[];
  assignments?: ChapterAssignment[];
  interviewQuestions?: InterviewQuestion[];
  estimatedDuration: number;
  subjectName?: string;
  subjectId?: string;
}

interface ChapterAssignment {
  _id: string;
  title: string;
  type: string;
  difficulty: string;
  totalPoints: number;
}

interface InterviewQuestion {
  _id: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  companyTags: string[];
  order: number;
}

interface Quiz {
  _id: string;
  title: string;
  description: string;
  totalQuestions: number;
  totalMarks: number;
  totalTime: number;
  isAttempted?: boolean;
  attemptCount?: number;
}

interface ChapterContent {
  _id: string;
  type: 'note' | 'cheatsheet';
  title: string;
  description?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  createdAt: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  description: string;
  order: number;
  chapters: Chapter[];
}

interface Course {
  _id: string;
  title: string;
  code: string;
  description: string;
}

interface ScheduleItem {
  date: Date;
  chapter: Chapter;
  subjectName: string;
  isCompleted: boolean;
}

const MyCourse: React.FC = () => {
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
  const [activeChapterTab, setActiveChapterTab] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [enrollmentDate, setEnrollmentDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchCourseData();
  }, []);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      // Get student's enrollment
      const enrollmentRes = await enrollmentApi.getMyEnrollments();
      const enrollments = enrollmentRes.data || [];
      
      if (enrollments.length === 0) {
        setError('You are not enrolled in any course.');
        setLoading(false);
        return;
      }

      const enrollment = enrollments[0];
      const courseData = enrollment.courseId;
      
      // Set enrollment date for calendar
      if (enrollment.createdAt) {
        setEnrollmentDate(new Date(enrollment.createdAt));
      }
      
      if (!courseData || !courseData._id) {
        setError('Course data not found.');
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // Get subjects for this course
      const subjectsRes = await subjectApi.getSubjectsByCourse(courseData._id);
      const subjectsData = subjectsRes.data || [];

      // Get chapters for each subject and their quizzes
      const subjectsWithChapters = await Promise.all(
        subjectsData.map(async (subject: any) => {
          const chaptersRes = await chapterApi.getChaptersBySubject(subject._id);
          const chapters = chaptersRes.data || [];
          
          // Fetch quizzes and content for each chapter
          const chaptersWithQuizzes = await Promise.all(
            chapters.map(async (chapter: Chapter) => {
              let quizzes: Quiz[] = [];
              let content: ChapterContent[] = [];
              let assignments: ChapterAssignment[] = [];
              
              // Fetch quizzes for chapter
              try {
                const quizzesRes = await quizApi.getQuizzesByChapter(chapter._id);
                quizzes = quizzesRes || [];
              } catch (err) {
                // No quizzes or error
              }
              
              // Fetch content (notes/cheatsheets) for chapter
              try {
                const contentRes = await contentAPI.getContentByChapter(chapter._id);
                content = contentRes.data || [];
              } catch (err) {
                // No content or error
              }

              // Fetch assignments for chapter
              if (chapter.assignmentIds && chapter.assignmentIds.length > 0) {
                try {
                  const assignmentPromises = chapter.assignmentIds.map(async (id: string) => {
                    try {
                      const res = await assignmentApi.getById(id);
                      const a = res.data?.data;
                      if (a) {
                        return { 
                          _id: a._id, 
                          title: a.title, 
                          type: String(a.type), 
                          difficulty: String(a.difficulty), 
                          totalPoints: a.totalPoints 
                        } as ChapterAssignment;
                      }
                      return null;
                    } catch {
                      return null;
                    }
                  });
                  const fetchedAssignments = await Promise.all(assignmentPromises);
                  assignments = fetchedAssignments.filter((a): a is ChapterAssignment => a !== null);
                } catch (err) {
                  // No assignments or error
                }
              }

              // Fetch interview questions for chapter
              let interviewQuestions: InterviewQuestion[] = [];
              try {
                const iqRes = await interviewQuestionApi.getQuestionsByChapter(chapter._id);
                interviewQuestions = iqRes.data || [];
              } catch (err) {
                // No interview questions or error
              }
              
              return { ...chapter, quizzes, content, assignments, interviewQuestions };
            })
          );
          
          return {
            ...subject,
            chapters: chaptersWithQuizzes.sort((a: Chapter, b: Chapter) => a.order - b.order)
          };
        })
      );

      setSubjects(subjectsWithChapters.sort((a, b) => a.order - b.order));

      // Fetch completed chapters
      try {
        const progressRes = await progressApi.getCompletedChapters(courseData._id);
        if (progressRes.completedChapterIds) {
          setCompletedChapters(new Set(progressRes.completedChapterIds));
        }
      } catch (progressErr) {
        console.log('No progress data yet');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Generate course schedule - distribute chapters across dates
  const courseSchedule = useMemo(() => {
    const schedule: Map<string, ScheduleItem> = new Map();
    const startDate = new Date(enrollmentDate);
    let dayOffset = 0;

    subjects.forEach(subject => {
      subject.chapters.forEach(chapter => {
        const scheduleDate = new Date(startDate);
        scheduleDate.setDate(scheduleDate.getDate() + dayOffset);
        
        const dateKey = scheduleDate.toISOString().split('T')[0];
        
        schedule.set(dateKey, {
          date: scheduleDate,
          chapter: { ...chapter, subjectName: subject.name, subjectId: subject._id },
          subjectName: subject.name,
          isCompleted: completedChapters.has(chapter._id)
        });
        
        dayOffset++; // One chapter per day
      });
    });

    return schedule;
  }, [subjects, enrollmentDate, completedChapters]);

  // Get all chapters as flat list for schedule
  const allChapters = useMemo(() => {
    const chapters: (Chapter & { subjectName: string; subjectId: string })[] = [];
    subjects.forEach(subject => {
      subject.chapters.forEach(chapter => {
        chapters.push({ ...chapter, subjectName: subject.name, subjectId: subject._id });
      });
    });
    return chapters;
  }, [subjects]);

  // Week navigation helpers
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const dateKey = date.toISOString().split('T')[0];
    const scheduleItem = courseSchedule.get(dateKey);
    
    if (scheduleItem) {
      // Expand the subject and chapter
      setExpandedSubjects(prev => new Set([...prev, scheduleItem.chapter.subjectId!]));
      setExpandedChapters(prev => new Set([...prev, scheduleItem.chapter._id]));
      
      // Scroll to the chapter
      setTimeout(() => {
        const element = document.getElementById(`chapter-${scheduleItem.chapter._id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  // Mark chapter as complete
  const markChapterComplete = async (chapterId: string) => {
    try {
      await progressApi.markChapterComplete(chapterId);
      setCompletedChapters(prev => new Set([...prev, chapterId]));
    } catch (err: any) {
      console.error('Failed to mark chapter complete:', err);
      setError('Failed to mark chapter as complete');
    }
  };

  // Get chapter for selected date
  const getSelectedDayChapter = () => {
    const dateKey = selectedDate.toISOString().split('T')[0];
    return courseSchedule.get(dateKey);
  };

  const selectedDayChapter = getSelectedDayChapter();

  if (loading) return <Spinner fullScreen />;

  if (!course) {
    return (
      <div className="my-course-page">
        <div className="no-course-message">
          <h2>No Course Enrolled</h2>
          <p>You haven't enrolled in any course yet. Please visit the Courses page to enroll.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-course-page">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Weekly Calendar with Course Info */}
      <div className="calendar-section">
        <div className="calendar-row">
          <WeekNavigator
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            minDate={enrollmentDate}
          />
          <div className="course-info-compact">
            <span className="course-name">{course.title}</span>
            <span className="course-stats">{subjects.length} Subjects • {subjects.reduce((acc, s) => acc + s.chapters.length, 0)} Chapters</span>
          </div>
        </div>

        {/* Selected Day's Topic */}
        {selectedDayChapter && (
          <div className="selected-topic-compact">
            <span className="topic-chapter">{selectedDayChapter.chapter.title}</span>
            <span className="topic-divider">|</span>
            <span className="topic-subject">{selectedDayChapter.subjectName}</span>
            <span className="topic-divider">|</span>
            <span className={`topic-status ${selectedDayChapter.isCompleted ? 'completed' : 'upcoming'}`}>
              {selectedDayChapter.isCompleted ? 'Completed' : 'Upcoming'}
            </span>
          </div>
        )}

        {!selectedDayChapter && (
          <div className="no-chapter-compact">
            No chapter scheduled for this day
          </div>
        )}
      </div>

      {/* Subjects List */}
      <div className="subjects-container">
        {subjects.length === 0 ? (
          <div className="no-content">
            <p>No subjects available for this course yet.</p>
          </div>
        ) : (
          subjects.map((subject, subjectIndex) => (
            <div key={subject._id} className="subject-card">
              <div 
                className={`subject-header ${expandedSubjects.has(subject._id) ? 'expanded' : ''}`}
                onClick={() => toggleSubject(subject._id)}
              >
                <div className="subject-title">
                  <span className="subject-number">{subjectIndex + 1}</span>
                  <div className="subject-name-wrapper">
                    <h3>{subject.name}</h3>
                    <span className="subject-code">{subject.code}</span>
                  </div>
                </div>
                <div className="subject-meta">
                  <span className="chapter-count">{subject.chapters.length} Chapters</span>
                  <span className={`expand-icon ${expandedSubjects.has(subject._id) ? 'rotated' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {expandedSubjects.has(subject._id) && (
                <div className="chapters-list">
                  {subject.chapters.length === 0 ? (
                    <div className="no-chapters">No chapters available</div>
                  ) : (
                    subject.chapters.map((chapter, chapterIndex) => {
                      const dateKey = Array.from(courseSchedule.entries()).find(
                        ([, item]) => item.chapter._id === chapter._id
                      )?.[0];
                      const isHighlighted = selectedDate && dateKey === selectedDate.toISOString().split('T')[0];
                      
                      return (
                      <div 
                        key={chapter._id} 
                        id={`chapter-${chapter._id}`}
                        className={`chapter-item ${isHighlighted ? 'highlighted' : ''} ${completedChapters.has(chapter._id) ? 'chapter-completed' : ''}`}
                      >
                        <div 
                          className={`chapter-header ${expandedChapters.has(chapter._id) ? 'expanded' : ''}`}
                          onClick={() => toggleChapter(chapter._id)}
                        >
                          <div className="chapter-title">
                            {completedChapters.has(chapter._id) && (
                              <span className="chapter-check">✓</span>
                            )}
                            <span className="chapter-number">{subjectIndex + 1}.{chapterIndex + 1}</span>
                            <span className="chapter-name">{chapter.title}</span>
                            {dateKey && (
                              <span className="chapter-date">
                                {new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          <div className="chapter-meta">
                            {chapter.estimatedDuration > 0 && (
                              <span className="duration">{formatDuration(chapter.estimatedDuration)}</span>
                            )}
                            <span className={`expand-icon small ${expandedChapters.has(chapter._id) ? 'rotated' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </div>

                        {expandedChapters.has(chapter._id) && (
                          <div className="chapter-content">
                            {chapter.description && (
                              <p className="chapter-description">{chapter.description}</p>
                            )}

                            {/* Tabbed Content Interface */}
                            {(() => {
                              const tabs = [
                                { id: 'videos', icon: '🎬', label: 'Videos', count: chapter.videos.length },
                                { id: 'notes', icon: '📄', label: 'Notes', count: chapter.notes.length },
                                { id: 'quizzes', icon: '📝', label: 'Quizzes', count: chapter.quizzes?.length || 0 },
                                { id: 'resources', icon: '📋', label: 'Resources', count: chapter.content?.length || 0 },
                                { id: 'assignments', icon: '✍️', label: 'Assignments', count: chapter.assignments?.length || 0 },
                                { id: 'interview', icon: '💼', label: 'Interview Q&A', count: chapter.interviewQuestions?.length || 0 },
                              ].filter(tab => tab.count > 0);

                              const activeTab = activeChapterTab[chapter._id] || tabs[0]?.id || '';
                              const setTab = (tabId: string) => setActiveChapterTab(prev => ({ ...prev, [chapter._id]: tabId }));

                              if (tabs.length === 0) {
                                return (
                                  <div className="no-content-message">
                                    No content available for this chapter yet.
                                  </div>
                                );
                              }

                              return (
                                <div className="chapter-tabs-container">
                                  {/* Tab Headers */}
                                  <div className="chapter-tabs">
                                    {tabs.map(tab => (
                                      <button
                                        key={tab.id}
                                        className={`chapter-tab ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => setTab(tab.id)}
                                      >
                                        <span className="tab-icon">{tab.icon}</span>
                                        <span className="tab-label">{tab.label}</span>
                                        <span className="tab-count">{tab.count}</span>
                                      </button>
                                    ))}
                                  </div>

                                  {/* Tab Content */}
                                  <div className="chapter-tab-content">
                                    {activeTab === 'videos' && (
                                      <div className="tab-panel">
                                        {chapter.videos.sort((a, b) => a.order - b.order).map((video, idx) => (
                                          <a key={idx} href={video.url} target="_blank" rel="noopener noreferrer" className="content-item video-item">
                                            <span className="item-icon">▶️</span>
                                            <span className="item-title">{video.title}</span>
                                            {video.duration > 0 && <span className="item-meta">{formatDuration(video.duration)}</span>}
                                          </a>
                                        ))}
                                      </div>
                                    )}

                                    {activeTab === 'notes' && (
                                      <div className="tab-panel">
                                        {chapter.notes.sort((a, b) => a.order - b.order).map((note, idx) => (
                                          <div key={idx} className="content-item note-item">
                                            <span className="item-icon">📄</span>
                                            <span className="item-title">{note.title}</span>
                                            {note.attachmentUrl && (
                                              <a href={note.attachmentUrl} target="_blank" rel="noopener noreferrer" className="item-action">
                                                ⬇ Download
                                              </a>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {activeTab === 'quizzes' && chapter.quizzes && (
                                      <div className="tab-panel">
                                        {chapter.quizzes.map((quiz) => (
                                          <div key={quiz._id} className="content-item quiz-item">
                                            <div className="item-main">
                                              <span className="item-icon">📝</span>
                                              <div className="item-details">
                                                <span className="item-title">{quiz.title}</span>
                                                <span className="item-subtitle">{quiz.totalQuestions} questions • {quiz.totalMarks} marks • {quiz.totalTime} min</span>
                                              </div>
                                            </div>
                                            <button className="item-btn primary" onClick={() => navigate(`/quiz/${quiz._id}/take`)}>
                                              {quiz.isAttempted ? 'Retake' : 'Start'}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {activeTab === 'resources' && chapter.content && (
                                      <div className="tab-panel">
                                        {chapter.content.map((item) => (
                                          <div key={item._id} className="content-item resource-item">
                                            <div className="item-main">
                                              <span className="item-icon">{item.type === 'cheatsheet' ? '📋' : '📝'}</span>
                                              <div className="item-details">
                                                <span className="item-title">{item.title}</span>
                                                <span className={`item-badge ${item.type}`}>{item.type}</span>
                                              </div>
                                            </div>
                                            {item.attachments && item.attachments.length > 0 && (
                                              <a href={`${window.location.origin}${item.attachments[0].url}`} target="_blank" rel="noopener noreferrer" className="item-action">
                                                ⬇ Download
                                              </a>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {activeTab === 'assignments' && chapter.assignments && (
                                      <div className="tab-panel">
                                        {chapter.assignments.map((assignment) => (
                                          <div key={assignment._id} className="content-item assignment-item">
                                            <div className="item-main">
                                              <span className="item-icon">✍️</span>
                                              <div className="item-details">
                                                <span className="item-title">{assignment.title}</span>
                                                <span className={`item-badge ${assignment.type.toLowerCase()}`}>{assignment.type}</span>
                                              </div>
                                            </div>
                                            <button className="item-btn secondary" onClick={() => navigate(`/assignments/${assignment._id}/workspace`)}>
                                              View
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {activeTab === 'interview' && chapter.interviewQuestions && (
                                      <div className="tab-panel">
                                        <div className="interview-tab-header">
                                          <span>{chapter.interviewQuestions.length} questions</span>
                                          <button className="practice-all-btn" onClick={() => navigate(`/interview-questions/${chapter._id}`)}>
                                            Practice All →
                                          </button>
                                        </div>
                                        {chapter.interviewQuestions.slice(0, 5).map((iq) => (
                                          <div key={iq._id} className="content-item interview-item">
                                            <div className="item-main">
                                              <span className="item-icon">💡</span>
                                              <div className="item-details">
                                                <span className="item-title">{iq.question.length > 60 ? iq.question.substring(0, 60) + '...' : iq.question}</span>
                                                <div className="item-tags">
                                                  <span className={`difficulty-tag ${iq.difficulty}`}>{iq.difficulty}</span>
                                                  {iq.companyTags.slice(0, 2).map((tag, i) => (
                                                    <span key={i} className="company-tag">{tag}</span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {chapter.interviewQuestions.length > 5 && (
                                          <div className="show-more" onClick={() => navigate(`/interview-questions/${chapter._id}`)}>
                                            +{chapter.interviewQuestions.length - 5} more questions
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Mark Complete Button */}
                            <div className="chapter-actions">
                              {completedChapters.has(chapter._id) ? (
                                <span className="completed-badge">✓ Completed</span>
                              ) : (
                                <button 
                                  className="mark-complete-btn"
                                  onClick={() => markChapterComplete(chapter._id)}
                                >
                                  Mark as Complete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );})
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyCourse;
