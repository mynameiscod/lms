/**
 * The placed students and companies shown on www.codebegun.com on 27 Nov 2026 (taken from the site's
 * own /alumni list), so the Website Content screen starts with what the website already shows.
 * Used once per environment by scripts/importWebsitePlacements.ts. Photos are fetched from the site.
 *
 * Company type: the well-known IT services firms are marked service and Darwinbox product; the rest
 * are "other" for the team to set. The website did not list a course, batch or year per student,
 * so those are left empty.
 */
export const WEBSITE_PHOTO_BASE = 'https://www.codebegun.com';

export const SEED_COMPANIES: { name: string; domain: string; type: 'product' | 'service' | 'startup' | 'other' }[] = [
  { name: "Concentrix", domain: "concentrix.com", type: 'service' },
  { name: "EPAM Systems", domain: "epam.com", type: 'service' },
  { name: "Capgemini", domain: "capgemini.com", type: 'service' },
  { name: "Toshiba", domain: "toshiba.com", type: 'other' },
  { name: "Payship", domain: "payship.com", type: 'other' },
  { name: "Virinchi Technologies", domain: "virinchi.com", type: 'other' },
  { name: "Adiquity", domain: "adiquity.com", type: 'other' },
  { name: "Infinite", domain: "infinite.com", type: 'other' },
  { name: "Idea Entity", domain: "ideaentity.com", type: 'other' },
  { name: "Mphasis", domain: "mphasis.com", type: 'service' },
  { name: "Kagami ERP", domain: "kagamierp.com", type: 'other' },
  { name: "Infosys", domain: "infosys.com", type: 'service' },
  { name: "TCS", domain: "tcs.com", type: 'service' },
  { name: "Accenture", domain: "accenture.com", type: 'service' },
  { name: "Jayam Solutions", domain: "jayamsolutions.com", type: 'other' },
  { name: "ValueHub", domain: "valuehub.com", type: 'other' },
  { name: "Winfo Solutions", domain: "winfosolutions.com", type: 'other' },
  { name: "Sigma Software", domain: "sigmasoft.ai", type: 'other' },
  { name: "Wipro", domain: "wipro.com", type: 'service' },
  { name: "Darwinbox", domain: "darwinbox.com", type: 'product' },
  { name: "WinWire", domain: "winwire.com", type: 'other' },
  { name: "Cognizant", domain: "cognizant.com", type: 'service' },
  { name: "HCL Technologies", domain: "hcltech.com", type: 'service' },
];

