import { db } from "./src/lib/db";
import { questions } from "./src/lib/schema";
import { eq } from "drizzle-orm";

async function checkDrizzle() {
  try {
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, '25243611-e016-410b-bdb0-42e808d410f9'))
      .limit(1);
    
    if (quizQuestions.length > 0) {
      const q = quizQuestions[0];
      console.log('Drizzle field names:');
      console.log(Object.keys(q));
      console.log('\nDrizzle field access test:');
      console.log('- q.id:', q.id ? 'EXISTS' : 'NULL');
      console.log('- q.questionText:', q.questionText ? 'EXISTS' : 'NULL');
      console.log('- q.question_text:', (q as any).question_text ? 'EXISTS' : 'NULL');
      console.log('- q.orderIndex:', q.orderIndex !== null ? q.orderIndex : 'NULL');
      console.log('- q.order_index:', (q as any).order_index !== null ? (q as any).order_index : 'NULL');
      console.log('- q.bloomsLevel:', q.bloomsLevel ? 'EXISTS' : 'NULL');
      console.log('- q.blooms_level:', (q as any).blooms_level ? 'EXISTS' : 'NULL');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkDrizzle();
