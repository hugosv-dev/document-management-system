---
description: Inicia e valida as aplicações de backend e frontend do projeto.
name: subir-aplicacoes
agent: agent
---

# Subir as aplicações

Inicie o backend e o frontend deste projeto para desenvolvimento local.

Requisitos:

- Confira os scripts disponíveis em `backend/package.json` e `frontend/package.json` antes de iniciar os processos.
- Inicie o backend com `npm run dev` no diretório `backend` e o frontend com `npm run dev` no diretório `frontend`.
- Mantenha cada processo em um terminal separado e deixe ambos em execução ao concluir.
- Se as dependências de uma aplicação não estiverem instaladas, instale-as no diretório correspondente antes de iniciar. Não reinstale dependências já disponíveis.
- Aguarde a inicialização dos dois servidores e valide que o backend responde em `http://localhost:3000/health` e que o frontend está disponível em `http://localhost:5173`.
- O frontend usa o proxy `/api` do Vite para encaminhar chamadas ao backend. Não altere essa configuração nem o código da aplicação para contornar falhas de inicialização.
- Se uma porta estiver ocupada ou algum processo falhar, investigue a causa sem encerrar processos não relacionados. Informe claramente o problema e não declare a aplicação pronta sem validação.
- Ao final, informe o estado de cada aplicação, as URLs disponíveis e qualquer ação necessária para resolver erros.