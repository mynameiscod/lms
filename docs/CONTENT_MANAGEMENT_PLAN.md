# Student Dashboard Content Management System - Architecture Plan

## Overview
Students see aggregated content (Announcements, Notes, Assignments, Cheatsheets, Snippets) posted by admins/instructors on the dashboard.

---

## 1. BACKEND ARCHITECTURE

### Database Models (MongoDB)

#### Unified Content Model (Recommended Approach)
```typescript
interface Content {
  _id: ObjectId;
  type: 'announcement' | 'note' | 'assignment' | 'cheatsheet' | 'snippet';
  title: string;
  description: string;
  content: string;  // Rich text/HTML
  
  author: {
    userId: ObjectId;
    name: string;
    role: 'ADMIN' | 'INSTRUCTOR';
  };
  
  course: {
    courseId: ObjectId;
    courseName: string;
  };
  
  tenant: ObjectId;
  
  // Type-specific fields
  dueDate?: Date;           // For assignments
  priority?: 'low' | 'medium' | 'high';  // For announcements
  fileAttachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  
  // Metadata
  tags: string[];
  visibility: 'all_students' | 'specific_batch' | 'enrolled_only';
  visibleTo?: ObjectId[];   // Specific batch/user IDs if needed
  
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;         // Auto-hide old announcements
}
```

### Alternative: Separate Models
- If you want very specific fields per type, create separate models
- Trade-off: More schemas but cleaner per-type logic

---

## 2. BACKEND ROUTES & CONTROLLERS

### Admin Routes (POST/PUT/DELETE)
```
POST   /api/content                    → Create content
PUT    /api/content/:id                → Update content
DELETE /api/content/:id                → Delete content
GET    /api/content/admin/dashboard    → Admin dashboard view
```

### Student Routes (GET only)
```
GET    /api/content/student            → Get all content for student
GET    /api/content/student?type=announcement  → Filter by type
GET    /api/content/student?course=xyz → Filter by course
GET    /api/content/student/:id        → Get single content detail
```

### Content-Specific Routes
```
GET    /api/announcements               (student view, read-only)
GET    /api/notes                       (student view)
GET    /api/assignments                 (student view)
GET    /api/cheatsheets                 (student view)
GET    /api/snippets                    (student view)

POST   /api/announcements               (admin only)
POST   /api/notes                       (admin/instructor)
POST   /api/assignments                 (admin/instructor)
POST   /api/cheatsheets                 (admin/instructor)
POST   /api/snippets                    (admin/instructor)
```

---

## 3. AUTHORIZATION & PERMISSIONS

```
ADMIN/INSTRUCTOR can:
  ✓ Create any content type
  ✓ Edit their own content
  ✓ Delete their own content
  ✓ View admin dashboard with analytics

STUDENT can:
  ✓ View content for their courses
  ✓ Mark assignments as completed (later feature)
  ✗ Cannot create
  ✗ Cannot edit/delete
```

---

## 4. FRONTEND ARCHITECTURE

### Admin Panel Pages
```
/admin/content
  ├── Create Content Form
  │   ├── Type Selector (announcement/note/assignment/cheatsheet/snippet)
  │   ├── Title & Description
  │   ├── Rich Text Editor (content field)
  │   ├── Course Selector
  │   ├── File Upload
  │   ├── Due Date (for assignments)
  │   └── Visibility Settings
  │
  ├── Content Management Table
  │   ├── All posted content
  │   ├── Filter by type
  │   ├── Search
  │   ├── Edit/Delete actions
  │   └── View analytics
```

### Student Dashboard Display
```
Dashboard Overview
  ├── TAB 1: All Content (Timeline view)
  │   ├── Recent announcements
  │   ├── Upcoming assignments
  │   ├── New notes/cheatsheets
  │   └── Code snippets
  │
  ├── TAB 2: Announcements
  │   ├── Important/Pinned first
  │   ├── Filter by course
  │   └── Search
  │
  ├── TAB 3: Assignments
  │   ├── Due date priority
  │   ├── Status: Due Soon / Overdue / Completed
  │   └── Mark as read/completed
  │
  ├── TAB 4: Notes
  │   ├── By course
  │   ├── Search/filter
  │   └── Download option
  │
  ├── TAB 5: Cheatsheets
  │   ├── Category filter
  │   ├── Search
  │   └── Preview/Download
  │
  └── TAB 6: Code Snippets
      ├── Language filter
      ├── Search
      └── Copy to clipboard
```

