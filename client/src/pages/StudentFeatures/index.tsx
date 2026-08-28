import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantApi } from '../../api';
import './StudentFeaturesPage.css';

interface FeatureConfig {
  dashboard: boolean;
  myCourse: boolean;
  topicHub: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  mockInterviews: boolean;
  codingSnippets: boolean;
  classHub: boolean;
  feeDetails: boolean;
  scheduledInterviews: boolean;
  resumeBuilder: boolean;
  learningPlan: boolean;
  thinkingLab: boolean;
  speakingPractice: boolean;
  jobTracker: boolean;
  aiMentor: boolean;
  projectBuilder: boolean;
  resourceLibrary: boolean;
  codePlayground: boolean;
  careerProfile: boolean;
  aiCommunicationLab: boolean;
  liveClasses: boolean;
  collegePortal: boolean;
  myApplications: boolean;
  alumniDirectory: boolean;
}

// Map each student feature to the module that must be enabled for it
const FEATURE_MODULE_MAP: Record<keyof FeatureConfig, string | null> = {
  dashboard:            null,
  myCourse:             'courses',
  topicHub:             'courses',
  classHub:             'classRecordings',
  attendance:           'attendance',
  quizzes:              'quizzes',
  assignments:          'assignments',
  mockInterviews:       'mockInterviews',
  codingSnippets:       'codeEditor',
  feeDetails:           null,
  scheduledInterviews:  null,
  resumeBuilder:        null,
  learningPlan:         'courses',
  thinkingLab:          'thinkingLab',
  speakingPractice:     'speakingPractice',
  jobTracker:           'careerPilot',
  aiMentor:             'careerPilot',
  projectBuilder:       'careerPilot',
  resourceLibrary:      'resourceLibrary',
  codePlayground:       'codeAssessments',
  careerProfile:        'careerPilot',
  aiCommunicationLab:   'aiCommunicationLab',
  liveClasses:          null,
  collegePortal:        'placement',
  myApplications:       'placement',
  alumniDirectory:      'placement',
};

type FeatureGroup = 'Home' | 'Daily Practice' | 'My Learning' | 'Prep & Career' | 'College' | 'My Account';
const GROUP_ORDER: FeatureGroup[] = ['Home', 'Daily Practice', 'My Learning', 'Prep & Career', 'College', 'My Account'];

