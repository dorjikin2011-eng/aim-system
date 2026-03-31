import { useState, useEffect } from 'react';

interface Indicator {
  id: string;
  assessment_id: string;
  indicator_number: number;
  score: number;
  evidence_file_paths: string;
  systems: string | null;
  proactive_measures: string | null;
  completed_training: number | null;
  total_employees: number | null;
  submitted_declarations: number | null;
  covered_officials: number | null;
  convictions: number | null;
  prosecutions: number | null;
  admin_actions: number | null;
  weighted_score: number | null;
  timely_atrs: number | null;
  total_atrs: number | null;
  created_at: string;
  updated_at: string;
}

interface Submission {
  assessment_id: string;
  status: string;
  submitted_by_focal: string;
  remarks_hoa: string | null;
  focal_name: string;
  focal_email: string;
  created_at: string;
  updated_at: string;
  indicators: Indicator[];
}

export function useHoaData() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('${API_BASE}/api/hoa/submissions', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const result = await response.json();
      setSubmissions(result.submissions || []);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { submissions, loading, error, refetch: fetchData };
}
