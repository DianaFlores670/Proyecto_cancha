/**
 * Rutas para gestionar solicitudes de Admin de Espacio Deportivo
 */

const express = require('express');
const pool = require('../../config/database');
const { verifyToken, checkRole } = require('../../middleware/auth');

// Importar mailer real
const {
  notifyAdminNuevaSolicitud,
  notifyUsuarioResultado
} = require('../../lib/mailer');

const router = express.Router();

// Helper
const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });


// ============================
// MODELOS
// ============================

const getCorreosAdmins = async () => {
  const q = `
    SELECT LOWER(TRIM(u.correo)) AS correo
    FROM administrador a
    JOIN usuario u ON u.id_persona = a.id_administrador
    WHERE u.correo IS NOT NULL AND u.correo <> ''
  `;
  const { rows } = await pool.query(q);
  const set = new Set(rows.map(r => r.correo).filter(Boolean));
  return Array.from(set);
};

const getEspaciosLibres = async (limite = 50, offset = 0) => {
  const q = `
    SELECT id_espacio, nombre, direccion
    FROM espacio_deportivo
    WHERE id_admin_esp_dep IS NULL
    ORDER BY nombre ASC
    LIMIT $1 OFFSET $2
  `;
  const { rows } = await pool.query(q, [limite, offset]);
  return rows;
};

const crearSolicitud = async ({ id_usuario, id_espacio, motivo = null }) => {
  const chk = await pool.query(
    `SELECT id_admin_esp_dep, nombre FROM espacio_deportivo WHERE id_espacio = $1`,
    [id_espacio]
  );
  if (!chk.rowCount) throw new Error('Espacio deportivo no encontrado');
  if (chk.rows[0].id_admin_esp_dep) throw new Error('El espacio ya tiene un administrador');

  const ins = `
    INSERT INTO solicitud_admin_esp_dep (id_usuario, id_espacio, motivo)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await pool.query(ins, [id_usuario, id_espacio, motivo]);
  return { solicitud: rows[0], espacio_nombre: chk.rows[0].nombre };
};

const listarSolicitudesPorEstado = async ({ estado, limite, offset }) => {
  const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE s.estado::text = $1
    ORDER BY s.fecha_solicitud ASC
    LIMIT $2 OFFSET $3
  `;
  const { rows } = await pool.query(q, [estado, limite, offset]);
  return rows;
};

const listarSolicitudesDeUsuario = async ({ id_usuario, estado, limite, offset }) => {
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
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await pool.query(q, params);
  return rows;
};

