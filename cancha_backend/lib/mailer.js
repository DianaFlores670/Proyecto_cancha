const nodemailer = require('nodemailer');
const mailCfg = require('../config/mail');
const pool = require('../config/database');

let transporter = null;

if (mailCfg.ENABLED) {
  transporter = nodemailer.createTransport({
    host: mailCfg.HOST,
    port: mailCfg.PORT,
    secure: !!mailCfg.SECURE,
    auth: mailCfg.USER && mailCfg.PASS
      ? { user: mailCfg.USER, pass: mailCfg.PASS }
      : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 200,
    rateDelta: 1000,
    rateLimit: 5,
    tls: {
      rejectUnauthorized: false
    }
  });
}

function sendMail({ to, subject, html, text, bcc }) {
  if (!mailCfg.ENABLED) {
    console.log('[MAIL DISABLED]', { to, subject });
    return;
  }
  if (!transporter) {
    console.log('[MAIL ERROR] transporter null');
    return;
  }

  setImmediate(() => {
    transporter.sendMail(
      {
        from: mailCfg.FROM,
        to,
        bcc,
        subject,
        html,
        text
      },
      (err) => {
        if (err) console.error('[MAIL ERROR]', err);
      }
    );
  });
}

async function getCorreosAdmins() {
  const q = `
    select lower(trim(u.correo)) as correo
    from administrador a
    join usuario u on u.id_persona = a.id_administrador
    where u.correo is not null and u.correo <> ''
  `;
  const { rows } = await pool.query(q);
  return [...new Set(rows.map(r => r.correo).filter(Boolean))];
}

function notifyAdminNuevaSolicitud({ id_solicitud, usuario, correo, espacio_nombre }) {
  const destinos = [];
  if (mailCfg.ADMIN_TO) destinos.push(mailCfg.ADMIN_TO);
  sendMail({
    to: destinos,
    subject: 'Nueva solicitud para Admin de Espacio Deportivo',
    html: `
      <h3>Nueva solicitud para administrar un espacio</h3>
      <p><b>ID Solicitud:</b> ${id_solicitud}</p>
      <p><b>Solicitante:</b> ${usuario} (${correo})</p>
      <p><b>Espacio:</b> ${espacio_nombre}</p>
    `
  });
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

async function notifyAdminNuevaSolicitudRol({ id_solicitud, rol, id_usuario }) {
  const destinos = [];
  if (mailCfg.ADMIN_TO) destinos.push(mailCfg.ADMIN_TO);

  const adminsDb = await getCorreosAdmins();
  adminsDb.forEach(c => destinos.push(c));

  const to = [...new Set(destinos.filter(Boolean))];

  if (!to.length) {
    console.log('[MAIL] sin destino para notifyAdminNuevaSolicitudRol');
    return;
  }

  const u = await pool.query(
    'select usuario, correo from usuario where id_persona=$1',
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

  sendMail({ to, subject, html });
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
