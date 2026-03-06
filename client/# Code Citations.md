# Code Citations

## License: unknown
https://github.com/HumHug/HumHug.github.io/blob/a0e52e041684587eb987023977af3076d0ea378e/im-2310/a2/e1/style.css

```
## Assignment Module Implementation Plan

### Phase 1: Database Models

```
┌─────────────────────────────────────────────────────────────────┐
│                        ASSIGNMENT                                │
├─────────────────────────────────────────────────────────────────┤
│ _id, title, description, chapterId, tenantId                    │
│ type: "coding" | "fullstack"                                    │
│ difficulty: "easy" | "medium" | "hard"                          │
│ totalMarks, dueDate, isActive                                   │
│ starterCode: { language, files[] }                              │
│ testCases: [{ input, expectedOutput, marks, isHidden }]         │
│ constraints, hints[], tags[]                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUBMISSION                                   │
├─────────────────────────────────────────────────────────────────┤
│ _id, assignmentId, studentId, tenantId                          │
│ code: { language, files[] }                                     │
│ status: "draft" | "submitted" | "evaluated"                     │
│ version, submittedAt                                            │
│ testResults: [{ testCaseId, passed, output, executionTime }]    │
│ autoScore, manualScore, totalScore                              │
│ adminRemarks, reviewedBy, reviewedAt                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 2: API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Admin** |
| POST | `/assignments` | Create assignment |
| PUT | `/assignments/:id` | Update assignment |
| GET | `/assignments/:id/submissions` | Get all submissions |
| PUT | `/submissions/:id/review` | Add manual score/remarks |
| **Student** |
| GET | `/assignments/chapter/:chapterId` | Get assignments for chapter |
| GET | `/assignments/:id` | Get assignment details |
| POST | `/assignments/:id/run` | Run code against test cases |
| POST | `/assignments/:id/save` | Save draft |
| POST | `/assignments/:id/submit` | Submit solution |
| GET | `/assignments/:id/submissions/my` | Get my submissions |

---

### Phase 3: Frontend Components

```
client/src/
├── pages/
│   ├── Assignments/
│   │   ├── index.tsx                    # Assignment list
│   │   ├── AssignmentCreate.tsx         # Admin: Create/Edit
│   │   ├── AssignmentWorkspace.tsx      # Student: Coding playground
│   │   ├── AssignmentReview.tsx         # Admin: Review submissions
│   │   └── AssignmentSubmissions.tsx    # Admin: All submissions
│   │
├── components/
│   ├── Assignment/
│   │   ├── ProblemStatement.tsx         # Left panel
│   │   ├── CodeEditor.tsx               # Monaco editor wrapper
│   │   ├── TestCasePanel.tsx            # Test case results
│   │   ├── FileExplorer.tsx             # For fullstack (multi-file)
│   │   └── SubmissionHistory.tsx        # Version dropdown
```

---

### Phase 4: Student Workspace Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Assignment: Two
```


## License: unknown
https://github.com/HumHug/HumHug.github.io/blob/a0e52e041684587eb987023977af3076d0ea378e/im-2310/a2/e1/style.css

```
## Assignment Module Implementation Plan

### Phase 1: Database Models

```
┌─────────────────────────────────────────────────────────────────┐
│                        ASSIGNMENT                                │
├─────────────────────────────────────────────────────────────────┤
│ _id, title, description, chapterId, tenantId                    │
│ type: "coding" | "fullstack"                                    │
│ difficulty: "easy" | "medium" | "hard"                          │
│ totalMarks, dueDate, isActive                                   │
│ starterCode: { language, files[] }                              │
│ testCases: [{ input, expectedOutput, marks, isHidden }]         │
│ constraints, hints[], tags[]                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUBMISSION                                   │
├─────────────────────────────────────────────────────────────────┤
│ _id, assignmentId, studentId, tenantId                          │
│ code: { language, files[] }                                     │
│ status: "draft" | "submitted" | "evaluated"                     │
│ version, submittedAt                                            │
│ testResults: [{ testCaseId, passed, output, executionTime }]    │
│ autoScore, manualScore, totalScore                              │
│ adminRemarks, reviewedBy, reviewedAt                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 2: API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Admin** |
| POST | `/assignments` | Create assignment |
| PUT | `/assignments/:id` | Update assignment |
| GET | `/assignments/:id/submissions` | Get all submissions |
| PUT | `/submissions/:id/review` | Add manual score/remarks |
| **Student** |
| GET | `/assignments/chapter/:chapterId` | Get assignments for chapter |
| GET | `/assignments/:id` | Get assignment details |
| POST | `/assignments/:id/run` | Run code against test cases |
| POST | `/assignments/:id/save` | Save draft |
| POST | `/assignments/:id/submit` | Submit solution |
| GET | `/assignments/:id/submissions/my` | Get my submissions |

---

### Phase 3: Frontend Components

```
client/src/
├── pages/
│   ├── Assignments/
│   │   ├── index.tsx                    # Assignment list
│   │   ├── AssignmentCreate.tsx         # Admin: Create/Edit
│   │   ├── AssignmentWorkspace.tsx      # Student: Coding playground
│   │   ├── AssignmentReview.tsx         # Admin: Review submissions
│   │   └── AssignmentSubmissions.tsx    # Admin: All submissions
│   │
├── components/
│   ├── Assignment/
│   │   ├── ProblemStatement.tsx         # Left panel
│   │   ├── CodeEditor.tsx               # Monaco editor wrapper
│   │   ├── TestCasePanel.tsx            # Test case results
│   │   ├── FileExplorer.tsx             # For fullstack (multi-file)
│   │   └── SubmissionHistory.tsx        # Version dropdown
```

---

### Phase 4: Student Workspace Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Assignment: Two
```

