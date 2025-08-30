#!/usr/bin/env node
/**
 * Create a test session for performance testing
 * Run with: node scripts/create-test-session.mjs
 */

import fetch from 'node-fetch';
import readline from 'readline';

const BASE_URL = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function createSession() {
  console.log('🔐 Create Test Session for Performance Testing');
  console.log('==============================================\n');
  
  // Check if we have test credentials in environment
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;
  
  let email, password;
  
  if (testEmail && testPassword) {
    console.log('Using credentials from environment variables...\n');
    email = testEmail;
    password = testPassword;
  } else {
    console.log('Please enter test account credentials:\n');
    email = await question('Email: ');
    password = await question('Password: ');
  }
  
  console.log('\nAttempting to sign in...');
  
  try {
    // Sign in
    const response = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Sign in failed:', error);
      process.exit(1);
    }
    
    // Get the session cookie from response
    const cookies = response.headers.raw()['set-cookie'];
    let sessionCookie = null;
    
    if (cookies) {
      for (const cookie of cookies) {
        if (cookie.includes('better-auth.session')) {
          // Extract just the session value
          const match = cookie.match(/better-auth\.session=([^;]+)/);
          if (match) {
            sessionCookie = `better-auth.session=${match[1]}`;
            break;
          }
        }
      }
    }
    
    if (sessionCookie) {
      console.log('\n✅ Session created successfully!\n');
      console.log('To run performance tests with authentication, use:');
      console.log('─'.repeat(60));
      console.log(`SESSION_COOKIE="${sessionCookie}" node scripts/test-performance.mjs`);
      console.log('─'.repeat(60));
      console.log('\nOr export it for multiple uses:');
      console.log(`export SESSION_COOKIE="${sessionCookie}"`);
      console.log('node scripts/test-performance.mjs');
      
      // Also test that the session works
      console.log('\n🧪 Testing session...');
      const testResponse = await fetch(`${BASE_URL}/api/student/quizzes`, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log(`✅ Session valid! Found ${data.quizzes?.length || 0} quizzes.`);
      } else {
        console.log(`⚠️ Session might not be valid for student endpoints. Status: ${testResponse.status}`);
        
        // Try educator endpoint
        const educatorTest = await fetch(`${BASE_URL}/api/educator/quizzes`, {
          headers: {
            'Cookie': sessionCookie
          }
        });
        
        if (educatorTest.ok) {
          console.log('ℹ️ This appears to be an educator account.');
          console.log('Student panel tests require a student account.');
        }
      }
      
    } else {
      console.error('❌ Could not extract session cookie from response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Check if server is running
fetch(`${BASE_URL}/api/health`)
  .then(() => createSession())
  .catch(() => {
    console.error('❌ Server is not running at', BASE_URL);
    console.log('Please start the development server with: npm run dev');
    process.exit(1);
  });