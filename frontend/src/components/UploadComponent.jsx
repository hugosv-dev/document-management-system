import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';
import StatusMessage from './StatusMessage.jsx';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setMessage({ type: 'error', text: 'Selecione um arquivo para enviar.' });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const document = await uploadDocument(userId, file);
      setMessage({ type: 'success', text: `"${document.originalName}" enviado com sucesso.` });
      setFile(null);
      fileInputRef.current.value = '';
      onUploaded(document);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      <h2>Enviar documento</h2>
      <form onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(event) => setFile(event.target.files[0] ?? null)}
          disabled={uploading}
        />
        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      <StatusMessage type={message?.type}>{message?.text}</StatusMessage>
    </section>
  );
}
