import React, { useEffect, useState, useMemo } from 'react';
import { enrollmentApi, subjectApi, chapterApi, progressApi } from '../../api';
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
  assignmentIds: string[];
  estimatedDuration: number;
  subjectName?: string;
  subjectId?: string;
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
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [completedChapters, setCompletedChapters] = useState<Set<string>>(new Set());
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

      // Get chapters for each subject
      const subjectsWithChapters = await Promise.all(
        subjectsData.map(async (subject: any) => {
          const chaptersRes = await chapterApi.getChaptersBySubject(subject._id);
          return {
            ...subject,
            chapters: (chaptersRes.data || []).sort((a: Chapter, b: Chapter) => a.order - b.order)
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

                            {/* Videos */}
                            {chapter.videos.length > 0 && (
                              <div className="content-section">
                                <h4>Videos</h4>
                                <ul className="content-list">
                                  {chapter.videos.sort((a, b) => a.order - b.order).map((video, idx) => (
                                    <li key={idx} className="content-item video">
                                      <span className="content-icon">🎬</span>
                                      <a href={video.url} target="_blank" rel="noopener noreferrer">
                                        {video.title}
                                      </a>
                                      {video.duration > 0 && (
                                        <span className="item-duration">{formatDuration(video.duration)}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Notes */}
                            {chapter.notes.length > 0 && (
                              <div className="content-section">
                                <h4>Notes</h4>
                                <ul className="content-list">
                                  {chapter.notes.sort((a, b) => a.order - b.order).map((note, idx) => (
                                    <li key={idx} className="content-item note">
                                      <span className="content-icon">📄</span>
                                      <span className="note-title">{note.title}</span>
                                      {note.attachmentUrl && (
                                        <a href={note.attachmentUrl} target="_blank" rel="noopener noreferrer" className="attachment-link">
                                          Download
                                        </a>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Quiz */}
                            {chapter.quizId && (
                              <div className="content-section">
                                <h4>Quiz</h4>
                                <div className="quiz-item">
                                  <span className="content-icon">📝</span>
                                  <span>Chapter Quiz</span>
                                  <button className="start-quiz-btn">Start Quiz</button>
                                </div>
                              </div>
                            )}

                            {/* Assignments */}
                            {chapter.assignmentIds && chapter.assignmentIds.length > 0 && (
                              <div className="content-section">
                                <h4>Assignments</h4>
                                <div className="assignment-item">
                                  <span className="content-icon">✍️</span>
                                  <span>{chapter.assignmentIds.length} Assignment(s)</span>
                                  <button className="view-assignment-btn">View</button>
                                </div>
                              </div>
                            )}

                            {/* Empty state */}
                            {chapter.videos.length === 0 && chapter.notes.length === 0 && !chapter.quizId && (!chapter.assignmentIds || chapter.assignmentIds.length === 0) && (
                              <div className="no-content-message">
                                No content available for this chapter yet.
                              </div>
                            )}

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