const FEATURE_META: { key: keyof FeatureConfig; label: string; description: string; icon: string; group: FeatureGroup }[] = [
  // Home
  { key: 'dashboard',      label: 'Dashboard',                       description: 'Student dashboard with stats, progress, deadlines, and daily challenge cards', icon: '☑', group: 'Home' },
  // Daily Practice
  { key: 'aiCommunicationLab', label: 'AI Communication Lab', description: 'Daily self-introduction practice — record, get AI feedback, build a streak', icon: '🎙', group: 'Daily Practice' },
  { key: 'thinkingLab',     label: 'Thinking Lab',    description: 'AI-graded logic, aptitude and problem-solving drills', icon: '🧩', group: 'Daily Practice' },
  { key: 'speakingPractice',label: 'Speaking Practice (retired)', description: 'Superseded by AI Communication Lab — hidden from students. Leave off unless you specifically need the old tool.', icon: '🗣', group: 'Daily Practice' },
  // My Learning
  { key: 'myCourse',       label: 'My Course',                       description: 'Course content, chapters, and learning materials', icon: '📚', group: 'My Learning' },
  { key: 'learningPlan',   label: 'Learning Plan',                    description: 'Personalised learning plan and curriculum schedule', icon: '📅', group: 'My Learning' },
  { key: 'topicHub',       label: 'Topic Hub',                        description: 'Topic-wise practice, mastery and learning hub', icon: '🧠', group: 'My Learning' },
  { key: 'classHub',       label: '🎥 My Classes (Class Hub)',        description: 'View recorded classes with AI summary, quiz, notes, practice & assignment tabs', icon: '🎬', group: 'My Learning' },
  { key: 'quizzes',        label: 'Quizzes',                          description: 'Take quizzes and view quiz results', icon: '✍', group: 'My Learning' },
  { key: 'assignments',    label: 'Assignments',                      description: 'Submit coding assignments and view results', icon: '📝', group: 'My Learning' },
  { key: 'codingSnippets', label: 'Code Practice',                   description: 'Code editor access with snippet manager and practice problems', icon: '💻', group: 'My Learning' },
  { key: 'liveClasses',    label: 'Live Classes',                     description: 'Join scheduled live/online classes with recording playback', icon: '🎥', group: 'My Learning' },
  { key: 'attendance',     label: 'Attendance',                       description: 'View attendance records and attendance percentage', icon: '📊', group: 'My Learning' },
  // Prep & Career
  { key: 'codePlayground',  label: 'Code Playground',         description: 'Free-form multi-language code playground with run & GitHub push', icon: '🎮', group: 'Prep & Career' },
  { key: 'mockInterviews', label: 'Mock Interviews',                  description: 'Practice mock interviews with AI feedback', icon: '🎙', group: 'Prep & Career' },
  { key: 'scheduledInterviews', label: 'My Interviews',         description: 'View scheduled mock interviews and released feedback from interviewers', icon: '🗓', group: 'Prep & Career' },
  { key: 'resumeBuilder',  label: 'Resume Builder',                   description: 'Build, score, download and share a resume', icon: '📄', group: 'Prep & Career' },
  { key: 'careerProfile',   label: 'Career Profile (CareerPilot)', description: 'AI review of resume, GitHub and LinkedIn with improvement suggestions', icon: '🎯', group: 'Prep & Career' },
  { key: 'aiMentor',        label: 'AI Mentor (CareerPilot)', description: 'Personal AI mentor for guidance, doubts and career questions', icon: '🤖', group: 'Prep & Career' },
  { key: 'jobTracker',      label: 'Job Tracker (CareerPilot)', description: 'Track job applications, statuses and interview pipeline', icon: '📋', group: 'Prep & Career' },
  { key: 'projectBuilder',  label: 'Project Builder (CareerPilot)', description: 'Guided project builder to create portfolio-ready projects', icon: '🛠', group: 'Prep & Career' },
  { key: 'resourceLibrary', label: 'Resource Library',        description: 'Curated projects, references and downloadable learning resources', icon: '📁', group: 'Prep & Career' },
  // College (placement module — leave OFF for non-college tenants like coding bootcamps)
  { key: 'collegePortal',   label: 'My College Portal',       description: 'College dashboard: departments, curriculum, CRT & placement drives', icon: '🏛', group: 'College' },
  { key: 'myApplications',  label: 'My Applications',         description: 'Track placement-drive applications and their status', icon: '📄', group: 'College' },
  { key: 'alumniDirectory', label: 'Alumni Directory',        description: 'Browse alumni and request mentoring from industry professionals', icon: '🎓', group: 'College' },
  // My Account
  { key: 'feeDetails',          label: 'Fee Details',           description: 'Student fee ledger, payments, receipts, and reservation status', icon: '💰', group: 'My Account' },
];

