'use client'
import { useRouter } from 'next/navigation'

export default function PrivacyPolicy() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 space-y-6 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1 text-sm font-medium shadow-sm border border-gray-200 transition"
        >
          &larr; Back
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">Privacy Policy</h1>
        <p className="text-gray-700">Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Investor Portal. By accessing or using the service, you agree to the collection and use of information in accordance with this policy.</p>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">Information We Collect</h2>
        <ul className="list-disc list-inside text-gray-700">
          <li>Personal identification information (Name, email address, phone number, etc.)</li>
          <li>Usage data and cookies</li>
          <li>Authentication and profile information</li>
        </ul>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">How We Use Your Information</h2>
        <ul className="list-disc list-inside text-gray-700">
          <li>To provide and maintain our service</li>
          <li>To improve user experience</li>
          <li>To communicate with you</li>
          <li>To ensure security and prevent fraud</li>
        </ul>
        <h2 className="text-xl font-semibold text-gray-800 mt-6">Your Rights</h2>
        <ul className="list-disc list-inside text-gray-700">
          <li>You may review, update, or delete your personal information at any time</li>
          <li>You may opt out of certain communications</li>
        </ul>
        <p className="text-gray-700 mt-6">If you have any questions about this Privacy Policy, please contact us.</p>
      </div>
    </div>
  )
} 