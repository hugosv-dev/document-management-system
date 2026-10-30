import { useRef, useState } from 'react';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../config.js';
import { uploadDocument } from '../services/documentApi.js';
import StatusMessage from './StatusMessage.jsx';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  function resetFileInput() {
    setFile(null);
    fileInputRef.current.value = '';
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files[0] ?? null;

    if (selectedFile && selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setMessage({
        type: 'error',
        text: `Arquivo excede o tamanho máximo de ${MAX_FILE_SIZE_MB} MB.`,
      });
      resetFileInput();
      return;
    }

    setMessage(null);
    setFile(selectedFile);
  }

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
      resetFileInput();
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
          onChange={handleFileChange}
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
