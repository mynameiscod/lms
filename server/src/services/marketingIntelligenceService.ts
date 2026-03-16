/**
 * Marketing Intelligence Service
 * Mock AI logic for analyzing competitor ads and generating content.
 * Replace mock functions with real AI API calls (OpenAI/Gemini) later.
 */

interface AdData {
  headline: string;
  primaryText: string;
  cta: string;
  platform: string;
  competitorName: string;
}

interface AnalysisResult {
  hookType: string;
  painPoint: string;
  targetAudience: string;
  emotionalTrigger: string;
  offerType: string;
  ctaType: string;
  tone: string;
  strengthScore: number;
  weaknesses: string[];
  suggestedAngleForCodeBegun: string;
}

interface ContentRequest {
  type: 'instagram_reel' | 'ad_copy' | 'linkedin_post' | 'whatsapp_message';
  insight: {
    hookType: string;
    painPoint: string;
    targetAudience: string;
    emotionalTrigger: string;
    offerType: string;
    ctaType: string;
    tone: string;
    suggestedAngleForCodeBegun: string;
    competitorName: string;
    headline: string;
  };
}

const HOOK_TYPES = [
  'Fear of Missing Out (FOMO)',
  'Pain-Agitate-Solve',
  'Social Proof',
  'Curiosity Gap',
  'Direct Benefit',
  'Question Hook',
  'Statistic Hook',
  'Story Hook',
  'Contrarian Hook',
  'Authority Hook',
];

const PAIN_POINTS = [
  'Lack of practical coding skills',
  'Difficulty getting placed after graduation',
  'Expensive courses with no job guarantee',
  'Outdated curriculum in colleges',
  'No real-world project experience',
  'Fear of career switch to tech',
  'Information overload - too many options',
  'Lack of structured learning path',
  'No mentorship or guidance',
  'Gap between theory and industry needs',
];

const AUDIENCES = [
  'Fresh graduates looking for first job',
  'College students (2nd-4th year)',
  'Working professionals switching to tech',
  'Non-tech graduates entering IT',
  'Experienced devs upskilling',
  'Parents of college students',
  'Tier-2/3 city students',
  'Career gap professionals',
];

const EMOTIONAL_TRIGGERS = [
  'Aspiration - dream job at top MNC',
  'Fear - falling behind peers',
  'Urgency - limited seats/batch starting',
  'Social proof - success stories',
  'Belonging - join a community',
  'Pride - become industry-ready',
  'Relief - structured path, no confusion',
  'Excitement - build real projects',
];

const OFFER_TYPES = [
  'Free demo class',
  'Placement guarantee',
  'EMI/scholarship available',
  'Certificate on completion',
  'Money-back guarantee',
  'Early bird discount',
  'Free course material',
  'Referral bonus',
];

const CTA_TYPES = [
  'Book Free Demo',
  'Enroll Now',
  'Download Syllabus',
  'Talk to Counselor',
  'Start Free Trial',
  'Join Waitlist',
  'Apply Now',
  'Get Callback',
];

