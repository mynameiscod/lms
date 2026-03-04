const http = require('http');

const data = JSON.stringify({
  email: 'admin@test.com',
  password: 'Test123!'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(responseData);
      if (json.data && json.data.token) {
        console.log('Token:', json.data.token);
        console.log('TenantId:', json.data.user.tenantId);
      } else {
        console.log('Response:', JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (e) => console.error(`problem with request: ${e.message}`));
req.write(data);
req.end();
