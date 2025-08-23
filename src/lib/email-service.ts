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

// Email templates with biblical theming
export const emailTemplates = {
  // Invitation for new users
  newUserInvitation: (educatorName: string, invitationUrl: string, quizTitle?: string) => {
    const subject = quizTitle 
      ? `${educatorName} invited you to take "${quizTitle}" on Scrolls of Wisdom`
      : `${educatorName} invited you to join Scrolls of Wisdom - Biblical Knowledge Quest`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(146, 64, 14, 0.3);
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #f59e0b;
            border-right: 4px solid #f59e0b;
          }
          .content h2 {
            color: #92400e;
            font-size: 24px;
            margin-top: 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(217, 119, 6, 0.3);
            transition: all 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(217, 119, 6, 0.4);
          }
          .scripture-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #fef3c7;
            color: #92400e; 
            font-size: 14px;
            border-top: 2px solid #f59e0b;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📜 Welcome to Scrolls of Wisdom!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Biblical Knowledge Quest Awaits</p>
          </div>
          <div class="content">
            <h2>✨ You've Been Blessed with an Invitation!</h2>
            <p>Peace be with you,</p>
            <p><strong>${educatorName}</strong> has invited you to embark on a spiritual journey through Scrolls of Wisdom${quizTitle ? `, beginning with the quiz: "${quizTitle}"` : ''}.</p>
            
            <div class="scripture-box">
              <p>"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth." - 2 Timothy 2:15</p>
            </div>
            
            <p>Scrolls of Wisdom is a sacred space for biblical education where devoted educators guide students through the treasures of Scripture, helping them grow in knowledge and faith.</p>
            
            <p><strong>Your journey begins with these simple steps:</strong></p>
            <ol style="color: #78350f;">
              <li>Click the golden button below to create your blessed account</li>
              <li>Complete your profile with care and reverence</li>
              <li>Begin your quest for biblical wisdom through interactive quizzes</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button" style="color: white; text-decoration: none;">🕊️ Accept Your Calling & Begin</a>
            </div>
            
            <p style="color: #92400e; font-size: 14px; background: #fef3c7; padding: 10px; border-radius: 4px;">
              Or copy and paste this sacred link into your browser:<br>
              <code style="background: white; padding: 2px 4px; border-radius: 2px;">${invitationUrl}</code>
            </p>
            
            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309;"><em>⏰ This divine invitation expires in 7 days.</em></p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">📖 "Thy word is a lamp unto my feet, and a light unto my path." - Psalm 119:105</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Empowering Biblical Education</p>
            <p style="margin: 5px 0; font-size: 12px;">Dedicated to spreading God's Word with love and wisdom</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${educatorName} invited you to join Scrolls of Wisdom${quizTitle ? ` and take "${quizTitle}"` : ''}!

"Study to shew thyself approved unto God" - 2 Timothy 2:15

To accept this invitation and create your account, visit:
${invitationUrl}

This invitation expires in 7 days.

Scrolls of Wisdom - Your Biblical Knowledge Quest
Empowering biblical education with love and wisdom
    `;

    return { subject, html, text };
  },

  // Invitation for existing users
  existingUserInvitation: (educatorName: string, studentName: string, quizTitle: string, quizUrl: string) => {
    const subject = `📜 New Biblical Quest: "${quizTitle}" awaits you!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(146, 64, 14, 0.3);
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #f59e0b;
            border-right: 4px solid #f59e0b;
          }
          .content h2 {
            color: #92400e;
            font-size: 22px;
            margin-top: 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(217, 119, 6, 0.3);
            transition: all 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(217, 119, 6, 0.4);
          }
          .quiz-info { 
            background: linear-gradient(135deg, #fff 0%, #fef3c7 100%);
            padding: 20px; 
            border-left: 4px solid #d97706; 
            margin: 20px 0;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(146, 64, 14, 0.1);
          }
          .quiz-info h3 {
            color: #92400e;
            margin-top: 0;
            font-size: 20px;
          }
          .quiz-info ul {
            color: #78350f;
          }
          .scripture-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #fef3c7;
            color: #92400e; 
            font-size: 14px;
            border-top: 2px solid #f59e0b;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 New Scripture Challenge!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Test Your Biblical Knowledge</p>
          </div>
          <div class="content">
            <h2>Blessings, ${studentName}!</h2>
            <p>Your spiritual guide, <strong>${educatorName}</strong>, has prepared a new quest for you on Scrolls of Wisdom.</p>
            
            <div class="quiz-info">
              <h3 style="margin-top: 0;">📖 ${quizTitle}</h3>
              <p style="color: #78350f; font-weight: 500;">Your educator has lovingly crafted this quiz to deepen your understanding of God's Word.</p>
              <p><strong>This sacred journey will help you:</strong></p>
              <ul>
                <li>Test your knowledge of Scripture at your own pace</li>
                <li>Discover deeper meanings through detailed explanations</li>
                <li>Track your spiritual growth and biblical understanding</li>
                <li>Strengthen your foundation in God's Word</li>
              </ul>
            </div>

            <div class="scripture-box">
              <p>"All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness." - 2 Timothy 3:16</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${quizUrl}" class="button" style="color: white; text-decoration: none;">⚔️ Begin Your Quest Now</a>
            </div>
            
            <p style="color: #92400e; font-size: 14px; background: #fef3c7; padding: 10px; border-radius: 4px;">
              Or copy and paste this sacred link into your browser:<br>
              <code style="background: white; padding: 2px 4px; border-radius: 2px;">${quizUrl}</code>
            </p>

            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." - Proverbs 27:17
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">🕊️ May wisdom and understanding guide your path</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">Growing in faith, one scripture at a time</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Blessings, ${studentName}!

${educatorName} has assigned you a new biblical quest: "${quizTitle}"

"All Scripture is given by inspiration of God" - 2 Timothy 3:16

To begin your quest, visit:
${quizUrl}

Log in to your Scrolls of Wisdom account to get started.

May wisdom and understanding guide your path.

Scrolls of Wisdom - Your Biblical Knowledge Quest
Growing in faith, one scripture at a time
    `;

    return { subject, html, text };
  },

  // Simple notification for educator-student connection
  studentAddedNotification: (educatorName: string, studentName: string) => {
    const subject = `🕊️ Welcome to ${educatorName}'s Biblical Study Circle`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(146, 64, 14, 0.3);
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #f59e0b;
            border-right: 4px solid #f59e0b;
          }
          .content h2 {
            color: #92400e;
            font-size: 22px;
            margin-top: 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(217, 119, 6, 0.3);
            transition: all 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(217, 119, 6, 0.4);
          }
          .benefits-box {
            background: linear-gradient(135deg, #fff 0%, #fef3c7 100%);
            padding: 20px;
            border-left: 4px solid #d97706;
            margin: 20px 0;
            border-radius: 4px;
          }
          .benefits-box ul {
            color: #78350f;
          }
          .scripture-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #fef3c7;
            color: #92400e; 
            font-size: 14px;
            border-top: 2px solid #f59e0b;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👋 Welcome to the Fellowship!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Biblical Learning Community Awaits</p>
          </div>
          <div class="content">
            <h2>Greetings in Christ, ${studentName}!</h2>
            <p>Wonderful news! <strong>${educatorName}</strong> has welcomed you into their biblical study circle on Scrolls of Wisdom.</p>
            
            <div class="scripture-box">
              <p>"For where two or three are gathered together in my name, there am I in the midst of them." - Matthew 18:20</p>
            </div>
            
            <div class="benefits-box">
              <p><strong>As part of this blessed fellowship, you will:</strong></p>
              <ul>
                <li>📖 Receive carefully crafted biblical quizzes from your educator</li>
                <li>📈 Track your spiritual growth and scriptural understanding</li>
                <li>🎯 Access personalized guidance in your faith journey</li>
                <li>🤝 Join a community of believers seeking wisdom together</li>
              </ul>
            </div>
            
            <p style="color: #78350f;">Your educator will guide you through the treasures of Scripture with wisdom and care. Watch for upcoming quizzes that will challenge and strengthen your faith.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard" class="button" style="color: white; text-decoration: none;">🏠 Enter Your Study Hall</a>
            </div>

            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Let us consider how to stir up one another to love and good works" - Hebrews 10:24
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">✝️ Walking together in faith and knowledge</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">United in Christ, growing in wisdom</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Greetings in Christ, ${studentName}!

${educatorName} has welcomed you into their biblical study circle on Scrolls of Wisdom.

"For where two or three are gathered together in my name, there am I in the midst of them." - Matthew 18:20

You'll now receive quiz assignments and can track your spiritual growth in biblical studies.

Visit your study hall: ${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard

Walking together in faith and knowledge.

Scrolls of Wisdom - Your Biblical Knowledge Quest
United in Christ, growing in wisdom
    `;

    return { subject, html, text };
  },

  // Quiz enrollment notification (for both individual and group enrollments)
  quizEnrollmentNotification: (
    studentName: string, 
    educatorName: string, 
    quizTitle: string, 
    quizDescription: string | null,
    questionCount: number,
    duration: number,
    startTime: Date,
    groupName?: string
  ) => {
    const subject = `📜 New Biblical Quest: "${quizTitle}" Awaits You!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(146, 64, 14, 0.3);
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #f59e0b;
            border-right: 4px solid #f59e0b;
          }
          .content h2 {
            color: #92400e;
            font-size: 22px;
            margin-top: 0;
          }
          .quiz-details {
            background: linear-gradient(135deg, #fff 0%, #fef3c7 100%);
            padding: 20px;
            border-left: 4px solid #d97706;
            margin: 20px 0;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(146, 64, 14, 0.1);
          }
          .quiz-details h3 {
            color: #92400e;
            margin-top: 0;
            font-size: 20px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #fed7aa;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: bold;
            color: #78350f;
          }
          .detail-value {
            color: #92400e;
          }
          .scripture-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
            border-radius: 4px;
          }
          .group-badge {
            display: inline-block;
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(217, 119, 6, 0.3);
            transition: all 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(217, 119, 6, 0.4);
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #fef3c7;
            color: #92400e; 
            font-size: 14px;
            border-top: 2px solid #f59e0b;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Sacred Quest Assignment</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">A New Biblical Challenge Awaits</p>
          </div>
          <div class="content">
            <h2>Blessed Greetings, ${studentName}!</h2>
            
            <p>Your spiritual guide, <strong>${educatorName}</strong>, has lovingly prepared a new quest to deepen your understanding of God's Word.</p>
            
            ${groupName ? `<div class="group-badge">🕊️ Assigned to: ${groupName} Fellowship</div>` : ''}
            
            <div class="quiz-details">
              <h3>📜 ${quizTitle}</h3>
              ${quizDescription ? `<p style="color: #78350f; margin: 10px 0;">${quizDescription}</p>` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📊 Number of Questions:</span>
                <span class="detail-value">${questionCount}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">⏱️ Duration:</span>
                <span class="detail-value">${duration} minutes</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">📅 Start Time:</span>
                <span class="detail-value">${startTime.toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">🎯 Enrolled by:</span>
                <span class="detail-value">${educatorName}</span>
              </div>
            </div>
            
            <div class="scripture-box">
              <p>"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth." - 2 Timothy 2:15</p>
            </div>
            
            <p style="color: #78350f;">This sacred assessment will be available in your study hall when the appointed time arrives. Prepare your heart and mind for this blessed opportunity to demonstrate your growing wisdom in Scripture.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard" class="button" style="color: white; text-decoration: none;">📚 Visit Your Study Hall</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Let the word of Christ dwell in you richly in all wisdom" - Colossians 3:16
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">✝️ May your studies be blessed with divine understanding</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">Growing in faith through sacred learning</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Blessed Greetings, ${studentName}!

Your spiritual guide, ${educatorName}, has lovingly prepared a new quest: "${quizTitle}"

${groupName ? `Assigned to: ${groupName} Fellowship\n` : ''}
${quizDescription ? `\n${quizDescription}\n` : ''}

Quest Details:
- Number of Questions: ${questionCount}
- Duration: ${duration} minutes
- Start Time: ${startTime.toLocaleString()}
- Enrolled by: ${educatorName}

"Study to shew thyself approved unto God" - 2 Timothy 2:15

Visit your study hall when the quest becomes available:
${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard

May your studies be blessed with divine understanding.

Scrolls of Wisdom - Your Biblical Knowledge Quest
Growing in faith through sacred learning
    `;

    return { subject, html, text };
  },

  // Quiz reassignment notification
  quizReassignmentNotification: (
    studentName: string,
    educatorName: string,
    quizTitle: string,
    reason: string,
    newDeadline?: Date
  ) => {
    const subject = `🔄 Sacred Quest Renewed: "${quizTitle}" - A Second Blessing`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(5, 150, 105, 0.3);
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #10b981;
            border-right: 4px solid #10b981;
          }
          .content h2 {
            color: #92400e;
            font-size: 22px;
            margin-top: 0;
          }
          .reason-box {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            padding: 15px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
            border-radius: 4px;
          }
          .deadline-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
            border-radius: 4px;
          }
          .scripture-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
            border-radius: 4px;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(16, 185, 129, 0.4);
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #dcfce7;
            color: #14532d; 
            font-size: 14px;
            border-top: 2px solid #10b981;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #10b981, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🕊️ Grace Extended</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">A New Opportunity Awaits</p>
          </div>
          <div class="content">
            <h2>Beloved ${studentName},</h2>
            
            <p>Good news! Your spiritual mentor, <strong>${educatorName}</strong>, has graciously granted you another opportunity to complete the sacred quest.</p>
            
            <h3 style="color: #92400e; margin-top: 20px;">📜 ${quizTitle}</h3>
            
            <div class="reason-box">
              <p style="margin: 0; color: #14532d;"><strong>Reason for this blessing:</strong></p>
              <p style="margin: 5px 0 0 0; color: #166534;">${reason}</p>
            </div>
            
            ${newDeadline ? `
            <div class="deadline-box">
              <p style="margin: 0; color: #78350f;"><strong>⏰ New Completion Time:</strong></p>
              <p style="margin: 5px 0 0 0; color: #92400e;">${newDeadline.toLocaleString()}</p>
            </div>
            ` : ''}
            
            <div class="scripture-box">
              <p>"The Lord is gracious and compassionate, slow to anger and rich in love." - Psalm 145:8</p>
            </div>
            
            <p style="color: #78350f;">This renewed quest offers you a fresh opportunity to demonstrate your growing understanding of Scripture. The questions will be presented in a different order, providing a new perspective on the sacred material.</p>
            
            <p style="color: #78350f; font-weight: bold;">Remember: Each attempt is a chance to grow stronger in faith and wisdom.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard" class="button" style="color: white; text-decoration: none;">🎯 Begin Your Renewed Quest</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "His mercies are new every morning; great is thy faithfulness." - Lamentations 3:23
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">✝️ Walking in grace and second chances</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">Every attempt brings you closer to wisdom</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Beloved ${studentName},

Good news! ${educatorName} has graciously granted you another opportunity to complete: "${quizTitle}"

Reason for this blessing: ${reason}

${newDeadline ? `New Completion Time: ${newDeadline.toLocaleString()}\n` : ''}

"The Lord is gracious and compassionate, slow to anger and rich in love." - Psalm 145:8

This renewed quest offers a fresh opportunity to demonstrate your biblical understanding.

Begin your renewed quest at:
${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard

Walking in grace and second chances.

Scrolls of Wisdom - Your Biblical Knowledge Quest
Every attempt brings you closer to wisdom
    `;

    return { subject, html, text };
  },

  // Educator approval notification
  educatorApprovalNotification: (educatorName: string, _educatorEmail: string) => {
    const subject = `🎉 Hallelujah! Your Educator Account Has Been Approved`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(146, 64, 14, 0.3);
          }
          .celebration-banner {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 15px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #f59e0b;
            border-right: 4px solid #f59e0b;
          }
          .content h2 {
            color: #92400e;
            font-size: 22px;
            margin-top: 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(217, 119, 6, 0.3);
          }
          .permissions-box {
            background: linear-gradient(135deg, #fff 0%, #fef3c7 100%);
            padding: 20px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
            border-radius: 4px;
          }
          .permissions-box ul {
            color: #78350f;
          }
          .scripture-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #fef3c7;
            color: #92400e; 
            font-size: 14px;
            border-top: 2px solid #f59e0b;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Scrolls of Wisdom</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Educator Account Approved</p>
          </div>
          <div class="celebration-banner">
            🎊 CONGRATULATIONS! YOUR MINISTRY BEGINS TODAY! 🎊
          </div>
          <div class="content">
            <h2>Beloved Educator ${educatorName},</h2>
            <p>Grace and peace to you! We are delighted to inform you that your educator account on <strong>Scrolls of Wisdom</strong> has been approved.</p>
            
            <div class="scripture-box">
              <p>"Go ye therefore, and teach all nations... teaching them to observe all things whatsoever I have commanded you" - Matthew 28:19-20</p>
            </div>
            
            <p>You have been called to a noble ministry of biblical education. Your dedication to spreading God's Word will touch many lives and help students grow in faith and understanding.</p>
            
            <div class="permissions-box">
              <p><strong>🔑 Your Educator Privileges Include:</strong></p>
              <ul>
                <li>✅ Create and publish biblical quizzes</li>
                <li>✅ Add and manage students in your study circles</li>
                <li>✅ Edit and customize quiz content</li>
                <li>✅ View detailed analytics and progress reports</li>
                <li>✅ Export data for record keeping</li>
                <li>✅ Access to our growing library of biblical resources</li>
              </ul>
            </div>
            
            <p style="color: #78350f; font-weight: 500;">Your journey as a biblical educator starts now! Begin by creating your first quiz or inviting students to join your study circle.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/educator/dashboard" class="button" style="color: white; text-decoration: none;">🚀 Enter Your Educator Dashboard</a>
            </div>

            <div class="divider"></div>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #166534; font-weight: bold; margin: 0 0 10px 0;">📚 Quick Start Tips:</p>
              <ol style="color: #166534; margin: 5px 0;">
                <li>Upload your first biblical study material</li>
                <li>Create an engaging quiz from your content</li>
                <li>Invite your students to join</li>
                <li>Track their spiritual growth journey</li>
              </ol>
            </div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Well done, good and faithful servant!" - Matthew 25:21
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">🕊️ May your teaching bear much fruit for the Kingdom</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Empowering Biblical Education</p>
            <p style="margin: 5px 0; font-size: 12px;">Equipping saints for the work of ministry - Ephesians 4:12</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Beloved Educator ${educatorName},

CONGRATULATIONS! Your educator account has been approved!

"Go ye therefore, and teach all nations" - Matthew 28:19

You now have full access to create quizzes, manage students, and spread biblical knowledge through Scrolls of Wisdom.

Start your ministry: ${process.env.NEXT_PUBLIC_APP_URL}/educator/dashboard

May your teaching bear much fruit for the Kingdom.

Scrolls of Wisdom - Empowering Biblical Education
Equipping saints for the work of ministry
    `;

    return { subject, html, text };
  },

  // Educator rejection notification
  educatorRejectionNotification: (educatorName: string, educatorEmail: string, reason?: string) => {
    const subject = `Application Status Update - Scrolls of Wisdom`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            color: #451a03;
            background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center;
            position: relative;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            text-shadow: 2px 2px 4px rgba(146, 64, 14, 0.3);
          }
          .content { 
            background-color: #fffbeb; 
            padding: 30px; 
            border-left: 4px solid #f59e0b;
            border-right: 4px solid #f59e0b;
          }
          .content h2 {
            color: #92400e;
            font-size: 22px;
            margin-top: 0;
          }
          .button { 
            display: inline-block; 
            padding: 14px 32px; 
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(217, 119, 6, 0.3);
          }
          .reason-box {
            background: #fef3c7;
            padding: 15px;
            border-left: 4px solid #d97706;
            margin: 20px 0;
            border-radius: 4px;
          }
          .scripture-box {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            border-left: 4px solid #0284c7;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #075985;
            border-radius: 4px;
          }
          .encouragement-box {
            background: linear-gradient(135deg, #fff 0%, #fef3c7 100%);
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            padding: 20px;
            background: #fef3c7;
            color: #92400e; 
            font-size: 14px;
            border-top: 2px solid #f59e0b;
          }
          .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #f59e0b, transparent);
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📜 Scrolls of Wisdom</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Application Status Update</p>
          </div>
          <div class="content">
            <h2>Dear ${educatorName},</h2>
            <p>Peace be with you. Thank you for your interest in becoming an educator on Scrolls of Wisdom.</p>
            
            <p>After careful review, we regret to inform you that we are unable to approve your educator application at this time.</p>
            
            ${reason ? `
            <div class="reason-box">
              <p style="margin: 0; color: #92400e;"><strong>Additional Information:</strong></p>
              <p style="margin: 10px 0 0 0; color: #78350f;">${reason}</p>
            </div>
            ` : ''}
            
            <div class="scripture-box">
              <p>"Wait on the LORD: be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD." - Psalm 27:14</p>
            </div>
            
            <div class="encouragement-box">
              <p style="color: #78350f; margin-top: 0;"><strong>This is not the end of your journey!</strong></p>
              <p style="color: #78350f;">We encourage you to:</p>
              <ul style="color: #78350f;">
                <li>Continue growing in your biblical knowledge</li>
                <li>Consider reapplying in the future with additional qualifications</li>
                <li>Join as a student to experience our platform firsthand</li>
                <li>Reach out to our support team if you have questions</li>
              </ul>
            </div>
            
            <p style="color: #78350f;">Remember, God's timing is perfect, and He may have different plans for your ministry at this moment.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" class="button" style="color: white; text-decoration: none;">📧 Contact Support</a>
            </div>

            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Trust in the LORD with all thine heart; and lean not unto thine own understanding." - Proverbs 3:5
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">🙏 May God bless your continued journey in faith</p>
            <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">In His time, He makes all things beautiful - Ecclesiastes 3:11</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Dear ${educatorName},

Thank you for your interest in becoming an educator on Scrolls of Wisdom.

After careful review, we are unable to approve your educator application at this time.

${reason ? `Additional Information: ${reason}` : ''}

"Wait on the LORD: be of good courage" - Psalm 27:14

This is not the end of your journey. We encourage you to continue growing and consider reapplying in the future.

For questions, contact: ${process.env.NEXT_PUBLIC_APP_URL}/contact

May God bless your continued journey in faith.

Scrolls of Wisdom - Your Biblical Knowledge Quest
In His time, He makes all things beautiful
    `;

    return { subject, html, text };
  }
};

// Password reset email function
export async function sendPasswordResetEmail(email: string, userName: string, resetUrl: string) {
  const subject = `🔑 Password Reset Request - Scrolls of Wisdom`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: 'Georgia', 'Times New Roman', serif; 
          line-height: 1.6; 
          color: #451a03;
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
          margin: 0;
          padding: 20px;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #f59e0b, #dc2626);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content { 
          padding: 30px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: linear-gradient(135deg, #f59e0b, #dc2626);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          background: #fef3c7;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #92400e;
        }
        .warning {
          background: #fee2e2;
          border-left: 4px solid #dc2626;
          padding: 10px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Dear ${userName || 'Seeker'},</p>
          
          <p>We received a request to reset your password for your Scrolls of Wisdom account.</p>
          
          <p><strong>Click the button below to reset your password:</strong></p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you did not request this reset, please ignore this email</li>
              <li>Your password will not change unless you click the link above</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; font-size: 12px; color: #666;">${resetUrl}</p>
        </div>
        <div class="footer">
          <p>May your path be illuminated with divine wisdom</p>
          <p>Scrolls of Wisdom - Your Biblical Knowledge Quest</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Password Reset Request - Scrolls of Wisdom

Dear ${userName || 'Seeker'},

We received a request to reset your password for your Scrolls of Wisdom account.

To reset your password, please visit the following link:
${resetUrl}

Important:
- This link will expire in 1 hour
- If you did not request this reset, please ignore this email
- Your password will not change unless you click the link above

May your path be illuminated with divine wisdom,
Scrolls of Wisdom Team
  `;
  
  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}