const TONES = [
  'Professional & Authoritative',
  'Friendly & Casual',
  'Urgent & Action-Oriented',
  'Inspirational & Motivational',
  'Educational & Informative',
  'Empathetic & Understanding',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Analyze a competitor ad and return structured insights.
 * Currently uses mock logic — swap with OpenAI/Gemini API call later.
 */
export function analyzeAd(ad: AdData): AnalysisResult {
  const headline = ad.headline.toLowerCase();
  const text = ad.primaryText.toLowerCase();

  // Simple keyword-based hook detection (mock intelligence)
  let hookType = pickRandom(HOOK_TYPES);
  if (headline.includes('limited') || headline.includes('last chance') || text.includes('hurry')) {
    hookType = 'Fear of Missing Out (FOMO)';
  } else if (headline.includes('struggling') || headline.includes('tired of') || text.includes('frustrated')) {
    hookType = 'Pain-Agitate-Solve';
  } else if (headline.includes('students placed') || headline.includes('reviews') || text.includes('testimonial')) {
    hookType = 'Social Proof';
  } else if (headline.includes('secret') || headline.includes('what if') || headline.includes('discover')) {
    hookType = 'Curiosity Gap';
  } else if (headline.includes('?')) {
    hookType = 'Question Hook';
  } else if (headline.match(/\d+%|\d+ students|\d+ companies/)) {
    hookType = 'Statistic Hook';
  }

  // Detect CTA type
  let ctaType = pickRandom(CTA_TYPES);
  const ctaLower = ad.cta.toLowerCase();
  if (ctaLower.includes('demo')) ctaType = 'Book Free Demo';
  else if (ctaLower.includes('enroll') || ctaLower.includes('register')) ctaType = 'Enroll Now';
  else if (ctaLower.includes('download')) ctaType = 'Download Syllabus';
  else if (ctaLower.includes('call') || ctaLower.includes('talk')) ctaType = 'Talk to Counselor';
  else if (ctaLower.includes('trial') || ctaLower.includes('free')) ctaType = 'Start Free Trial';
  else if (ctaLower.includes('apply')) ctaType = 'Apply Now';

  // Detect tone
  let tone = pickRandom(TONES);
  if (text.includes('!') && (text.includes('now') || text.includes('today'))) {
    tone = 'Urgent & Action-Oriented';
  } else if (text.includes('dream') || text.includes('transform') || text.includes('success')) {
    tone = 'Inspirational & Motivational';
  }

  return {
    hookType,
    painPoint: pickRandom(PAIN_POINTS),
    targetAudience: pickRandom(AUDIENCES),
    emotionalTrigger: pickRandom(EMOTIONAL_TRIGGERS),
    offerType: pickRandom(OFFER_TYPES),
    ctaType,
    tone,
    strengthScore: calculateStrengthScore(ad),
    weaknesses: pickMultiple([
      'No clear differentiator from others',
      'Generic messaging',
      'Weak call-to-action',
      'Missing social proof',
      'No pricing transparency',
      'Too long for the platform',
      'No specific outcomes mentioned',
      'Lacks trust signals',
    ], 2),
    suggestedAngleForCodeBegun: generatePositioning(ad),
  };
}

function calculateStrengthScore(ad: AdData): number {
  let score = 5; // base score
  const h = ad.headline.toLowerCase();
  const t = ad.primaryText.toLowerCase();
  if (h.length > 10) score += 1; // has a real headline
  if (t.length > 50) score += 1; // has substantial text
  if (ad.cta) score += 1; // has a CTA
  if (h.match(/\d/)) score += 0.5; // uses numbers/stats
  if (t.includes('guarantee') || t.includes('free') || t.includes('offer')) score += 0.5; // has offer language
  return Math.min(10, Math.round(score));
}

function generatePositioning(ad: AdData): string {
  const positionings = [
    `Counter ${ad.competitorName}'s "${ad.headline.substring(0, 40)}..." by emphasizing CodeBegun's hands-on project-based learning with real client projects, not just tutorials.`,
    `While ${ad.competitorName} focuses on theory, CodeBegun should highlight its live coding sessions, 1-on-1 mentorship, and industry-connected placement support.`,
    `${ad.competitorName} uses ${ad.cta || 'generic CTAs'}. CodeBegun can stand out by offering a free live project demo instead of just a recorded demo class.`,
    `Position CodeBegun as the "anti-tutorial" platform — real projects, real mentors, real placements. Unlike ${ad.competitorName}'s mass-market approach.`,
    `Leverage CodeBegun's small batch sizes and personalized attention as a counter to ${ad.competitorName}'s volume-based model.`,
  ];
  return pickRandom(positionings);
}

/**
 * Generate marketing content based on analyzed insights.
 * Currently uses template-based mock logic.
 */
export function generateContent(req: ContentRequest): string {
  const { type, insight } = req;

  switch (type) {
    case 'instagram_reel':
      return generateReelScript(insight);
    case 'ad_copy':
      return generateAdCopy(insight);
    case 'linkedin_post':
      return generateLinkedInPost(insight);
    case 'whatsapp_message':
      return generateWhatsAppMessage(insight);
    default:
      return 'Content type not supported';
  }
}

function generateReelScript(insight: any): string {
  return `🎬 INSTAGRAM REEL SCRIPT
━━━━━━━━━━━━━━━━━━━━━━━━

📌 HOOK (0-3 seconds):
"${getReelHook(insight)}"

📌 PROBLEM (3-8 seconds):
"Most students ${insight.painPoint.toLowerCase()}. Sound familiar?"

📌 AGITATE (8-15 seconds):
"While others are ${insight.emotionalTrigger.toLowerCase()}, you're still stuck watching random YouTube tutorials that lead nowhere."

📌 SOLUTION (15-25 seconds):
"At CodeBegun, we don't do boring lectures. You build REAL projects from Day 1. 
Our students work on actual client projects, not toy apps."

📌 SOCIAL PROOF (25-35 seconds):
"That's why our students get placed at top companies within 3 months of completing the course."

📌 CTA (35-45 seconds):
"${insight.suggestedAngleForCodeBegun.split('.')[0]}. 
Link in bio for a FREE demo class. Only 5 spots left for this batch! 🔥"

━━━━━━━━━━━━━━━━━━━━━━━━
🎵 Suggested Audio: Trending motivational/tech background
📱 Format: 9:16 vertical
⏱️ Duration: 30-45 seconds`;
}

function getReelHook(insight: any): string {
  const hooks = [
    `Stop! If you're a ${insight.targetAudience.toLowerCase()}, this will change everything.`,
    `I need to tell you something that colleges won't...`,
    `"I got placed at a top MNC in just 3 months. Here's how..."`,
    `POV: You chose hands-on learning over boring lectures`,
    `${insight.targetAudience}? Watch this before it's too late.`,
  ];
  return pickRandom(hooks);
}

function generateAdCopy(insight: any): string {
  return `📢 AD COPY
━━━━━━━━━━━━━━━━━━━━━━━━

🔹 HEADLINE:
"From ${insight.painPoint} to Industry-Ready Developer — in 90 Days"

🔹 PRIMARY TEXT:
Are you a ${insight.targetAudience.toLowerCase()}?

Here's what nobody tells you: ${insight.painPoint.toLowerCase()}.

At CodeBegun, we built a program that fixes this:
✅ Live coding sessions (not recorded videos)
✅ Build 5+ real-world projects
✅ 1-on-1 mentorship from industry experts
✅ Dedicated placement support
✅ Small batches for personalized attention

💡 ${insight.suggestedAngleForCodeBegun.split('.')[0]}.

🎯 What our students say:
"I went from zero coding knowledge to getting placed at an MNC in just 4 months!" — Recent Graduate

🔹 CTA: Book Your FREE Demo Class →

🔹 OFFER: ${insight.offerType}

━━━━━━━━━━━━━━━━━━━━━━━━
📍 Recommended Platform: ${insight.hookType.includes('FOMO') ? 'Instagram Stories + Facebook Feed' : 'Facebook Feed + LinkedIn'}
🎯 Target: ${insight.targetAudience}`;
}

function generateLinkedInPost(insight: any): string {
  return `📝 LINKEDIN POST
━━━━━━━━━━━━━━━━━━━━━━━━

${insight.painPoint}.

I've seen this happen to hundreds of ${insight.targetAudience.toLowerCase()}.

The problem?
→ Colleges teach theory, industry needs practice
→ Random YouTube tutorials don't build real skills
→ Nobody tells you what companies actually look for

At CodeBegun, we took a different approach:

1️⃣ Real Projects from Day 1 — No "Hello World" here
2️⃣ Live Coding Sessions — Ask questions, get answers instantly
3️⃣ Industry Mentors — Learn from developers at top companies
4️⃣ Placement Support — Resume building, mock interviews, referrals
5️⃣ Small Batches — Max 15 students for personalized attention

The result?
→ 90%+ placement rate
→ Students placed at top MNCs
→ Career transformations in 3-6 months

${insight.suggestedAngleForCodeBegun.split('.')[0]}.

If you're a ${insight.targetAudience.toLowerCase()}, here's your chance.

🔗 Book a free demo class (link in comments)

---
#CodeBegun #LearnToCode #FullStackDeveloper #CareerSwitch #TechEducation #Placement #CodingBootcamp

━━━━━━━━━━━━━━━━━━━━━━━━
📊 Best posting time: Tue-Thu, 8-10 AM IST
💡 Engage with comments within first 30 minutes for algorithm boost`;
}

function generateWhatsAppMessage(insight: any): string {
  return `📱 WHATSAPP MESSAGE
━━━━━━━━━━━━━━━━━━━━━━━━

Hi! 👋

Are you a ${insight.targetAudience.toLowerCase()}?

🎯 *CodeBegun* is starting a new batch soon!

Here's what makes us different:
✅ *Live* coding classes (not recorded)
✅ Build *real projects* from Day 1
✅ *1-on-1 mentorship* from industry experts
✅ *Placement assistance* included
✅ Small batches — *only 15 seats*

💰 *Special Offer:* ${insight.offerType}

📅 Batch starts soon — limited seats available!

👉 Book your *FREE Demo Class*: [LINK]

---

*Reply "DEMO" to book your spot* 🚀

━━━━━━━━━━━━━━━━━━━━━━━━
📌 Send during: 10 AM - 1 PM or 6 PM - 9 PM
📌 Follow up after 24 hours if no response
📌 Use broadcast list, not group (for privacy)`;
}
