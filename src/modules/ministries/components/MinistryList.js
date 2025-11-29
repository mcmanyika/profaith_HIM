'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-toastify';

export default function MinistryList() {
  const [ministries, setMinistries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMinistry, setNewMinistry] = useState({
    name: '',
    description: ''
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchMinistries();
  }, []);

  const fetchMinistries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ministries')
        .select(`
          *,
          leader:profiles!leader_id(full_name, email)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      setMinistries(data || []);
    } catch (error) {
      console.error('Error fetching ministries:', error);
      toast.error('Failed to load ministries');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMinistry = async (e) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ministries')
        .insert([{
          ...newMinistry,
          leader_id: user.id
        }]);

      if (error) throw error;

      toast.success('Ministry created successfully!');
      setShowCreateModal(false);
      setNewMinistry({ name: '', description: '' });
      fetchMinistries();
    } catch (error) {
      console.error('Error creating ministry:', error);
      toast.error('Failed to create ministry');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Ministries</h1>
          <p className="text-gray-600">Church ministries and departments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + New Ministry
        </button>
      </div>

      {/* Ministries Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ministries.map((ministry) => (
            <div
              key={ministry.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{ministry.name}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {ministry.member_count} members
                </span>
              </div>
              
              <p className="text-gray-600 mb-4 line-clamp-3">
                {ministry.description || 'No description available'}
              </p>

              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">Leader</p>
                <p className="text-gray-800 font-medium">
                  {ministry.leader?.full_name || 'No leader assigned'}
                </p>
              </div>

              <button className="mt-4 w-full py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && ministries.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500 text-lg">No ministries yet</p>
          <p className="text-gray-400 text-sm mt-2">Create your first ministry to get started</p>
        </div>
      )}

      {/* Create Ministry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Ministry</h2>
            <form onSubmit={handleCreateMinistry}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ministry Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMinistry.name}
                  onChange={(e) => setNewMinistry({ ...newMinistry, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Youth Ministry, Worship Team"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newMinistry.description}
                  onChange={(e) => setNewMinistry({ ...newMinistry, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the ministry's purpose and activities..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewMinistry({ name: '', description: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Create Ministry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

