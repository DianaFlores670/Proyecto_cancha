/**
 * Rutas para gestionar solicitudes de Admin de Espacio Deportivo
 * Estilo: modelos + controladores en el mismo archivo, con helper "respuesta"
 */
const express = require('express');
const pool = require('../../config/database');
const { verifyToken, checkRole } = require('../../middleware/auth');

const router = express.Router();

// -----------------------------
// Helper de respuesta estándar
// -----------------------------
const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });

// -----------------------------
// Mail (opcional, no rompe si no existe)
// -----------------------------
let sendMail = async () => {};
let notifyAdminNuevaSolicitud = async () => {};
let notifyUsuarioResultado = async () => {};

try {
  const nodemailer = require('nodemailer');
  const mailCfg = require('../../config/mail'); // {ENABLED,HOST,PORT,SECURE,USER,PASS,FROM,ADMIN_TO}

  if (mailCfg?.ENABLED) {
    const transporter = nodemailer.createTransport({
      host: mailCfg.HOST,
      port: Number(mailCfg.PORT),
      secure: !!mailCfg.SECURE,
      auth: { user: mailCfg.USER, pass: mailCfg.PASS },
    });

    // Soporte to/cc/bcc/replyTo
    sendMail = async ({ to, cc, bcc, subject, html, text, replyTo }) => {
      await transporter.sendMail({
        from: mailCfg.FROM,
        to,
        cc,
        bcc,
        subject,
        html,
        text,
        replyTo
      });
    };

    // Notifica a TODOS los admins (usamos BCC para privacidad)
    notifyAdminNuevaSolicitud = async ({ toList = [], id_solicitud, usuario, correo, espacio_nombre }) => {
      if (!toList.length) return;
      const subject = 'Nueva solicitud: Admin de Espacio Deportivo';
      const html = `
        <h3>Nueva solicitud para administrar un espacio</h3>
        <ul>
          <li><b>ID Solicitud:</b> ${id_solicitud}</li>
          <li><b>Solicitante:</b> ${usuario || '-'} (${correo || '-'})</li>
          <li><b>Espacio:</b> ${espacio_nombre || '-'}</li>
        </ul>
        <p>Ingrese al panel de administración para aprobar o rechazar.</p>
      `;

      // Enviamos TO al primero y BCC al resto (no exponemos correos).
      const to = toList[0];
      const bcc = toList.slice(1);

      await sendMail({
        to,
        bcc,
        subject,
        html,
        // Para que el admin pueda responderle directo al solicitante:
        replyTo: correo || undefined
      });
    };

    notifyUsuarioResultado = async ({ to, aprobado, usuario, espacio_nombre, comentario }) => {
      if (!to) return;
      const subject = aprobado ? 'Tu solicitud fue APROBADA' : 'Tu solicitud fue RECHAZADA';
      const html = aprobado
        ? `<p>¡Hola ${usuario || ''}!</p>
           <p>Tu solicitud para administrar <b>${espacio_nombre || 'el espacio'}</b> fue <b>APROBADA</b>.</p>
           <p>Ya puedes iniciar sesión con el rol <b>admin_esp_dep</b>.</p>`
        : `<p>Hola ${usuario || ''},</p>
           <p>Tu solicitud para administrar <b>${espacio_nombre || 'el espacio'}</b> fue <b>RECHAZADA</b>.</p>
           ${comentario ? `<p>Motivo: ${comentario}</p>` : ''}`;
      await sendMail({ to, subject, html });
    };
  } else {
    console.log('[MAIL] Deshabilitado por config.ENABLED=false');
  }
} catch (e) {
  console.log('[MAIL] No configurado (sin nodemailer o sin config/mail.js). Continuando sin correo.');
}


// ============================
// MODELOS (acceso a la BD)
// ============================

/** Correos de todos los ADMINISTRADORES (únicos y válidos) */
const getCorreosAdmins = async () => {
  const q = `
    SELECT LOWER(TRIM(u.correo)) AS correo
    FROM administrador a
    JOIN usuario u ON u.id_persona = a.id_administrador
    WHERE u.correo IS NOT NULL AND u.correo <> ''
  `;
  const { rows } = await pool.query(q);
  // Unicos, filtrando falsy
  const set = new Set(rows.map(r => r.correo).filter(Boolean));
  return Array.from(set);
};


/** Espacios libres (sin admin asignado) */
const getEspaciosLibres = async (limite = 50, offset = 0) => {
  const q = `
    SELECT id_espacio, nombre, direccion
    FROM espacio_deportivo
    WHERE id_admin_esp_dep IS NULL
    ORDER BY nombre ASC
    LIMIT $1 OFFSET $2;`;
  const { rows } = await pool.query(q, [limite, offset]);
  return rows;
};

