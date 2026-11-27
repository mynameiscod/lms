/**
 * What www.codebegun.com shows on 27 Nov 2026 for the Tech Battle page, events, course cards, video
 * testimonials, mentors, home counters and top bar — taken from the site's own code, so Website
 * Content starts from what the website already has. Used once per environment by
 * scripts/importWebsiteContent.ts (placements have their own: importWebsitePlacements.ts).
 *
 * Not copied: the battle date (it comes from the live battle in Tech Battles — the site had it
 * hard-coded to 22 Nov 2026, already past) and course-page curriculum/projects/FAQs (different on
 * every course page; the team fills them in on the Courses tab).
 */
export const SITE_BASE = 'https://www.codebegun.com';

export const SEED_BATTLE = {
  eligibility: 'B.Tech Students',
  alsoOpenTo: 'Recent Passed Outs',
  durationText: '30 minutes',
  modeText: 'Online',
  topics: ['Live Coding Challenges', 'Aptitude & Logical Thinking', 'Programming MCQs', 'Interview Coding Questions', 'Real Industry-Level Problems'],
  prizes: [
    { place: '1st Prize', amount: '₹1000', items: ['Myntra Gift Voucher', 'Surprise Gift Hamper', 'Participation Certificate', '15% off on CareerPilot'] },
    { place: '2nd Prize', amount: '₹700', items: ['Myntra Gift Voucher', 'Surprise Gift Hamper', 'Participation Certificate', '10% off on CareerPilot'] },
    { place: '3rd Prize', amount: '₹500', items: ['Myntra Gift Voucher', 'Surprise Gift Hamper', 'Participation Certificate', '5% off on CareerPilot'] },
  ],
  everyone: ['Industry-Recognized Participation Certificate'],
};

export const SEED_BATTLE_STATS = [
  { value: '1000+', label: 'Active Participants' },
  { value: '50+', label: 'Weekly Challenges' },
  { value: 'Top 3', label: 'Win Prizes' },
  { value: 'Every Week', label: 'New Challenges' },
];

export const SEED_HOME_STATS = [
  { value: '4 hrs', label: 'Daily training' },
  { value: 'Free', label: 'Demo & counselling' },
  { value: '60+', label: 'Company network' },
  { value: '6+', label: 'Career programs' },
];

export const SEED_TOP_BAR = { enabled: true, text: '2026 B.Tech Graduate? If you are looking for placement', linkText: 'Click here →', url: '/placements-2026' };

export const SEED_EVENTS = [
  {
    type: 'hackathon', title: 'CodeBegun HackZen — 24-Hour Technical Hackathon', startDate: '2026-09-25', endDate: '2026-09-26',
    venue: 'Narasaraopeta Engineering College', mode: 'offline', teamSize: 'Teams of 2–4', pageUrl: '/hackathons/codebegun-techotsav-26',
  },
  {
    type: 'workshop', title: 'Build Your Own AI Agent', summary: 'A 2-day free online workshop.', startDate: '2026-10-16', endDate: '2026-10-17',
    timeText: '6:00 – 7:30 PM', mode: 'online', feeText: 'Free', pageUrl: '/workshops',
  },
];

