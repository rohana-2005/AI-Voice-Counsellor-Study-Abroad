// lib/mockData.ts

export const student = {
  full_name: "Arjun Sharma",
  phone_number: "+91 98765 43210",
  email: "arjun.sharma@gmail.com",
  location: "Mumbai, Maharashtra",
  avatar_initials: "AS",
};

export const academicProfile = {
  edu_level: "Bachelor's Degree",
  current_field: "Computer Science & Engineering",
  institution: "Mumbai University",
  gpa_percentage: "78%",
  target_countries: ["United Kingdom", "Ireland", "Canada"],
  course_interest: "MSc Data Science",
  intake_timing: "September 2025",
  test_status: "IELTS Scheduled",
  budget_range: "₹30L – ₹50L",
  scholarship_interest: true,
};

export const callSession = {
  id: "sess_001",
  date: "April 3, 2026",
  duration: "18 mins",
  transcript: [
    {
      role: "ai",
      message:
        "Hello Arjun! I'm your AI Study Abroad Counselor. I've reviewed your profile and I'm excited to help you plan your journey to study in the UK or Ireland. Shall we begin?",
      timestamp: "10:02 AM",
    },
    {
      role: "user",
      message:
        "Yes, definitely! I'm interested in doing my Masters in Data Science. I've been looking at universities in the UK mainly.",
      timestamp: "10:03 AM",
    },
    {
      role: "ai",
      message:
        "Great choice! With your 78% GPA in Computer Science from Mumbai University, you're a solid candidate for top UK universities. I'd recommend looking at University of Manchester, University of Bristol, and King's College London for MSc Data Science. Your budget of ₹30L–50L also opens doors to some excellent scholarship opportunities.",
      timestamp: "10:04 AM",
    },
    {
      role: "user",
      message:
        "I haven't taken IELTS yet, is that going to be a big issue?",
      timestamp: "10:05 AM",
    },
    {
      role: "ai",
      message:
        "Not at all! You can start preparing now — aim for 7.0+ overall with no band below 6.5 for most UK universities. Many universities also accept Duolingo or PTE. I'll add IELTS Prep to your action plan right away.",
      timestamp: "10:06 AM",
    },
    {
      role: "user",
      message: "What about scholarships? I'm really interested in those.",
      timestamp: "10:08 AM",
    },
    {
      role: "ai",
      message:
        "Excellent! With your profile, you're eligible for the Chevening Scholarship, Commonwealth Scholarship, and university-specific merit scholarships at Manchester and Bristol. We'll shortlist the best ones for you based on your September 2025 intake timeline.",
      timestamp: "10:09 AM",
    },
  ],
  sentiment: "positive",
  lead_score: 78,
  classification: "Hot" as "Hot" | "Warm" | "Cold",
  score_breakdown: {
    academic: 82,
    financial: 71,
    clarity: 85,
  },
  recommended_actions: [
    { id: 1, action: "Schedule IELTS exam (Target: 7.0+)", done: false, priority: "High" },
    { id: 2, action: "Shortlist 5–6 universities in UK & Ireland", done: false, priority: "High" },
    { id: 3, action: "Start SOP drafting", done: false, priority: "Medium" },
    { id: 4, action: "Research Chevening Scholarship requirements", done: false, priority: "Medium" },
    { id: 5, action: "Request LORs from professors", done: false, priority: "Medium" },
    { id: 6, action: "Book financial documentation", done: false, priority: "Low" },
  ],
  insight_text:
    "You are a strong candidate for UK & Ireland universities. Completing your IELTS and submitting strong LORs will significantly improve your chances of admission with scholarships.",
};

export const universityRecommendations = [
  {
    id: 1,
    name: "University of Manchester",
    country: "United Kingdom",
    flag: "UK",
    tuition: "£24,000/yr",
    ranking: "#6 QS UK",
    course: "MSc Data Science",
    match: 94,
    deadline: "June 30, 2025",
    tag: "Best Match",
    tagColor: "blue",
  },
  {
    id: 2,
    name: "University College Dublin",
    country: "Ireland",
    flag: "IE",
    tuition: "€18,500/yr",
    ranking: "#2 QS Ireland",
    course: "MSc Data Analytics",
    match: 89,
    deadline: "May 15, 2025",
    tag: "High Scholarship",
    tagColor: "green",
  },
  {
    id: 3,
    name: "University of Bristol",
    country: "United Kingdom",
    flag: "UK",
    tuition: "£22,500/yr",
    ranking: "#8 QS UK",
    course: "MSc Machine Learning",
    match: 86,
    deadline: "July 1, 2025",
    tag: "Safe Choice",
    tagColor: "purple",
  },
  {
    id: 4,
    name: "Trinity College Dublin",
    country: "Ireland",
    flag: "IE",
    tuition: "€21,000/yr",
    ranking: "#1 QS Ireland",
    course: "MSc Computer Science",
    match: 82,
    deadline: "April 30, 2025",
    tag: "Reach",
    tagColor: "orange",
  },
  {
    id: 5,
    name: "University of Toronto",
    country: "Canada",
    flag: "CA",
    tuition: "CA$32,000/yr",
    ranking: "#21 QS World",
    course: "MEng Data Science",
    match: 79,
    deadline: "August 1, 2025",
    tag: "Explore",
    tagColor: "gray",
  },
];

