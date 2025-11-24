const express = require('express');
const pool = require('../../../config/database');
const { verifyToken, checkRole } = require('../../../middleware/auth');

const router = express.Router();
const respuesta = (ok, msg, datos = null) => ({ exito: ok, mensaje: msg, datos });

/* ===================================================================
   ========================= MODELOS =================================
   =================================================================== */

/**
 * Verificar si la reserva pertenece a los espacios del encargado
 */
const validarReservaEncargado = async (id_encargado, id_reserva) => {
  const q = `
    SELECT 1
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    WHERE en.id_encargado = $1 AND r.id_reserva = $2
  `;
  const r = await pool.query(q, [id_encargado, id_reserva]);
  return r.rowCount > 0;
};


/* ========================= LISTAR ============================= */

const obtenerReportes = async (id_encargado, limite, offset) => {
  const q = `
  SELECT r.*,
         res.fecha_reserva,
         res.estado AS estado_reserva,
         c.nombre AS nombre_cancha,
         res.id_reserva,
         u.nombre AS cliente_nombre,
         u.apellido AS cliente_apellido,
         (u.nombre || ' ' || u.apellido) AS cliente_completo
  FROM reporte_incidencia r
  JOIN reserva res ON res.id_reserva = r.id_reserva
  JOIN cancha c ON c.id_cancha = res.id_cancha
  JOIN cliente cli ON cli.id_cliente = res.id_cliente
  JOIN usuario u ON u.id_persona = cli.id_cliente
  WHERE r.id_encargado = $1
  ORDER BY r.id_reporte DESC
  LIMIT $2 OFFSET $3
`;


  const qt = `
    SELECT COUNT(*)
    FROM reporte_incidencia
    WHERE id_encargado = $1
  `;

  const [r1, r2] = await Promise.all([
    pool.query(q, [id_encargado, limite, offset]),
    pool.query(qt, [id_encargado])
  ]);

  return {
    reportes: r1.rows,
    total: Number(r2.rows[0].count)
  };
};


/* ========================= FILTRO ============================= */

const filtrarReportes = async (id_encargado, tipo, limite, offset) => {
  const ordenes = {
    fecha: 'res.fecha_reserva DESC',
    verificado: 'r.verificado ASC',
    cancha: 'c.nombre ASC'
  };

  const orderBy = ordenes[tipo] || 'r.id_reporte DESC';

  const q = `
  SELECT r.*,
         res.fecha_reserva,
         res.estado AS estado_reserva,
         c.nombre AS nombre_cancha,
         res.id_reserva,
         u.nombre AS cliente_nombre,
         u.apellido AS cliente_apellido,
         (u.nombre || ' ' || u.apellido) AS cliente_completo
  FROM reporte_incidencia r
  JOIN reserva res ON res.id_reserva = r.id_reserva
  JOIN cancha c ON c.id_cancha = res.id_cancha
  JOIN cliente cli ON cli.id_cliente = res.id_cliente
  JOIN usuario u ON u.id_persona = cli.id_cliente
  WHERE r.id_encargado = $1
  ORDER BY ${orderBy}
  LIMIT $2 OFFSET $3
`;


  const qt = `
    SELECT COUNT(*)
    FROM reporte_incidencia
    WHERE id_encargado = $1
  `;

  const [rows, total] = await Promise.all([
    pool.query(q, [id_encargado, limite, offset]),
    pool.query(qt, [id_encargado])
  ]);

  return {
    reportes: rows.rows,
    total: Number(total.rows[0].count)
  };
};


/* ========================= BUSCAR ============================= */

const buscarReportes = async (id_encargado, q, limite, offset) => {
  const like = `%${q}%`;

  const sql = `
  SELECT r.*,
         res.fecha_reserva,
         res.estado AS estado_reserva,
         c.nombre AS nombre_cancha,
         res.id_reserva,
         u.nombre AS cliente_nombre,
         u.apellido AS cliente_apellido,
         (u.nombre || ' ' || u.apellido) AS cliente_completo
  FROM reporte_incidencia r
  JOIN reserva res ON res.id_reserva = r.id_reserva
  JOIN cancha c ON c.id_cancha = res.id_cancha
  JOIN cliente cli ON cli.id_cliente = res.id_cliente
  JOIN usuario u ON u.id_persona = cli.id_cliente
  WHERE r.id_encargado = $1
    AND (
      r.detalle ILIKE $2 OR
      r.sugerencia ILIKE $2 OR
      c.nombre ILIKE $2 OR
      u.nombre ILIKE $2 OR
      u.apellido ILIKE $2
    )
  ORDER BY r.id_reporte DESC
  LIMIT $3 OFFSET $4
`;


  const countSql = `
  SELECT COUNT(*)
  FROM reporte_incidencia r
  JOIN reserva res ON res.id_reserva = r.id_reserva
  JOIN cancha c ON c.id_cancha = res.id_cancha
  JOIN cliente cli ON cli.id_cliente = res.id_cliente
  JOIN usuario u ON u.id_persona = cli.id_cliente
  WHERE r.id_encargado = $1
    AND (
      r.detalle ILIKE $2 OR
      r.sugerencia ILIKE $2 OR
      c.nombre ILIKE $2 OR
      u.nombre ILIKE $2 OR
      u.apellido ILIKE $2
    )
`;


  const [rows, total] = await Promise.all([
    pool.query(sql, [id_encargado, like, limite, offset]),
    pool.query(countSql, [id_encargado, like])
  ]);

  return {
    reportes: rows.rows,
    total: Number(total.rows[0].count)
  };
};


/* ========================= DETALLE ============================= */

