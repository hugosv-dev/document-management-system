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
| RNF-06 | Backend testado com o runner nativo do Node (`node:test`), executado por `npm test`; a pipeline `.github/workflows/ci.yml` roda install e testes do backend e install e build do frontend em todo push e pull request (Node 24) |
| RNF-07 | Nenhuma dependência nova além das presentes nos `package.json` (express, multer, react, vite) |
| RNF-08 | Upload limitado a um único arquivo, sem campos extras (`fields: 0`, `parts: 1`); corpos muito acima do limite são recusados pelo `Content-Length` antes da leitura |
| RNF-09 | Downloads servidos como `application/octet-stream`; todas as respostas com `X-Content-Type-Options: nosniff` e sem `X-Powered-By` |
| RNF-10 | Configuração inválida impede a inicialização com mensagem clara (fail fast)                   |

### Variáveis de ambiente

| Variável           | Padrão                     | Descrição                                     |
| ------------------ | -------------------------- | --------------------------------------------- |
| `PORT`             | `3000`                     | Porta HTTP do backend (inteiro entre 1 e 65535) |
| `STORAGE_DIR`      | `backend/storage`          | Diretório local onde os arquivos são gravados; caminhos relativos partem de `backend/` |
| `MAX_FILE_SIZE_MB` | `10`                       | Tamanho máximo do upload, em megabytes (maior que zero) |
| `VITE_MAX_FILE_SIZE_MB` | `10`                  | Frontend: limite usado para recusar arquivos antes do envio; deve acompanhar `MAX_FILE_SIZE_MB` |

O diretório de armazenamento é criado na inicialização caso não exista. O
conteúdo de `backend/storage` já é ignorado pelo Git (`.gitignore`). Como os
metadados ficam em memória, os arquivos de execuções anteriores ficam órfãos
após reiniciar o backend; apague-os manualmente, preservando o `.gitkeep`.

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
- Todas as rotas de documentos exigem o cabeçalho `X-User-Id`, no formato
  `^[A-Za-z0-9._-]{1,64}$`. Fora do formato, a resposta é `400` com
  `Usuário inválido. ...`.
- Respostas de erro: `{ "error": "mensagem em português" }`, inclusive para
  rotas inexistentes (`404 Recurso não encontrado.`), URLs malformadas
  (`400 Requisição inválida.`) e falhas inesperadas
  (`500 Erro interno ao processar a requisição.`).

### POST /upload

- Cabeçalhos: `X-User-Id: <usuario>`
- Entrada: `multipart/form-data` com o campo `file` (um único arquivo)
- Saída `201 Created`: metadados públicos do documento criado

| Status | Situação                                      | Exemplo de mensagem                        |
| ------ | --------------------------------------------- | ------------------------------------------ |
| 400    | `X-User-Id` ausente ou vazio                  | `Usuário não informado.`                   |
| 400    | Campo `file` ausente                          | `Nenhum arquivo enviado.`                  |
| 400    | Arquivo em outro campo, mais de um arquivo ou campos extras | `Requisição de upload inválida. Envie um único arquivo no campo "file".` |
| 413    | Arquivo maior que `MAX_FILE_SIZE_MB`          | `Arquivo excede o tamanho máximo de 10 MB.` |
| 500    | Falha inesperada ao gravar o arquivo          | `Erro interno ao processar a requisição.`  |

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
  `Content-Type: application/octet-stream` (o `mimeType` informado no upload
  não é confiável para ser servido) e
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

| Camada       | Arquivo                                               | Responsabilidade                                                                                   |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| config       | `backend/src/config.js`                               | Ler e validar variáveis de ambiente (lança erro se inválidas)                                      |
| erros        | `backend/src/errors.js`                               | `AppError` (mensagem + status HTTP) e `NotFoundError` (404)                                        |
| middlewares  | `backend/src/middlewares/user.middleware.js`          | Validar `X-User-Id` (presença e formato)                                                           |
| middlewares  | `backend/src/middlewares/upload.middleware.js`        | Configurar `multer.diskStorage` e limites; converter erros do multer em `AppError` (400/413)       |
| middlewares  | `backend/src/middlewares/error.middleware.js`         | 404 de rotas inexistentes e tratador global de erros em JSON                                        |
| routes       | `backend/src/routes/documents.routes.js`              | Declarar endpoints e encadear middlewares e controller                                             |
| controllers  | `backend/src/controllers/documents.controller.js`     | Ler `req.file`/`req.params`, chamar o service e montar a resposta HTTP                             |
| services     | `backend/src/services/documents.service.js`           | Regras de negócio: registrar, listar por dono, localizar para download (`NotFoundError`)           |
| repositories | `backend/src/repositories/documents.repository.js`    | Metadados em memória (índices por `id` e por dono) e regras do armazenamento local (nome físico, caminho) |
| composição   | `backend/src/app.js`                                  | Montar dependências (`createApp`), cabeçalhos de segurança e tratadores de erro                    |
| entrada      | `backend/src/server.js`                               | Validar a configuração e iniciar o servidor (`npm start` / `npm run dev`)                          |

Os nomes seguem o padrão `<recurso>.<camada>.js` do prompt reutilizável
`/scaffold-camada` (`.github/prompts/scaffold-camada.prompt.md`).

Decisões:

- **Injeção por factories**: cada camada é criada por uma função que recebe
  suas dependências (`createDocumentsService({ repository })`), facilitando
  testes sem mocks globais.
- **Contratos assíncronos**: todos os métodos do repositório e do service são
  `async`, para que a persistência possa evoluir (arquivo, banco) sem mudar as
  camadas de cima.
