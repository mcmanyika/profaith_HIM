import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

class MFAManager {
  constructor() {
    this.supabase = createClientComponentClient()
  }

  async setupMFA() {
    try {
      const { data, error } = await this.supabase.auth.mfa.enroll({
        factorType: 'totp'
      })

      if (error) throw error

      return {
        success: true,
        data: {
          id: data.id,
          uri: data.totp_uri,
          secret: data.totp_secret
        }
      }
    } catch (error) {
      console.error('Error setting up MFA:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async verifyMFA(factorId, code) {
    try {
      const { data, error } = await this.supabase.auth.mfa.challenge({
        factorId
      })

      if (error) throw error

      const { data: verifyData, error: verifyError } = await this.supabase.auth.mfa.verify({
        factorId,
        challengeId: data.id,
        code
      })

      if (verifyError) throw verifyError

      return {
        success: true,
        data: verifyData
      }
    } catch (error) {
      console.error('Error verifying MFA:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async disableMFA(factorId) {
    try {
      const { error } = await this.supabase.auth.mfa.unenroll({
        factorId
      })

      if (error) throw error

      return {
        success: true
      }
    } catch (error) {
      console.error('Error disabling MFA:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getMFAFactors() {
    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser()
      if (userError) throw userError

      const { data, error } = await this.supabase.auth.mfa.listFactors()
      if (error) throw error

      return {
        success: true,
        data: {
          factors: data.all,
          totp: data.totp
        }
      }
    } catch (error) {
      console.error('Error getting MFA factors:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

export const mfaManager = new MFAManager() 