const aprobarSolicitud = async ({ id_solicitud, adminId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const solRes = await client.query(
      `SELECT * FROM solicitud_admin_esp_dep WHERE id_solicitud = $1 FOR UPDATE`,
      [id_solicitud]
    );
    if (!solRes.rowCount) throw new Error('Solicitud no encontrada');

    const sol = solRes.rows[0];
    if (sol.estado !== 'pendiente') throw new Error('La solicitud ya fue procesada');

    const espRes = await client.query(
      `SELECT id_admin_esp_dep, nombre FROM espacio_deportivo WHERE id_espacio = $1 FOR UPDATE`,
      [sol.id_espacio]
    );
    if (!espRes.rowCount) throw new Error('Espacio no encontrado');
    if (espRes.rows[0].id_admin_esp_dep) throw new Error('El espacio ya tiene administrador');

    // Verificar si ya es admin_esp_dep
    const existeRol = await client.query(
      `SELECT 1 FROM admin_esp_dep WHERE id_admin_esp_dep = $1`,
      [sol.id_usuario]
    );

    if (!existeRol.rowCount) {
      await client.query(
        `INSERT INTO admin_esp_dep (id_admin_esp_dep, fecha_ingreso, direccion, estado)
     VALUES ($1, now(), NULL, true)`,
        [sol.id_usuario]
      );
    }

    // Verificar si ya es cliente
    const existeCliente = await client.query(
      `SELECT 1 FROM cliente WHERE id_cliente = $1`,
      [sol.id_usuario]
    );

    if (!existeCliente.rowCount) {
      await client.query(
        `INSERT INTO cliente (id_cliente)
     VALUES ($1)`,
        [sol.id_usuario]
      );
    }



    await client.query(
      `UPDATE espacio_deportivo SET id_admin_esp_dep = $1 WHERE id_espacio = $2`,
      [sol.id_usuario, sol.id_espacio]
    );

    await client.query(
      `UPDATE solicitud_admin_esp_dep
       SET estado = 'aprobada', decidido_por_admin = $1, fecha_decision = now()
       WHERE id_solicitud = $2`,
      [adminId, id_solicitud]
    );

    await client.query('COMMIT');

    const u = await pool.query(`SELECT usuario, correo FROM usuario WHERE id_persona=$1`, [sol.id_usuario]);

    return {
      to: u.rows[0]?.correo,
      usuario: u.rows[0]?.usuario,
      espacio_nombre: espRes.rows[0]?.nombre
    };

  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const rechazarSolicitud = async ({ id_solicitud, adminId, comentario }) => {
  const upd = `
    UPDATE solicitud_admin_esp_dep
    SET estado = 'rechazada',
        decidido_por_admin = $1,
        comentario_decision = $2,
        fecha_decision = now()
    WHERE id_solicitud = $3 AND estado = 'pendiente'
    RETURNING *
  `;

  const { rows } = await pool.query(upd, [adminId, comentario || null, id_solicitud]);
  if (!rows.length) throw new Error('Solicitud no encontrada o ya procesada');

  const sol = rows[0];

  const u = await pool.query(`SELECT usuario, correo FROM usuario WHERE id_persona=$1`, [sol.id_usuario]);
  const e = await pool.query(`SELECT nombre FROM espacio_deportivo WHERE id_espacio=$1`, [sol.id_espacio]);

  return {
    to: u.rows[0]?.correo,
    usuario: u.rows[0]?.usuario,
    espacio_nombre: e.rows[0]?.nombre,
    comentario: sol.comentario_decision,
    solicitud: sol
  };
};


// ============================
// CONTROLADORES HTTP
// ============================

const getEspaciosLibresController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const espacios = await getEspaciosLibres(limite, offset);
    res.json(respuesta(true, 'Espacios deportivos disponibles', { espacios, paginacion: { limite, offset } }));
  } catch {
    res.status(500).json(respuesta(false, 'Error interno del servidor'));
  }
};

const crearSolicitudController = async (req, res) => {
  try {
    const { id_usuario, id_espacio, motivo } = req.body;

    if (!id_usuario || !id_espacio)
      return res.status(400).json(respuesta(false, 'id_usuario e id_espacio son obligatorios'));

    // Validar si ya tiene solicitud pendiente
    const pending = await pool.query(
      `SELECT 1 FROM solicitud_admin_esp_dep 
   WHERE id_usuario = $1 AND estado = 'pendiente'`,
      [id_usuario]
    );

    if (pending.rowCount > 0) {
      return res
        .status(400)
        .json(respuesta(false, 'Ya tienes una solicitud pendiente para administrar un espacio'));
    }


    const { solicitud, espacio_nombre } = await crearSolicitud({
      id_usuario: parseInt(id_usuario),
      id_espacio: parseInt(id_espacio),
      motivo
    });

    getCorreosAdmins()
      .then(async adminEmails => {
        const u = await pool.query(
          'SELECT usuario, correo FROM usuario WHERE id_persona=$1',
          [id_usuario]
        );

        notifyAdminNuevaSolicitud({
          toList: adminEmails,
          id_solicitud: solicitud.id_solicitud,
          usuario: u.rows[0]?.usuario,
          correo: u.rows[0]?.correo,
          espacio_nombre
        }).catch(err => console.error("EMAIL ERROR:", err));
      })
      .catch(err => console.error("EMAIL ADMIN FETCH ERROR:", err));


    res.status(201).json(respuesta(true, 'Solicitud creada correctamente', solicitud));

  } catch (e) {
    console.error("ERROR:", e.message);

    if (e.message.includes("ux_solicitud_unica_pendiente")) {
      return res
        .status(400)
        .json(respuesta(false, "Ya tienes una solicitud pendiente para administrar un espacio."));
    }

    res.status(400).json(respuesta(false, e.message));
  }

};