export const SEED_STUDENTS: { name: string; image: string; role: string; company: string; packageLpa: number; quote: string }[] = [
  { name: "Abdul", image: "/images/PlacedStudents/Abdul.jpg", role: "Software Engineer", company: "Concentrix", packageLpa: 4.2, quote: "Landed my first job within 45 days." },
  { name: "Arvind", image: "/images/PlacedStudents/Arvind.jpg", role: "Software Engineer", company: "EPAM Systems", packageLpa: 8.0, quote: "Real projects made all the difference." },
  { name: "Ashok", image: "/images/PlacedStudents/Ashok.jpg", role: "Software Engineer", company: "Capgemini", packageLpa: 4.0, quote: "Best decision of my engineering career." },
  { name: "Charan", image: "/images/PlacedStudents/Charan.jpg", role: "Software Engineer", company: "Toshiba", packageLpa: 3.6, quote: "From zero coding to job-ready in 145 days." },
  { name: "Devika", image: "/images/PlacedStudents/Devika.jpg", role: "Software Engineer", company: "Payship", packageLpa: 4.5, quote: "Mentors pushed me beyond my comfort zone." },
  { name: "Kavya", image: "/images/PlacedStudents/Kavya.jpg", role: "Software Engineer", company: "Virinchi Technologies", packageLpa: 5.0, quote: "Got placed before the batch even ended!" },
  { name: "Manikanta", image: "/images/PlacedStudents/Manikanta.jpg", role: "Software Engineer", company: "EPAM Systems", packageLpa: 11.0, quote: "Interview prep here is genuinely world-class." },
  { name: "Muzahid", image: "/images/PlacedStudents/Muzahid.jpg", role: "Software Engineer", company: "Virinchi Technologies", packageLpa: 3.9, quote: "Built 6 projects that got me hired." },
  { name: "Narasimha Reddy", image: "/images/PlacedStudents/Narasimhareddy.jpg", role: "Software Engineer", company: "Adiquity", packageLpa: 4.5, quote: "Changed careers completely, no regrets." },
  { name: "Nithin", image: "/images/PlacedStudents/Nithin.jpg", role: "Software Engineer", company: "Infinite", packageLpa: 4.0, quote: "From non-CS background to software engineer." },
  { name: "Pavithra", image: "/images/PlacedStudents/Pavithra.jpg", role: "Software Engineer", company: "Idea Entity", packageLpa: 3.8, quote: "The project approach clicked for me instantly." },
  { name: "Praneeth", image: "/images/PlacedStudents/Praneeth.jpg", role: "Software Engineer", company: "Mphasis", packageLpa: 7.5, quote: "Small batch meant personal attention every day." },
  { name: "Praveen", image: "/images/PlacedStudents/Praveen.jpg", role: "Software Engineer", company: "Toshiba", packageLpa: 5.2, quote: "Confidence to crack interviews — that's the gift." },
  { name: "Praveena", image: "/images/PlacedStudents/Praveena.jpg", role: "Software Engineer", company: "Kagami ERP", packageLpa: 6.0, quote: "Got 2 offers. Chose the one I loved." },
  { name: "Rahul", image: "/images/PlacedStudents/Rahul.jpg", role: "Software Engineer", company: "Capgemini", packageLpa: 4.2, quote: "Practical training, real results. Period." },
  { name: "Ram Krishna", image: "/images/PlacedStudents/Ramkrishna.jpg", role: "Software Engineer", company: "Infosys", packageLpa: 4.0, quote: "Mock interviews were tougher than real ones." },
  { name: "Reddy Sekhar", image: "/images/PlacedStudents/Reddysekhar.jpg", role: "Software Engineer", company: "TCS", packageLpa: 3.6, quote: "Projects on my resume got me shortlisted." },
  { name: "Sai Pranav", image: "/images/PlacedStudents/SaiPranav.jpg", role: "Software Engineer", company: "Accenture", packageLpa: 4.8, quote: "Went from fresher to full-stack engineer." },
  { name: "Satya Narayana", image: "/images/PlacedStudents/Satyanarayana.jpg", role: "Software Engineer", company: "Jayam Solutions", packageLpa: 3.9, quote: "Best place to start your tech journey." },
  { name: "Shivani", image: "/images/PlacedStudents/Shivani.jpg", role: "Software Engineer", company: "ValueHub", packageLpa: 5.5, quote: "The mentors treated us like professionals." },
  { name: "Sravya", image: "/images/PlacedStudents/Sravya.jpg", role: "Software Engineer", company: "Winfo Solutions", packageLpa: 4.2, quote: "Learned more in 145 days than in 4 years." },
  { name: "Srikar", image: "/images/PlacedStudents/Srikar.jpg", role: "Software Engineer", company: "Sigma Software", packageLpa: 4.5, quote: "My portfolio got me the interview call." },
  { name: "Srilatha", image: "/images/PlacedStudents/Srilatha.jpg", role: "Software Engineer", company: "Wipro", packageLpa: 3.8, quote: "CodeBegun taught me to think like an engineer." },
  { name: "Subramanyam", image: "/images/PlacedStudents/Subramanyam.jpg", role: "Software Engineer", company: "Jayam Solutions", packageLpa: 4.0, quote: "No shortcuts — just real, deep skill building." },
  { name: "Uday", image: "/images/PlacedStudents/Uday.jpg", role: "Software Engineer", company: "Darwinbox", packageLpa: 6.5, quote: "The placement support was exceptional." },
  { name: "Venkata Kiran", image: "/images/PlacedStudents/Venkatakiran.jpg", role: "Software Engineer", company: "Jayam Solutions", packageLpa: 5.0, quote: "Was scared to code. Now I build full apps." },
  { name: "Vignesh", image: "/images/PlacedStudents/Vignesh.jpg", role: "Software Engineer", company: "WinWire", packageLpa: 6.5, quote: "Worth every rupee. Zero hesitation." },
  { name: "Vijay", image: "/images/PlacedStudents/Vijay.jpg", role: "Software Engineer", company: "Virinchi Technologies", packageLpa: 3.9, quote: "The community here keeps you motivated." },
  { name: "Vineela", image: "/images/PlacedStudents/Vineela.jpg", role: "Software Engineer", company: "Cognizant", packageLpa: 5.5, quote: "Cracked my dream company on first attempt." },
  { name: "Yeswanth", image: "/images/PlacedStudents/Yeswanth.jpg", role: "Software Engineer", company: "HCL Technologies", packageLpa: 4.5, quote: "Best investment I ever made for my career." },
];
