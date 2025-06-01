'use client'
import React, { useState, useEffect, useRef } from 'react'
import withAuth from '../../utils/withAuth'
import Admin from "../../components/layout/Admin";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import withSessionTimeout from '../../utils/withSessionTimeout'
import { useRouter } from 'next/navigation'

function DocumentsPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [userEmail, setUserEmail] = useState(null)
  const [userLevel, setUserLevel] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const documentsPerPage = 6
  const fileInputRef = useRef(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  const documentCategories = [
    { id: 'bank_statements', label: 'Bank Statements' },
    { id: 'title_deeds', label: 'Title Deeds' },
    { id: 'letters', label: 'Letters & Documents' }
  ]

  useEffect(() => {
    fetchUserEmail()
    fetchUserLevel()
    fetchDocuments()
  }, [currentPage, sortField, sortDirection])

  const fetchUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email)
      }
    } catch (error) {
      console.error('Error fetching user email:', error)
    }
  }

  const fetchUserLevel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_level')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserLevel(profile.user_level)
        }
      }
    } catch (error) {
      console.error('Error fetching user level:', error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error, count } = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range((currentPage - 1) * documentsPerPage, currentPage * documentsPerPage - 1)

      if (error) throw error
      setDocuments(data || [])
      setTotalPages(Math.ceil((count || 0) / documentsPerPage))
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedCategory) {
      toast.error('Please select both a file and a category')
      return
    }

    try {
      setUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Validate file
      const maxFileSize = 5 * 1024 * 1024 // 5MB
      if (selectedFile.size > maxFileSize) {
        throw new Error('File size must be less than 5MB')
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(selectedFile.type)) {
        throw new Error('Invalid file type. Please upload PDF, JPEG, PNG, or Word documents only.')
      }

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop()
      // Use a simpler path structure
      const fileName = `${Date.now()}-${selectedFile.name}`
      
      console.log('Upload attempt details:', {
        fileName,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        userId: user.id,
        category: selectedCategory,
        bucket: 'project-documents',
        auth: {
          user: user.id,
          email: user.email
        }
      })

      // Verify authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw new Error('Authentication error')
      }
      if (!session) {
        throw new Error('No active session')
      }

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true // Allow overwriting if file exists
        })

      if (uploadError) {
        console.error('Storage upload error details:', {
          error: uploadError,
          message: uploadError.message,
          details: uploadError.details,
          hint: uploadError.hint,
          statusCode: uploadError.statusCode,
          name: uploadError.name,
          stack: uploadError.stack,
          fileName,
          userId: user.id,
          bucket: 'project-documents',
          session: session ? 'exists' : 'none'
        })
        throw uploadError
      }

      console.log('Upload successful:', uploadData)

      // Create document record in database
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            user_id: user.id,
            category: selectedCategory,
            file_name: selectedFile.name,
            file_path: fileName,
            file_type: selectedFile.type,
            file_size: selectedFile.size
          }
        ])
        .select()
        .single()

      if (dbError) {
        console.error('Database insert error:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        })
        throw dbError
      }

      console.log('Document record created:', docData)

      toast.success('Document uploaded successfully')
      
      // Clear the form
      setSelectedFile(null)
      setSelectedCategory('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      fetchDocuments()
    } catch (error) {
      console.error('Error uploading document:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      toast.error(error.message || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (docItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(docItem.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = docItem.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document')
    }
  }

  const handleDelete = async (docItem) => {
    try {
      // Verify user has permission to delete
      if (userLevel !== 5) {
        toast.error('You do not have permission to delete documents')
        return
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to delete documents')
        return
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-documents')
        .remove([docItem.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        throw new Error('Failed to delete file from storage')
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docItem.id)
        .eq('user_id', user.id) // Add user_id check for additional security

      if (dbError) {
        console.error('Database delete error:', dbError)
        throw new Error('Failed to delete document record')
      }

      toast.success('Document deleted successfully')
      fetchDocuments()
      setShowDeleteModal(false)
      setDocumentToDelete(null)
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error(error.message || 'Failed to delete document')
    }
  }

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field) => {
    if (field !== sortField) return '↕'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <Admin>
      <div className="p-6">
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && documentToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Document</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDocumentToDelete(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete &ldquo;{documentToDelete.file_name}&rdquo;? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDocumentToDelete(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(documentToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section - Only visible to user_level 5 */}
        {userLevel === 5 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a category</option>
                  {documentCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full p-2 border rounded-md"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !selectedCategory}
                className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-600 disabled:bg-gray-300"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Your Documents</h2>
          {loading ? (
            <div className="text-center py-4">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            <>
              {/* Table Headers */}
              <div className="hidden md:grid grid-cols-12 gap-4 mb-4 px-4 font-medium text-gray-500">
                <div 
                  className="col-span-4 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('file_name')}
                >
                  File Name {getSortIcon('file_name')}
                </div>
                <div 
                  className="col-span-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('category')}
                >
                  Category {getSortIcon('category')}
                </div>
                <div 
                  className="col-span-3 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('created_at')}
                >
                  Upload Date {getSortIcon('created_at')}
                </div>
                <div className="col-span-2 text-right">
                  Actions
                </div>
              </div>

              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 border rounded-md"
                  >
                    <div className="col-span-1 md:col-span-4">
                      <h3 className="font-medium text-sm md:text-base">{doc.file_name}</h3>
                    </div>
                    <div className="col-span-1 md:col-span-3 text-sm md:text-base">
                      <span className="md:hidden font-medium mr-2">Category:</span>
                      {documentCategories.find(c => c.id === doc.category)?.label}
                    </div>
                    <div className="col-span-1 md:col-span-3 text-sm md:text-base">
                      <span className="md:hidden font-medium mr-2">Upload Date:</span>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    <div className="col-span-1 md:col-span-2 flex justify-start md:justify-end space-x-2 mt-2 md:mt-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Download
                      </button>
                      {userLevel === 5 ? (
                        <button
                          onClick={() => {
                            setDocumentToDelete(doc)
                            setShowDeleteModal(true)
                          }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Admin>
  )
}

export default withSessionTimeout(DocumentsPage)
