import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Assignment from '../models/Assignment';
import Tenant from '../models/Tenant';
import User from '../models/User';

const sampleAssignment = {
  title: '🚀 Build a REST API with Node.js & Express',
  description: `## Overview
Create a fully functional REST API for a **Todo Application** using Node.js and Express.js. This assignment will test your understanding of:

- RESTful API design principles
- Express.js routing and middleware
- CRUD operations
- Error handling
- Input validation

## Learning Objectives
By completing this assignment, you will:
1. Understand how to structure a Node.js project
2. Learn to create RESTful endpoints
3. Implement proper error handling
4. Use middleware for validation`,

  instructions: `## Step-by-Step Instructions

### Step 1: Project Setup
\`\`\`bash
mkdir todo-api
cd todo-api
npm init -y
npm install express cors dotenv
\`\`\`

### Step 2: Create the Server
Create \`server.js\` with the following structure:
\`\`\`javascript
const express = require('express');
const app = express();

app.use(express.json());

// Your routes here

app.listen(3000, () => console.log('Server running on port 3000'));
\`\`\`

### Step 3: Implement CRUD Endpoints
- \`GET /todos\` - Get all todos
- \`GET /todos/:id\` - Get a single todo
- \`POST /todos\` - Create a new todo
- \`PUT /todos/:id\` - Update a todo
- \`DELETE /todos/:id\` - Delete a todo

### Requirements
✅ Use proper HTTP status codes
✅ Implement input validation
✅ Handle errors gracefully
✅ Use meaningful variable names

### Bonus Points
⭐ Add pagination to GET /todos
⭐ Add filtering by status
⭐ Write unit tests`,

  type: 'coding',
  difficulty: 'medium',
  topics: ['Node.js', 'Express.js', 'REST API', 'Backend Development', 'JavaScript'],
  tags: ['api', 'backend', 'nodejs', 'express', 'crud'],
  totalPoints: 100,
  passingPoints: 60,
  status: 'published',
  
  // Due date 7 days from now
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  
  allowedLanguages: ['javascript', 'typescript'],
  
  starterCode: [
    {
      language: 'javascript',
      code: `const express = require('express');
const app = express();

app.use(express.json());

// In-memory storage for todos
let todos = [
  { id: 1, title: 'Learn Express', completed: false },
  { id: 2, title: 'Build REST API', completed: false }
];

// TODO: Implement GET /todos - Return all todos
app.get('/todos', (req, res) => {
  // Your code here
});

// TODO: Implement GET /todos/:id - Return a single todo
app.get('/todos/:id', (req, res) => {
  // Your code here
});

// TODO: Implement POST /todos - Create a new todo
app.post('/todos', (req, res) => {
  // Your code here
});

// TODO: Implement PUT /todos/:id - Update a todo
app.put('/todos/:id', (req, res) => {
  // Your code here
});

// TODO: Implement DELETE /todos/:id - Delete a todo
app.delete('/todos/:id', (req, res) => {
  // Your code here
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;`
    },
    {
      language: 'typescript',
      code: `import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// In-memory storage for todos
let todos: Todo[] = [
  { id: 1, title: 'Learn Express', completed: false },
  { id: 2, title: 'Build REST API', completed: false }
];

// TODO: Implement GET /todos - Return all todos
app.get('/todos', (req: Request, res: Response) => {
  // Your code here
});

// TODO: Implement GET /todos/:id - Return a single todo
app.get('/todos/:id', (req: Request, res: Response) => {
  // Your code here
});

// TODO: Implement POST /todos - Create a new todo
app.post('/todos', (req: Request, res: Response) => {
  // Your code here
});

// TODO: Implement PUT /todos/:id - Update a todo
app.put('/todos/:id', (req: Request, res: Response) => {
  // Your code here
});

// TODO: Implement DELETE /todos/:id - Delete a todo
app.delete('/todos/:id', (req: Request, res: Response) => {
  // Your code here
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;`
    }
  ],
  
  testCases: [
    {
      input: 'GET /todos',
      expectedOutput: '[{"id":1,"title":"Learn Express","completed":false},{"id":2,"title":"Build REST API","completed":false}]',
      isHidden: false,
      points: 15,
      description: 'Should return all todos'
    },
    {
      input: 'GET /todos/1',
      expectedOutput: '{"id":1,"title":"Learn Express","completed":false}',
      isHidden: false,
      points: 15,
      description: 'Should return a single todo by ID'
    },
    {
      input: 'POST /todos {"title":"New Todo"}',
      expectedOutput: '{"id":3,"title":"New Todo","completed":false}',
      isHidden: false,
      points: 20,
      description: 'Should create a new todo'
    },
    {
      input: 'PUT /todos/1 {"completed":true}',
      expectedOutput: '{"id":1,"title":"Learn Express","completed":true}',
      isHidden: true,
      points: 25,
      description: 'Should update an existing todo'
    },
    {
      input: 'DELETE /todos/1',
      expectedOutput: '{"message":"Todo deleted"}',
      isHidden: true,
      points: 25,
      description: 'Should delete a todo'
    }
  ],
  
  timeLimit: 10000,
  memoryLimit: 256,
  
  rubric: [
    {
      criterion: 'Code Quality',
      description: 'Clean, readable code with proper naming conventions and comments',
      maxPoints: 20
    },
    {
      criterion: 'Functionality',
      description: 'All CRUD operations work correctly',
      maxPoints: 40
    },
    {
      criterion: 'Error Handling',
      description: 'Proper error responses with appropriate HTTP status codes',
      maxPoints: 20
    },
    {
      criterion: 'Best Practices',
      description: 'Follows RESTful conventions and Express.js best practices',
      maxPoints: 20
    }
  ],
  
  settings: {
    shuffleQuestions: false,
    shuffleOptions: false,
    showCorrectAnswers: true,
    timeLimitMinutes: 120,
    maxAttempts: 3,
    allowLateSubmission: true,
    latePenaltyPercent: 10
  },
  
  hints: [
    '💡 Use req.params to access URL parameters like :id',
    '💡 Use req.body to access data sent in POST/PUT requests',
    '💡 Return 404 status when a todo is not found',
    '💡 Use Array.find() to search for items by ID'
  ],
  
  enableHints: true,
  showTestCaseResults: true,
  showExpectedOutput: false,
  maxAttempts: 3,
  
  stats: {
    totalSubmissions: 0,
    completedSubmissions: 0,
    averageScore: 0,
    highestScore: 0,
    averageTimeSpent: 0
  }
};

