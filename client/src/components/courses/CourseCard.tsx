import React from 'react';

interface Course {
  _id: string;
  title: string;
  description?: string;
  instructor?: string | { firstName: string; lastName: string };
  students?: number;
}


interface CourseCardProps {
  course: Course;
  isEnrolled: boolean;
  onEnroll: () => Promise<void>;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isEnrolled,
  onEnroll
}) => {
  const instructorName = typeof course.instructor === 'string' 
    ? course.instructor 
    : course.instructor 
      ? `${course.instructor.firstName} ${course.instructor.lastName}`
      : 'N/A';

  return (
    <div className="course-card">
      <h3>{course.title}</h3>
      {course.description && <p>{course.description}</p>}
      {course.instructor && <p className="instructor">Instructor: {instructorName}</p>}
      {course.students !== undefined && <p className="students">Students: {course.students}</p>}
      <button onClick={onEnroll} disabled={isEnrolled}>
        {isEnrolled ? 'Already Enrolled' : 'Enroll'}
      </button>
    </div>
  );
};

export default CourseCard;