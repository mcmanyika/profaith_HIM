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
    this.activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
  }

  initialize() {
    this.setupActivityListeners()
    this.setupSessionRefresh()
    this.setupSessionCheck()
  }

  setupActivityListeners() {
    const handleActivity = () => {
      this.lastActivity = Date.now()
    }

    this.activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity)
    })
  }

  setupSessionRefresh() {
    this.refreshInterval = setInterval(async () => {
      const { data: { session } } = await this.supabase.auth.getSession()
      if (session) {
        await this.supabase.auth.refreshSession()
        this.updateSessionInfo(session)
      }
    }, SESSION_REFRESH_INTERVAL)
  }

  setupSessionCheck() {
    this.checkInterval = setInterval(() => {
      const currentTime = Date.now()
      if (currentTime - this.lastActivity > SESSION_TIMEOUT) {
        this.handleSessionTimeout()
      }
    }, ACTIVITY_CHECK_INTERVAL)
  }

  async handleSessionTimeout() {
    await this.supabase.auth.signOut()
    window.location.href = '/auth/signin?error=Session expired. Please sign in again.'
  }

  updateSessionInfo(session) {
    const sessionInfo = {
      lastRefresh: Date.now(),
      expiresAt: new Date(session.expires_at).getTime()
    }
    sessionStorage.setItem('sessionInfo', JSON.stringify(sessionInfo))
  }

  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    this.activityEvents.forEach(event => {
      window.removeEventListener(event, this.handleActivity)
    })
  }
}

export const sessionManager = new SessionManager() 