export const kanbanTasks = {
  "to-start": [
    { id: "k1", title: "IELTS Preparation", priority: "High", icon: "DOC", dueDate: "May 2025" },
    { id: "k2", title: "SOP Writing", priority: "Medium", icon: "WRITE", dueDate: "Jun 2025" },
    { id: "k3", title: "Financial Documents", priority: "Low", icon: "MONEY", dueDate: "Jul 2025" },
  ],
  "in-progress": [
    { id: "k4", title: "Shortlisting Universities", priority: "High", icon: "UNI", dueDate: "Apr 2025" },
    { id: "k5", title: "Letters of Recommendation", priority: "Medium", icon: "LOR", dueDate: "May 2025" },
  ],
  completed: [
    { id: "k6", title: "Initial Counseling Session", priority: "Done", icon: "DONE", dueDate: "Mar 2025" },
    { id: "k7", title: "Profile Assessment", priority: "Done", icon: "REPORT", dueDate: "Mar 2025" },
  ],
};

export const testimonials = [
  {
    id: 1,
    name: "Priya Mehta",
    university: "University of Manchester",
    country: "United Kingdom",
    flag: "UK",
    text: "The AI counselor helped me choose the perfect course and university. I got a merit scholarship too! The process was incredibly smooth from shortlisting to visa.",
    rating: 5,
    course: "MSc Data Science",
    year: "2024",
  },
  {
    id: 2,
    name: "Rahul Verma",
    university: "Trinity College Dublin",
    country: "Ireland",
    flag: "IE",
    text: "I was confused between 6 universities. The AI analysis gave me a clarity score and matched me with the right one. Got a Chevening scholarship recommendation too!",
    rating: 5,
    course: "MBA Finance",
    year: "2024",
  },
  {
    id: 3,
    name: "Anjali Singh",
    university: "University of Toronto",
    country: "Canada",
    flag: "CA",
    text: "The conversational AI made the entire process feel personal. It was like talking to an expert counselor at 2am when I had doubts. Absolutely love this platform!",
    rating: 5,
    course: "MEng Computer Science",
    year: "2025",
  },
  {
    id: 4,
    name: "Karan Patel",
    university: "University of Birmingham",
    country: "United Kingdom",
    flag: "UK",
    text: "The readiness score helped me understand exactly what I needed to improve. Within 2 months I went from a Cold lead to Hot. Admitted with partial scholarship!",
    rating: 5,
    course: "MSc AI & Machine Learning",
    year: "2025",
  },
];

export const countries = [
  {
    name: "United Kingdom",
    flag: "UK",
    universities: "120+",
    avgTuition: "£18,000–£35,000",
    workVisa: "2-year Graduate Route",
    highlight: "World-class research universities",
    color: "from-blue-500 to-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    popularCourses: ["MBA", "MSc Data Science", "LLM", "MSc Engineering"],
  },
  {
    name: "Ireland",
    flag: "IE",
    universities: "25+",
    avgTuition: "€10,000–€25,000",
    workVisa: "2-year Stay Back",
    highlight: "EU education, tech hub",
    color: "from-green-500 to-emerald-700",
    bg: "bg-green-50",
    border: "border-green-200",
    popularCourses: ["MSc Computer Science", "MBA", "MSc Analytics", "MSc Finance"],
  },
  {
    name: "Canada",
    flag: "CA",
    universities: "80+",
    avgTuition: "CA$20,000–CA$45,000",
    workVisa: "3-year PGWP",
    highlight: "PR pathway, diverse culture",
    color: "from-red-500 to-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    popularCourses: ["MEng", "MBA", "MSc Computing", "MPH"],
  },
  {
    name: "United States",
    flag: "US",
    universities: "200+",
    avgTuition: "$25,000–$55,000",
    workVisa: "3-year OPT (STEM)",
    highlight: "Ivy League & top research",
    color: "from-indigo-500 to-purple-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    popularCourses: ["MS Computer Science", "MBA", "MS Finance", "MS Data Science"],
  },
];

export const stats = [
  { value: "40,000+", label: "Students Counseled", icon: "STU" },
  { value: "120+", label: "Partner Universities", icon: "UNI" },
  { value: "99%", label: "Visa Success Rate", icon: "VISA" },
  { value: "21+", label: "Years of Experience", icon: "YRS" },
  { value: "4", label: "Countries Covered", icon: "CTR" },
  { value: "Free", label: "AI Consultation", icon: "AI" },
];

export const onboardingQuestions = [
  {
    step: 1,
    question: "What's your current level of education?",
    field: "edu_level",
    options: [
      "12th Grade / High School",
      "Bachelor's Degree",
      "Master's Degree",
      "Diploma / Certificate",
    ],
  },
  {
    step: 2,
    question: "What's your current CGPA or percentage?",
    field: "gpa_percentage",
    options: ["Below 60%", "60–70%", "70–80%", "Above 80%"],
  },
  {
    step: 3,
    question: "What's your budget for studying abroad?",
    field: "budget_range",
    options: ["Under ₹20L", "₹20L–₹30L", "₹30L–₹50L", "Above ₹50L"],
  },
  {
    step: 4,
    question: "Which countries are you interested in?",
    field: "target_countries",
    options: ["United Kingdom", "Ireland", "Canada", "United States", "Australia"],
  },
  {
    step: 5,
    question: "What field of study interests you?",
    field: "course_interest",
    options: [
      "Data Science / AI",
      "Business / MBA",
      "Engineering",
      "Law",
      "Healthcare",
      "Finance",
    ],
  },
];

export const recentSessions = [
  {
    id: "sess_001",
    date: "April 3, 2026",
    duration: "18 mins",
    sentiment: "positive",
    lead_score: 78,
    classification: "Hot" as const,
    preview:
      "Discussed MSc Data Science options in UK & Ireland. Shortlisted University of Manchester and UCD. Recommended IELTS preparation.",
  },
  {
    id: "sess_002",
    date: "March 28, 2026",
    duration: "12 mins",
    sentiment: "neutral",
    lead_score: 65,
    classification: "Warm" as const,
    preview:
      "Initial profile assessment. Explored budget constraints and discussed scholarship options. Profile looks promising for Ireland route.",
  },
];
