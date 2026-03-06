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

  const hasAnyEnrollment = enrollments.length > 0;

  // Show only published courses to students
  const publishedCourses = courses.filter(c => c.isPublished);

  if (loading) return <Spinner fullScreen />;

  // If student is already enrolled, show their course
  if (hasAnyEnrollment) {
    const enrolledCourse = courses.find(c => isEnrolled(c._id));
    return (
      <div className="courses-page">
        <div className="courses-header">
          <h1>My Course</h1>
          <p className="courses-subtitle">Your enrolled course</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <div className="courses-grid">
          {enrolledCourse && (
            <CourseCard
              key={enrolledCourse._id}
              course={enrolledCourse}
              isEnrolled={true}
              onEnroll={() => Promise.resolve()}
            />
          )}
        </div>
      </div>
    );
  }

  // If not enrolled, show available courses
  return (
    <div className="courses-page">
      <div className="courses-header">
        <h1>Available Courses</h1>
        <p className="courses-subtitle">Select a course to enroll</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="courses-grid">
        {publishedCourses.length === 0 ? (
          <div className="no-courses">
            <p>No courses available at the moment.</p>
          </div>
        ) : (
          publishedCourses.map((course) => (
            <CourseCard
              key={course._id}
              course={course}
              isEnrolled={false}
              onEnroll={() => handleEnroll(course._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CoursesPage;