async function seedAssignment() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the first tenant
    const tenant = await Tenant.findOne();
    if (!tenant) {
      console.error('❌ No tenant found. Please create a tenant first.');
      process.exit(1);
    }
    console.log(`📌 Using tenant: ${tenant.name} (${tenant._id})`);

    // Find an admin user
    let user = await User.findOne({ tenant: tenant._id });
    if (!user) {
      // Try finding any user
      user = await User.findOne();
    }
    if (!user) {
      console.error('❌ No user found. Please create a user first.');
      process.exit(1);
    }
    console.log(`📌 Using user: ${user.email} (${user._id}) - Role: ${user.role}`);

    // Check if assignment already exists
    const existing = await Assignment.findOne({ 
      title: sampleAssignment.title,
      tenant: tenant._id 
    });
    
    if (existing) {
      console.log('⚠️ Assignment already exists. Updating...');
      await Assignment.findByIdAndUpdate(existing._id, {
        ...sampleAssignment,
        tenant: tenant._id,
        createdBy: user._id
      });
      console.log('✅ Assignment updated successfully!');
    } else {
      // Create the assignment
      const assignment = new Assignment({
        ...sampleAssignment,
        tenant: tenant._id,
        createdBy: user._id
      });
      await assignment.save();
      console.log('✅ Sample assignment created successfully!');
    }

    console.log('\n📋 Assignment Details:');
    console.log(`   Title: ${sampleAssignment.title}`);
    console.log(`   Type: ${sampleAssignment.type}`);
    console.log(`   Difficulty: ${sampleAssignment.difficulty}`);
    console.log(`   Points: ${sampleAssignment.totalPoints}`);
    console.log(`   Status: ${sampleAssignment.status}`);
    console.log(`   Test Cases: ${sampleAssignment.testCases.length}`);
    console.log(`   Languages: ${sampleAssignment.allowedLanguages.join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding assignment:', error);
    process.exit(1);
  }
}

seedAssignment();
