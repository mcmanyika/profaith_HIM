import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

const getTemplateContent = (template, data) => {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { text-align: center; padding: 20px 0; }
      .logo { max-width: 150px; height: auto; }
      .content { background: #ffffff; padding: 30px; border-radius: 8px; }
      .button { 
        display: inline-block; 
        padding: 12px 24px; 
        background-color: #000000; 
        color: #ffffff; 
        text-decoration: none; 
        border-radius: 6px; 
        margin: 20px 0; 
      }
      .footer { 
        text-align: center; 
        padding: 20px; 
        font-size: 12px; 
        color: #666; 
      }
      .warning { 
        background-color: #fff3cd; 
        border: 1px solid #ffeeba; 
        color: #856404; 
        padding: 15px; 
        border-radius: 4px; 
        margin: 20px 0; 
      }
    </style>
  `;

  const baseTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://sdlrxbcshhjhuaqoidzh.supabase.co/storage/v1/object/sign/images/logo.png" alt="Logo" class="logo">
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply directly to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Kumusha. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  switch (template) {
    case 'account-locked':
      return {
        subject: 'Security Alert: Account Temporarily Locked',
        html: baseTemplate.replace('{{content}}', `
          <h1>Account Security Alert</h1>
          <p>Dear user,</p>
          <p>We have detected multiple unsuccessful login attempts on your account. To protect your account, we have temporarily locked it.</p>
          <div class="warning">
            <strong>Important:</strong> Your account will be automatically unlocked at: ${new Date(data.unlockTime).toLocaleString()}
          </div>
          <p>If you did not attempt to log in, please take the following steps:</p>
          <ol>
            <li>Change your password immediately after the account is unlocked</li>
            <li>Enable two-factor authentication for additional security</li>
            <li>Contact our support team if you need immediate assistance</li>
          </ol>
          <p>Best regards,<br>Kumusha Security Team</p>
        `)
      };

    case 'suspicious-activity':
      return {
        subject: 'Security Alert: Suspicious Activity Detected',
        html: baseTemplate.replace('{{content}}', `
          <h1>Security Alert</h1>
          <p>Dear user,</p>
          <p>We have detected unusual activity on your account:</p>
          <div class="warning">
            <ul>
              ${data.activities.map(activity => `<li>${activity.details}</li>`).join('')}
            </ul>
          </div>
          <p>If you did not perform these actions, please:</p>
          <ol>
            <li>Change your password immediately</li>
            <li>Review your account activity</li>
            <li>Enable two-factor authentication</li>
            <li>Contact our support team</li>
          </ol>
          <p>Best regards,<br>Kumusha Security Team</p>
        `)
      };

    case 'password-reset':
      return {
        subject: 'Password Reset Request - Kumusha',
        html: baseTemplate.replace('{{content}}', `
          <h1>Password Reset Request</h1>
          <p>Dear user,</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${data.resetToken}" class="button">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <div class="warning">
            <strong>Important:</strong> If you did not request this password reset, please:
            <ol>
              <li>Ignore this email</li>
              <li>Check your account for any unauthorized changes</li>
              <li>Contact our support team if you notice any suspicious activity</li>
            </ol>
          </div>
          <p>Best regards,<br>Kumusha Team</p>
        `)
      };

    case 'welcome':
      return {
        subject: 'Welcome to Kumusha!',
        html: baseTemplate.replace('{{content}}', `
          <h1>Welcome to Kumusha!</h1>
          <p>Dear user,</p>
          <p>Thank you for joining Kumusha. We're excited to have you on board!</p>
          <p>To get started:</p>
          <ol>
            <li>Complete your profile</li>
            <li>Set up your security preferences</li>
            <li>Explore our features</li>
          </ol>
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/account" class="button">
              Go to Your Account
            </a>
          </div>
          <p>If you have any questions, our support team is here to help.</p>
          <p>Best regards,<br>Kumusha Team</p>
        `)
      };

    default:
      return {
        subject: 'Kumusha Notification',
        html: baseTemplate.replace('{{content}}', `
          <h1>Notification</h1>
          <p>Dear user,</p>
          <p>${data.message || 'You have received a notification from Kumusha.'}</p>
          <p>Best regards,<br>Kumusha Team</p>
        `)
      };
  }
};

const logEmailSend = async (emailData) => {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert({
        to_email: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging email:', error);
  }
};

export const sendLockoutNotification = async (email) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          type: 'account_locked',
          unlockTime: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes from now
        }
      }
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending lockout notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendSuspiciousActivityNotification = async (email, activities) => {
  try {
    // Use Supabase's built-in email sending
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          type: 'suspicious_activity',
          activities
        }
      }
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending suspicious activity notification:', error);
    return { success: false, error: error.message };
  }
};

export const sendPasswordResetEmail = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

export const sendWelcomeEmail = async (email) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          type: 'welcome'
        }
      }
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}; 