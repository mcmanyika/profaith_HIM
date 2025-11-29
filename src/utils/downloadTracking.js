import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const trackDownload = async (platform) => {
  const supabase = createClientComponentClient()
  
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    
    // Get user IP and user agent
    const userAgent = navigator.userAgent
    const sessionId = session?.access_token || 'anonymous'
    
    // Prepare download data
    const downloadData = {
      user_id: session?.user?.id || null,
      platform: platform,
      user_agent: userAgent,
      session_id: sessionId,
      download_url: platform === 'ios' 
        ? 'https://apps.apple.com/app/your-app-id' // Replace with your App Store link
        : 'https://play.google.com/store/apps/details?id=your.app.package', // Replace with your Play Store link
      success: true
    }
    
    // Insert download record
    const { data, error } = await supabase
      .from('downloads')
      .insert([downloadData])
    
    if (error) {
      console.error('Error tracking download:', error)
      return { success: false, error }
    }
    
    console.log('Download tracked successfully:', data)
    return { success: true, data }
    
  } catch (error) {
    console.error('Error in trackDownload:', error)
    return { success: false, error }
  }
}

export const getDownloadStats = async () => {
  const supabase = createClientComponentClient()
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }
    
    // Get download statistics
    const { data, error } = await supabase
      .from('downloads')
      .select('platform, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching download stats:', error)
      return { success: false, error }
    }
    
    return { success: true, data }
    
  } catch (error) {
    console.error('Error in getDownloadStats:', error)
    return { success: false, error }
  }
}

export const getTotalDownloadStats = async () => {
  const supabase = createClientComponentClient()
  
  try {
    // Get total download counts by platform
    const { data, error } = await supabase
      .from('downloads')
      .select('platform')
    
    if (error) {
      console.error('Error fetching total download stats:', error)
      return { success: false, error }
    }
    
    // Calculate totals
    const stats = {
      total: data.length,
      ios: data.filter(d => d.platform === 'ios').length,
      android: data.filter(d => d.platform === 'android').length
    }
    
    return { success: true, data: stats }
    
  } catch (error) {
    console.error('Error in getTotalDownloadStats:', error)
    return { success: false, error }
  }
} 