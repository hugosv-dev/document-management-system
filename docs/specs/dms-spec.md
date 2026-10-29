# Especificação - Document Management System

> Especificação gerada a partir de [spec-template.md](./spec-template.md) no
> Passo 1 (Plan Mode), seguindo o desenvolvimento guiado por especificação
> (Spec Driven Development). Este documento orienta a implementação dos
> Passos 2 (backend) e 3 (frontend).

## 1. Objetivo

Entregar uma aplicação web (API Express + interface React) que permita a cada
usuário enviar, listar e baixar seus documentos, com os arquivos gravados
exclusivamente no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de documentos
- Listagem de documentos
- Download de documentos
- Gestão simples por usuário (cada usuário vê e baixa apenas os próprios documentos)

### Fora do escopo

- Armazenamento externo ou em nuvem
- Versionamento de documentos
- Autenticação e autorização reais (login, senha, tokens)
- Banco de dados (metadados persistentes)
- Exclusão, renomeação ou edição de documentos
- Busca, filtros e paginação
- Pré-visualização de arquivos no navegador

## 3. Requisitos funcionais

| ID    | Requisito                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um documento                                                                |
| RF-02 | O usuário pode listar os documentos que ele enviou                                                |
| RF-03 | O usuário pode baixar um documento pelo identificador, recebendo-o com o nome original            |
| RF-04 | O usuário é identificado pelo cabeçalho HTTP `X-User-Id` em todas as operações de documentos     |
| RF-05 | O sistema rejeita uploads sem arquivo ou com tamanho acima do limite configurado                 |
| RF-06 | O sistema responde "não encontrado" para documento inexistente ou pertencente a outro usuário    |

### Critérios de aceite

- **RF-01**: dado um usuário identificado e um arquivo válido, `POST /upload`
  retorna `201` com os metadados e o arquivo passa a existir em `backend/storage`.
- **RF-02**: `GET /documents` retorna somente os documentos cujo `owner` é o
  usuário do cabeçalho, ordenados do mais recente para o mais antigo. Sem
  documentos, retorna lista vazia.
- **RF-03**: `GET /documents/:id/download` retorna o conteúdo binário idêntico
  ao enviado, com `Content-Disposition: attachment` e o `originalName`.
- **RF-04**: requisições sem `X-User-Id` (ou com valor vazio) retornam `400`.
- **RF-05**: upload sem o campo `file` retorna `400`; acima do limite retorna `413`.
- **RF-06**: `id` inexistente, de outro usuário ou com arquivo ausente no disco
  retorna `404` (não revela a existência de documentos de terceiros).

## 4. Requisitos não funcionais

| ID     | Requisito                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------- |
| RNF-01 | Arquivos gravados no filesystem local via `multer` com `diskStorage`                          |
| RNF-02 | Metadados mantidos em memória nesta fase                                                       |
| RNF-03 | Configuração via variáveis de ambiente (12-Factor)                                             |
| RNF-04 | Nome físico do arquivo gerado pelo sistema (UUID), nunca derivado do nome enviado pelo usuário |
| RNF-05 | Erros retornados em JSON no formato `{ "error": "mensagem" }`, com mensagens em português     |
| RNF-06 | Backend testado com o runner nativo do Node (`node:test`), executado por `npm test`            |
| RNF-07 | Nenhuma dependência nova além das presentes nos `package.json` (express, multer, react, vite) |

### Variáveis de ambiente

| Variável           | Padrão                     | Descrição                                     |
| ------------------ | -------------------------- | --------------------------------------------- |
| `PORT`             | `3000`                     | Porta HTTP do backend                         |
| `STORAGE_DIR`      | `backend/storage`          | Diretório local onde os arquivos são gravados |
| `MAX_FILE_SIZE_MB` | `10`                       | Tamanho máximo do upload, em megabytes        |

O diretório de armazenamento é criado na inicialização caso não exista. O
conteúdo de `backend/storage` já é ignorado pelo Git (`.gitignore`).

## 5. Modelo de dados (metadados do documento)

| Campo        | Tipo   | Exposto na API | Descrição                                                |
| ------------ | ------ | -------------- | -------------------------------------------------------- |
| id           | string | sim            | Identificador único do documento (`crypto.randomUUID()`) |
| originalName | string | sim            | Nome original do arquivo enviado                         |
| mimeType     | string | sim            | Tipo MIME informado no upload                            |
| size         | number | sim            | Tamanho em bytes                                         |
| uploadedAt   | string | sim            | Data/hora do upload (ISO 8601)                           |
| owner        | string | sim            | Identificador do usuário dono (valor de `X-User-Id`)     |
| storedName   | string | não            | Nome físico do arquivo em `STORAGE_DIR` (uso interno)    |