/** Course cards. `key` is the Website Batches course key (what the website sends for next-batch). */
export const SEED_COURSES = [
  { key: 'java_full_stack', name: 'Java Full Stack with AI', title: 'Java Full Stack with AI', tags: ['Java', 'Spring Boot', 'React', 'SQL', 'AI'], duration: '145 Days', fee: '₹35,000', badge: 'Most Popular', pageUrl: '/courses/java-full-stack', brochureUrl: '/brochures/codebegun-java-full-stack.pdf' },
  { key: 'python_full_stack', name: 'Python Full Stack with AI', title: 'Python Full Stack with AI', tags: ['Python', 'Django', 'React', 'SQL', 'AI'], duration: '145 Days', fee: '₹35,000', pageUrl: '/courses/python-full-stack' },
  { key: 'data_analytics', name: 'Data Analytics with AI', title: 'Data Analytics with AI', tags: ['Excel', 'SQL', 'Power BI', 'Python'], duration: '145 Days', fee: '₹35,000', pageUrl: '/courses/data-analytics', brochureUrl: '/brochures/codebegun-data-analytics-with-ai.pdf' },
  { key: 'data_science', name: 'Data Science with AI', title: 'Data Science with AI', tags: ['Python', 'ML', 'Data Analysis', 'LLMs'], duration: '145 Days', fee: '₹45,000', pageUrl: '/courses/data-science' },
  { key: 'generative_ai', name: 'Artificial Intelligence', title: 'Artificial Intelligence', tags: ['Python', 'LLMs', 'RAG', 'GenAI'], duration: '145 Days', fee: '₹65,000', pageUrl: '/courses/ai-ml' },
  { key: 'generative_ai_developer', name: 'Generative AI Developer', title: 'Generative AI Developer', tags: ['LLMs', 'RAG', 'AI Agents', 'LangChain'], duration: '145 Days', fee: '₹65,000', pageUrl: '/generative-ai-course' },
  { key: 'fde', name: 'Forward Deployed AI Engineer', title: 'Forward Deployed AI Engineer (FDE)', tags: ['GenAI', 'AI Agents', 'Deployment', 'APIs'], duration: '24 Weeks', fee: '₹1,18,000', oldFee: '₹1,55,000', pageUrl: '/forward-deployed-ai-engineer' },
].map((c) => ({ mode: 'Online & Offline', seatsText: 'Only 27 / Batch', oldFee: '', badge: '', brochureUrl: '', ...c }));

export const SEED_TESTIMONIALS = [
  { name: 'Arvind', thumb: '/images/Students_Videos/Aravind_thumbnail.jpeg', videoUrl: 'https://iframe.mediadelivery.net/embed/681820/33a942bf-f3ec-4ea6-b1f3-430949dc4455?autoplay=true&preload=true&responsive=true', company: 'EPAM Systems', packageLpa: 8, label: '' },
  { name: 'Praneeth', thumb: '/images/Students_Videos/Praneeth_thumbnail.jpeg', videoUrl: 'https://iframe.mediadelivery.net/embed/681820/e453bf1b-9afe-4d8f-82c3-1f3584dfa6fc?autoplay=true&preload=true&responsive=true', company: 'Mphasis', packageLpa: 7.5, label: '' },
  { name: 'Narasimha', thumb: '/images/Students_Videos/Narasimha_thumbnail.jpeg', videoUrl: 'https://iframe.mediadelivery.net/embed/681820/1a1cdb3f-5b88-4b31-a11f-bf210ee71634?autoplay=true&preload=true&responsive=true', company: 'Adiquity', packageLpa: 4.5, label: '' },
  { name: 'Samyuktha', thumb: '/images/Students_Videos/Samyuktha_thumbnail.jpeg', videoUrl: 'https://iframe.mediadelivery.net/embed/681820/1c140630-9c9f-4fdf-8724-0b32975801e4?autoplay=true&preload=true&responsive=true', company: '', packageLpa: null, label: 'Student Review' },
  { name: 'Raju', thumb: '/images/Students_Videos/Raju_thumbnail.jpeg', videoUrl: 'https://iframe.mediadelivery.net/embed/681820/c2842108-faea-4c33-9800-5d9221042d07?autoplay=true&preload=true&responsive=true', company: '', packageLpa: null, label: 'Student Review' },
  { name: 'Jaswanth', thumb: '/images/Students_Videos/Jaswanth_thumbnail.jpeg', videoUrl: 'https://iframe.mediadelivery.net/embed/681820/100e7f75-6a06-4a74-9ad4-05fefce581cb?autoplay=true&preload=true&responsive=true', company: '', packageLpa: null, label: 'Student Review' },
];

export const SEED_TRAINERS = [
  { name: 'Galaba Siva Prasad', photo: '/images/Mentors/Galaba_SivaPrasad.jpeg', title: 'Staff Engineer', company: 'Crunchyroll', experience: '15+ yrs' },
  { name: 'Naresh', photo: '/images/Mentors/Naresh.jpeg', title: 'Tech Lead — Commerce', company: 'Ex-Flipkart', experience: '12 yrs' },
  { name: 'Tharun Koduri', photo: '/images/Mentors/Tharun_Koduri.jpeg', title: 'Tech Lead', company: 'Ex-Viaplus', experience: '6+ yrs' },
];
