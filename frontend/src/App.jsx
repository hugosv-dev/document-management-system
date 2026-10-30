import { useState } from 'react';
import StatusMessage from './components/StatusMessage.jsx';
import { USER_ID_PATTERN } from './config.js';
import DocumentsPage from './pages/DocumentsPage.jsx';

const DEFAULT_USER_ID = 'usuario-demo';

export default function App() {
  const [draftUserId, setDraftUserId] = useState(DEFAULT_USER_ID);
  const [currentUser, setCurrentUser] = useState(DEFAULT_USER_ID);
  const [userError, setUserError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const userId = draftUserId.trim();

    if (!USER_ID_PATTERN.test(userId)) {
      setUserError('Usuário inválido. Use até 64 caracteres entre letras, números, ".", "_" e "-".');
      return;
    }

    setUserError('');
    setCurrentUser(userId);
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '960px' }}>
      <h1>Document Management System</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Usuário:{' '}
          <input value={draftUserId} onChange={(event) => setDraftUserId(event.target.value)} />
        </label>{' '}
        <button type="submit">Entrar</button>
      </form>
      <StatusMessage type="error">{userError}</StatusMessage>
      <StatusMessage>
        Conectado como <strong>{currentUser}</strong>. Identificação simples para demonstração,
        sem autenticação.
      </StatusMessage>

      {/* key recria a página ao trocar de usuário, descartando estado do anterior. */}
      <DocumentsPage key={currentUser} userId={currentUser} />
    </main>
  );
}
