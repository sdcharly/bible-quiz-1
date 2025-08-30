#!/usr/bin/env node
/**
 * Setup test data for performance testing
 * Creates test educator and student accounts with sample quizzes
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hash } from '@auth/core/helpers';
import { user, quizzes, enrollments, educatorStudents, questions } from '../src/lib/schema.js';
import { eq } from 'drizzle-orm';

config(); // Load .env

const DATABASE_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ No database URL found in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);
const db = drizzle(sql);

async function setupTestData() {
  console.log('🔧 Setting up test data for performance testing...\n');
  
  try {
    // 1. Create test educator
    console.log('Creating test educator...');
    const hashedPassword = await hash('testpass123');
    
    const [educator] = await db.insert(user).values({
      id: 'test-educator-' + Date.now(),
      email: 'test.educator@example.com',
      name: 'Test Educator',
      password: hashedPassword,
      role: 'educator',
      emailVerified: true
    }).onConflictDoUpdate({
      target: user.email,
      set: { 
        password: hashedPassword,
        name: 'Test Educator',
        role: 'educator'
      }
    }).returning();
    
    console.log('✅ Educator created:', educator.email);
    
    // 2. Create test student
    console.log('\nCreating test student...');
    const [student] = await db.insert(user).values({
      id: 'test-student-' + Date.now(),
      email: 'test.student@example.com',
      name: 'Test Student',
      password: hashedPassword,
      role: 'student',
      emailVerified: true
    }).onConflictDoUpdate({
      target: user.email,
      set: { 
        password: hashedPassword,
        name: 'Test Student',
        role: 'student'
      }
    }).returning();
    
    console.log('✅ Student created:', student.email);
    
    // 3. Link student to educator
    console.log('\nLinking student to educator...');
    await db.insert(educatorStudents).values({
      educatorId: educator.id,
      studentId: student.id,
      status: 'active'
    }).onConflictDoNothing();
    
    // 4. Create test quizzes
    console.log('\nCreating test quizzes...');
    const quizData = [];
    
    for (let i = 1; i <= 10; i++) {
      const [quiz] = await db.insert(quizzes).values({
        id: `test-quiz-${Date.now()}-${i}`,
        title: `Test Quiz ${i} - Performance Testing`,
        description: `This is test quiz ${i} for performance testing. Contains sample questions about various topics.`,
        educatorId: educator.id,
        status: 'published',
        totalQuestions: 10,
        duration: 30,
        passingScore: 70,
        startTime: i <= 3 ? new Date(Date.now() - 86400000) : // Past (active)
                  i <= 6 ? new Date(Date.now() + 86400000) : // Future (upcoming)
                  new Date(), // Current
        timezone: 'UTC'
      }).returning();
      
      quizData.push(quiz);
      
      // Create questions for each quiz
      for (let q = 1; q <= 10; q++) {
        await db.insert(questions).values({
          id: `test-q-${quiz.id}-${q}`,
          quizId: quiz.id,
          questionText: `Sample question ${q} for quiz ${i}?`,
          options: JSON.stringify([
            { id: 'a', text: 'Option A' },
            { id: 'b', text: 'Option B' },
            { id: 'c', text: 'Option C' },
            { id: 'd', text: 'Option D' }
          ]),
          correctAnswer: 'a',
          orderIndex: q
        });
      }
      
      // Enroll student in quiz
      await db.insert(enrollments).values({
        id: `test-enroll-${quiz.id}`,
        quizId: quiz.id,
        studentId: student.id,
        enrolledAt: new Date(),
        status: i <= 2 ? 'completed' : 'enrolled' // Mark first 2 as completed
      }).onConflictDoNothing();
    }
    
    console.log(`✅ Created ${quizData.length} test quizzes with questions`);
    
    // 5. Display test credentials
    console.log('\n' + '='.repeat(60));
    console.log('TEST ACCOUNTS READY');
    console.log('='.repeat(60));
    console.log('\n📧 Test Educator:');
    console.log('   Email: test.educator@example.com');
    console.log('   Password: testpass123');
    console.log('\n📧 Test Student:');
    console.log('   Email: test.student@example.com');
    console.log('   Password: testpass123');
    console.log('\n📊 Test Data:');
    console.log('   - 10 quizzes created');
    console.log('   - 100 questions total');
    console.log('   - 2 completed, 8 available');
    console.log('\n' + '='.repeat(60));
    console.log('\n🚀 To run performance tests:');
    console.log('\n1. Get session cookie:');
    console.log('   node scripts/create-test-session.mjs');
    console.log('\n2. Run performance tests:');
    console.log('   SESSION_COOKIE="..." node scripts/test-performance.mjs');
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  } finally {
    await sql.end();
  }
}

setupTestData();