import { useState, useEffect } from 'react';

interface Indicator {
  id: string | null;
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

interface FocalData {
  agencyId: string;
  assessmentId: string;
  fiscalYear: string;
  indicators: Indicator[];
}

export function useFocalData() {
  const [data, setData] = useState<FocalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('${API_BASE}/api/focal/indicators', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const result = await response.json();
      setData(result);
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

  return { data, loading, error, refetch: fetchData };
}
