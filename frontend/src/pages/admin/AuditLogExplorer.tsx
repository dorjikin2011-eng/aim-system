// frontend/src/pages/admin/AuditLogExplorer.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function AuditLogExplorer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/admin/logs');
        if (!res.ok) throw new Error('Failed to load logs');
        const data = await res.json();
        setLogs(data.logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <HomeIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold mb-4">Audit Log Explorer</h1>
        
        {loading ? (
          <p className="text-gray-500">Loading logs...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Found <strong>{logs.length}</strong> audit log entries.
            </p>
            
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-gray-600">
                    by {log.actor_email} • {new Date(log.created_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {log.target_type} ({log.target_id})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}