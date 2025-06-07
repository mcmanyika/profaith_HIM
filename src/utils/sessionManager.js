import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const ACTIVITY_CHECK_INTERVAL = 60 * 1000 // 1 minute
const SESSION_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes

class SessionManager {
  constructor() {
    this.supabase = createClientComponentClient()
    this.lastActivity = Date.now()
    this.refreshInterval = null
    this.checkInterval = null
    this.activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    this.handleActivity = this.handleActivity.bind(this)
  }

  initialize() {
    try {
      this.setupActivityListeners()
      this.setupSessionRefresh()
      this.setupSessionCheck()
      console.log('Session manager initialized')
    } catch (error) {
      console.error('Error initializing session manager:', error)
    }
  }

  handleActivity() {
    this.lastActivity = Date.now()
  }

  setupActivityListeners() {
    this.activityEvents.forEach(event => {
      window.addEventListener(event, this.handleActivity)
    })
  }

  async setupSessionRefresh() {
    try {
      // Initial session check
      const { data: { session } } = await this.supabase.auth.getSession()
      if (session) {
        await this.refreshSession()
      }

      // Set up periodic refresh
      this.refreshInterval = setInterval(async () => {
        await this.refreshSession()
      }, SESSION_REFRESH_INTERVAL)
    } catch (error) {
      console.error('Error setting up session refresh:', error)
    }
  }

  async refreshSession() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      if (session) {
        const { error } = await this.supabase.auth.refreshSession()
        if (error) {
          console.error('Error refreshing session:', error)
          await this.handleSessionTimeout()
          return
        }
        this.updateSessionInfo(session)
      }
    } catch (error) {
      console.error('Error in refreshSession:', error)
      await this.handleSessionTimeout()
    }
  }

  setupSessionCheck() {
    this.checkInterval = setInterval(async () => {
      try {
        const currentTime = Date.now()
        if (currentTime - this.lastActivity > SESSION_TIMEOUT) {
          await this.handleSessionTimeout()
        }
      } catch (error) {
        console.error('Error in session check:', error)
      }
    }, ACTIVITY_CHECK_INTERVAL)
  }

  async handleSessionTimeout() {
    try {
      await this.supabase.auth.signOut()
      window.location.href = '/auth/signin?error=Session expired. Please sign in again.'
    } catch (error) {
      console.error('Error handling session timeout:', error)
      window.location.href = '/auth/signin?error=Session error. Please sign in again.'
    }
  }

  updateSessionInfo(session) {
    try {
      const sessionInfo = {
        lastRefresh: Date.now(),
        expiresAt: new Date(session.expires_at).getTime()
      }
      sessionStorage.setItem('sessionInfo', JSON.stringify(sessionInfo))
    } catch (error) {
      console.error('Error updating session info:', error)
    }
  }

  cleanup() {
    try {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
      }
      if (this.checkInterval) {
        clearInterval(this.checkInterval)
      }
      this.activityEvents.forEach(event => {
        window.removeEventListener(event, this.handleActivity)
      })
    } catch (error) {
      console.error('Error cleaning up session manager:', error)
    }
  }
}

export const sessionManager = new SessionManager() 