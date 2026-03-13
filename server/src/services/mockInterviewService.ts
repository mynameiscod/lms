import mongoose from 'mongoose';
import MockInterview, { IMockInterview, IInterviewResponse } from '../models/MockInterview';
import InterviewQuestion from '../models/InterviewQuestion';

// Question banks for different categories (fallback if no AI)
const questionBanks: Record<string, { question: string; type: string; expectedTopics: string[] }[]> = {
  'technical-java': [
    { question: 'Explain the difference between ArrayList and LinkedList in Java. When would you use each?', type: 'technical', expectedTopics: ['ArrayList', 'LinkedList', 'performance', 'use cases', 'random access', 'insertion'] },
    { question: 'What is the difference between == and .equals() in Java?', type: 'technical', expectedTopics: ['reference comparison', 'value comparison', 'Object class', 'String pool'] },
    { question: 'Explain the concept of garbage collection in Java. How does it work?', type: 'technical', expectedTopics: ['heap memory', 'GC roots', 'mark and sweep', 'generations', 'finalize'] },
    { question: 'What are the SOLID principles? Can you explain each with an example?', type: 'technical', expectedTopics: ['Single Responsibility', 'Open/Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion'] },
    { question: 'Explain multithreading in Java. What is the difference between Thread class and Runnable interface?', type: 'technical', expectedTopics: ['Thread', 'Runnable', 'concurrency', 'synchronization', 'thread lifecycle'] },
    { question: 'What is the difference between HashMap and ConcurrentHashMap?', type: 'technical', expectedTopics: ['thread-safety', 'segments', 'locking', 'null values', 'performance'] },
    { question: 'Explain exception handling in Java. What is the difference between checked and unchecked exceptions?', type: 'technical', expectedTopics: ['try-catch', 'throws', 'RuntimeException', 'compile-time', 'runtime'] },
    { question: 'What is dependency injection? How does Spring implement it?', type: 'technical', expectedTopics: ['IoC', 'constructor injection', 'setter injection', '@Autowired', 'loose coupling'] },
    { question: 'Explain the Java Stream API. How would you filter and transform a list of objects?', type: 'technical', expectedTopics: ['filter', 'map', 'collect', 'lambda', 'functional programming'] },
    { question: 'What are design patterns? Explain Singleton and Factory patterns with examples.', type: 'technical', expectedTopics: ['creational patterns', 'Singleton', 'Factory', 'getInstance', 'encapsulation'] },
  ],
  'technical-python': [
    { question: 'What is the difference between a list and a tuple in Python?', type: 'technical', expectedTopics: ['mutable', 'immutable', 'performance', 'use cases', 'hashable'] },
    { question: 'Explain decorators in Python. How would you create a custom decorator?', type: 'technical', expectedTopics: ['wrapper function', '@decorator', 'higher-order function', 'functools.wraps'] },
    { question: 'What are generators in Python? How are they different from regular functions?', type: 'technical', expectedTopics: ['yield', 'lazy evaluation', 'memory efficiency', 'iterator protocol'] },
    { question: 'Explain the GIL (Global Interpreter Lock) in Python. How does it affect multithreading?', type: 'technical', expectedTopics: ['GIL', 'threading', 'multiprocessing', 'CPU-bound', 'I/O-bound'] },
    { question: 'What is the difference between __init__ and __new__ in Python?', type: 'technical', expectedTopics: ['constructor', 'instance creation', 'metaclass', 'object initialization'] },
    { question: 'Explain list comprehension vs generator expression. When would you use each?', type: 'technical', expectedTopics: ['memory', 'lazy evaluation', 'syntax', 'performance'] },
    { question: 'What are context managers in Python? Explain the with statement.', type: 'technical', expectedTopics: ['__enter__', '__exit__', 'resource management', 'file handling'] },
    { question: 'Explain args and kwargs in Python functions.', type: 'technical', expectedTopics: ['positional arguments', 'keyword arguments', 'unpacking', 'flexible functions'] },
    { question: 'What is the difference between shallow copy and deep copy?', type: 'technical', expectedTopics: ['copy module', 'nested objects', 'references', 'memory'] },
    { question: 'Explain Python\'s memory management and reference counting.', type: 'technical', expectedTopics: ['reference counting', 'garbage collection', 'memory allocation', 'del statement'] },
  ],
  'hr': [
    { question: 'Tell me about yourself and your background.', type: 'behavioral', expectedTopics: ['education', 'experience', 'skills', 'career goals', 'achievements'] },
    { question: 'Why do you want to work for our company?', type: 'behavioral', expectedTopics: ['company research', 'culture fit', 'growth opportunities', 'alignment with goals'] },
    { question: 'What are your greatest strengths and weaknesses?', type: 'behavioral', expectedTopics: ['self-awareness', 'specific examples', 'improvement efforts', 'relevance to role'] },
    { question: 'Describe a challenging project you worked on. How did you handle it?', type: 'situational', expectedTopics: ['problem description', 'approach', 'challenges', 'outcome', 'learnings'] },
    { question: 'Tell me about a time when you had a conflict with a team member. How did you resolve it?', type: 'situational', expectedTopics: ['conflict description', 'communication', 'resolution', 'relationship outcome'] },
    { question: 'Where do you see yourself in 5 years?', type: 'behavioral', expectedTopics: ['career progression', 'goals', 'company alignment', 'growth mindset'] },
    { question: 'Why should we hire you over other candidates?', type: 'behavioral', expectedTopics: ['unique value', 'skills match', 'enthusiasm', 'specific contributions'] },
    { question: 'How do you handle pressure and tight deadlines?', type: 'situational', expectedTopics: ['prioritization', 'time management', 'stress management', 'example situations'] },
    { question: 'What is your expected salary?', type: 'behavioral', expectedTopics: ['market research', 'flexibility', 'value justification'] },
    { question: 'Do you have any questions for us?', type: 'behavioral', expectedTopics: ['thoughtful questions', 'company interest', 'role clarity', 'growth opportunities'] },
  ],
  'company-tcs': [
    { question: 'Tell me about yourself and why you want to join TCS.', type: 'behavioral', expectedTopics: ['background', 'TCS values', 'career goals', 'IT industry interest'] },
    { question: 'What do you know about TCS? What are its main services?', type: 'behavioral', expectedTopics: ['IT services', 'consulting', 'digital transformation', 'global presence'] },
    { question: 'Explain Object-Oriented Programming concepts with examples.', type: 'technical', expectedTopics: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'] },
    { question: 'What is the difference between a process and a thread?', type: 'technical', expectedTopics: ['memory space', 'execution', 'communication', 'overhead'] },
    { question: 'Explain SQL joins with examples.', type: 'technical', expectedTopics: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'use cases'] },
    { question: 'What is normalization in databases?', type: 'technical', expectedTopics: ['1NF', '2NF', '3NF', 'redundancy', 'data integrity'] },
    { question: 'How do you handle a situation where you disagree with your manager?', type: 'situational', expectedTopics: ['communication', 'respect', 'data-driven', 'compromise'] },
    { question: 'Are you willing to relocate to different cities for projects?', type: 'behavioral', expectedTopics: ['flexibility', 'adaptability', 'commitment'] },
    { question: 'What is your approach to learning new technologies?', type: 'behavioral', expectedTopics: ['self-learning', 'curiosity', 'resources', 'practice'] },
    { question: 'Explain the software development lifecycle (SDLC).', type: 'technical', expectedTopics: ['requirements', 'design', 'development', 'testing', 'deployment', 'maintenance'] },
  ],
  'company-infosys': [
    { question: 'Why do you want to join Infosys?', type: 'behavioral', expectedTopics: ['company values', 'learning culture', 'global exposure', 'career growth'] },
    { question: 'What do you know about Infosys\' services and recent initiatives?', type: 'behavioral', expectedTopics: ['digital services', 'Infosys Springboard', 'ESG initiatives', 'innovation'] },
    { question: 'Explain the concept of cloud computing.', type: 'technical', expectedTopics: ['IaaS', 'PaaS', 'SaaS', 'benefits', 'providers'] },
    { question: 'What is an API? How does REST API work?', type: 'technical', expectedTopics: ['Application Programming Interface', 'REST', 'HTTP methods', 'JSON', 'endpoints'] },
    { question: 'Explain agile methodology and its benefits.', type: 'technical', expectedTopics: ['sprints', 'scrum', 'iterative', 'collaboration', 'flexibility'] },
    { question: 'What is version control? Explain Git basics.', type: 'technical', expectedTopics: ['Git', 'commit', 'branch', 'merge', 'pull request'] },
    { question: 'Describe a time when you learned something quickly to complete a task.', type: 'situational', expectedTopics: ['learning approach', 'time constraint', 'resources used', 'outcome'] },
    { question: 'How do you stay updated with technology trends?', type: 'behavioral', expectedTopics: ['blogs', 'courses', 'communities', 'practice projects'] },
    { question: 'What is your biggest achievement?', type: 'behavioral', expectedTopics: ['specific achievement', 'effort', 'impact', 'learnings'] },
    { question: 'Explain data structures you know and their time complexities.', type: 'technical', expectedTopics: ['arrays', 'linked lists', 'stacks', 'queues', 'trees', 'Big O'] },
  ],
};