Exemplo de representação pública:

```json
{
  "id": "3f1c2a9e-8b7d-4c1e-9a55-2f6d0c4b7e10",
  "originalName": "relatorio.pdf",
  "mimeType": "application/pdf",
  "size": 48213,
  "uploadedAt": "2026-10-29T16:51:53.106Z",
  "owner": "hugo"
}
```

## 6. Contratos de API

Convenções gerais:

- O backend expõe as rotas **sem** prefixo. O frontend chama `/api/...` e o
  proxy do Vite remove o prefixo antes de encaminhar para `http://localhost:3000`.
- Todas as rotas de documentos exigem o cabeçalho `X-User-Id`.
- Respostas de erro: `{ "error": "mensagem em português" }`.

### POST /upload

- Cabeçalhos: `X-User-Id: <usuario>`
- Entrada: `multipart/form-data` com o campo `file` (um único arquivo)
- Saída `201 Created`: metadados públicos do documento criado

| Status | Situação                                      | Exemplo de mensagem                        |
| ------ | --------------------------------------------- | ------------------------------------------ |
| 400    | `X-User-Id` ausente ou vazio                  | `Usuário não informado.`                   |
| 400    | Campo `file` ausente                          | `Nenhum arquivo enviado.`                  |
| 413    | Arquivo maior que `MAX_FILE_SIZE_MB`          | `Arquivo excede o tamanho máximo de 10 MB.` |
| 500    | Falha inesperada ao gravar o arquivo          | `Erro interno ao processar o documento.`   |

### GET /documents

- Cabeçalhos: `X-User-Id: <usuario>`
- Saída `200 OK`: array com os metadados públicos dos documentos do usuário,
  do mais recente para o mais antigo (`[]` quando não houver documentos)

| Status | Situação                     | Exemplo de mensagem      |
| ------ | ---------------------------- | ------------------------ |
| 400    | `X-User-Id` ausente ou vazio | `Usuário não informado.` |

### GET /documents/:id/download

- Cabeçalhos: `X-User-Id: <usuario>`
- Saída `200 OK`: conteúdo binário do arquivo, com
  `Content-Type` igual ao `mimeType` e
  `Content-Disposition: attachment; filename="<originalName>"`

| Status | Situação                                                  | Exemplo de mensagem          |
| ------ | --------------------------------------------------------- | ---------------------------- |
| 400    | `X-User-Id` ausente ou vazio                              | `Usuário não informado.`     |
| 404    | Documento inexistente, de outro usuário ou ausente no disco | `Documento não encontrado.` |

### GET /health (já existente)

- Saída `200 OK`: `{ "status": "ok" }`

## 7. Decisões arquiteturais

### Backend - Clean Architecture simples

Fluxo de dependência: `routes -> controllers -> services -> repositories`.
Camadas internas não conhecem camadas externas (o service não conhece Express
nem multer).

| Camada         | Arquivo previsto                                   | Responsabilidade                                                                 |
| -------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| config         | `backend/src/config.js`                            | Ler variáveis de ambiente e aplicar padrões                                      |
| routes         | `backend/src/routes/documentRoutes.js`             | Declarar endpoints, aplicar o middleware do multer e delegar ao controller       |
| middleware     | `backend/src/routes/uploadMiddleware.js`           | Configurar `multer.diskStorage` (destino `STORAGE_DIR`, nome UUID, limite)       |
| controllers    | `backend/src/controllers/documentController.js`    | Ler `X-User-Id`, validar entrada, mapear resultados e erros para HTTP            |
| services       | `backend/src/services/documentService.js`          | Regras de negócio: registrar, listar por dono, localizar para download           |
| repositories   | `backend/src/repositories/documentMetadataRepository.js` | Metadados em memória (`Map` por `id`)                                     |
| repositories   | `backend/src/repositories/fileStorageRepository.js`      | Acesso ao filesystem local (caminho absoluto, verificação de existência) |
| composição     | `backend/src/app.js`                               | Montar dependências (factories) e registrar o roteador                           |

Decisões:

- **Injeção por factories**: cada camada é criada por uma função que recebe
  suas dependências (`createDocumentService({ metadataRepository, fileStorage })`),
  facilitando testes sem mocks globais.
- **Multer na camada de rotas**: o upload físico é um detalhe de infraestrutura
  HTTP; o service recebe apenas os dados já gravados (`storedName`,
  `originalName`, `mimeType`, `size`, `owner`).
- **Erros de domínio**: o service sinaliza "não encontrado" com um erro
  identificável (ex.: `NotFoundError`); o controller o traduz para `404`.
  Erros do multer (`LIMIT_FILE_SIZE`) são traduzidos para `413`.
- **`app.js` exportável**: mantém `module.exports = app` para uso nos testes.

