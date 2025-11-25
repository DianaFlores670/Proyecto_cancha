const nodemailer = require('nodemailer');
const mailCfg = require('../config/mail');
const pool = require('../config/database');

let transporter = null;

// Crear transporter con POOL SMTP (MUY RÁPIDO)
if (mailCfg.ENABLED) {
  transporter = nodemailer.createTransport({
    host: mailCfg.HOST,
    port: mailCfg.PORT,
    secure: !!mailCfg.SECURE,

    auth: mailCfg.USER && mailCfg.PASS
      ? { user: mailCfg.USER, pass: mailCfg.PASS }
      : undefined,

    pool: true,               // Reusar conexiones SMTP
    maxConnections: 5,        // Mantener abiertas 5 conexiones activas
    maxMessages: 200,         // Reusar cada conexión para 200 correos
    rateDelta: 1000,          // Ventana de tiempo 1s
    rateLimit: 5,             // Máximo 5 correos por segundo
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Enviar correo sin esperar la promesa (background)
function sendMail({ to, subject, html, text, bcc }) {
  if (!mailCfg.ENABLED) {
    console.log('[MAIL DISABLED]', { to, subject });
    return;
  }
  if (!transporter) {
    console.log('[MAIL ERROR] Transporter null');
    return;
  }

  setImmediate(() => {
    transporter.sendMail({
      from: mailCfg.FROM,
      to,
      bcc,
      subject,
      html,
      text
    }, (err, info) => {
      if (err) console.error('[MAIL ERROR]', err);
    });
  });
}

// =========================
// ADMIN ESP DEP
// =========================
function notifyAdminNuevaSolicitud({ id_solicitud, usuario, correo, espacio_nombre }) {
  if (!mailCfg.ADMIN_TO) return;

  const subject = 'Nueva solicitud para Admin de Espacio Deportivo';

  const html = `
    <h3>Nueva solicitud para administrar un espacio</h3>
    <p><b>ID Solicitud:</b> ${id_solicitud}</p>
    <p><b>Solicitante:</b> ${usuario} (${correo})</p>
    <p><b>Espacio:</b> ${espacio_nombre}</p>
  `;

  sendMail({ to: mailCfg.ADMIN_TO, subject, html });
}

function notifyUsuarioResultado({ to, aprobado, usuario, espacio_nombre, comentario }) {
  const subject = aprobado
    ? 'Tu solicitud fue aprobada'
    : 'Tu solicitud fue rechazada';

  const html = aprobado
    ? `<p>${usuario}, tu solicitud para <b>${espacio_nombre}</b> fue aprobada.</p>`
    : `<p>${usuario}, tu solicitud para <b>${espacio_nombre}</b> fue rechazada.</p><p>${comentario || ''}</p>`;

  sendMail({ to, subject, html });
}

// =========================
// ROLES (control / encargado)
// =========================
async function notifyAdminNuevaSolicitudRol({ id_solicitud, rol, id_usuario }) {
  if (!mailCfg.ADMIN_TO) return;

  const u = await pool.query(
    `SELECT usuario, correo FROM usuario WHERE id_persona=$1`,
    [id_usuario]
  );

  const usuario = u.rows[0]?.usuario || 'Usuario desconocido';
  const correo = u.rows[0]?.correo || 'Sin correo';

  const subject = 'Nueva solicitud de rol';

  const html = `
    <h3>Nueva solicitud de rol</h3>
    <p><b>ID Solicitud:</b> ${id_solicitud}</p>
    <p><b>Solicitante:</b> ${usuario} (${correo})</p>
    <p><b>Rol solicitado:</b> ${rol}</p>
  `;

  sendMail({ to: mailCfg.ADMIN_TO, subject, html });
}

function notifyUsuarioResultadoRol({ to, aprobado, rol, comentario }) {
  const subject = aprobado
    ? `Tu solicitud para ${rol} fue aprobada`
    : `Tu solicitud para ${rol} fue rechazada`;

  const html = aprobado
    ? `<p>Tu solicitud para el rol <b>${rol}</b> fue aprobada.</p>`
    : `<p>Tu solicitud para el rol <b>${rol}</b> fue rechazada.</p><p>${comentario || ''}</p>`;

  sendMail({ to, subject, html });
}

module.exports = {
  sendMail,
  notifyAdminNuevaSolicitud,
  notifyUsuarioResultado,
  notifyAdminNuevaSolicitudRol,
  notifyUsuarioResultadoRol
};