// AI Evaluation prompts and logic
const evaluateAnswer = (question: string, answer: string, expectedTopics: string[]): {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  keywordsCovered: string[];
  keywordsMissed: string[];
} => {
  // Simple keyword-based evaluation (replace with OpenAI in production)
  const answerLower = answer.toLowerCase();
  const covered: string[] = [];
  const missed: string[] = [];
  
  expectedTopics.forEach(topic => {
    if (answerLower.includes(topic.toLowerCase())) {
      covered.push(topic);
    } else {
      missed.push(topic);
    }
  });
  
  const coverage = expectedTopics.length > 0 ? (covered.length / expectedTopics.length) : 0;
  const lengthScore = Math.min(answer.length / 200, 1); // Good answers are usually 200+ chars
  const rawScore = (coverage * 0.7 + lengthScore * 0.3) * 10;
  const score = Math.round(Math.min(rawScore, 10) * 10) / 10;
  
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  if (covered.length > 0) {
    strengths.push(`Covered key topics: ${covered.slice(0, 3).join(', ')}`);
  }
  if (answer.length > 150) {
    strengths.push('Provided detailed explanation');
  }
  if (answer.includes('example') || answer.includes('for instance')) {
    strengths.push('Used examples to illustrate points');
  }
  
  if (missed.length > 0) {
    improvements.push(`Consider mentioning: ${missed.slice(0, 3).join(', ')}`);
  }
  if (answer.length < 100) {
    improvements.push('Provide more detailed explanation');
  }
  if (!answer.includes('example')) {
    improvements.push('Include practical examples');
  }
  
  const feedback = score >= 7 
    ? 'Great answer! You covered the key concepts well.'
    : score >= 5 
    ? 'Good attempt. Try to cover more aspects of the topic.'
    : 'Needs improvement. Review the topic and practice explaining it more comprehensively.';
  
  return { score, feedback, strengths, improvements, keywordsCovered: covered, keywordsMissed: missed };
};

class MockInterviewService {
  
  // Create a new mock interview session
  async createInterview(data: {
    studentId: string;
    tenantId: string;
    type?: 'ai' | 'expert' | 'peer';
    category: string;
    subCategory?: string;
    targetCompany?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    totalQuestions?: number;
    timeLimit?: number;
    courseId?: string;
    subjectId?: string;
    chapterId?: string;
    batchId?: string;
  }): Promise<IMockInterview> {
    const {
      studentId,
      tenantId,
      type = 'ai',
      category,
      subCategory,
      targetCompany,
      difficulty = 'medium',
      totalQuestions = 10,
      timeLimit = 30,
      courseId,
      subjectId,
      chapterId,
      batchId
    } = data;
    
    // Generate questions based on category
    const questions = await this.generateQuestions({
      category,
      subCategory,
      targetCompany,
      difficulty,
      count: totalQuestions,
      chapterId,
      tenantId
    });
    
    const responses: IInterviewResponse[] = questions.map((q, idx) => ({
      questionNumber: idx + 1,
      question: q.question,
      questionType: q.type as any,
      expectedTopics: q.expectedTopics,
      answer: '',
      responseTime: 0,
      score: 0,
      feedback: '',
      strengths: [],
      improvements: [],
      keywordsCovered: [],
      keywordsMissed: []
    }));
    
    const interview = new MockInterview({
      studentId,
      tenantId,
      type,
      category,
      subCategory,
      targetCompany,
      difficulty,
      totalQuestions,
      timeLimit,
      courseId,
      subjectId,
      chapterId,
      batchId,
      status: 'scheduled',
      responses,
      currentQuestionIndex: 0,
      topStrengths: [],
      topImprovements: [],
      recommendedTopics: []
    });
    
    return await interview.save();
  }
  
