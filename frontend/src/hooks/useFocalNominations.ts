import { useState, useEffect } from 'react';

interface FocalNomination {
  id: string;
  nominee_email: string;
  nominee_name: string;
  nominee_position: string;
  status: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
  agency_name: string;
  hoa_name?: string;
  hoa_email?: string;
}

export function useHoaNominations() {
  const [nominations, setNominations] = useState<FocalNomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('${API_BASE}/api/hoa/nominations', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch nominations');
      }
      
      const result = await response.json();
      setNominations(result.nominations || []);
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

  return { nominations, loading, error, refetch: fetchData };
}

export function usePendingNominations() {
  const [nominations, setNominations] = useState<FocalNomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('${API_BASE}/api/admin/focal-nominations', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending nominations');
      }
      
      const result = await response.json();
      setNominations(result.nominations || []);
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

  return { nominations, loading, error, refetch: fetchData };
}
