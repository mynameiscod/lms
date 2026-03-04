const http = require('http');

// Step 1: Login as student
const loginData = JSON.stringify({
  email: 'student@test.com',
  password: 'Test123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(loginOptions, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(responseData);
      if (json.data && json.data.token) {
        const token = json.data.token;
        const tenantId = json.data.user.tenantId;
        const studentId = json.data.user._id;
        
        console.log('✅ Student logged in');
        console.log('Student ID:', studentId);
        console.log('Tenant ID:', tenantId);
        console.log('');
        
        // Step 2: Try to start a quiz
        setTimeout(() => {
          testQuizAttempt(token, tenantId, studentId, '69a8391864ad5f28809953b9', 'Quiz 002');
        }, 500);
      }
    } catch (e) {
      console.log('Login error:', responseData);
    }
  });
});

req.on('error', (e) => console.error(`Login error: ${e.message}`));
req.write(loginData);
req.end();

// Function to test quiz attempt
function testQuizAttempt(token, tenantId, studentId, quizId, quizName) {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/v1/quizzes/${quizId}/start`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Length': 0
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(responseData);
        console.log(`\n📝 Attempt to start "${quizName}":`);
        
        if (res.statusCode === 201) {
          console.log('✅ SUCCESS! Student CAN take the quiz');
          console.log('Attempt ID:', json._id);
          console.log('Status:', json.status);
        } else {
          console.log('❌ FAILED -', json.message || json.error);
        }
      } catch (e) {
        console.log('Response:', responseData);
      }
    });
  });

  req.on('error', (e) => console.error(`Quiz attempt error: ${e.message}`));
  req.end();
}
