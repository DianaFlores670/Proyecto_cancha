const express = require('express');
const pool = require('../../../config/database');
const { verifyToken, checkRole } = require('../../../middleware/auth');

const router = express.Router();
const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });

const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');

/* ============================================================
   =========================== MODELOS =========================
   ============================================================ */

/**
 * Obtener todas las reservas de las canchas donde trabaja el encargado
 */
const obtenerReservas = async (id_usuario, limite, offset) => {
  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.nombre AS nombre_cancha,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1
    ORDER BY r.fecha_reserva DESC, r.id_reserva DESC
    LIMIT $2 OFFSET $3
  `;

  const qt = `
    SELECT COUNT(*)
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    WHERE en.id_encargado = $1
  `;

  const [r1, r2] = await Promise.all([
    pool.query(q, [id_usuario, limite, offset]),
    pool.query(qt, [id_usuario])
  ]);

  return {
    reservas: r1.rows,
    total: Number(r2.rows[0].count)
  };
};

/**
 * Filtro general
 */
const filtrarReservas = async (id_usuario, tipo, limite, offset) => {
  const ordenes = {
    fecha: 'r.fecha_reserva DESC',
    monto: 'r.monto_total DESC',
    estado: 'r.estado ASC',
    cancha: 'c.nombre ASC'
  };

  const orderBy = ordenes[tipo] || ordenes.fecha;

  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.nombre AS nombre_cancha,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

  const qt = `
    SELECT COUNT(*)
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    WHERE en.id_encargado = $1
  `;

  const [rows, count] = await Promise.all([
    pool.query(q, [id_usuario, limite, offset]),
    pool.query(qt, [id_usuario])
  ]);

  return {
    reservas: rows.rows,
    total: Number(count.rows[0].count)
  };
};

/**
 * Buscar reservas por cancha, cliente, estado
 */
const buscarReservas = async (id_usuario, q, limite, offset) => {
  const termino = `%${sanitizeInput(q)}%`;

  const sql = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.nombre AS nombre_cancha,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1
      AND (
        c.nombre ILIKE $2
        OR u.nombre ILIKE $2
        OR u.apellido ILIKE $2
        OR r.estado::text ILIKE $2
      )
    ORDER BY r.fecha_reserva DESC
    LIMIT $3 OFFSET $4
  `;

  const countSql = `
    SELECT COUNT(*)
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1
      AND (
        c.nombre ILIKE $2
        OR u.nombre ILIKE $2
        OR u.apellido ILIKE $2
        OR r.estado::text ILIKE $2
      )
  `;

  const [rows, count] = await Promise.all([
    pool.query(sql, [id_usuario, termino, limite, offset]),
    pool.query(countSql, [id_usuario, termino])
  ]);

  return {
    reservas: rows.rows,
    total: Number(count.rows[0].count)
  };
};

/**
 * Detalle individual, incluye horarios
 */
const obtenerReservaPorId = async (id_usuario, id_reserva) => {
  const infoSql = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.nombre AS nombre_cancha,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1 AND r.id_reserva = $2
  `;

  const horariosSql = `
    SELECT fecha, hora_inicio, hora_fin
    FROM reserva_horario
    WHERE id_reserva = $1
    ORDER BY fecha, hora_inicio
  `;

  const [info, horarios] = await Promise.all([
    pool.query(infoSql, [id_usuario, id_reserva]),
    pool.query(horariosSql, [id_reserva])
  ]);

  if (!info.rows.length) return null;

  return {
    info: info.rows[0],
    horarios: horarios.rows
  };
};

/* ============================================================
   ======================== CONTROLADORES ======================
   ============================================================ */

const datosEspecificosController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const data = await obtenerReservas(id_usuario, limite, offset);

    res.json(respuesta(true, "Reservas obtenidas", data));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const filtroController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const tipo = req.query.tipo;
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const data = await filtrarReservas(id_usuario, tipo, limite, offset);

    res.json(respuesta(true, "Reservas filtradas", data));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const buscarController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const q = req.query.q || "";
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const data = await buscarReservas(id_usuario, q, limite, offset);

    res.json(respuesta(true, "Resultados de busqueda", data));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const detalleController = async (req, res) => {
  try {
    const id_usuario = req.user.id_persona;
    const id_reserva = Number(req.params.id);

    if (Number.isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, "ID de reserva invalido"));
    }

    const data = await obtenerReservaPorId(id_usuario, id_reserva);

    if (!data) return res.status(404).json(respuesta(false, "No encontrado"));

    res.json(respuesta(true, "OK", data));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

/* ============================================================
   ============================ RUTAS ==========================
   ============================================================ */

router.get(
  '/datos-especificos',
  verifyToken,
  checkRole(['ENCARGADO']),
  datosEspecificosController
);
router.get(
  '/filtro',
  verifyToken,
  checkRole(['ENCARGADO']),
  filtroController
);
router.get(
  '/buscar',
  verifyToken,
  checkRole(['ENCARGADO']),
  buscarController
);
router.get(
  '/dato-individual/:id',
  verifyToken,
  checkRole(['ENCARGADO']),
  detalleController
);

module.exports = router;
