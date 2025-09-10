import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  template: string;
  active: boolean;
  responses: number;
  lastUsed: string;
}

interface ConversationStats {
  totalFlows: number;
  activeFlows: number;
  totalResponses: number;
  topFlows: ConversationFlow[];
}

export default function ConversationManagement() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState<ConversationFlow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlow, setNewFlow] = useState<Partial<ConversationFlow>>({
    name: '',
    description: '',
    keywords: [],
    template: '',
    active: true
  });

  useEffect(() => {
    fetchConversationData();
  }, []);

  const fetchConversationData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API calls
      const mockFlows: ConversationFlow[] = [
        {
          id: '1',
          name: 'Support Request',
          description: 'Handles vendor support requests',
          keywords: ['support', 'help', 'problem'],
          template: 'inactive_vendors_support_prompt_util',
          active: true,
          responses: 45,
          lastUsed: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'Loan Inquiry',
          description: 'Processes loan-related inquiries',
          keywords: ['loan', 'money', 'funding'],
          template: 'reply_to_default_hi_loan_ready_to_verify_aadhar_or_not_util',
          active: true,
          responses: 23,
          lastUsed: '2024-01-14T15:45:00Z'
        },
        {
          id: '3',
          name: 'Aadhaar Verification',
          description: 'Handles Aadhaar verification requests',
          keywords: ['verify', 'aadhaar', 'aadhar'],
          template: 'aadhaar_verification_confirmation',
          active: true,
          responses: 67,
          lastUsed: '2024-01-15T09:15:00Z'
        },
        {
          id: '4',
          name: 'Location Update',
          description: 'Processes location sharing',
          keywords: ['location', 'address', 'where'],
          template: 'location_confirmation',
          active: true,
          responses: 89,
          lastUsed: '2024-01-15T11:20:00Z'
        },
        {
          id: '5',
          name: 'Greeting Response',
          description: 'Default greeting responses',
          keywords: ['hi', 'hello', 'hey'],
          template: 'default_hi_and_loan_prompt',
          active: true,
          responses: 156,
          lastUsed: '2024-01-15T12:00:00Z'
        }
      ];

      const mockStats: ConversationStats = {
        totalFlows: mockFlows.length,
        activeFlows: mockFlows.filter(f => f.active).length,
        totalResponses: mockFlows.reduce((sum, f) => sum + f.responses, 0),
        topFlows: mockFlows.sort((a, b) => b.responses - a.responses).slice(0, 3)
      };

      setFlows(mockFlows);
      setStats(mockStats);
    } catch (error) {
      console.error('Error fetching conversation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlowStatus = async (flowId: string) => {
    try {
      // Update flow status
      setFlows(prev => prev.map(flow => 
        flow.id === flowId ? { ...flow, active: !flow.active } : flow
      ));
      
      // Here you would make an API call to update the flow status
      console.log(`Toggled flow ${flowId} status`);
    } catch (error) {
      console.error('Error toggling flow status:', error);
    }
  };

  const createNewFlow = async () => {
    try {
      if (!newFlow.name || !newFlow.description || !newFlow.template) {
        alert('Please fill in all required fields');
        return;
      }

      const flow: ConversationFlow = {
        id: Date.now().toString(),
        name: newFlow.name!,
        description: newFlow.description!,
        keywords: newFlow.keywords || [],
        template: newFlow.template!,
        active: newFlow.active || true,
        responses: 0,
        lastUsed: new Date().toISOString()
      };

      setFlows(prev => [...prev, flow]);
      setShowCreateModal(false);
      setNewFlow({
        name: '',
        description: '',
        keywords: [],
        template: '',
        active: true
      });

      // Here you would make an API call to create the flow
      console.log('Created new flow:', flow);
    } catch (error) {
      console.error('Error creating flow:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Conversation Management</h1>
              <p className="text-gray-600 mt-2">Manage automated conversation flows and responses</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Flow
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Flows</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFlows}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Flows</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeFlows}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Responses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalResponses}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last Activity</p>
                  <p className="text-sm font-bold text-gray-900">2 min ago</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Flows */}
        {stats && stats.topFlows.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Flows</h2>
            <div className="space-y-4">
              {stats.topFlows.map((flow, index) => (
                <div key={flow.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{flow.name}</h3>
                      <p className="text-sm text-gray-600">{flow.responses} responses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Last used</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(flow.lastUsed)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flows Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Conversation Flows</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flow
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keywords
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {flows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{flow.name}</div>
                        <div className="text-sm text-gray-500">{flow.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {flow.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flow.template}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flow.responses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          flow.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {flow.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(flow.lastUsed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedFlow(flow)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => toggleFlowStatus(flow.id)}
                          className={`${
                            flow.active
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {flow.active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Flow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Flow</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={newFlow.name || ''}
                      onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Flow name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newFlow.description || ''}
                      onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      placeholder="Flow description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
                    <input
                      type="text"
                      value={newFlow.keywords?.join(', ') || ''}
                      onChange={(e) => setNewFlow({ 
                        ...newFlow, 
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) 
                      })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="support, help, problem"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template</label>
                    <input
                      type="text"
                      value={newFlow.template || ''}
                      onChange={(e) => setNewFlow({ ...newFlow, template: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Template name"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewFlow}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Create Flow
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flow Details Modal */}
        {selectedFlow && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedFlow.name}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900">{selectedFlow.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Keywords</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedFlow.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Template</label>
                    <p className="text-sm text-gray-900">{selectedFlow.template}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Responses</label>
                    <p className="text-sm text-gray-900">{selectedFlow.responses}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Used</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedFlow.lastUsed)}</p>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setSelectedFlow(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
