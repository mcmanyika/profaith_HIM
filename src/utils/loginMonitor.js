import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

class LoginMonitor {
  constructor() {
    this.supabase = createClientComponentClient()
    this.SUSPICIOUS_THRESHOLDS = {
      FAILED_ATTEMPTS: 5,
      TIME_WINDOW: 15 * 60 * 1000, // 15 minutes
      IP_CHANGES: 3,
      LOCATION_CHANGES: 2
    }
  }

  async logLoginAttempt(email, success, metadata = {}) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      const userId = user?.id

      const { data, error } = await this.supabase
        .from('login_attempts')
        .insert({
          user_id: userId,
          email,
          success,
          ip_address: metadata.ip,
          user_agent: metadata.userAgent,
          location: metadata.location,
          timestamp: new Date().toISOString()
        })

      if (error) throw error

      // Check for suspicious activity after logging
      await this.checkSuspiciousActivity(email)

      return { success: true, data }
    } catch (error) {
      console.error('Error logging login attempt:', error)
      return { success: false, error: error.message }
    }
  }

  async checkSuspiciousActivity(email) {
    try {
      const timeWindow = new Date(Date.now() - this.SUSPICIOUS_THRESHOLDS.TIME_WINDOW)
      
      // Get recent login attempts
      const { data: attempts, error: attemptsError } = await this.supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .gte('timestamp', timeWindow.toISOString())
        .order('timestamp', { ascending: false })

      if (attemptsError) throw attemptsError

      const suspiciousActivities = []

      // Check for multiple failed attempts
      const failedAttempts = attempts.filter(attempt => !attempt.success)
      if (failedAttempts.length >= this.SUSPICIOUS_THRESHOLDS.FAILED_ATTEMPTS) {
        suspiciousActivities.push({
          type: 'multiple_failures',
          details: `${failedAttempts.length} failed attempts in the last 15 minutes`
        })
      }

      // Check for IP changes
      const uniqueIPs = new Set(attempts.map(attempt => attempt.ip_address))
      if (uniqueIPs.size >= this.SUSPICIOUS_THRESHOLDS.IP_CHANGES) {
        suspiciousActivities.push({
          type: 'multiple_ips',
          details: `Login attempts from ${uniqueIPs.size} different IP addresses`
        })
      }

      // Check for location changes
      const uniqueLocations = new Set(attempts.map(attempt => attempt.location))
      if (uniqueLocations.size >= this.SUSPICIOUS_THRESHOLDS.LOCATION_CHANGES) {
        suspiciousActivities.push({
          type: 'multiple_locations',
          details: `Login attempts from ${uniqueLocations.size} different locations`
        })
      }

      // If suspicious activities are detected, log them and notify
      if (suspiciousActivities.length > 0) {
        await this.logSuspiciousActivity(email, suspiciousActivities)
        await this.notifySuspiciousActivity(email, suspiciousActivities)
      }

      return {
        success: true,
        suspicious: suspiciousActivities.length > 0,
        activities: suspiciousActivities
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error)
      return { success: false, error: error.message }
    }
  }

  async logSuspiciousActivity(email, activities) {
    try {
      const { data, error } = await this.supabase
        .from('suspicious_activities')
        .insert({
          email,
          activities,
          timestamp: new Date().toISOString()
        })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error logging suspicious activity:', error)
      return { success: false, error: error.message }
    }
  }

  async notifySuspiciousActivity(email, activities) {
    try {
      // Get user's notification preferences
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('email', email)
        .single()

      if (userError) throw userError

      // Send email notification if enabled
      if (user?.notification_preferences?.email_notifications) {
        const { error: emailError } = await this.supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: 'Suspicious Login Activity Detected',
            template: 'suspicious-activity',
            data: {
              activities,
              timestamp: new Date().toISOString()
            }
          }
        })

        if (emailError) throw emailError
      }

      return { success: true }
    } catch (error) {
      console.error('Error notifying suspicious activity:', error)
      return { success: false, error: error.message }
    }
  }

  async getLoginHistory(email, limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('login_attempts')
        .select('*')
        .eq('email', email)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error getting login history:', error)
      return { success: false, error: error.message }
    }
  }
}

export const loginMonitor = new LoginMonitor() 