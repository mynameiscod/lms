import React, { useEffect, useState } from 'react';
import { courseApi, enrollmentApi } from '../../api';
import { CourseCard } from '../../components/courses';
import { Spinner, Alert } from '../../components/common';
import { Course, Enrollment } from '../../types';
import './CoursesPage.css';

const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, enrollmentsRes] = await Promise.all([
          courseApi.getCourses(),
          enrollmentApi.getMyEnrollments()
        ]);

        setCourses(coursesRes.data || []);
        setEnrollments(enrollmentsRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch courses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEnroll = async (courseId: string) => {
    try {
      await enrollmentApi.enrollCourse(courseId);
      const enrollmentsRes = await enrollmentApi.getMyEnrollments();
      setEnrollments(enrollmentsRes.data || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to enroll');
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some((e) => e.courseId === courseId);
  };

  const filteredCourses = courses.filter((course) => {
    if (filter === 'enrolled') {
      return isEnrolled(course._id);
    }
    if (filter === 'available') {
      return !isEnrolled(course._id);
    }
    return true;
  });

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="courses-page">
      <div className="courses-header">
        <h1>Courses</h1>
        <p className="courses-subtitle">Explore and enroll in our courses</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="filter-bar">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Courses ({courses.length})
        </button>
        <button
          className={`filter-btn ${filter === 'enrolled' ? 'active' : ''}`}
          onClick={() => setFilter('enrolled')}
        >
          My Courses ({enrollments.length})
        </button>
        <button
          className={`filter-btn ${filter === 'available' ? 'active' : ''}`}
          onClick={() => setFilter('available')}
        >
          Available ({courses.length - enrollments.length})
        </button>
      </div>

      <div className="courses-grid">
        {filteredCourses.length === 0 ? (
          <div className="no-courses">
            <p>No courses found. Try a different filter.</p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <CourseCard
              key={course._id}
              course={course}
              isEnrolled={isEnrolled(course._id)}
              onEnroll={() => handleEnroll(course._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesPage;