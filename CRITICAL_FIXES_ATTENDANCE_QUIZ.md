# 🔧 CRITICAL FIXES - Attendance & Quiz Modules

## PRIORITY 1: QUIZ MODULE - CRITICAL FIXES

### Issue 1: Quiz Timer Not Working in Frontend
**Status**: Timer exists but may need fixes
**File**: `client/src/pages/QuizTaking/index.tsx` line ~100
**Fix Needed**:
```typescript
// Add timer countdown logic
useEffect(() => {
  if (!quiz || !attempt) return;
  
  timerRef.current = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) {
        clearInterval(timerRef.current!);
        handleSubmitQuiz(); // Auto-submit when time ends
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [quiz, attempt]);

// Add warning when < 5 minutes left
useEffect(() => {
  if (timeLeft > 0 && timeLeft <= 300 && timeLeft % 60 === 0) {
    console.warn(`⏰ Only ${Math.floor(timeLeft / 60)} minutes left!`);
  }
}, [timeLeft]);
```

**Status**: ✅ Timer logic exists, needs testing

---

### Issue 2: Answer Validation & Scoring Not Implemented
**Status**: Backend has scoring structure but implementation incomplete
**File**: `server/src/services/quizService.ts`
**Fix Needed**: Implement scoring algorithm
```typescript
// Calculate correct answers and marks
async calculateQuizScore(attemptId: string, userAnswers: Map<string, any>) {
  const attempt = await QuizAttempt.findById(attemptId)
    .populate('quizId')
    .populate('userId');

  if (!attempt) throw new Error('Attempt not found');

  const quiz = attempt.quizId as IQuiz;
  let correctCount = 0;
  let totalMarks = 0;
  const results = [];

  for (const [questionId, userAnswer] of userAnswers) {
    const question = await Question.findById(questionId);
    if (!question) continue;

    const isCorrect = this.checkAnswer(question, userAnswer);
    const marks = isCorrect ? question.marks : 
                  (quiz.negativeMarking ? -(quiz.negativeMarkingValue || 0) : 0);
    
    correctCount += isCorrect ? 1 : 0;
    totalMarks += marks;

    results.push({
      questionId,
      userAnswer,
      isCorrect,
      marksObtained: marks,
      correctAnswer: question.correctAnswer
    });
  }

  attempt.totalMarks = totalMarks;
  attempt.totalCorrect = correctCount;
  attempt.percentage = (totalMarks / quiz.totalMarks) * 100;
  attempt.passed = attempt.percentage >= (quiz.passPercentage || 50);
  attempt.completedAt = new Date();
  
  await attempt.save();
  return { attempt, results };
}

// Check if answer is correct
private checkAnswer(question: IQuestion, userAnswer: any): boolean {
  if (question.type === 'multiple_choice') {
    return userAnswer === question.correctAnswer;
  } else if (question.type === 'true_false') {
    return userAnswer === question.correctAnswer;
  } else if (question.type === 'short_answer') {
    return userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
  }
  return false;
}
```

**Status**: ❌ NEEDS IMPLEMENTATION

---

### Issue 3: Question Randomization Not Enforced
**Status**: Flag exists but not implemented
**File**: `server/src/controllers/quizController.ts` - getQuizQuestions method
**Fix Needed**:
```typescript
export const getQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    let questions = await Question.find({ 
      _id: { $in: quiz.questionIds || [] } 
    });

    // Shuffle if enabled
    if (quiz.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    }

    // Remove correct answers from questions (hide from students)
    const sanitized = questions.map(q => {
      const obj = q.toObject();
      delete obj.correctAnswer;
      return obj;
    });

    res.json({
      success: true,
      data: sanitized
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
```

**Status**: ❌ NEEDS IMPLEMENTATION

---

### Issue 4: Auto-Save Answers Not Implemented
**Status**: Exists in code but may not save correctly
**File**: `client/src/pages/QuizTaking/index.tsx`
**Fix Needed**:
```typescript
// Auto-save answers every 10 seconds
useEffect(() => {
  if (!attempt || answers.size === 0) return;

  const autoSaveTimer = setInterval(async () => {
    try {
      await quizApi.saveQuizProgress(attempt._id, {
        answers: Array.from(answers.entries()),
        currentQuestionIndex,
        timestamp: new Date()
      });
      console.log('✅ Answers auto-saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, 10000); // 10 seconds

  return () => clearInterval(autoSaveTimer);
}, [attempt, answers, currentQuestionIndex]);
```

**Status**: ⚠️ Partial implementation needed

---

## PRIORITY 2: ATTENDANCE MODULE - CRITICAL FIXES  

### Issue 1: Bulk Attendance Marking Not Working
**Status**: UI exists but backend doesn't support bulk
**File**: `server/src/controllers/attendanceController.ts`
**Fix Needed**:
```typescript
export const markBulkAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, date, attendance } = req.body;
    // attendance: [{ studentId, status, inTime, outTime }, ...]
    
    const tenantId = req.tenantId!;
    const markedBy = req.user?.id || req.userId!;

    if (!batchId || !date || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: batchId, date, attendance array'
      });
    }

    // Check for duplicates
    const existingRecords = await Attendance.find({
      batchId,
      date: new Date(date),
      tenantId
    });

    if (existingRecords.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Attendance already marked for ${existingRecords.length} students on this date`
      });
    }

    // Bulk insert
    const records = attendance.map((att: any) => ({
      studentId: att.studentId,
      batchId,
      date: new Date(date),
      inTime: att.inTime || null,
      outTime: att.outTime || null,
      status: att.status || 'absent',
      markedBy,
      tenantId,
      remarks: att.remarks || ''
    }));

    const result = await Attendance.insertMany(records);

    res.status(201).json({
      success: true,
      data: result,
      message: `${result.length} attendance records created successfully`
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark bulk attendance'
    });
  }
};
```

**Status**: ❌ NEEDS IMPLEMENTATION

---

### Issue 2: Attendance Percentage Calculation Missing
**Status**: No calculation exists
**File**: `server/src/services/attendanceService.ts`
**Fix Needed**:
```typescript
async getAttendancePercentage(studentId: string, batchId: string, tenantId: string) {
  const totalDays = await Attendance.countDocuments({
    batchId,
    tenantId,
    date: { $exists: true }
  }).distinct('date');

  const presentDays = await Attendance.countDocuments({
    studentId,
    batchId,
    status: 'present',
    tenantId
  });

  const percentage = totalDays.length > 0 
    ? (presentDays / totalDays.length) * 100 
    : 0;

  return {
    totalDays: totalDays.length,
    presentDays,
    absentDays: totalDays.length - presentDays,
    percentage: Math.round(percentage * 100) / 100,
    status: percentage >= 75 ? 'good' : percentage >= 50 ? 'warning' : 'critical'
  };
}
```

**Status**: ❌ NEEDS IMPLEMENTATION

---

### Issue 3: Attendance Export to CSV Not Implemented
**Status**: No export functionality exists
**File**: Create `server/src/controllers/attendanceController.ts`
**Fix Needed**:
```typescript
import * as XLSX from 'xlsx';

export const exportAttendanceReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, startDate, endDate, format = 'csv' } = req.query;
    const tenantId = req.tenantId!;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'batchId is required'
      });
    }

    const query: any = { batchId, tenantId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName email')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: 1, studentId: 1 });

    // Format data for export
    const data = attendance.map((record: any) => ({
      'Student Name': `${record.studentId.firstName} ${record.studentId.lastName}`,
      'Student Email': record.studentId.email,
      'Date': new Date(record.date).toLocaleDateString(),
      'Status': record.status.toUpperCase(),
      'In Time': record.inTime || '-',
      'Out Time': record.outTime || '-',
      'Remarks': record.remarks || '-'
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
      res.send(buffer);
    } else {
      const csv = XLSX.utils.json_to_csv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
      res.send(csv);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export attendance report'
    });
  }
};
```

**Status**: ❌ NEEDS IMPLEMENTATION

---

## RECOMMENDED ACTION PLAN

### Week 1: Quiz Module
- [ ] Day 1-2: Implement quiz scoring & answer validation
- [ ] Day 3: Implement question randomization
- [ ] Day 4: Add auto-save functionality
- [ ] Day 5: Test end-to-end quiz flow

### Week 2: Attendance Module  
- [ ] Day 1-2: Add bulk attendance marking
- [ ] Day 3: Implement percentage calculation
- [ ] Day 4: Add export functionality
- [ ] Day 5: Test end-to-end attendance flow

### Week 3: Polish & Testing
- [ ] Add analytics dashboards
- [ ] Performance optimization
- [ ] Full regression testing
- [ ] Deployment

---

## Total Estimated Effort
- **Quiz Module**: 15-20 hours
- **Attendance Module**: 12-16 hours
- **Testing & Polish**: 10-15 hours
- **Total**: 37-51 hours (~1 week intensive work)
