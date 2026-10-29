import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';
import StatusMessage from './StatusMessage.jsx';

// Um link <a href> não envia o cabeçalho X-User-Id; por isso o arquivo é
// obtido via fetch e salvo a partir de um Blob.
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function DownloadButton({ userId, documentId, fileName }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setDownloading(true);
    setError('');
    try {
      saveBlob(await downloadDocument(userId, documentId), fileName);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={downloading}>
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      <StatusMessage type="error">{error}</StatusMessage>
    </>
  );
}
