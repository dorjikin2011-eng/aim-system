// frontend/src/pages/admin/AuditLogExplorer.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, DocumentMagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';
import { API_BASE } from '../../config'; // ✅ ADD MISSING IMPORT

interface AuditLog {
  id: string;
  action: string;
  actor_email: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AuditLogExplorer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      // ✅ FIXED: Use backticks for template literal
      const res = await fetch(`${API_BASE}/api/admin/logs`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to load logs' }));
        throw new Error(errorData.error || `HTTP ${res.status}: Failed to load logs`);
      }
      
      const data = await res.json();
      // Handle different response formats
      const logsList = data.logs || data.data || data;
      setLogs(Array.isArray(logsList) ? logsList : []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-800';
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = logs.filter(log => 
    filter === '' || 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.actor_email.toLowerCase().includes(filter.toLowerCase()) ||
    log.target_type.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <HomeIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log Explorer</h1>
        </div>
        <button
          onClick={fetchLogs}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <DocumentMagnifyingGlassIcon className="h-4 w-4 mr-2" />
          Refresh Logs
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Activity Logs</h2>
              <p className="text-sm text-gray-600 mt-1">
                Track all user actions and system events
              </p>
            </div>
            
            {/* Filter Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Filter logs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-64 p-2 pl-8 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <DocumentMagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-2 top-3" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">
              <p className="font-medium">Error loading logs:</p>
              <p>{error}</p>
              <button 
                onClick={fetchLogs} 
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try Again
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-600">No audit log entries available at this time.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> log entries
                </p>
                {filter && filteredLogs.length !== logs.length && (
                  <button
                    onClick={() => setFilter('')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">{log.actor_email}</span>
                          {' '}performed action on{' '}
                          <span className="font-medium">{log.target_type}</span>
                        </p>
                        <div className="mt-1 text-xs text-gray-500">
                          Target ID: {log.target_id}
                          {log.ip_address && ` • IP: ${log.ip_address}`}
                        </div>
                        {log.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              View Details
                            </summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}