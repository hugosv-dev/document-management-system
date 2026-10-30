const API_PREFIX = '/api';

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    if (body?.error) {
      return body.error;
    }
  } catch {
    // Corpo sem JSON: usa a mensagem genérica abaixo.
  }
  return `Falha na requisição (HTTP ${response.status}).`;
}

async function request(path, { userId, headers, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers: { ...headers, 'X-User-Id': userId },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', { userId, method: 'POST', body: formData });
  return response.json();
}

export async function listDocuments(userId) {
  const response = await request('/documents', { userId });
  return response.json();
}

export async function downloadDocument(userId, id) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, { userId });
  return response.blob();
}
