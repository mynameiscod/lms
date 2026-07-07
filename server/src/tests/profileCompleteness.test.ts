import { computeProfileCompleteness, computeProfileMissing } from '../utils/profileCompleteness';

describe('profileCompleteness utilities', () => {
  it('returns 0 when profile is null or empty', () => {
    expect(computeProfileCompleteness(null)).toBe(0);
    expect(computeProfileCompleteness({})).toBe(0);
  });

  it('returns 100 when all required profile fields are present', () => {
    const fullProfile = {
      personalInfo: {
        firstName: 'John',
        surname: 'Doe',
        email: 'john@example.com',
        mobileNumber: '+911234567890',
        country: 'India',
        state: 'Karnataka',
        city: 'Bengaluru',
        gender: 'Male',
        dateOfBirth: '1995-01-01',
      },
      professionalProfiles: {
        resumeUrl: 'https://example.com/resume.pdf',
      },
      education: {
        highestQualification: 'B.Tech/B.E.',
        currentStatus: 'Student',
        tenthClass: {
          schoolName: 'ABC School',
        },
      },
      technicalBackground: {
        programmingLanguages: ['JavaScript'],
        technologies: ['React'],
        experienceLevel: 'Beginner',
      },
      courseInterest: {
        interestedCourse: 'MERN Stack',
        preferredLearningMode: 'Online',
        preferredBatchTime: 'Evening',
      },
      additionalInfo: {
        careerGoal: 'Become a software developer',
      },
    };

    expect(computeProfileCompleteness(fullProfile)).toBe(100);
    expect(computeProfileMissing(fullProfile)).toEqual([]);
  });

  it('marks only filled sections as complete using stored profile rules', () => {
    const partialProfile = {
      personalInfo: {
        firstName: 'Jane',
        surname: 'Smith',
        email: 'jane@example.com',
        mobileNumber: '+911234567890',
        country: 'India',
        state: 'Delhi',
        city: 'New Delhi',
        gender: 'Female',
        dateOfBirth: '1998-05-10',
        address: '123 Street',
      },
      professionalProfiles: {
        linkedInUrl: 'https://linkedin.com/in/jane',
      },
      education: {
        highestQualification: '12th Standard',
        currentStatus: 'Student',
        tenthClass: {
          schoolName: 'XYZ School',
        },
      },
      technicalBackground: {
        programmingLanguages: ['Python'],
        technologies: [],
        experienceLevel: 'Intermediate',
      },
      courseInterest: {
        interestedCourse: 'Data Science',
        preferredLearningMode: 'Online',
        preferredBatchTime: 'Morning',
      },
      additionalInfo: {
        howDidYouHear: 'LinkedIn',
      },
    };

    const completeness = computeProfileCompleteness(partialProfile);
    expect(completeness).toBeGreaterThan(0);
    expect(computeProfileMissing(partialProfile).some((item) => item.section === 'Technical')).toBe(true);
  });
});
