// frontend/src/pages/prevention/components/ValidationInbox.tsx

interface ValidationRequest {
  id: string;
  agencyName: string;
  message: string;
}

interface Props {
  requests: ValidationRequest[];
}

export default function ValidationInbox({ requests }: Props) {
  if (requests.length === 0) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
      <h3 className="font-medium text-blue-800 flex items-center gap-2">
        <span>📥</span> Validation Requests ({requests.length})
      </h3>
      <ul className="mt-2 space-y-1">
        {requests.map(req => (
          <li key={req.id} className="text-sm text-blue-700">
            • <strong>{req.agencyName}</strong> – {req.message}
          </li>
        ))}
      </ul>
      <button className="mt-3 text-sm text-blue-700 hover:underline">
        View all requests
      </button>
    </div>
  );
}