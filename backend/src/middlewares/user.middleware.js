const USER_HEADER = 'X-User-Id';
const USER_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

function requireUser(req, res, next) {
  const userId = (req.get(USER_HEADER) || '').trim();

  if (!userId) {
    return res.status(400).json({ error: 'Usuário não informado.' });
  }

  if (!USER_ID_PATTERN.test(userId)) {
    return res.status(400).json({
      error: 'Usuário inválido. Use até 64 caracteres entre letras, números, ".", "_" e "-".',
    });
  }

  res.locals.userId = userId;
  return next();
}

module.exports = { requireUser, USER_ID_PATTERN };