const obtenerReportePorId = async (id_encargado, id_reporte) => {
  const q = `
    SELECT r.*, 
           res.fecha_reserva,
           res.estado AS estado_reserva,
           c.nombre AS nombre_cancha,
           cli.id_cliente,
           u.nombre AS cliente_nombre,
           u.apellido AS cliente_apellido,
           (u.nombre || ' ' || u.apellido) AS cliente_completo,
       res.id_reserva
    FROM reporte_incidencia r
    JOIN reserva res ON res.id_reserva = r.id_reserva
    JOIN cancha c ON c.id_cancha = res.id_cancha
    JOIN cliente cli ON cli.id_cliente = res.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE r.id_reporte = $1 AND r.id_encargado = $2
  `;

  const r = await pool.query(q, [id_reporte, id_encargado]);
  return r.rows[0] || null;
};


/* ========================= CREAR ============================= */

const crearReporte = async ({ id_encargado, detalle, sugerencia, id_reserva }) => {
  // validar si puede reportar esta reserva
  const valido = await validarReservaEncargado(id_encargado, id_reserva);
  if (!valido) throw new Error("No puedes reportar incidencias de reservas fuera de tus espacios");

  const q = `
    INSERT INTO reporte_incidencia(detalle, sugerencia, id_encargado, id_reserva)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const r = await pool.query(q, [detalle, sugerencia, id_encargado, id_reserva]);
  return r.rows[0];
};


/* ========================= EDITAR ============================= */

const editarReporte = async ({ id_reporte, id_encargado, detalle, sugerencia, id_reserva }) => {
  const q = `
    UPDATE reporte_incidencia
    SET detalle = $1,
        sugerencia = $2,
        id_reserva = $3
    WHERE id_reporte = $4 AND id_encargado = $5
    RETURNING *
  `;

  const r = await pool.query(q, [
    detalle,
    sugerencia,
    id_reserva,
    id_reporte,
    id_encargado
  ]);

  if (!r.rows.length) throw new Error("No puedes editar este reporte");
  return r.rows[0];
};

const obtenerReservasEncargado = async (id_encargado) => {
  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      c.nombre AS nombre_cancha,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      (u.nombre || ' ' || u.apellido) AS cliente_completo
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1
    ORDER BY r.id_reserva DESC
  `;
  const resp = await pool.query(q, [id_encargado]);
  return resp.rows;
};

const obtenerReservasPasadasEncargado = async (id_encargado) => {
  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      c.nombre AS nombre_cancha,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      (u.nombre || ' ' || u.apellido) AS cliente_completo
    FROM encargado en
    JOIN cancha c ON c.id_espacio = en.id_espacio
    JOIN reserva r ON r.id_cancha = c.id_cancha
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE en.id_encargado = $1
      AND r.fecha_reserva < NOW()
    ORDER BY r.fecha_reserva DESC
  `;
  const resp = await pool.query(q, [id_encargado]);
  return resp.rows;
};


/* ===================================================================
   ======================= CONTROLADORES =============================
   =================================================================== */

const datosEspecificosController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const out = await obtenerReportes(id, limite, offset);

    res.json(respuesta(true, "Reportes obtenidos", out));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const filtroController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const tipo = req.query.tipo;
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const out = await filtrarReportes(id, tipo, limite, offset);
    res.json(respuesta(true, "Reportes filtrados", out));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const buscarController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const q = req.query.q || "";
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const out = await buscarReportes(id, q, limite, offset);
    res.json(respuesta(true, "Resultados", out));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const detalleController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const id_reporte = Number(req.params.id);

    const out = await obtenerReportePorId(id, id_reporte);
    if (!out) return res.status(404).json(respuesta(false, "No encontrado"));

    res.json(respuesta(true, "OK", { reporte: out }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const crearController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const { detalle, sugerencia, id_reserva } = req.body;

    const out = await crearReporte({ id_encargado: id, detalle, sugerencia, id_reserva });

    res.json(respuesta(true, "Reporte creado", out));
  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};

const editarController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const id_reporte = Number(req.params.id);
    const { detalle, sugerencia, id_reserva } = req.body;

    const out = await editarReporte({
      id_reporte,
      id_encargado: id,
      detalle,
      sugerencia,
      id_reserva
    });

    res.json(respuesta(true, "Reporte actualizado", out));
  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};


const reservasDisponiblesController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const rows = await obtenerReservasEncargado(id);

    res.json(respuesta(true, "Reservas disponibles", { reservas: rows }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const reservasPasadasController = async (req, res) => {
  try {
    const id = req.user.id_persona;
    const rows = await obtenerReservasPasadasEncargado(id);
    res.json(respuesta(true, "Reservas pasadas", { reservas: rows }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};


/* ===================================================================
   ============================ RUTAS ================================
   =================================================================== */

router.get('/datos-especificos', verifyToken, checkRole(['ENCARGADO']), datosEspecificosController);
router.get('/filtro', verifyToken, checkRole(['ENCARGADO']), filtroController);
router.get('/buscar', verifyToken, checkRole(['ENCARGADO']), buscarController);
router.get('/dato-individual/:id', verifyToken, checkRole(['ENCARGADO']), detalleController);

router.post('/', verifyToken, checkRole(['ENCARGADO']), crearController);
router.put('/:id', verifyToken, checkRole(['ENCARGADO']), editarController);
router.get('/reservas-disponibles', verifyToken, checkRole(['ENCARGADO']), reservasDisponiblesController);
router.get('/reservas-pasadas', verifyToken, checkRole(['ENCARGADO']), reservasPasadasController);


module.exports = router;
