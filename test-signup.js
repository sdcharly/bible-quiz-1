// Test script to check if email/password signup works
const testSignup = async () => {
  try {
    console.log('Testing email/password signup...');
    
    const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        password: process.env.TEST_PASSWORD || 'TestPassword123!',
        name: 'Test User',
      }),
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('Signup successful:', data);
    } else {
      console.log('Signup failed');
    }
  } catch (error) {
    console.error('Error during signup:', error);
  }
};

testSignup();