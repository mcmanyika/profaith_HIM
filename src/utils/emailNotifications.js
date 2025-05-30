import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

const getTemplateContent = (template, data) => {
  switch (template) {
    case 'account-locked':
      return {
        subject: 'Account Locked - Multiple Failed Login Attempts',
        html: `
          <h1>Account Locked</h1>
          <p>Dear user,</p>
          <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
          <p>Your account will be unlocked at: ${new Date(data.unlockTime).toLocaleString()}</p>
          <p>If you did not attempt to log in, please contact support immediately.</p>
          <p>Best regards,<br>Kumusha Team</p>
        `
      };

    case 'suspicious-activity':
      return {
        subject: 'Suspicious Login Activity Detected',
        html: `
          <h1>Suspicious Login Activity Detected</h1>
          <p>Dear user,</p>
          <p>We have detected suspicious activity on your account:</p>
          <ul>
            ${data.activities.map(activity => `<li>${activity.details}</li>`).join('')}
          </ul>
          <p>If this was not you, please secure your account immediately.</p>
          <p>Best regards,<br>Kumusha Team</p>
        `
      };

    case 'password-reset':
      return {
        subject: 'Password Reset Request',
        html: `
          <h1>Password Reset Request</h1>
          <p>Dear user,</p>
          <p>You have requested to reset your password. Click the link below to proceed:</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${data.resetToken}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>Best regards,<br>Kumusha Team</p>
        `
      };

    case 'welcome':
      return {
        subject: 'Welcome to Our Platform',
        html: `
          <h1>Welcome to Kumusha!</h1>
          <p>Dear ${data.fullName},</p>
          <p>Welcome to our platform! We're excited to have you on board.</p>
          <p>Get started by exploring our features and setting up your profile.</p>
          <p>Best regards,<br>Kumusha Team</p>
        `
      };

    default:
      throw new Error(`Template ${template} not found`);
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
    // Use Supabase's built-in email sending
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
    // Use Supabase's built-in password reset
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
    // Use Supabase's built-in email sending
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