### Frontend - componentes React

| Tipo       | Arquivo previsto                               | Responsabilidade                                                  |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| service    | `frontend/src/services/documentApi.js`         | `uploadDocument`, `listDocuments`, `downloadDocument` via `fetch` |
| component  | `frontend/src/components/UploadComponent.jsx`  | Seleção e envio de arquivo, feedback de sucesso/erro              |
| component  | `frontend/src/components/DocumentList.jsx`     | Tabela de documentos (nome, tamanho, data) com ação de download   |
| component  | `frontend/src/components/DownloadButton.jsx`   | Baixar um documento pelo `id`                                     |
| page       | `frontend/src/pages/DocumentsPage.jsx`         | Compor upload + lista e recarregar a lista após upload            |
| raiz       | `frontend/src/App.jsx`                         | Campo de usuário atual e renderização da página                   |

Decisões:

- Componentes funcionais com hooks (`useState`, `useEffect`).
- Todas as chamadas usam o prefixo `/api` e enviam `X-User-Id`.
- **Download via `fetch` + `Blob`**: um link `<a href>` simples não envia
  cabeçalhos customizados; o `DownloadButton` obtém o blob e dispara o
  download com `URL.createObjectURL`, usando o nome de `Content-Disposition`.

### Riscos e limitações conhecidas

- Metadados em memória são perdidos ao reiniciar o backend; os arquivos em
  `backend/storage` permanecem órfãos (aceito nesta fase; persistência fica
  para uma evolução futura).
- `X-User-Id` não é autenticação: qualquer cliente pode se passar por outro
  usuário. Adequado apenas ao escopo do workshop.
- Não há validação de tipo de arquivo; o limite de tamanho é a única proteção
  contra uploads abusivos.

## 8. Plano de execução

Etapas na ordem de implementação. Cada etapa deve manter `npm test` passando.

1. **Configuração** - criar `backend/src/config.js` lendo `PORT`,
   `STORAGE_DIR` e `MAX_FILE_SIZE_MB` com padrões; garantir a criação do
   diretório de armazenamento.
   *Aceite*: valores padrão aplicados quando as variáveis não existem.
2. **Repositórios** - implementar `documentMetadataRepository` (`save`,
   `findById`, `findByOwner`) e `fileStorageRepository` (`resolvePath`,
   `exists`).
   *Aceite*: testes unitários com `node:test` para salvar, buscar e filtrar por dono.
3. **Service** - implementar `documentService` (`registerDocument`,
   `listDocuments`, `getDocumentForDownload`) gerando `id` e `uploadedAt` e
   ocultando `storedName` na representação pública.
   *Aceite*: testes cobrindo listagem por dono e `NotFoundError` para
   documento inexistente, de outro usuário ou ausente no disco.
4. **Middleware de upload e controller** - configurar `multer.diskStorage`
   (destino `STORAGE_DIR`, nome UUID + extensão, `limits.fileSize`) e o
   `documentController` com validação de `X-User-Id` e mapeamento de erros
   (400, 404, 413, 500).
   *Aceite*: respostas de erro no formato `{ "error": "..." }`.
5. **Rotas e composição** - criar `documentRoutes` com `POST /upload`,
   `GET /documents` e `GET /documents/:id/download`; montar as dependências e
   registrar o roteador em `backend/src/app.js`, preservando `/health`.
   *Aceite*: backend sobe com `npm run dev` e responde aos três endpoints.
6. **Testes de integração do backend** - testar o fluxo HTTP completo
   (upload -> listagem -> download) e os casos de erro usando `app` em porta
   efêmera e um `STORAGE_DIR` temporário.
   *Aceite*: `cd backend && npm test` passa.
7. **Cliente de API do frontend** - criar `frontend/src/services/documentApi.js`
   com `fetch`, prefixo `/api`, cabeçalho `X-User-Id` e tratamento de erros.
   *Aceite*: funções retornam dados ou lançam erro com a mensagem do backend.
8. **Componentes** - criar `UploadComponent`, `DocumentList` e
   `DownloadButton`, reutilizando o cliente de API.
   *Aceite*: componentes sem duplicação de chamadas HTTP.
9. **Página e App** - criar `DocumentsPage` e atualizar `App.jsx` com o campo
   de usuário atual; recarregar a lista após upload bem-sucedido.
   *Aceite*: `cd frontend && npm run build` conclui sem erros.
10. **Validação ponta a ponta** - rodar backend e frontend, enviar um arquivo,
    vê-lo na lista e baixá-lo; trocar o usuário e confirmar que a lista muda.
    *Aceite*: arquivo baixado é idêntico ao enviado e documentos de outro
    usuário não aparecem nem podem ser baixados.
