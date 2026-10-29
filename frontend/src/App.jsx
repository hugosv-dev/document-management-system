import { useState } from 'react';
import DocumentsPage from './pages/DocumentsPage.jsx';

export default function App() {
  const [userId, setUserId] = useState('usuario-demo');
  const currentUser = userId.trim();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '960px' }}>
      <h1>Document Management System</h1>

      <label>
        Usuário atual:{' '}
        <input value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>

      {currentUser ? (
        <DocumentsPage userId={currentUser} />
      ) : (
        <p>Informe um usuário para gerenciar seus documentos.</p>
      )}
    </main>
  );
}
