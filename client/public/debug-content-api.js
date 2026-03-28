// Quick test script to check API connectivity and create sample content
// Run this in the browser console to test if the API is working

const testContentAPI = async () => {
  console.log('🔍 Testing Content API...');
  
  try {
    // Test API connectivity
    const baseURL = window.location.origin;
    console.log('Base URL:', baseURL);
    
    // Try to fetch content
    const response = await fetch(`${baseURL}/api/v1/content`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || 'no-token'}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Working! Content data:', data);
      return data;
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
    return null;
  }
};

const createSampleContent = async () => {
  console.log('📝 Creating sample content...');
  
  const sampleContent = {
    type: 'announcement',
    title: 'Welcome to the LMS!',
    description: 'This is a sample announcement to test the content system.',
    content: 'Welcome to our Learning Management System! This is a test announcement to verify that content creation is working properly.',
    isPublished: true,
    visibility: 'all_students',
    tags: ['welcome', 'announcement', 'test']
  };

  try {
    const baseURL = window.location.origin;
    const response = await fetch(`${baseURL}/api/v1/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || 'no-token'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleContent)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sample content created!', data);
      console.log('🔄 Refresh the page to see the content');
      return data;
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to create content:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating content:', error);
    return null;
  }
};

// Run tests
console.log(`
🧪 LMS Content API Troubleshooting
==================================

To test the API, run these commands in the browser console:

1. Test API connectivity:
   testContentAPI()

2. Create sample content:
   createSampleContent()

3. Check authentication token:
   console.log('Token:', localStorage.getItem('token'))

4. Check current user:
   console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'))
`);

// Auto-run basic test
testContentAPI();