const listarSolicitudesController = async (req, res) => {
  try {
    const estado = req.query.estado || 'pendiente';
    const limite = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const data = await listarSolicitudesPorEstado({ estado, limite, offset });
    res.json(respuesta(true, 'Solicitudes obtenidas correctamente', { solicitudes: data, paginacion: { limite, offset } }));

  } catch {
    res.status(500).json(respuesta(false, 'Error interno del servidor'));
  }
};

const listarMisSolicitudesController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const estado = req.query.estado || null;
    const limite = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const data = await listarSolicitudesDeUsuario({ id_usuario, estado, limite, offset });
    res.json(respuesta(true, 'Solicitudes del usuario', { solicitudes: data, paginacion: { limite, offset } }));

  } catch {
    res.status(500).json(respuesta(false, 'Error interno del servidor'));
  }
};

const anularSolicitudController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const id_solicitud = parseInt(req.params.id);

    const sol = await anularSolicitud({ id_solicitud, id_usuario });
    res.json(respuesta(true, 'Solicitud anulada', sol));

  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};

const aprobarSolicitudController = async (req, res) => {
  try {
    const id_solicitud = parseInt(req.params.id);
    const adminId = req.user.id_persona;

    const out = await aprobarSolicitud({ id_solicitud, adminId });

    notifyUsuarioResultado({
      to: out.to,
      aprobado: true,
      usuario: out.usuario,
      espacio_nombre: out.espacio_nombre
    }).catch(err => console.error("EMAIL ERROR:", err));

    res.json(respuesta(true, 'Solicitud aprobada correctamente'));

  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};

const rechazarSolicitudController = async (req, res) => {
  try {
    const id_solicitud = parseInt(req.params.id);
    const adminId = req.user.id_persona;
    const comentario = req.body.comentario_decision || null;

    const out = await rechazarSolicitud({ id_solicitud, adminId, comentario });

    notifyUsuarioResultado({
      to: out.to,
      aprobado: false,
      usuario: out.usuario,
      espacio_nombre: out.espacio_nombre,
      comentario: out.comentario
    }).catch(err => console.error("EMAIL ERROR:", err));

    res.json(respuesta(true, 'Solicitud rechazada correctamente', out.solicitud));

  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};

// ============================
// CONSULTAS GENERALES
// ============================

const obtenerDatosSolicitudes = async (limite = 10, offset = 0) => {
  const q = `
    SELECT 
      s.*,
      u.usuario AS usuario_nombre,
      u.correo,
      e.nombre AS espacio_nombre
    FROM solicitud_admin_esp_dep s
    JOIN usuario u ON u.id_persona = s.id_usuario
    JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    ORDER BY s.fecha_solicitud DESC
    LIMIT $1 OFFSET $2
  `;

  const qt = `SELECT COUNT(*) FROM solicitud_admin_esp_dep`;

  const [r1, r2] = await Promise.all([
    pool.query(q, [limite, offset]),
    pool.query(qt)
  ]);

  return {
    solicitudes: r1.rows,
    total: Number(r2.rows[0].count)
  };
};


const filtrarSolicitudesEstadoController = async (req, res) => {
  try {
    const estado = String(req.query.estado || '').toLowerCase();
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const q = `
      SELECT 
        s.*,
        u.usuario AS usuario_nombre,
        u.correo,
        e.nombre AS espacio_nombre
      FROM solicitud_admin_esp_dep s
      JOIN usuario u ON u.id_persona = s.id_usuario
      JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
      WHERE s.estado::text = $1
      ORDER BY s.fecha_solicitud DESC
      LIMIT $2 OFFSET $3
    `;

    const qt = `
      SELECT COUNT(*)
      FROM solicitud_admin_esp_dep
      WHERE estado::text = $1
    `;


    const [r1, r2] = await Promise.all([
      pool.query(q, [estado, limite, offset]),
      pool.query(qt, [estado])
    ]);

    res.json(respuesta(true, 'Solicitudes filtradas', {
      solicitudes: r1.rows,
      paginacion: { limite, offset, total: Number(r2.rows[0].count) }
    }));

  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};


const buscarSolicitudController = async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
  SELECT 
    s.*,
    u.usuario AS usuario_nombre,
    u.correo,
    e.nombre AS espacio_nombre
  FROM solicitud_admin_esp_dep s
  JOIN usuario u ON u.id_persona = s.id_usuario
  JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
  WHERE u.usuario ILIKE $1
     OR u.correo ILIKE $1
     OR e.nombre ILIKE $1
     OR s.estado::text ILIKE $1
     OR CAST(s.id_solicitud AS TEXT) ILIKE $1
  ORDER BY s.fecha_solicitud DESC
  LIMIT $2 OFFSET $3
`;

    const queryTotal = `
  SELECT COUNT(*)
  FROM solicitud_admin_esp_dep s
  JOIN usuario u ON u.id_persona = s.id_usuario
  JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
  WHERE u.usuario ILIKE $1
     OR u.correo ILIKE $1
     OR e.nombre ILIKE $1
     OR s.estado::text ILIKE $1
     OR CAST(s.id_solicitud AS TEXT) ILIKE $1
`;


    const [r1, r2] = await Promise.all([
      pool.query(query, [q, limite, offset]),
      pool.query(queryTotal, [q])
    ]);

    res.json(respuesta(true, 'Resultados de busqueda', {
      solicitudes: r1.rows,
      paginacion: { limite, offset, total: Number(r2.rows[0].count) }
    }));

  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};


const obtenerSolicitudPorIdController = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const q = `
      SELECT 
        s.*,
        u.usuario AS usuario_nombre,
        u.correo,
        e.nombre AS espacio_nombre
      FROM solicitud_admin_esp_dep s
      JOIN usuario u ON u.id_persona = s.id_usuario
      JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
      WHERE s.id_solicitud = $1
    `;

    const r = await pool.query(q, [id]);

    if (!r.rowCount)
      return res.status(404).json(respuesta(false, 'Solicitud no encontrada'));

    res.json(respuesta(true, 'Solicitud obtenida', { solicitud: r.rows[0] }));

  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};


// ============================
// RUTAS
// ============================

router.get('/espacios-libres', getEspaciosLibresController);
router.post('/', crearSolicitudController);

router.get('/', verifyToken, checkRole(['ADMINISTRADOR']), listarSolicitudesController);
router.post('/:id/aprobar', verifyToken, checkRole(['ADMINISTRADOR']), aprobarSolicitudController);
router.post('/:id/rechazar', verifyToken, checkRole(['ADMINISTRADOR']), rechazarSolicitudController);

router.get('/mias', verifyToken, listarMisSolicitudesController);
router.post('/:id/anular', verifyToken, anularSolicitudController);

router.get('/datos-especificos', verifyToken, checkRole(['ADMINISTRADOR']), async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const { solicitudes, total } = await obtenerDatosSolicitudes(limite, offset);
    res.json(respuesta(true, 'Solicitudes obtenidas', { solicitudes, paginacion: { limite, offset, total } }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
});

router.get('/filtro', verifyToken, checkRole(['ADMINISTRADOR']), filtrarSolicitudesEstadoController);
router.get('/buscar', verifyToken, checkRole(['ADMINISTRADOR']), buscarSolicitudController);
router.get('/dato-individual/:id', verifyToken, checkRole(['ADMINISTRADOR']), obtenerSolicitudPorIdController);

module.exports = router;
