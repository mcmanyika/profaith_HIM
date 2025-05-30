'use client'

import { useState, useEffect } from 'react'
import { mfaManager } from '../utils/mfaManager'
import QRCode from 'qrcode.react'
import { toast } from 'react-toastify'

export default function MFASetup() {
  const [step, setStep] = useState('initial') // initial, setup, verify, complete
  const [mfaData, setMfaData] = useState(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mfaStatus, setMfaStatus] = useState(null)

  useEffect(() => {
    checkMFAStatus()
  }, [])

  const checkMFAStatus = async () => {
    const { success, data } = await mfaManager.getMFAFactors()
    if (success && data.totp) {
      setMfaStatus('enabled')
    } else {
      setMfaStatus('disabled')
    }
  }

  const handleSetupMFA = async () => {
    setIsLoading(true)
    const { success, data, error } = await mfaManager.setupMFA()
    setIsLoading(false)

    if (success) {
      setMfaData(data)
      setStep('setup')
    } else {
      toast.error(error || 'Failed to setup MFA')
    }
  }

  const handleVerifyMFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    const { success, error } = await mfaManager.verifyMFA(mfaData.id, verificationCode)
    setIsLoading(false)

    if (success) {
      setStep('complete')
      setMfaStatus('enabled')
      toast.success('MFA has been successfully enabled')
    } else {
      toast.error(error || 'Failed to verify MFA code')
    }
  }

  const handleDisableMFA = async () => {
    if (!mfaData?.id) {
      toast.error('No MFA factor found')
      return
    }

    setIsLoading(true)
    const { success, error } = await mfaManager.disableMFA(mfaData.id)
    setIsLoading(false)

    if (success) {
      setMfaStatus('disabled')
      setStep('initial')
      toast.success('MFA has been successfully disabled')
    } else {
      toast.error(error || 'Failed to disable MFA')
    }
  }

  if (mfaStatus === 'enabled') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
        <p className="text-green-600 mb-4">✓ MFA is currently enabled</p>
        <button
          onClick={handleDisableMFA}
          disabled={isLoading}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading ? 'Disabling...' : 'Disable MFA'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
      
      {step === 'initial' && (
        <div>
          <p className="mb-4">Enhance your account security by enabling two-factor authentication.</p>
          <button
            onClick={handleSetupMFA}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Setting up...' : 'Enable MFA'}
          </button>
        </div>
      )}

      {step === 'setup' && mfaData && (
        <div>
          <p className="mb-4">Scan this QR code with your authenticator app:</p>
          <div className="flex justify-center mb-4">
            <QRCode value={mfaData.uri} size={200} />
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Or manually enter this code in your authenticator app:
            <br />
            <code className="bg-gray-100 p-2 rounded">{mfaData.secret}</code>
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter the 6-digit code from your authenticator app:
            </label>
            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
            />
          </div>
          <button
            onClick={handleVerifyMFA}
            disabled={isLoading || verificationCode.length !== 6}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify and Enable MFA'}
          </button>
        </div>
      )}

      {step === 'complete' && (
        <div>
          <p className="text-green-600 mb-4">✓ MFA has been successfully enabled!</p>
          <p className="text-sm text-gray-600">
            Your account is now protected with two-factor authentication.
          </p>
        </div>
      )}
    </div>
  )
} 