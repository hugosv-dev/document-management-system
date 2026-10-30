const { loadConfig } = require('./config');

function start() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(`Configuração inválida: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  // Carregado só depois da validação, para exibir a mensagem acima em vez de um stack trace.
  const app = require('./app');
  // No Express 5 o callback também é chamado em falhas (ex.: porta em uso).
  app.listen(config.port, (error) => {
    if (error) {
      console.error(`Não foi possível iniciar na porta ${config.port}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

start();
