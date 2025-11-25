// config/mail.js  (puedes versionarlo si usas credenciales de prueba)
module.exports = {
  ENABLED: true,
  HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  PORT: Number(process.env.SMTP_PORT || 587),
  SECURE: (process.env.SMTP_SECURE || 'false') === 'true',
  USER: process.env.SMTP_USER || 'michelona1682xd@gmail.com',
  PASS: process.env.SMTP_PASS || 'wrjpkorlmonopyuk',
  FROM: process.env.MAIL_FROM || 'michelona1682xd@gmail.com',
  ADMIN_TO: process.env.ADMIN_NOTIFICATION_EMAIL || 'michelona1682xd@gmail.com'
};

