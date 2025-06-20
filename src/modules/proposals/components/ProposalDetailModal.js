import ProposalStatusBadge from './ProposalStatusBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-toastify';
import LinearProgress from '@mui/material/LinearProgress';
import { useRouter } from 'next/navigation';
import { PROPOSAL_CATEGORIES } from '../constants/proposalConstants';

export default function ProposalDetailModal({ proposal, onClose, onUpdate }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProposal, setEditedProposal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userLevel, setUserLevel] = useState(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (proposal) {
      setEditedProposal(proposal);
    }

    const fetchUserLevel = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_level')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            setUserLevel(profile.user_level);
          }
        }
      } catch (error) {
        console.error('Error fetching user level:', error);
      }
    };

    fetchUserLevel();
  }, []);

  if (!proposal || !editedProposal) return null;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log('Original proposal:', proposal); // Debug log
      console.log('Edited proposal before save:', editedProposal); // Debug log

      const { data, error } = await supabase
        .from('proposals')
        .update({
          title: editedProposal.title,
          description: editedProposal.description,
          budget: editedProposal.budget,
          status: editedProposal.status,
          category: editedProposal.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', editedProposal.id)
        .select();

      if (error) {
        console.error('Supabase error:', error); // Debug log
        throw error;
      }

      console.log('Save response:', data); // Debug log
      toast.success('Proposal updated successfully');
      setIsEditing(false);
      if (onUpdate && data?.[0]) {
        console.log('Calling onUpdate with:', data[0]); // Debug log
        onUpdate(data[0]);
      }
      onClose();
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error(error.message || 'Failed to update proposal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProposal(proposal);
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50"
        onClick={onClose}
      >
        <motion.div 
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-xl max-h-[90vh] overflow-y-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-3 border-b pb-3">
              <div className="flex-grow">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedProposal.title}
                        onChange={(e) => setEditedProposal({ ...editedProposal, title: e.target.value })}
                        className="flex-grow text-lg font-semibold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        placeholder="Enter proposal title"
                        maxLength={100}
                      />
                      <select
                        value={editedProposal.category}
                        onChange={(e) => setEditedProposal({ ...editedProposal, category: e.target.value })}
                        className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {PROPOSAL_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{editedProposal.title}</h2>
                    <p className="text-sm text-gray-500">{editedProposal.category}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editedProposal.title.trim()}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {userLevel === 5 && (
                      <button
                        onClick={handleEdit}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-6 mt-6">
              {/* Main Content */}
              <div className="grid gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                  {isEditing ? (
                    <textarea
                      value={editedProposal.description}
                      onChange={(e) => setEditedProposal({ ...editedProposal, description: e.target.value })}
                      className="w-full h-32 p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{editedProposal.description}</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Budget</h3>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedProposal.budget}
                      onChange={(e) => setEditedProposal({ ...editedProposal, budget: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <p className="text-gray-600">
                      {editedProposal.budget.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Budget Progress Section */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Funding Progress</h3>
                  <div className="space-y-2">
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((editedProposal.amount_raised / editedProposal.budget) * 100 || 0, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        flexGrow: 1,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#00D48A'
                        },
                        backgroundColor: '#f3f4f6'
                      }}
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>
                        ${(editedProposal.amount_raised || 0).toLocaleString()} raised
                      </span>
                      <span>
                        {Math.min((editedProposal.amount_raised / editedProposal.budget) * 100 || 0, 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Selection */}
                {isEditing && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Status</h3>
                    <select
                      value={editedProposal.status}
                      onChange={(e) => setEditedProposal({ ...editedProposal, status: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}

                {/* Payment Button */}
                {editedProposal.status === 'active' && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/checkout/${editedProposal.id}`);
                    }}
                    className="w-full px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    Make Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 