import { useCallback, useEffect, useState } from 'react';
import DocumentList from '../components/DocumentList.jsx';
import UploadComponent from '../components/UploadComponent.jsx';
import { listDocuments } from '../services/documentApi.js';

export default function DocumentsPage({ userId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // Evita que a resposta de um usuário anterior sobrescreva a lista atual.
    let ignore = false;

    async function loadDocuments() {
      setLoading(true);
      setError('');
      try {
        const items = await listDocuments(userId);
        if (!ignore) {
          setDocuments(items);
        }
      } catch (listError) {
        if (!ignore) {
          setDocuments([]);
          setError(listError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      ignore = true;
    };
  }, [userId, reloadKey]);

  const reloadDocuments = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <>
      <UploadComponent userId={userId} onUploaded={reloadDocuments} />
      <DocumentList userId={userId} documents={documents} loading={loading} error={error} />
    </>
  );
}
