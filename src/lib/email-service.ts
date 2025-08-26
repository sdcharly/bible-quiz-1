import { createTransport } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { branding } from './branding';


// Create reusable transporter
const createEmailTransporter = (): Mail | null => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // [REMOVED: Console statement for performance]
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
    // [REMOVED: Console statement for performance]:');
    // [REMOVED: Console statement for performance]
    // [REMOVED: Console statement for performance]
    // [REMOVED: Console statement for performance]
    // [REMOVED: Console statement for performance]
    if (options.text) {
      // [REMOVED: Console statement for performance]:', options.text.substring(0, 200) + '...');
    }
    // [REMOVED: Console statement for performance]
    return { success: true, messageId: 'console-only', simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: branding.getEmailFromHeader(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    // [REMOVED: Console statement for performance]
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // [REMOVED: Console statement for performance]
    // Don't throw, return success false instead
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// Helper function to create email table wrapper
const createEmailWrapper = (headerContent: string, bodyContent: string, footerContent: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${branding.appName}</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #fef3c7; font-family: Georgia, 'Times New Roman', serif;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef3c7;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: white; border-radius: 12px; overflow: hidden;">
              <tr>
                <td bgcolor="#f59e0b" style="background-color: #f59e0b; color: white; padding: 30px 20px; text-align: center;">
                  ${headerContent}
                </td>
              </tr>
              <tr>
                <td style="background-color: #fffbeb; padding: 30px;">
                  ${bodyContent}
                </td>
              </tr>
              <tr>
                <td bgcolor="#fef3c7" style="text-align: center; padding: 20px; background-color: #fef3c7; color: #78350f; font-size: 14px; border-top: 2px solid #f59e0b;">
                  ${footerContent}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Email templates with biblical theming
export const emailTemplates = {
  // Invitation for new users
  newUserInvitation: (educatorName: string, invitationUrl: string, quizTitle?: string) => {
    const subject = quizTitle 
      ? `${educatorName} invited you to take "${quizTitle}" on ${branding.appName}`
      : `${educatorName} invited you to join ${branding.appName} - ${branding.tagline}`;

    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">📜 Welcome to ${branding.appName}!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">${branding.tagline} Awaits</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 24px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">✨ You've Been Blessed with an Invitation!</h2>
      <p style="color: #451a03; margin: 15px 0;">Peace be with you,</p>
      <p style="color: #451a03; margin: 15px 0;"><strong style="color: #92400e;">${educatorName}</strong> has invited you to embark on a spiritual journey through ${branding.appName}${quizTitle ? `, beginning with the quiz: "<strong style="color: #92400e;">${quizTitle}</strong>"` : ''}.</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth." - 2 Timothy 2:15</p>
          </td>
        </tr>
      </table>
      
      <p style="color: #451a03; margin: 15px 0;">${branding.appName} is a sacred space for biblical education where devoted educators guide students through the treasures of Scripture, helping them grow in knowledge and faith.</p>
      
      <p style="color: #451a03; margin: 15px 0;"><strong>Your journey begins with these simple steps:</strong></p>
      <ol style="color: #78350f; margin: 15px 0;">
        <li>Click the golden button below to create your blessed account</li>
        <li>Complete your profile with care and reverence</li>
        <li>Begin your quest for biblical wisdom through interactive quizzes</li>
      </ol>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${invitationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">🕊️ Accept Your Calling & Begin</a>
      </div>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 10px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Or copy and paste this sacred link into your browser:</strong><br>
              <span style="color: #78350f; word-break: break-all;">${invitationUrl}</span>
            </p>
          </td>
        </tr>
      </table>
      
      <hr style="border: none; height: 2px; background-color: #f59e0b; margin: 20px 0;">
      
      <p style="text-align: center; color: #b45309; font-style: italic;"><em>⏰ This divine invitation expires in 7 days.</em></p>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">📖 "Thy word is a lamp unto my feet, and a light unto my path." - Psalm 119:105</p>
      <p style="margin: 5px 0; color: #78350f;">${branding.getCopyrightText()}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">Dedicated to spreading God's Word with love and wisdom</p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
${educatorName} invited you to join ${branding.appName}${quizTitle ? ` and take "${quizTitle}"` : ''}!

"Study to shew thyself approved unto God" - 2 Timothy 2:15

To accept this invitation and create your account, visit:
${invitationUrl}

This invitation expires in 7 days.

${branding.getEmailFooter()}
Empowering biblical education with love and wisdom
    `;

    return { subject, html, text };
  },

  // OTP verification email
  otpVerification: (educatorName: string, otp: string, expiryMinutes: number = 10) => {
    const subject = `🔐 Your Verification Code for ${branding.appName}`;

    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">🔐 Email Verification Required</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Confirm Your Sacred Identity</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 24px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">Greetings, ${educatorName}!</h2>
      
      <p style="color: #451a03; margin: 15px 0;">To complete your registration as a Biblical educator on ${branding.appName}, please verify your email address using the code below.</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#f59e0b" style="background-color: #f59e0b; border-radius: 12px; padding: 25px 40px; text-align: center;">
                  <p style="margin: 0; color: white; font-size: 14px; font-weight: bold;">YOUR VERIFICATION CODE</p>
                  <p style="margin: 10px 0 0 0; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fef3c7" style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">"But let all things be done decently and in order." - 1 Corinthians 14:40</p>
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fff" style="background-color: #fff; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px;">
            <h4 style="margin-top: 0; color: #92400e;">⏰ Important Information:</h4>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="color: #78350f; padding: 3px 0;">• This code will expire in <strong>${expiryMinutes} minutes</strong></td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">• Enter this code on the verification page</td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">• Do not share this code with anyone</td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">• If you didn't request this, please ignore this email</td></tr>
            </table>
          </td>
        </tr>
      </table>
      
      <h3 style="color: #92400e; font-size: 18px; margin: 20px 0 10px 0; font-family: Georgia, 'Times New Roman', serif;">🛡️ Security Tips:</h3>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 8px 20px;">
            1. ${branding.appName} will never ask for your password via email
          </td>
        </tr>
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 8px 20px;">
            2. This code is for email verification only
          </td>
        </tr>
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 8px 20px;">
            3. Always verify you're on the correct website before entering codes
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fef3c7" style="background-color: #fef3c7; border-left: 4px solid #16a34a; padding: 15px;">
            <p style="margin: 0; color: #78350f;"><strong>Need a new code?</strong> You can request a new verification code from the signup page after 60 seconds.</p>
          </td>
        </tr>
      </table>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">📖 "The Lord shall preserve thee from all evil" - Psalm 121:7</p>
      <p style="margin: 5px 0; color: #78350f;">© 2024 ${branding.appName} · Secure Biblical Education</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">This is an automated security email - please do not reply</p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
Greetings ${educatorName},

Your ${branding.appName} Verification Code:

${otp}

This code will expire in ${expiryMinutes} minutes.

Enter this code on the verification page to complete your registration as a Biblical educator.

Security Tips:
- Never share this code with anyone
- We will never ask for your password via email
- This code is for email verification only

If you didn't request this code, please ignore this email.

"But let all things be done decently and in order." - 1 Corinthians 14:40

${branding.appName} - Secure Biblical Education
    `;

    return { subject, html, text };
  },

  // Educator signup pending confirmation
  educatorSignupPending: (educatorName: string) => {
    const subject = `📜 Welcome to ${branding.appName} - Your Application is Under Review`;

    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">🎓 Welcome, Sacred Guide!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Your Journey to Teaching God's Word Begins</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 24px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">Blessings and Peace, ${educatorName}!</h2>
      
      <p style="color: #451a03; margin: 15px 0;">Thank you for answering the sacred calling to become a Biblical educator on ${branding.appName}. Your dedication to spreading God's Word through teaching is truly a blessing.</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fef3c7" style="background-color: #fef3c7; border-radius: 8px; border: 2px solid #f59e0b; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 20px; color: #92400e; font-weight: bold;">⏳ Your Application Status</p>
            <p style="margin: 10px 0 0 0; font-size: 18px; color: #d97706; font-weight: bold;">PENDING APPROVAL</p>
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fef3c7" style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">"And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers" - Ephesians 4:11</p>
          </td>
        </tr>
      </table>
      
      <h3 style="color: #92400e; font-size: 18px; margin: 20px 0 10px 0; font-family: Georgia, 'Times New Roman', serif;">📋 What Happens Next?</h3>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 10px 20px;">
            1. <strong>Review Process:</strong> Our ministry team will carefully review your application within 24-48 hours
          </td>
        </tr>
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 10px 20px;">
            2. <strong>Verification:</strong> We verify all educators to maintain the sanctity of our biblical education platform
          </td>
        </tr>
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 10px 20px;">
            3. <strong>Notification:</strong> You will receive an email once your account has been approved
          </td>
        </tr>
        <tr>
          <td style="color: #451a03; line-height: 1.8; padding: 0 0 10px 20px;">
            4. <strong>Access Granted:</strong> Upon approval, you'll gain full access to create and manage biblical quizzes
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#ffffff" style="background-color: #fff; border-radius: 8px; border: 1px solid #fed7aa; padding: 20px;">
            <h4 style="margin-top: 0; color: #92400e;">🌟 While You Wait, You Can:</h4>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="color: #78350f; padding: 3px 0;">• Prepare your biblical study materials</td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">• Plan your quiz topics and difficulty levels</td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">• Consider which scriptures you want to focus on</td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">• Pray for wisdom in guiding your future students</td></tr>
            </table>
          </td>
        </tr>
      </table>
      
      <p style="color: #451a03; margin: 20px 0;">We are blessed to have you join our community of educators dedicated to spreading God's Word through interactive learning.</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fef3c7" style="background-color: #fef3c7; border-left: 4px solid #16a34a; padding: 15px;">
            <p style="margin: 0; color: #78350f;"><strong>Need Help?</strong> Contact us at ${branding.supportEmail}</p>
          </td>
        </tr>
      </table>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">📖 "Go ye therefore, and teach all nations" - Matthew 28:19</p>
      <p style="margin: 5px 0; color: #78350f;">${branding.getCopyrightText()}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">Thank you for your patience during the approval process</p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
Welcome to ${branding.appName}, ${educatorName}!

Your educator account application has been received and is currently PENDING APPROVAL.

What Happens Next:
1. Our ministry team will review your application within 24-48 hours
2. We verify all educators to maintain platform integrity  
3. You will receive an email once approved
4. Upon approval, you'll gain full access to create biblical quizzes

While you wait, you can:
- Prepare your biblical study materials
- Plan your quiz topics
- Consider which scriptures to focus on
- Pray for wisdom in guiding students

Need help? Contact ${branding.supportEmail}

"Go ye therefore, and teach all nations" - Matthew 28:19

${branding.appName} - Empowering Biblical Education
    `;

    return { subject, html, text };
  },

  // Invitation for existing users
  existingUserInvitation: (educatorName: string, studentName: string, quizTitle: string, quizUrl: string) => {
    const subject = `📜 New Biblical Quest: "${quizTitle}" awaits you!`;

    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">📚 New Scripture Challenge!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Test Your Biblical Knowledge</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 22px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">Blessings, ${studentName}!</h2>
      <p style="color: #451a03; margin: 15px 0;">Your spiritual guide, <strong style="color: #92400e;">${educatorName}</strong>, has prepared a new quest for you on ${branding.appName}.</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
        <tr>
          <td style="padding: 20px;">
            <h3 style="margin-top: 0; color: #92400e; font-family: Georgia, 'Times New Roman', serif;">📖 ${quizTitle}</h3>
            <p style="color: #78350f; font-weight: 500; margin: 10px 0;">Your educator has lovingly crafted this quiz to deepen your understanding of God's Word.</p>
            <p style="color: #451a03; margin: 15px 0;"><strong>This sacred journey will help you:</strong></p>
            <ul style="color: #78350f; margin: 10px 0;">
              <li>Test your knowledge of Scripture at your own pace</li>
              <li>Discover deeper meanings through detailed explanations</li>
              <li>Track your spiritual growth and biblical understanding</li>
              <li>Strengthen your foundation in God's Word</li>
            </ul>
          </td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">"All Scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness." - 2 Timothy 3:16</p>
          </td>
        </tr>
      </table>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${quizUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">⚔️ Begin Your Quest Now</a>
      </div>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 10px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Or copy and paste this sacred link into your browser:</strong><br>
              <span style="color: #78350f; word-break: break-all;">${quizUrl}</span>
            </p>
          </td>
        </tr>
      </table>

      <hr style="border: none; height: 2px; background-color: #f59e0b; margin: 20px 0;">
      
      <p style="text-align: center; color: #b45309; font-style: italic;">
        "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend." - Proverbs 27:17
      </p>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">🕊️ May wisdom and understanding guide your path</p>
      <p style="margin: 5px 0; color: #78350f;">${branding.getCopyrightText()}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">Growing in faith, one scripture at a time</p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
Blessings, ${studentName}!

${educatorName} has assigned you a new biblical quest: "${quizTitle}"

"All Scripture is given by inspiration of God" - 2 Timothy 3:16

To begin your quest, visit:
${quizUrl}

Log in to your ${branding.appName} account to get started.

May wisdom and understanding guide your path.

${branding.getEmailFooter()}
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
            <p>Wonderful news! <strong>${educatorName}</strong> has welcomed you into their biblical study circle on ${branding.appName}.</p>
            
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
              <a href="${branding.appUrl}/student/dashboard" class="button" style="color: white; text-decoration: none;">🏠 Enter Your Study Hall</a>
            </div>

            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Let us consider how to stir up one another to love and good works" - Hebrews 10:24
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">✝️ Walking together in faith and knowledge</p>
            <p style="margin: 5px 0;">© 2024 ${branding.appName} · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">United in Christ, growing in wisdom</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Greetings in Christ, ${studentName}!

${educatorName} has welcomed you into their biblical study circle on ${branding.appName}.

"For where two or three are gathered together in my name, there am I in the midst of them." - Matthew 18:20

You'll now receive quiz assignments and can track your spiritual growth in biblical studies.

Visit your study hall: ${branding.appUrl}/student/dashboard

Walking together in faith and knowledge.

${branding.getEmailFooter()}
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
    startTime: Date | null,
    groupName?: string,
    quizUrl?: string,
    studentTimezone?: string
  ) => {
    const subject = `📜 New Biblical Quest: "${quizTitle}" Awaits You!`;
    
    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">📖 Sacred Quest Assignment</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">A New Biblical Challenge Awaits</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 22px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">Blessed Greetings, ${studentName}!</h2>
      
      <p style="color: #451a03; margin: 15px 0;">Your spiritual guide, <strong style="color: #92400e;">${educatorName}</strong>, has lovingly prepared a new quest to deepen your understanding of God's Word.</p>
      
      ${groupName ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 15px 0;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="#f59e0b" style="background-color: #f59e0b; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                  🕊️ Assigned to: ${groupName} Fellowship
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>` : ''}
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
        <tr>
          <td style="padding: 20px; background-color: #fff;">
            <h3 style="margin-top: 0; color: #92400e; font-family: Georgia, 'Times New Roman', serif; font-size: 20px;">📜 ${quizTitle}</h3>
            ${quizDescription ? `<p style="color: #78350f; margin: 10px 0;">${quizDescription}</p>` : ''}
            
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="font-weight: bold; color: #78350f;">📊 Number of Questions:</td>
                      <td align="right" style="color: #92400e;">${questionCount}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="font-weight: bold; color: #78350f;">⏱️ Duration:</td>
                      <td align="right" style="color: #92400e;">${duration} minutes</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #fed7aa;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="font-weight: bold; color: #78350f;">📅 Start Time:</td>
                      <td align="right" style="color: #92400e;">${
                        startTime 
                          ? studentTimezone 
                            ? startTime.toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: studentTimezone
                              })
                            : startTime.toLocaleString('en-US', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: 'UTC'
                              }) + ' UTC'
                          : 'To be announced'
                      }</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td style="font-weight: bold; color: #78350f;">🎯 Enrolled by:</td>
                      <td align="right" style="color: #92400e;">${educatorName}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">"Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth." - 2 Timothy 2:15</p>
          </td>
        </tr>
      </table>
      
      <p style="color: #78350f; margin: 15px 0;">This sacred assessment will be available in your study hall when the appointed time arrives. Prepare your heart and mind for this blessed opportunity to demonstrate your growing wisdom in Scripture.</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${quizUrl || `${branding.appUrl}/student/dashboard`}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">📚 ${quizUrl ? 'Take Quiz Now' : 'Visit Your Study Hall'}</a>
      </div>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 10px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Or copy and paste this link into your browser:</strong><br>
              <span style="color: #78350f; word-break: break-all;">${quizUrl || `${branding.appUrl}/student/dashboard`}</span>
            </p>
          </td>
        </tr>
      </table>
      
      <hr style="border: none; height: 2px; background-color: #f59e0b; margin: 20px 0;">
      
      <p style="text-align: center; color: #b45309; font-style: italic;">
        "Let the word of Christ dwell in you richly in all wisdom" - Colossians 3:16
      </p>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">✝️ May your studies be blessed with divine understanding</p>
      <p style="margin: 5px 0; color: #78350f;">${branding.getCopyrightText()}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">Growing in faith through sacred learning</p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
Blessed Greetings, ${studentName}!

Your spiritual guide, ${educatorName}, has lovingly prepared a new quest: "${quizTitle}"

${groupName ? `Assigned to: ${groupName} Fellowship\n` : ''}
${quizDescription ? `\n${quizDescription}\n` : ''}

Quest Details:
- Number of Questions: ${questionCount}
- Duration: ${duration} minutes
- Start Time: ${
      startTime 
        ? studentTimezone 
          ? // Use student's preferred timezone if available
            startTime.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: studentTimezone
            }) + ` (${studentTimezone})`
          : // Default to IST for new users with UTC in brackets
            startTime.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Kolkata'
            }) + ' IST (' +
            startTime.toLocaleString('en-US', {
              timeStyle: 'short',
              timeZone: 'UTC'
            }) + ' UTC)'
        : 'To be announced'
    }
