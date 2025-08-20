import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

// Create reusable transporter
const createEmailTransporter = (): Mail | null => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('Email configuration missing. Emails will be logged to console only.');
    return null;
  }

  return createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user,
      pass,
    },
  });
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  const transporter = createEmailTransporter();
  
  // If no transporter (missing config), log to console
  if (!transporter) {
    console.log('\n📧 Email (simulated - SMTP not configured):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (options.text) {
      console.log('Content (text):', options.text.substring(0, 200) + '...');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { success: true, messageId: 'console-only', simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"BibleQuiz" <noreply@biblequiz.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw, return success false instead
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// Email templates
export const emailTemplates = {
  // Invitation for new users
  newUserInvitation: (educatorName: string, invitationUrl: string, quizTitle?: string) => {
    const subject = quizTitle 
      ? `${educatorName} invited you to take "${quizTitle}" on BibleQuiz`
      : `${educatorName} invited you to join BibleQuiz`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Welcome to BibleQuiz!</h1>
          </div>
          <div class="content">
            <h2>You've Been Invited!</h2>
            <p>Hi there,</p>
            <p><strong>${educatorName}</strong> has invited you to join BibleQuiz${quizTitle ? ` and take the quiz "${quizTitle}"` : ''}.</p>
            
            <p>BibleQuiz is an interactive platform for biblical education where educators create quizzes to help students deepen their understanding of scripture.</p>
            
            <p>To get started:</p>
            <ol>
              <li>Click the button below to create your account</li>
              <li>Fill in your details including your phone number (for educator communication)</li>
              <li>Start taking quizzes and tracking your progress</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button" style="color: white; text-decoration: none;">Accept Invitation & Sign Up</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <code>${invitationUrl}</code>
            </p>
            
            <p><em>This invitation expires in 7 days.</em></p>
          </div>
          <div class="footer">
            <p>© 2024 BibleQuiz. Empowering biblical education.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${educatorName} invited you to join BibleQuiz${quizTitle ? ` and take "${quizTitle}"` : ''}!

To accept this invitation and create your account, visit:
${invitationUrl}

This invitation expires in 7 days.

BibleQuiz - Empowering biblical education
    `;

    return { subject, html, text };
  },

  // Invitation for existing users
  existingUserInvitation: (educatorName: string, studentName: string, quizTitle: string, quizUrl: string) => {
    const subject = `${educatorName} assigned you a new quiz: "${quizTitle}"`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .quiz-info { background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 New Quiz Assigned!</h1>
          </div>
          <div class="content">
            <h2>Hi ${studentName},</h2>
            <p><strong>${educatorName}</strong> has assigned you a new quiz on BibleQuiz.</p>
            
            <div class="quiz-info">
              <h3 style="margin-top: 0;">📖 ${quizTitle}</h3>
              <p>Your educator has prepared this quiz to test your biblical knowledge. Log in to your account to:</p>
              <ul>
                <li>Take the quiz at your own pace</li>
                <li>Review your answers and explanations</li>
                <li>Track your progress</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="${quizUrl}" class="button" style="color: white; text-decoration: none;">Take Quiz Now</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <code>${quizUrl}</code>
            </p>
          </div>
          <div class="footer">
            <p>© 2024 BibleQuiz. Empowering biblical education.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${studentName},

${educatorName} has assigned you a new quiz: "${quizTitle}"

To take this quiz, visit:
${quizUrl}

Log in to your BibleQuiz account to get started.

BibleQuiz - Empowering biblical education
    `;

    return { subject, html, text };
  },

  // Simple notification for educator-student connection
  studentAddedNotification: (educatorName: string, studentName: string) => {
    const subject = `You've been added to ${educatorName}'s class on BibleQuiz`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Welcome to the Class!</h1>
          </div>
          <div class="content">
            <h2>Hi ${studentName},</h2>
            <p>Great news! <strong>${educatorName}</strong> has added you to their class on BibleQuiz.</p>
            
            <p>This means you'll be able to:</p>
            <ul>
              <li>Receive quiz assignments directly from your educator</li>
              <li>Track your progress in biblical studies</li>
              <li>Access personalized learning materials</li>
            </ul>
            
            <p>Your educator will notify you when new quizzes are available.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard" class="button" style="color: white; text-decoration: none;">Go to Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 BibleQuiz. Empowering biblical education.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Hi ${studentName},

${educatorName} has added you to their class on BibleQuiz.

You'll now receive quiz assignments and can track your progress in biblical studies.

Visit your dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard

BibleQuiz - Empowering biblical education
    `;

    return { subject, html, text };
  }
};