/** Crear solicitud (valida que el espacio esté libre) */
const crearSolicitud = async ({ id_usuario, id_espacio, motivo = null }) => {
  const chk = await pool.query(
    `SELECT id_admin_esp_dep, nombre FROM espacio_deportivo WHERE id_espacio = $1`,
    [id_espacio]
  );
  if (chk.rowCount === 0) throw new Error('Espacio deportivo no encontrado');
  if (chk.rows[0].id_admin_esp_dep) throw new Error('El espacio ya tiene un administrador asignado');

  const ins = `
    INSERT INTO solicitud_admin_esp_dep (id_usuario, id_espacio, motivo)
    VALUES ($1, $2, $3)
    RETURNING *;`;
  const { rows } = await pool.query(ins, [id_usuario, id_espacio, motivo]);
  return { solicitud: rows[0], espacio_nombre: chk.rows[0].nombre };
};

/** Listar solicitudes por estado (ADMIN) */
const listarSolicitudesPorEstado = async ({ estado = 'pendiente', limite = 50, offset = 0 }) => {
  const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE s.estado = $1
    ORDER BY s.fecha_solicitud ASC
    LIMIT $2 OFFSET $3;`;
  const { rows } = await pool.query(q, [estado, limite, offset]);
  return rows;
};

/** Listar solicitudes del usuario autenticado */
const listarSolicitudesDeUsuario = async ({ id_usuario, estado, limite = 50, offset = 0 }) => {
  const params = [id_usuario];
  let where = `s.id_usuario = $1`;
  if (estado) {
    params.push(estado);
    where += ` AND s.estado = $${params.length}`;
  }
  params.push(limite, offset);

  const q = `
    SELECT s.*, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE ${where}
    ORDER BY s.fecha_solicitud DESC
    LIMIT $${params.length - 1} OFFSET $${params.length};`;
  const { rows } = await pool.query(q, params);
  return rows;
};

/** Aprobar solicitud (transacción + bloqueo) */
const aprobarSolicitud = async ({ id_solicitud, adminId }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const solRes = await client.query(
      `SELECT * FROM solicitud_admin_esp_dep WHERE id_solicitud = $1 FOR UPDATE`,
      [id_solicitud]
    );
    if (solRes.rowCount === 0) throw new Error('Solicitud no encontrada');
    const sol = solRes.rows[0];
    if (sol.estado !== 'pendiente') throw new Error('La solicitud ya fue procesada');

    const espRes = await client.query(
      `SELECT id_admin_esp_dep, nombre FROM espacio_deportivo WHERE id_espacio = $1 FOR UPDATE`,
      [sol.id_espacio]
    );
    if (espRes.rowCount === 0) throw new Error('Espacio no encontrado');
    if (espRes.rows[0].id_admin_esp_dep) throw new Error('El espacio ya tiene administrador');

    // crear rol admin_esp_dep si no existe
    const existeRol = await client.query(
      `SELECT 1 FROM admin_esp_dep WHERE id_admin_esp_dep = $1`,
      [sol.id_usuario]
    );
    if (existeRol.rowCount === 0) {
      await client.query(
        `INSERT INTO admin_esp_dep (id_admin_esp_dep, fecha_ingreso, direccion, estado)
         VALUES ($1, now(), NULL, true)`,
        [sol.id_usuario]
      );
    }

    // asignar admin al espacio
    await client.query(
      `UPDATE espacio_deportivo SET id_admin_esp_dep = $1 WHERE id_espacio = $2`,
      [sol.id_usuario, sol.id_espacio]
    );

    // actualizar solicitud
    await client.query(
      `UPDATE solicitud_admin_esp_dep
       SET estado = 'aprobada', decidido_por_admin = $1, fecha_decision = now()
       WHERE id_solicitud = $2`,
      [adminId, id_solicitud]
    );

    await client.query('COMMIT');

    // datos para correo
    const u = await pool.query('SELECT usuario, correo FROM usuario WHERE id_persona=$1', [sol.id_usuario]);
    const to = u.rows[0]?.correo || null;
    const usuarioNombre = u.rows[0]?.usuario || null;
    const espacioNombre = espRes.rows[0]?.nombre || null;

    return { to, usuarioNombre, espacioNombre };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

/** Rechazar solicitud */
const rechazarSolicitud = async ({ id_solicitud, adminId, comentario }) => {
  const upd = `
    UPDATE solicitud_admin_esp_dep
    SET estado = 'rechazada',
        decidido_por_admin = $1,
        comentario_decision = $2,
        fecha_decision = now()
    WHERE id_solicitud = $3 AND estado = 'pendiente'
    RETURNING *;`;
  const { rows } = await pool.query(upd, [adminId, comentario || null, id_solicitud]);
  if (rows.length === 0) throw new Error('Solicitud no encontrada o ya procesada');

  const sol = rows[0];
  const u = await pool.query('SELECT usuario, correo FROM usuario WHERE id_persona=$1', [sol.id_usuario]);
  const e = await pool.query('SELECT nombre FROM espacio_deportivo WHERE id_espacio=$1', [sol.id_espacio]);

  return {
    to: u.rows[0]?.correo || null,
    usuarioNombre: u.rows[0]?.usuario || null,
    espacioNombre: e.rows[0]?.nombre || null,
    comentario: sol.comentario_decision || null,
    solicitud: sol,
  };
};

/** Anular solicitud (por el propio usuario) */
const anularSolicitud = async ({ id_solicitud, id_usuario }) => {
  const upd = `
    UPDATE solicitud_admin_esp_dep
    SET estado = 'anulada', fecha_decision = now()
    WHERE id_solicitud = $1 AND id_usuario = $2 AND estado = 'pendiente'
    RETURNING *;`;
  const { rows } = await pool.query(upd, [id_solicitud, id_usuario]);
  if (rows.length === 0) throw new Error('Solicitud no encontrada, no te pertenece o ya fue procesada');
  return rows[0];
};
const estadosPermitidos = ['pendiente','aprobada','rechazada','anulada'];

const obtenerDatosSolicitudes = async (limite = 10, offset = 0) => {
  const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    ORDER BY s.fecha_solicitud DESC
    LIMIT $1 OFFSET $2
  `;
  const qt = `SELECT COUNT(*) FROM solicitud_admin_esp_dep`;
  const [r1, r2] = await Promise.all([pool.query(q, [limite, offset]), pool.query(qt)]);
  return { solicitudes: r1.rows, total: parseInt(r2.rows[0].count) };
};