- **Repositório dono do armazenamento**: gera o nome físico (UUID + extensão
  validada) e resolve caminhos com `path.basename`; o middleware de upload
  recebe `storageDir` e `createStoredName` do repositório via `app.js`.
- **Multer em middleware**: o upload físico é um detalhe de infraestrutura
  HTTP; o service recebe apenas os dados já gravados (`storedName`,
  `originalName`, `mimeType`, `size`, `owner`). O `X-User-Id` é validado antes
  do multer, para que nada seja gravado em requisições sem usuário; o multer
  remove arquivos parciais em caso de erro.
- **Erros com status**: `AppError` carrega o status HTTP; o tratador global em
  `app.js` responde `{ "error": "..." }` sem expor stack traces. Arquivo
  removido do disco entre a consulta e o envio (`ENOENT`) vira `404`.
- **`app.js` exportável**: `require('./app')` retorna o app Express (contrato do
  teste de fumaça do seed) e também expõe `createApp(config)` para os testes
  usarem um `STORAGE_DIR` temporário. O `listen` fica em `server.js`.

### Frontend - componentes React

| Tipo       | Arquivo previsto                               | Responsabilidade                                                  |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| service    | `frontend/src/services/documentApi.js`         | `uploadDocument`, `listDocuments`, `downloadDocument` via `fetch` |
| component  | `frontend/src/components/UploadComponent.jsx`  | Seleção e envio de arquivo, feedback de sucesso/erro              |
| component  | `frontend/src/components/DocumentList.jsx`     | Tabela de documentos (nome, tamanho, data) com ação de download   |
| component  | `frontend/src/components/DownloadButton.jsx`   | Baixar um documento pelo `id`                                     |
| component  | `frontend/src/components/StatusMessage.jsx`    | Mensagem reutilizável de carregamento, sucesso ou erro            |
| page       | `frontend/src/pages/DocumentsPage.jsx`         | Compor upload + lista e recarregar a lista após upload            |
| config     | `frontend/src/config.js`                       | Limite de tamanho (`VITE_MAX_FILE_SIZE_MB`) e formato do usuário  |
| raiz       | `frontend/src/App.jsx`                         | Formulário de usuário (botão "Entrar") e renderização da página   |

Decisões:

- Componentes funcionais com hooks (`useState`, `useEffect`).
- Todas as chamadas usam o prefixo `/api` e enviam `X-User-Id`, centralizadas
  em uma única função `request` do cliente de API.
- **Download via `fetch` + `Blob`**: um link `<a href>` simples não envia
  cabeçalhos customizados; o `DownloadButton` obtém o blob e dispara o
  download com `URL.createObjectURL`, usando o `originalName` já presente na
  listagem como nome do arquivo. A URL temporária é liberada após 1 segundo.
- **Troca de usuário explícita**: o usuário só muda ao clicar em "Entrar" e
  após validar o formato; `DocumentsPage` recebe `key={usuário}` e é recriada,
  descartando arquivo selecionado e mensagens do usuário anterior.
- **Validação antecipada**: arquivos acima de `VITE_MAX_FILE_SIZE_MB` são
  recusados antes do envio; o backend continua sendo a validação definitiva.

### Riscos e limitações conhecidas

- Metadados em memória são perdidos ao reiniciar o backend; os arquivos em
  `backend/storage` permanecem órfãos (aceito nesta fase; persistência fica
  para uma evolução futura).
- `X-User-Id` não é autenticação: qualquer cliente pode se passar por outro
  usuário. Adequado apenas ao escopo do workshop (a interface exibe esse
  aviso). A evolução recomendada é derivar o dono de uma sessão autenticada no
  servidor, o que também permitiria downloads por link direto.
- Não há validação de tipo de arquivo nem cotas por usuário; o limite de
  tamanho por arquivo é a única proteção contra uploads abusivos, e o disco
  pode crescer sem limite.

## 8. Plano de execução

Etapas na ordem de implementação. Cada etapa deve manter `npm test` passando.

1. **Configuração** - criar `backend/src/config.js` lendo `PORT`,
   `STORAGE_DIR` e `MAX_FILE_SIZE_MB` com padrões; garantir a criação do
   diretório de armazenamento.
   *Aceite*: valores padrão aplicados quando as variáveis não existem.
2. **Repositório** - implementar `documents.repository.js` (`save`,
   `findById`, `findByOwner`, `resolveFilePath`, `fileExists`).
   *Aceite*: metadados filtrados por dono e caminho sempre dentro de `STORAGE_DIR`.
3. **Service** - implementar `documents.service.js` (`registerDocument`,
   `listDocuments`, `getDocumentForDownload`) gerando `id` e `uploadedAt` e
   ocultando `storedName` na representação pública.
   *Aceite*: testes cobrindo listagem por dono e `NotFoundError` para
   documento inexistente, de outro usuário ou ausente no disco.
4. **Controller** - implementar `documents.controller.js` com validação de
   `X-User-Id`, handlers de upload/listagem/download e tratador de erros
   (400, 404, 413, 500).
   *Aceite*: respostas de erro no formato `{ "error": "..." }`.
5. **Rotas e composição** - criar `documents.routes.js` com `multer.diskStorage`
   (destino `STORAGE_DIR`, nome UUID + extensão, `limits.fileSize`) e as rotas
   `POST /upload`, `GET /documents` e `GET /documents/:id/download`; montar as
   dependências e registrar o roteador em `backend/src/app.js`, preservando `/health`.
   *Aceite*: backend sobe com `npm run dev` e responde aos três endpoints.
6. **Testes do backend** - em `backend/test/`, testar configuração, service e o
   fluxo HTTP completo (upload -> listagem -> download) com os casos de erro,
   usando `createApp` em porta efêmera e um `STORAGE_DIR` temporário.
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
