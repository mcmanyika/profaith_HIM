'use client'

import { useState, useEffect } from 'react'
import { getDownloadStats, getTotalDownloadStats } from '../utils/downloadTracking'

export default function DownloadStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const result = await getTotalDownloadStats()
        
        if (result.success) {
          setStats(result.data)
        } else {
          setError(result.error)
        }
      } catch (err) {
        setError('Failed to fetch download statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Error loading statistics: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Download Statistics</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats?.total || 0}</div>
          <div className="text-sm text-gray-600">Total Downloads</div>
        </div>
        
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{stats?.ios || 0}</div>
          <div className="text-sm text-gray-600">iOS Downloads</div>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats?.android || 0}</div>
          <div className="text-sm text-gray-600">Android Downloads</div>
        </div>
      </div>
    </div>
  )
} 