const obtenerSolicitudesFiltradas = async (estado, limite = 10, offset = 0) => {
  if (!estadosPermitidos.includes(String(estado || '').toLowerCase())) {
    throw new Error('El parametro estado es invalido');
  }
  const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE s.estado = $1
    ORDER BY s.fecha_solicitud DESC
    LIMIT $2 OFFSET $3
  `;
  const qt = `SELECT COUNT(*) FROM solicitud_admin_esp_dep WHERE estado = $1`;
  const [r1, r2] = await Promise.all([pool.query(q, [estado, limite, offset]), pool.query(qt, [estado])]);
  return { solicitudes: r1.rows, total: parseInt(r2.rows[0].count) };
};

const buscarSolicitudes = async (texto, limite = 10, offset = 0) => {
  const sanitize = (s) => String(s || '').replace(/[%_\\]/g, '\\$&');
  const term = `%${sanitize(texto)}%`;
  const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE u.usuario ILIKE $1
       OR u.correo ILIKE $1
       OR e.nombre ILIKE $1
       OR s.estado ILIKE $1
       OR CAST(s.id_solicitud AS TEXT) ILIKE $1
    ORDER BY s.fecha_solicitud DESC
    LIMIT $2 OFFSET $3
  `;
  const qt = `
    SELECT COUNT(*)
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE u.usuario ILIKE $1
       OR u.correo ILIKE $1
       OR e.nombre ILIKE $1
       OR s.estado ILIKE $1
       OR CAST(s.id_solicitud AS TEXT) ILIKE $1
  `;
  const [r1, r2] = await Promise.all([pool.query(q, [term, limite, offset]), pool.query(qt, [term])]);
  return { solicitudes: r1.rows, total: parseInt(r2.rows[0].count) };
};

