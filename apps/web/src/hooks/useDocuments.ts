import { useState, useCallback } from 'react';
import { uploadOrderDocument, fetchOrderDocuments } from '../api';

export function useOrderDocuments(orderId: string | null) {
  const [docs, setDocs] = useState<{ name: string; requiredFor: string; link?: string; version?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const resp = await fetchOrderDocuments(orderId);
      setDocs(resp.documents);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const upload = useCallback(async (name: string, requiredFor?: string) => {
    if (!orderId) return;
    setLoading(true);
    try {
      const resp = await uploadOrderDocument(orderId, name, requiredFor);
      setDocs(resp.documents);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  return { docs, loading, error, load, upload };
}