---

## 5. COMPONENT STRUCTURE

### Admin Components
```
AdminContentPanel/
  ├── ContentForm.tsx         (Create/Edit form)
  ├── ContentForm.css
  ├── ContentTable.tsx        (List all content)
  ├── ContentTable.css
  ├── ContentFilters.tsx      (Type/Course/Status filters)
  └── ContentFilters.css
```

### Student Components (Already exist, will enhance)
```
StudentsContent/
  ├── ContentTabs.tsx         (Tab switcher)
  ├── ContentTabs.css
  ├── AnnouncementsList.tsx   (Already have this logic)
  ├── AssignmentsList.tsx     (Existing mock data)
  ├── NotesList.tsx           (New)
  ├── CheatsheetsList.tsx     (New)
  ├── SnippetsDisplay.tsx     (New)
  ├── ContentCard.tsx         (Reusable card component)
  └── ContentCard.css
```

---

## 6. DATA FLOW

### Admin Creates Content
```
Admin → Form → Submit → Backend API → MongoDB → Store
                          ↓
                     Emit Socket Event
                          ↓
                   Connected Students
                   (Real-time update)
```

### Student Views Content
```
Student Opens Dashboard → API Call → Fetch Content → Filter by Course/Type → Display
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Backend Setup (1-2 hours)
- [ ] Create Content model/schema
- [ ] Create controllers (create, read, update, delete)
- [ ] Create routes for admin and student
- [ ] Add authentication/authorization middleware
- [ ] Add mock data for testing

### Phase 2: Admin Panel Frontend (2-3 hours)
- [ ] Create ContentForm component
- [ ] Create ContentTable component
- [ ] Add file upload functionality
- [ ] Add form validation
- [ ] Connect to backend APIs

### Phase 3: Student Dashboard Integration (2-3 hours)
- [ ] Refactor existing activity display
- [ ] Create tab-based view
- [ ] Create individual list components
- [ ] Add filtering/search
- [ ] Display real-time updates

### Phase 4: Polish & Features (1-2 hours)
- [ ] Add pagination
- [ ] Add sorting options
- [ ] Add notifications for new content
- [ ] Add read/unread status tracking
- [ ] Add rich text editor

---

## 8. START HERE - RECOMMENDED APPROACH

### Quick Win Strategy:
1. **Reuse Existing Mock Data** - Your dashboard already shows mock announcements, assignments, etc.
   - Replace mock data with API calls
   - Create simple backend models first
   - Add admin form to create new entries

2. **Start with Admin Panel** - Build the input interface first
   - Simple form for each content type
   - Save to MongoDB
   - Then connect student view

3. **One Feature at a Time**
   - Start with **Announcements** (simplest)
   - Then **Assignments**
   - Then **Notes**
   - Then **Cheatsheets** & **Snippets**

---

## 9. INITIAL QUESTIONS TO CLARIFY

1. **Should different content types have different fields?**
   - Assignment: needs due date, rubric, submission handling
   - Note: maybe just content + attachments
   - Snippet: code language, syntax highlighting
   - Cheatsheet: maybe downloadable PDF

2. **Who can create?**
   - Only admins? Or instructors too?
   - Can instructors create for their courses only?

3. **Real-time or Poll?**
   - WebSocket for real-time updates?
   - Or just refresh when students come back?

4. **Search/Filter Priority?**
   - By course? By type? By date? By instructor?

5. **Attachments/Files?**
   - Support file uploads?
   - Where store files? (Local, S3, etc.)

---

## 10. SQL/NoSQL Schema Summary

### Single Content Collection Approach (Recommended)
```
Contents Collection:
│
├── Announces (type: 'announcement')
│   └── Fields: title, content, priority, expiresAt
│
├── Notes (type: 'note') 
│   └── Fields: title, content, fileAttachments
│
├── Assignments (type: 'assignment')
│   └── Fields: title, content, dueDate, rubric
│
├── Cheatsheets (type: 'cheatsheet')
│   └── Fields: title, content, category, fileAttachments
│
└── Snippets (type: 'snippet')
    └── Fields: title, code, language, tags
```

---

**Ready to start implementation? Which feature do you want to tackle first?**