const obtenerSolicitudPorId = async (id_solicitud) => {
  const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE s.id_solicitud = $1
  `;
  const r = await pool.query(q, [id_solicitud]);
  return r.rows[0] || null;
};

// ============================
// CONTROLADORES (HTTP)
// ============================

/** GET /espacios-libres */
const getEspaciosLibresController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const espacios = await getEspaciosLibres(limite, offset);
    res.json(respuesta(true, 'Espacios deportivos disponibles', { espacios, paginacion: { limite, offset } }));
  } catch (e) {
    console.error('getEspaciosLibres:', e);
    res.status(500).json(respuesta(false, 'Error interno del servidor'));
  }
};

/** POST /  (crear solicitud) */
const crearSolicitudController = async (req, res) => {
  try {
    const { id_usuario, id_espacio, motivo } = req.body;
    if (!id_usuario || !id_espacio) {
      return res.status(400).json(respuesta(false, 'id_usuario e id_espacio son obligatorios'));
    }

    const { solicitud, espacio_nombre } = await crearSolicitud({ id_usuario: parseInt(id_usuario), id_espacio: parseInt(id_espacio), motivo });

    // notificar a TODOS los admins (si mail activo)
try {
  // correos de admins
  const adminEmails = await getCorreosAdmins();

  // datos del solicitante (reply-to)
  const u = await pool.query('SELECT usuario, correo FROM usuario WHERE id_persona=$1', [id_usuario]);

  await notifyAdminNuevaSolicitud({
    toList: adminEmails,
    id_solicitud: solicitud.id_solicitud,
    usuario: u.rows[0]?.usuario,
    correo: u.rows[0]?.correo,
    espacio_nombre
  });
} catch (_) {}


    res.status(201).json(respuesta(true, 'Solicitud creada correctamente', solicitud));
  } catch (e) {
    console.error('crearSolicitud:', e);
    if (e.code === '23505') {
      return res.status(400).json(respuesta(false, 'Ya existe una solicitud pendiente para este espacio'));
    }
    res.status(400).json(respuesta(false, e.message));
  }
};

/** GET /  (listar por estado) — ADMIN */
const listarSolicitudesController = async (req, res) => {
  try {
    const estado = (req.query.estado || 'pendiente').toLowerCase();
    const limite = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const data = await listarSolicitudesPorEstado({ estado, limite, offset });
    res.json(respuesta(true, 'Solicitudes obtenidas correctamente', { solicitudes: data, paginacion: { limite, offset } }));
  } catch (e) {
    console.error('listarSolicitudes:', e);
    res.status(500).json(respuesta(false, 'Error interno del servidor'));
  }
};

/** GET /mias  (listar del usuario autenticado) */
const listarMisSolicitudesController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const estado = req.query.estado ? String(req.query.estado).toLowerCase() : undefined;
    const limite = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const data = await listarSolicitudesDeUsuario({ id_usuario, estado, limite, offset });
    res.json(respuesta(true, 'Solicitudes del usuario', { solicitudes: data, paginacion: { limite, offset } }));
  } catch (e) {
    console.error('listarMisSolicitudes:', e);
    res.status(500).json(respuesta(false, 'Error interno del servidor'));
  }
};

/** POST /:id/anular  (usuario dueño) */
const anularSolicitudController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const id_solicitud = parseInt(req.params.id);
    const sol = await anularSolicitud({ id_solicitud, id_usuario });
    res.json(respuesta(true, 'Solicitud anulada', sol));
  } catch (e) {
    console.error('anularSolicitud:', e);
    res.status(400).json(respuesta(false, e.message));
  }
};

/** POST /:id/aprobar — ADMIN */
const aprobarSolicitudController = async (req, res) => {
  try {
    const id_solicitud = parseInt(req.params.id);
    const adminId = req.user.id_persona;
    const comentario = req.body.comentario_decision || null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const solRes = await client.query(
        `SELECT * FROM solicitud_admin_esp_dep WHERE id_solicitud = $1 FOR UPDATE`,
        [id_solicitud]
      );
      if (solRes.rowCount === 0) throw new Error('Solicitud no encontrada');
      const sol = solRes.rows[0];
      if (sol.estado !== 'pendiente') throw new Error('La solicitud ya fue procesada');

      const espRes = await client.query(
        `SELECT id_admin_esp_dep, nombre FROM espacio_deportivo WHERE id_espacio = $1 FOR UPDATE`,
        [sol.id_espacio]
      );
      if (espRes.rowCount === 0) throw new Error('Espacio no encontrado');
      if (espRes.rows[0].id_admin_esp_dep) throw new Error('El espacio ya tiene administrador');

      const existeRol = await client.query(
        `SELECT 1 FROM admin_esp_dep WHERE id_admin_esp_dep = $1`,
        [sol.id_usuario]
      );
      if (existeRol.rowCount === 0) {
        await client.query(
          `INSERT INTO admin_esp_dep (id_admin_esp_dep, fecha_ingreso, direccion, estado)
           VALUES ($1, now(), NULL, true)`,
          [sol.id_usuario]
        );
      }

      await client.query(
        `UPDATE espacio_deportivo SET id_admin_esp_dep = $1 WHERE id_espacio = $2`,
        [sol.id_usuario, sol.id_espacio]
      );

      await client.query(
        `UPDATE solicitud_admin_esp_dep
         SET estado = 'aprobada',
             decidido_por_admin = $1,
             fecha_decision = now(),
             comentario_decision = $2
         WHERE id_solicitud = $3`,
        [adminId, comentario, id_solicitud]
      );

      await client.query('COMMIT');

      const u = await pool.query('SELECT usuario, correo FROM usuario WHERE id_persona=$1', [sol.id_usuario]);
      const to = u.rows[0]?.correo || null;
      const usuarioNombre = u.rows[0]?.usuario || null;
      const espacioNombre = espRes.rows[0]?.nombre || null;

      try {
        await notifyUsuarioResultado({
          to,
          aprobado: true,
          usuario: usuarioNombre,
          espacio_nombre: espacioNombre
        });
      } catch (_) {}

      res.json(respuesta(true, 'Solicitud aprobada correctamente'));
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('aprobarSolicitud:', e);
    res.status(400).json(respuesta(false, e.message));
  }
};


/** POST /:id/rechazar — ADMIN */
const rechazarSolicitudController = async (req, res) => {
  try {
    const id_solicitud = parseInt(req.params.id);
    const adminId = req.user.id_persona;
    const comentario = req.body.comentario_decision || null;

    const out = await rechazarSolicitud({ id_solicitud, adminId, comentario });

    // notificar al usuario (si mail activo)
    try {
      await notifyUsuarioResultado({
        to: out.to,
        aprobado: false,
        usuario: out.usuarioNombre,
        espacio_nombre: out.espacioNombre,
        comentario: out.comentario,
      });
    } catch (_) {}

    res.json(respuesta(true, 'Solicitud rechazada correctamente', out.solicitud));
  } catch (e) {
    console.error('rechazarSolicitud:', e);
    res.status(400).json(respuesta(false, e.message));
  }
};
const obtenerDatosSolicitudController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const { solicitudes, total } = await obtenerDatosSolicitudes(limite, offset);
    res.json(respuesta(true, 'Solicitudes obtenidas correctamente', {
      solicitudes,
      paginacion: { limite, offset, total }
    }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const filtrarSolicitudesEstadoController = async (req, res) => {
  try {
    const estado = String(req.query.estado || '').toLowerCase();
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const { solicitudes, total } = await obtenerSolicitudesFiltradas(estado, limite, offset);
    res.json(respuesta(true, 'Solicitudes filtradas correctamente', {
      solicitudes,
      estado,
      paginacion: { limite, offset, total }
    }));
  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};

const buscarSolicitudController = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json(respuesta(false, 'El parametro q es requerido'));
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const { solicitudes, total } = await buscarSolicitudes(q, limite, offset);
    res.json(respuesta(true, 'Solicitudes obtenidas correctamente', {
      solicitudes,
      paginacion: { limite, offset, total }
    }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerSolicitudPorIdController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json(respuesta(false, 'ID invalido'));
    const sol = await obtenerSolicitudPorId(id);
    if (!sol) return res.status(404).json(respuesta(false, 'Solicitud no encontrada'));
    res.json(respuesta(true, 'Solicitud obtenida correctamente', { solicitud: sol }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};


// ============================
// RUTAS
// ============================

// Públicos (para el modal de registro)
router.get('/espacios-libres', getEspaciosLibresController);
router.post('/', crearSolicitudController);

// ADMIN
router.get('/', verifyToken, checkRole(['ADMINISTRADOR']), listarSolicitudesController);
router.post('/:id/aprobar', verifyToken, checkRole(['ADMINISTRADOR']), aprobarSolicitudController);
router.post('/:id/rechazar', verifyToken, checkRole(['ADMINISTRADOR']), rechazarSolicitudController);

// Usuario autenticado
router.get('/mias', verifyToken, listarMisSolicitudesController);
router.post('/:id/anular', verifyToken, anularSolicitudController);
//
router.get('/datos-especificos', verifyToken, checkRole(['ADMINISTRADOR']), obtenerDatosSolicitudController);
router.get('/filtro', verifyToken, checkRole(['ADMINISTRADOR']), filtrarSolicitudesEstadoController);
router.get('/buscar', verifyToken, checkRole(['ADMINISTRADOR']), buscarSolicitudController);
router.get('/dato-individual/:id', verifyToken, checkRole(['ADMINISTRADOR']), obtenerSolicitudPorIdController);


module.exports = router;