- Enrolled by: ${educatorName}

"Study to shew thyself approved unto God" - 2 Timothy 2:15

Access the quiz:
${quizUrl || `${branding.appUrl}/student/dashboard`}

May your studies be blessed with divine understanding.

${branding.getEmailFooter()}
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
    newDeadline?: Date,
    questionCount?: number,
    duration?: number,
    quizUrl?: string
  ) => {
    const subject = `🔄 Sacred Quest Renewed: "${quizTitle}" - A Second Blessing`;
    
    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">🕊️ Grace Extended</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">A New Opportunity Awaits</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 22px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">Beloved ${studentName},</h2>
      
      <p style="color: #451a03; margin: 15px 0;">Good news! Your spiritual mentor, <strong style="color: #92400e;">${educatorName}</strong>, has graciously granted you another opportunity to complete the sacred quest.</p>
      
      <h3 style="color: #92400e; margin-top: 20px; font-family: Georgia, 'Times New Roman', serif;">📜 ${quizTitle}</h3>
      
      ${(questionCount || duration) ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 15px 0; background-color: #fff; border-radius: 8px; border: 1px solid #fed7aa;">
        <tr>
          <td style="padding: 15px;">
            <p style="margin: 0 0 10px 0; color: #78350f; font-weight: bold;">Quiz Details:</p>
            ${questionCount ? `<p style="margin: 5px 0; color: #92400e;">📚 Questions: ${questionCount}</p>` : ''}
            ${duration ? `<p style="margin: 5px 0; color: #92400e;">⏱️ Duration: ${duration} minutes</p>` : ''}
          </td>
        </tr>
      </table>
      ` : ''}
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #78350f;"><strong>Reason for this blessing:</strong></p>
            <p style="margin: 5px 0 0 0; color: #92400e;">${reason}</p>
          </td>
        </tr>
      </table>
      
      ${newDeadline ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0; color: #78350f;"><strong>⏰ New Completion Time:</strong></p>
            <p style="margin: 5px 0 0 0; color: #92400e;">${newDeadline.toLocaleString()}</p>
          </td>
        </tr>
      </table>
      ` : ''}
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">"The Lord is gracious and compassionate, slow to anger and rich in love." - Psalm 145:8</p>
          </td>
        </tr>
      </table>
      
      <p style="color: #78350f; margin: 15px 0;">This renewed quest offers you a fresh opportunity to demonstrate your growing understanding of Scripture. The questions will be presented in a different order, providing a new perspective on the sacred material.</p>
      
      <p style="color: #78350f; font-weight: bold; margin: 15px 0;">Remember: Each attempt is a chance to grow stronger in faith and wisdom.</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${quizUrl || `${branding.appUrl}/student/dashboard`}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">🎯 ${quizUrl ? 'Begin Your Renewed Quest' : 'Go to Your Dashboard'}</a>
      </div>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 10px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Or copy and paste this link into your browser:</strong><br>
              <span style="color: #78350f; word-break: break-all;">${quizUrl || `${branding.appUrl}/student/dashboard`}</span>
            </p>
          </td>
        </tr>
      </table>
      
      <hr style="border: none; height: 2px; background-color: #f59e0b; margin: 20px 0;">
      
      <p style="text-align: center; color: #b45309; font-style: italic; margin: 15px 0;">
        "His mercies are new every morning; great is thy faithfulness." - Lamentations 3:23
      </p>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">✝️ Walking in grace and second chances</p>
      <p style="margin: 5px 0; color: #78350f;">${branding.getCopyrightText()}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">Every attempt brings you closer to wisdom</p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
Beloved ${studentName},

Good news! ${educatorName} has graciously granted you another opportunity to complete: "${quizTitle}"

${questionCount ? `Questions: ${questionCount}` : ''}
${duration ? `Duration: ${duration} minutes` : ''}

Reason for this blessing: ${reason}

${newDeadline ? `New Completion Time: ${newDeadline.toLocaleString()}\n` : ''}

"The Lord is gracious and compassionate, slow to anger and rich in love." - Psalm 145:8

This renewed quest offers a fresh opportunity to demonstrate your biblical understanding.

Begin your renewed quest at:
${quizUrl || `${branding.appUrl}/student/dashboard`}

Walking in grace and second chances.

${branding.getEmailFooter()}
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
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
            border-left: 4px solid #f59e0b;
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
            <h1>✨ ${branding.appName}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Educator Account Approved</p>
          </div>
          <div class="celebration-banner">
            🎊 CONGRATULATIONS! YOUR MINISTRY BEGINS TODAY! 🎊
          </div>
          <div class="content">
            <h2>Beloved Educator ${educatorName},</h2>
            <p>Grace and peace to you! We are delighted to inform you that your educator account on <strong>${branding.appName}</strong> has been approved.</p>
            
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
              <a href="${branding.appUrl}/educator/dashboard" class="button" style="color: white; text-decoration: none;">🚀 Enter Your Educator Dashboard</a>
            </div>

            <div class="divider"></div>
            
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0;">📚 Quick Start Tips:</p>
              <ol style="color: #78350f; margin: 5px 0;">
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
            <p style="margin: 5px 0;">© 2024 ${branding.appName} · Empowering Biblical Education</p>
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

You now have full access to create quizzes, manage students, and spread biblical knowledge through ${branding.appName}.

Start your ministry: ${branding.appUrl}/educator/dashboard

May your teaching bear much fruit for the Kingdom.

${branding.appName} - Empowering Biblical Education
Equipping saints for the work of ministry
    `;

    return { subject, html, text };
  },

  // Educator rejection notification
  educatorRejectionNotification: (educatorName: string, educatorEmail: string, reason?: string) => {
    const subject = `Application Status Update - ${branding.appName}`;

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
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #d97706;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #78350f;
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
            <h1>📜 ${branding.appName}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Application Status Update</p>
          </div>
          <div class="content">
            <h2>Dear ${educatorName},</h2>
            <p>Peace be with you. Thank you for your interest in becoming an educator on ${branding.appName}.</p>
            
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
              <a href="${branding.appUrl}/contact" class="button" style="color: white; text-decoration: none;">📧 Contact Support</a>
            </div>

            <div class="divider"></div>
            
            <p style="text-align: center; color: #b45309; font-style: italic;">
              "Trust in the LORD with all thine heart; and lean not unto thine own understanding." - Proverbs 3:5
            </p>
          </div>
          <div class="footer">
            <p style="margin: 5px 0;">🙏 May God bless your continued journey in faith</p>
            <p style="margin: 5px 0;">© 2024 ${branding.appName} · Your Biblical Knowledge Quest</p>
            <p style="margin: 5px 0; font-size: 12px;">In His time, He makes all things beautiful - Ecclesiastes 3:11</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Dear ${educatorName},

Thank you for your interest in becoming an educator on ${branding.appName}.

After careful review, we are unable to approve your educator application at this time.

${reason ? `Additional Information: ${reason}` : ''}

"Wait on the LORD: be of good courage" - Psalm 27:14

This is not the end of your journey. We encourage you to continue growing and consider reapplying in the future.

For questions, contact: ${branding.appUrl}/contact

May God bless your continued journey in faith.

${branding.getEmailFooter()}
In His time, He makes all things beautiful
    `;

    return { subject, html, text };
  },

  // Educator reminder email for inactive educators
  educatorReminderEmail: (
    educatorName: string, 
    triggerReason: string, 
    reminderLevel: number,
    daysSinceLastActivity: number,
    totalQuizzes: number,
    totalStudents: number,
    dashboardUrl?: string
  ) => {
    const subject = reminderLevel === 1 
      ? `🌟 Your Biblical Teaching Ministry Awaits - We Miss You!`
      : `💝 A Gentle Reminder: Your Students Need Your Wisdom`;

    const getReminderMessage = () => {
      if (triggerReason === 'no_quizzes_created') {
        return {
          primary: "We notice you haven't created your first quiz yet. Every great teacher starts with a single lesson!",
          encouragement: "Your unique insights into God's Word are valuable, and your future students are waiting to learn from your wisdom.",
          action: "Create Your First Quiz"
        };
      } else if (triggerReason === 'has_quizzes_no_students') {
        return {
          primary: `You've created ${totalQuizzes} wonderful quiz${totalQuizzes > 1 ? 'es' : ''}, but haven't invited students yet.`,
          encouragement: "Your biblical quizzes are ready to inspire and educate! Consider inviting students to join your study circle.",
          action: "Invite Students to Learn"
        };
      } else if (triggerReason === 'previously_engaged_now_inactive') {
        return {
          primary: "We've noticed you've been away from your teaching ministry for a while.",
          encouragement: "Your students miss your guidance, and there's so much more biblical wisdom you can share with them.",
          action: "Continue Your Ministry"
        };
      } else {
        return {
          primary: `It's been ${daysSinceLastActivity} days since you last visited your educator dashboard.`,
          encouragement: "Your calling to teach God's Word is a noble one, and every day brings new opportunities to impact lives.",
          action: "Return to Teaching"
        };
      }
    };

    const message = getReminderMessage();

    const headerContent = `
      <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">
        ${reminderLevel === 1 ? '🌟 Your Ministry Awaits!' : '💝 Gentle Reminder'}
      </h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">Spreading God's Word Through Teaching</p>
    `;

    const bodyContent = `
      <h2 style="color: #92400e; font-size: 24px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">
        Beloved Teacher ${educatorName},
      </h2>
      
      <p style="color: #451a03; margin: 15px 0;">Peace and blessings to you! We hope this message finds you well in your walk with the Lord.</p>
      
      <p style="color: #78350f; margin: 15px 0; font-weight: 500;">${message.primary}</p>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
            <p style="margin: 0; color: #78350f; font-style: italic;">
              "And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers; For the perfecting of the saints, for the work of the ministry, for the edifying of the body of Christ" - Ephesians 4:11-12
            </p>
          </td>
        </tr>
      </table>
      
      <p style="color: #451a03; margin: 15px 0;">${message.encouragement}</p>
      
      ${totalQuizzes > 0 ? `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fff" style="background-color: #fff; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px;">
            <h4 style="margin-top: 0; color: #92400e;">📊 Your Ministry Impact So Far:</h4>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr><td style="color: #78350f; padding: 3px 0;">📚 Biblical Quizzes Created: <strong>${totalQuizzes}</strong></td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">👥 Students in Your Care: <strong>${totalStudents}</strong></td></tr>
              <tr><td style="color: #78350f; padding: 3px 0;">🎯 Lives Touched: <strong>Countless and Growing</strong></td></tr>
            </table>
          </td>
        </tr>
      </table>
      ` : ''}
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td bgcolor="#fff" style="background-color: #fff; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px;">
            <h4 style="margin-top: 0; color: #92400e;">🌟 Why Your Ministry Matters:</h4>
            <ul style="color: #78350f; margin: 10px 0;">
              <li><strong>Eternal Impact:</strong> Every lesson you teach plants seeds for eternity</li>
              <li><strong>Biblical Literacy:</strong> You help believers grow deeper in God's Word</li>
              <li><strong>Faith Formation:</strong> Your quizzes strengthen the foundation of faith</li>
              <li><strong>Community Building:</strong> You bring believers together in learning</li>
            </ul>
          </td>
        </tr>
      </table>
      
      <p style="color: #78350f; margin: 20px 0;">
        Remember, ${educatorName}, God has called you to this ministry of biblical education not by accident, but by divine purpose. Your voice, your perspective, and your heart for God's Word are unique gifts that only you can share.
      </p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${dashboardUrl || `${branding.appUrl}/educator/dashboard`}" 
           style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
          ✨ ${message.action}
        </a>
      </div>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; padding: 10px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Quick link to your educator dashboard:</strong><br>
              <span style="color: #78350f; word-break: break-all;">${dashboardUrl || `${branding.appUrl}/educator/dashboard`}</span>
            </p>
          </td>
        </tr>
      </table>
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
        <tr>
          <td style="background-color: #fef3c7; border-left: 4px solid #16a34a; padding: 15px;">
            <p style="margin: 0; color: #78350f;">
              <strong>💡 Need inspiration?</strong> Consider creating a quiz on your favorite Bible story, a character study, or even basic biblical principles. Your students are eager to learn!
            </p>
          </td>
        </tr>
      </table>
      
      <hr style="border: none; height: 2px; background-color: #f59e0b; margin: 20px 0;">
      
      <p style="color: #451a03; margin: 15px 0; font-style: italic;">
        We're not sending this reminder to pressure you, but to encourage you in your calling. If you need any assistance or have questions about using the platform, we're here to help.
      </p>
      
      <p style="text-align: center; color: #b45309; font-style: italic; margin: 20px 0;">
        "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." - Matthew 5:16
      </p>
    `;

    const footerContent = `
      <p style="margin: 5px 0; color: #78350f;">🙏 May the Lord bless your teaching ministry abundantly</p>
      <p style="margin: 5px 0; color: #78350f;">${branding.getCopyrightText()}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #78350f;">
        This gentle reminder was sent with love. 
        <a href="${branding.appUrl}/unsubscribe" style="color: #92400e;">Manage your preferences</a>
      </p>
    `;

    const html = createEmailWrapper(headerContent, bodyContent, footerContent);

    const text = `
Beloved Teacher ${educatorName},

Peace and blessings to you!

${message.primary}

"And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers" - Ephesians 4:11-12

${message.encouragement}

${totalQuizzes > 0 ? `Your Ministry Impact:
- Biblical Quizzes Created: ${totalQuizzes}
- Students in Your Care: ${totalStudents}
- Lives Touched: Countless and Growing

` : ''}Why Your Ministry Matters:
• Eternal Impact: Every lesson plants seeds for eternity
• Biblical Literacy: You help believers grow in God's Word  
• Faith Formation: Your quizzes strengthen faith foundations
• Community Building: You bring believers together in learning

Remember, God has called you to this ministry by divine purpose. Your unique gifts are needed!

${message.action}: ${dashboardUrl || `${branding.appUrl}/educator/dashboard`}

"Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." - Matthew 5:16

This reminder was sent with love and encouragement.
Manage preferences: ${branding.appUrl}/unsubscribe

May the Lord bless your teaching ministry abundantly.
${branding.appName} - Empowering Biblical Education
    `;

    return { subject, html, text };
  }
};

// Password reset email function
export async function sendPasswordResetEmail(email: string, userName: string, resetUrl: string) {
  const subject = `🔑 Password Reset Request - ${branding.appName}`;
  
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
          padding: 30px;
          text-align: center;
        }
        .content { 
          padding: 30px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
          background: #fef3c7;
          border-left: 4px solid #d97706;
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
          
          <p>We received a request to reset your password for your ${branding.appName} account.</p>
          
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
          <p>${branding.getEmailFooter()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Password Reset Request - ${branding.appName}

Dear ${userName || 'Seeker'},

We received a request to reset your password for your ${branding.appName} account.

To reset your password, please visit the following link:
${resetUrl}

Important:
- This link will expire in 1 hour
- If you did not request this reset, please ignore this email
- Your password will not change unless you click the link above

May your path be illuminated with divine wisdom,
${branding.appName} Team
  `;
  
  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}