const StudentFeaturesPage: React.FC = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureConfig>({
    dashboard: true,
    myCourse: true,
    topicHub: true,
    attendance: true,
    quizzes: true,
    assignments: true,
    mockInterviews: true,
    codingSnippets: true,
    classHub: true,
    feeDetails: true,
    scheduledInterviews: true,
    resumeBuilder: true,
    learningPlan: true,
    thinkingLab: true,
    speakingPractice: true,
    jobTracker: true,
    aiMentor: true,
    projectBuilder: true,
    resourceLibrary: true,
    codePlayground: true,
    careerProfile: true,
    aiCommunicationLab: true,
    liveClasses: true,
    collegePortal: true,
    myApplications: true,
    alumniDirectory: true,
  });
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    const fetchAll = async () => {
      if (!user?.tenantId) return;
      try {
        const [featRes, tenantRes] = await Promise.allSettled([
          tenantApi.getStudentFeatures(user.tenantId),
          tenantApi.getTenant(user.tenantId)
        ]);
        if (featRes.status === 'fulfilled' && featRes.value.success && featRes.value.data) {
          setFeatures(prev => ({ ...prev, ...featRes.value.data }));
        }
        if (tenantRes.status === 'fulfilled' && tenantRes.value.data) {
          setEnabledModules(tenantRes.value.data.modules || {});
        }
        setModulesLoaded(true);
      } catch (err) {
        console.error('Failed to fetch student features:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user?.tenantId]);

  const isModuleLocked = (featureKey: keyof FeatureConfig): boolean => {
    if (isSuperAdmin) return false;
    const moduleKey = FEATURE_MODULE_MAP[featureKey];
    if (!moduleKey) return false;
    return modulesLoaded && enabledModules[moduleKey] === false;
  };

  const handleToggle = (key: keyof FeatureConfig) => {
    if (isModuleLocked(key)) return;
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user?.tenantId) return;
    setSaving(true);
    try {
      await tenantApi.updateStudentFeatures(user.tenantId, { ...features });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save student features:', err);
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(features).filter(Boolean).length;
  const lockedCount = FEATURE_META.filter(f => isModuleLocked(f.key)).length;

  if (loading) {
    return (
      <div className="sf-page">
        <div className="sf-loading">Loading feature settings...</div>
      </div>
    );
  }

  return (
    <div className="sf-page">
      <div className="sf-header">
        <div className="sf-header-text">
          <h1>Student Feature Control</h1>
          <p>Control which features and modules are visible to students. Toggle features on or off to customize the student experience.</p>
        </div>
        <div className="sf-header-badge">
          {enabledCount} of {FEATURE_META.length} enabled
        </div>
      </div>

      {lockedCount > 0 && (
        <div className="sf-module-notice">
          <i className="fa-solid fa-lock me-2" />
          <strong>{lockedCount} feature{lockedCount > 1 ? 's are' : ' is'} locked</strong> â€” the corresponding platform module{lockedCount > 1 ? 's are' : ' is'} disabled by your Super Admin. Contact them to enable.
        </div>
      )}

      {GROUP_ORDER.map((group) => {
        const groupFeatures = FEATURE_META.filter((f) => f.group === group);
        if (groupFeatures.length === 0) return null;
        return (
          <div key={group} className="sf-group">
            <h2 className="sf-group-title" style={{ fontSize: 14, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '.05em', margin: '22px 0 10px' }}>
              {group === 'Daily Practice' ? '🔥 ' : group === 'College' ? '🎓 ' : ''}{group}
            </h2>
            <div className="sf-features-grid">
              {groupFeatures.map(({ key, label, description, icon }) => {
                const locked = isModuleLocked(key);
                return (
                  <div key={key} className={`sf-feature-card ${features[key] && !locked ? 'enabled' : 'disabled'}${locked ? ' sf-locked' : ''}`}>
                    <div className="sf-feature-info">
                      <span className="sf-feature-icon">{icon}</span>
                      <div className="sf-feature-text">
                        <h3>{label} {locked && <span className="sf-lock-badge"><i className="fa-solid fa-lock" /> Module disabled</span>}</h3>
                        <p>{description}</p>
                      </div>
                    </div>
                    <label className={`sf-toggle${locked ? ' sf-toggle-disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={features[key] && !locked}
                        onChange={() => handleToggle(key)}
                        disabled={locked}
                      />
                      <span className="sf-toggle-slider"></span>
                      <span className="sf-toggle-label">{locked ? 'Locked' : features[key] ? 'Visible' : 'Hidden'}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="sf-actions">
        <button className="sf-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'âœ“ Saved!' : 'Save Changes'}
        </button>
        {saved && <span className="sf-saved-msg">Student feature settings updated successfully.</span>}
      </div>
    </div>
  );
};


export default StudentFeaturesPage;