  // Generate questions for interview
  async generateQuestions(params: {
    category: string;
    subCategory?: string;
    targetCompany?: string;
    difficulty: string;
    count: number;
    chapterId?: string;
    tenantId: string;
  }): Promise<{ question: string; type: string; expectedTopics: string[] }[]> {
    const { category, subCategory, targetCompany, count, chapterId, tenantId } = params;
    
    // If chapter is specified, try to get questions from InterviewQuestion bank
    if (chapterId) {
      const chapterQuestions = await InterviewQuestion.find({
        chapterId,
        tenantId,
        isActive: true
      }).limit(count);
      
      if (chapterQuestions.length >= count / 2) {
        return chapterQuestions.map(q => ({
          question: q.question,
          type: 'technical',
          expectedTopics: q.tags || []
        }));
      }
    }
    
    // Use question bank based on category
    let bankKey = category;
    if (targetCompany) {
      bankKey = `company-${targetCompany.toLowerCase()}`;
    } else if (subCategory) {
      bankKey = `${category}-${subCategory.toLowerCase()}`;
    }
    
    const bank = questionBanks[bankKey] || questionBanks['hr'];
    
    // Shuffle and pick questions
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
  
  // Start an interview
  async startInterview(interviewId: string, studentId: string): Promise<IMockInterview> {
    const interview = await MockInterview.findOne({
      _id: interviewId,
      studentId,
      status: { $in: ['scheduled', 'in-progress'] }
    });
    
    if (!interview) {
      throw new Error('Interview not found or already completed');
    }
    
    if (interview.status === 'scheduled') {
      interview.status = 'in-progress';
      interview.startedAt = new Date();
      await interview.save();
    }
    
    return interview;
  }
  
  // Submit answer for current question
  async submitAnswer(
    interviewId: string,
    studentId: string,
    questionIndex: number,
    answer: string,
    responseTime: number
  ): Promise<{ evaluation: IInterviewResponse; nextQuestion: IInterviewResponse | null }> {
    const interview = await MockInterview.findOne({
      _id: interviewId,
      studentId,
      status: 'in-progress'
    });
    
    if (!interview) {
      throw new Error('Interview not found or not in progress');
    }
    
    if (questionIndex >= interview.responses.length) {
      throw new Error('Invalid question index');
    }
    
    const response = interview.responses[questionIndex];
    
    // Evaluate the answer
    const evaluation = evaluateAnswer(response.question, answer, response.expectedTopics);
    
    // Update response
    response.answer = answer;
    response.responseTime = responseTime;
    response.score = evaluation.score;
    response.feedback = evaluation.feedback;
    response.strengths = evaluation.strengths;
    response.improvements = evaluation.improvements;
    response.keywordsCovered = evaluation.keywordsCovered;
    response.keywordsMissed = evaluation.keywordsMissed;
    
    interview.currentQuestionIndex = questionIndex + 1;
    await interview.save();
    
    const nextQuestion = questionIndex + 1 < interview.responses.length 
      ? interview.responses[questionIndex + 1] 
      : null;
    
    return { evaluation: response, nextQuestion };
  }
  
  // Complete interview and generate overall feedback
  async completeInterview(interviewId: string, studentId: string): Promise<IMockInterview> {
    const interview = await MockInterview.findOne({
      _id: interviewId,
      studentId
    });
    
    if (!interview) {
      throw new Error('Interview not found');
    }
    
    // Calculate overall scores
    const answeredResponses = interview.responses.filter(r => r.answer.length > 0);
    const avgScore = answeredResponses.length > 0
      ? answeredResponses.reduce((sum, r) => sum + r.score, 0) / answeredResponses.length
      : 0;
    
    interview.overallScore = Math.round(avgScore * 10); // Convert 0-10 to 0-100
    interview.status = 'completed';
    interview.completedAt = new Date();
    
    if (interview.startedAt) {
      interview.actualDuration = Math.round(
        (interview.completedAt.getTime() - interview.startedAt.getTime()) / 60000
      );
    }
    
    // Generate overall feedback
    interview.overallFeedback = this.generateOverallFeedback(interview.overallScore);
    
    // Calculate category scores (simplified)
    const technicalResponses = answeredResponses.filter(r => r.questionType === 'technical');
    const behavioralResponses = answeredResponses.filter(r => 
      r.questionType === 'behavioral' || r.questionType === 'situational'
    );
    
    if (technicalResponses.length > 0) {
      interview.technicalScore = Math.round(
        (technicalResponses.reduce((sum, r) => sum + r.score, 0) / technicalResponses.length) * 10
      );
    }
    
    if (behavioralResponses.length > 0) {
      interview.communicationScore = Math.round(
        (behavioralResponses.reduce((sum, r) => sum + r.score, 0) / behavioralResponses.length) * 10
      );
    }
    
    // Aggregate strengths and improvements
    const allStrengths = answeredResponses.flatMap(r => r.strengths);
    const allImprovements = answeredResponses.flatMap(r => r.improvements);
    const missedTopics = answeredResponses.flatMap(r => r.keywordsMissed);
    
    // Get unique top items
    interview.topStrengths = [...new Set(allStrengths)].slice(0, 5);
    interview.topImprovements = [...new Set(allImprovements)].slice(0, 5);
    interview.recommendedTopics = [...new Set(missedTopics)].slice(0, 5);
    
    await interview.save();
    return interview;
  }
  
  private generateOverallFeedback(score: number): string {
    if (score >= 80) {
      return 'Excellent performance! You demonstrated strong knowledge and communication skills. You are well-prepared for real interviews.';
    } else if (score >= 60) {
      return 'Good performance! You have a solid foundation but there are areas to improve. Focus on the recommended topics and practice more.';
    } else if (score >= 40) {
      return 'Fair performance. You need to strengthen your fundamentals and practice more. Review the topics you missed and try again.';
    } else {
      return 'Needs significant improvement. Focus on building your core knowledge and practice regularly. Consider reviewing basic concepts.';
    }
  }
  
  // Get interview by ID
  async getInterviewById(interviewId: string, studentId?: string): Promise<IMockInterview | null> {
    const query: any = { _id: interviewId };
    if (studentId) {
      query.studentId = studentId;
    }
    return await MockInterview.findOne(query)
      .populate('studentId', 'name email')
      .populate('courseId', 'name')
      .populate('chapterId', 'name');
  }
  
  // Get student's interview history
  async getStudentInterviews(
    studentId: string,
    tenantId: string,
    filters?: {
      category?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ interviews: IMockInterview[]; total: number }> {
    const query: any = { studentId, tenantId };
    
    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    
    const [interviews, total] = await Promise.all([
      MockInterview.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('courseId', 'name')
        .populate('chapterId', 'name'),
      MockInterview.countDocuments(query)
    ]);
    
    return { interviews, total };
  }
  
  // Get interview statistics for student
  async getStudentStats(studentId: string, tenantId: string): Promise<{
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number;
    bestScore: number;
    recentTrend: number[];
    categoryBreakdown: { category: string; count: number; avgScore: number }[];
  }> {
    const interviews = await MockInterview.find({
      studentId,
      tenantId,
      status: 'completed'
    }).sort({ completedAt: -1 });
    
    const total = await MockInterview.countDocuments({ studentId, tenantId });
    const completed = interviews.length;
    
    const scores = interviews.map(i => i.overallScore || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    
    // Recent 5 interview scores
    const recentTrend = scores.slice(0, 5).reverse();
    
    // Category breakdown
    const categoryMap = new Map<string, { count: number; totalScore: number }>();
    interviews.forEach(i => {
      const existing = categoryMap.get(i.category) || { count: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += i.overallScore || 0;
      categoryMap.set(i.category, existing);
    });
    
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      avgScore: Math.round(data.totalScore / data.count)
    }));
    
    return {
      totalInterviews: total,
      completedInterviews: completed,
      averageScore: avgScore,
      bestScore,
      recentTrend,
      categoryBreakdown
    };
  }
  
  // Get leaderboard for a batch
  async getBatchLeaderboard(
    batchId: string,
    tenantId: string,
    limit: number = 10
  ): Promise<{ rank: number; studentId: string; studentName: string; avgScore: number; interviewCount: number }[]> {
    const result = await MockInterview.aggregate([
      {
        $match: {
          batchId: new mongoose.Types.ObjectId(batchId),
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$studentId',
          avgScore: { $avg: '$overallScore' },
          interviewCount: { $sum: 1 }
        }
      },
      {
        $sort: { avgScore: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $project: {
          studentId: '$_id',
          studentName: '$student.name',
          avgScore: { $round: ['$avgScore', 0] },
          interviewCount: 1
        }
      }
    ]);
    
    return result.map((r, idx) => ({ ...r, rank: idx + 1 }));
  }
  
  // Cancel an interview
  async cancelInterview(interviewId: string, studentId: string): Promise<IMockInterview> {
    const interview = await MockInterview.findOneAndUpdate(
      {
        _id: interviewId,
        studentId,
        status: { $in: ['scheduled', 'in-progress'] }
      },
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!interview) {
      throw new Error('Interview not found or cannot be cancelled');
    }
    
    return interview;
  }
  
  // ==================== ASSIGNMENT METHODS ====================
  
  // Admin assigns interview to a single student
  async assignInterviewToStudent(data: {
    assignedBy: string;
    tenantId: string;
    studentId: string;
    category: string;
    subCategory?: string;
    targetCompany?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    totalQuestions?: number;
    timeLimit?: number;
    dueDate?: Date;
    assignmentNote?: string;
    assignmentPriority?: 'low' | 'medium' | 'high';
    recordingEnabled?: boolean;
    courseId?: string;
    subjectId?: string;
    chapterId?: string;
    batchId?: string;
  }): Promise<IMockInterview> {
    const {
      assignedBy,
      tenantId,
      studentId,
      category,
      subCategory,
      targetCompany,
      difficulty = 'medium',
      totalQuestions = 10,
      timeLimit = 30,
      dueDate,
      assignmentNote,
      assignmentPriority = 'medium',
      recordingEnabled = false,
      courseId,
      subjectId,
      chapterId,
      batchId
    } = data;
    
    // Generate questions
    const questions = await this.generateQuestions({
      category,
      subCategory,
      targetCompany,
      difficulty,
      count: totalQuestions,
      chapterId,
      tenantId
    });
    
    const responses: IInterviewResponse[] = questions.map((q, idx) => ({
      questionNumber: idx + 1,
      question: q.question,
      questionType: q.type as any,
      expectedTopics: q.expectedTopics,
      answer: '',
      responseTime: 0,
      score: 0,
      feedback: '',
      strengths: [],
      improvements: [],
      keywordsCovered: [],
      keywordsMissed: []
    }));
    
    const interview = new MockInterview({
      studentId,
      tenantId,
      type: 'ai',
      category,
      subCategory,
      targetCompany,
      difficulty,
      totalQuestions,
      timeLimit,
      courseId,
      subjectId,
      chapterId,
      batchId,
      status: 'scheduled',
      responses,
      currentQuestionIndex: 0,
      topStrengths: [],
      topImprovements: [],
      recommendedTopics: [],
      // Assignment fields
      isAssigned: true,
      assignedBy,
      assignedAt: new Date(),
      dueDate,
      assignmentNote,
      assignmentPriority,
      recordingEnabled
    });
    
    return await interview.save();
  }
  
  // Admin assigns interview to multiple students in a batch
  async assignInterviewToBatch(data: {
    assignedBy: string;
    tenantId: string;
    batchId: string;
    studentIds: string[];
    category: string;
    subCategory?: string;
    targetCompany?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    totalQuestions?: number;
    timeLimit?: number;
    dueDate?: Date;
    assignmentNote?: string;
    assignmentPriority?: 'low' | 'medium' | 'high';
    recordingEnabled?: boolean;
    courseId?: string;
    subjectId?: string;
    chapterId?: string;
  }): Promise<{ created: number; failed: string[] }> {
    const { studentIds, ...commonData } = data;
    
    const results = await Promise.allSettled(
      studentIds.map(studentId => 
        this.assignInterviewToStudent({
          ...commonData,
          studentId,
          batchId: data.batchId
        })
      )
    );
    
    const created = results.filter(r => r.status === 'fulfilled').length;
    const failed = results
      .map((r, idx) => r.status === 'rejected' ? studentIds[idx] : null)
      .filter((id): id is string => id !== null);
    
    return { created, failed };
  }
  
  // Get assigned interviews for admin view
  async getAssignedInterviews(
    tenantId: string,
    filters?: {
      assignedBy?: string;
      batchId?: string;
      status?: string;
      category?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ interviews: IMockInterview[]; total: number }> {
    const query: any = { tenantId, isAssigned: true };
    
    if (filters?.assignedBy) {
      query.assignedBy = filters.assignedBy;
    }
    if (filters?.batchId) {
      query.batchId = filters.batchId;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.category) {
      query.category = filters.category;
    }
    
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    
    const [interviews, total] = await Promise.all([
      MockInterview.find(query)
        .sort({ assignedAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('studentId', 'name email')
        .populate('assignedBy', 'name email')
        .populate('batchId', 'name')
        .populate('courseId', 'name'),
      MockInterview.countDocuments(query)
    ]);
    
    return { interviews, total };
  }
  
  // Get student's assigned interviews
  async getStudentAssignedInterviews(
    studentId: string,
    tenantId: string,
    filters?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ interviews: IMockInterview[]; total: number }> {
    const query: any = { studentId, tenantId, isAssigned: true };
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    
    const [interviews, total] = await Promise.all([
      MockInterview.find(query)
        .sort({ dueDate: 1, assignedAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('assignedBy', 'name')
        .populate('courseId', 'name')
        .populate('batchId', 'name'),
      MockInterview.countDocuments(query)
    ]);
    
    return { interviews, total };
  }
  
  // Get assignment statistics for admin
  async getAssignmentStats(tenantId: string, assignedBy?: string): Promise<{
    totalAssigned: number;
    completed: number;
    pending: number;
    overdue: number;
    averageScore: number;
    completionRate: number;
  }> {
    const query: any = { tenantId, isAssigned: true };
    if (assignedBy) {
      query.assignedBy = assignedBy;
    }
    
    const interviews = await MockInterview.find(query);
    
    const now = new Date();
    const completed = interviews.filter(i => i.status === 'completed').length;
    const pending = interviews.filter(i => 
      ['scheduled', 'in-progress'].includes(i.status) && 
      (!i.dueDate || new Date(i.dueDate) >= now)
    ).length;
    const overdue = interviews.filter(i => 
      ['scheduled', 'in-progress'].includes(i.status) && 
      i.dueDate && new Date(i.dueDate) < now
    ).length;
    
    const completedScores = interviews
      .filter(i => i.status === 'completed' && i.overallScore)
      .map(i => i.overallScore!);
    
    const averageScore = completedScores.length > 0 
      ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
      : 0;
    
    const completionRate = interviews.length > 0 
      ? Math.round((completed / interviews.length) * 100)
      : 0;
    
    return {
      totalAssigned: interviews.length,
      completed,
      pending,
      overdue,
      averageScore,
      completionRate
    };
  }
  
  // ==================== RECORDING METHODS ====================
  
  // Save recording URL after upload
  async saveRecording(
    interviewId: string,
    studentId: string,
    recordingData: {
      recordingUrl: string;
      recordingDuration: number;
      recordingSize: number;
      recordingType: 'video' | 'audio';
    }
  ): Promise<IMockInterview> {
    const interview = await MockInterview.findOneAndUpdate(
      { _id: interviewId, studentId },
      {
        recordingUrl: recordingData.recordingUrl,
        recordingDuration: recordingData.recordingDuration,
        recordingSize: recordingData.recordingSize,
        recordingType: recordingData.recordingType
      },
      { new: true }
    );
    
    if (!interview) {
      throw new Error('Interview not found');
    }
    
    return interview;
  }
  
  // Get interviews with recordings for admin review
  async getInterviewsWithRecordings(
    tenantId: string,
    filters?: {
      batchId?: string;
      studentId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ interviews: IMockInterview[]; total: number }> {
    const query: any = { 
      tenantId, 
      recordingUrl: { $exists: true, $ne: null }
    };
    
    if (filters?.batchId) {
      query.batchId = filters.batchId;
    }
    if (filters?.studentId) {
      query.studentId = filters.studentId;
    }
    
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    
    const [interviews, total] = await Promise.all([
      MockInterview.find(query)
        .sort({ completedAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('studentId', 'name email')
        .populate('batchId', 'name'),
      MockInterview.countDocuments(query)
    ]);
    
    return { interviews, total };
  }
}

export default new MockInterviewService();
