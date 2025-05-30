import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const sendLockoutNotification = async (email) => {
  try {
    const supabase = createClientComponentClient();
    
    // Create a notification record in the database
    const { error } = await supabase
      .from('security_notifications')
      .insert([
        {
          email,
          type: 'account_lockout',
          message: 'Your account has been temporarily locked due to multiple failed login attempts.',
          status: 'pending'
        }
      ]);

    if (error) throw error;

    // Send email using Supabase Edge Function
    const { error: emailError } = await supabase.functions.invoke('send-lockout-email', {
      body: { email }
    });

    if (emailError) throw emailError;

    return { success: true };
  } catch (error) {
    console.error('Error sending lockout notification:', error);
    return { success: false, error: error.message };
  }
}; 