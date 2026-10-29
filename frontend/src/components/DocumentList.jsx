import DownloadButton from './DownloadButton.jsx';
import StatusMessage from './StatusMessage.jsx';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

function formatSize(bytes) {
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${SIZE_UNITS[unit]}`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

export default function DocumentList({ userId, documents, loading, error }) {
  return (
    <section>
      <h2>Meus documentos</h2>
      {loading && <StatusMessage>Carregando documentos...</StatusMessage>}
      <StatusMessage type="error">{error}</StatusMessage>
      {!loading && !error && documents.length === 0 && (
        <StatusMessage>Nenhum documento enviado ainda.</StatusMessage>
      )}
      {documents.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th>Nome</th>
              <th>Tamanho</th>
              <th>Enviado em</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{document.originalName}</td>
                <td>{formatSize(document.size)}</td>
                <td>{formatDate(document.uploadedAt)}</td>
                <td>
                  <DownloadButton
                    userId={userId}
                    documentId={document.id}
                    fileName={document.originalName}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
