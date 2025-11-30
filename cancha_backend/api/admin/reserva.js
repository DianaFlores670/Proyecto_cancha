const express = require('express');
const pool = require('../../config/database');

const router = express.Router();

// RESPUESTA STANDARD
const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos,
});

// ===================================================
// ============== MODELOS Y UTILIDADES ===============
// ===================================================

// Estado calculado
const estadoCalculado = `
  CASE 
    WHEN r.estado <> 'pagada'
         AND r.fecha_reserva < (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')
    THEN 'cancelada'
    ELSE r.estado
  END AS estado
`;

// FUNCION GLOBAL PARA GENERAR HORARIOS (1 HORA)
const generarBloques = (fecha_reserva, hora_inicio, hora_fin, monto_total) => {
  const inicio = new Date(`1970-01-01T${hora_inicio}:00`);
  const fin = new Date(`1970-01-01T${hora_fin}:00`);

  const diffHoras = (fin - inicio) / (1000 * 60 * 60);
  if (diffHoras <= 0) throw new Error("La hora fin debe ser mayor que la hora inicio");

  const montoPorBloque = monto_total / diffHoras;

  const horarios = [];
  let h = new Date(inicio);

  while (h < fin) {
    let h2 = new Date(h);
    h2.setHours(h.getHours() + 1);

    horarios.push({
      fecha: fecha_reserva,
      hora_inicio: h.toTimeString().slice(0, 5),
      hora_fin: h2.toTimeString().slice(0, 5),
      monto: montoPorBloque,
    });

    h = h2;
  }

  return horarios;
};

// ===================================================
// ============== OBTENER RESERVAS ====================
// ===================================================

const obtenerReservasActivas = async () => {
  const query = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      ${estadoCalculado},
      r.monto_total,
      c.id_cliente,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    WHERE r.estado IN ('pendiente', 'en_cuotas')
    ORDER BY r.fecha_reserva ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const obtenerDatosEspecificos = async (limite, offset) => {
  const query = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      ${estadoCalculado},
      c.id_cliente,
      p.nombre AS cliente_nombre,
      p.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario p ON c.id_cliente = p.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    ORDER BY r.id_reserva
    LIMIT $1 OFFSET $2
  `;

  const totalQuery = `SELECT COUNT(*) FROM reserva`;

  const [datos, total] = await Promise.all([
    pool.query(query, [limite, offset]),
    pool.query(totalQuery),
  ]);

  return { reservas: datos.rows, total: parseInt(total.rows[0].count) };
};

const obtenerReservasFiltradas = async (tipoFiltro, limite, offset) => {
  const valid = {
    fecha: 'r.fecha_reserva DESC',
    monto: 'r.monto_total ASC',
    estado: 'estado ASC',
    default: 'r.id_reserva ASC'
  };

  const orden = valid[tipoFiltro] || valid.default;

  const query = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      ${estadoCalculado},
      c.id_cliente,
      p.nombre AS cliente_nombre,
      p.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario p ON c.id_cliente = p.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    ORDER BY ${orden}
    LIMIT $1 OFFSET $2
  `;

  const totalQuery = `SELECT COUNT(*) FROM reserva`;

  const [datos, total] = await Promise.all([
    pool.query(query, [limite, offset]),
    pool.query(totalQuery)
  ]);

  return { reservas: datos.rows, total: parseInt(total.rows[0].count) };
};

const buscarReservas = async (texto, limite, offset) => {
  const termino = `%${texto.replace(/[%_\\]/g, '\\$&')}%`;

  const query = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      ${estadoCalculado},
      c.id_cliente,
      p.nombre AS cliente_nombre,
      p.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario p ON c.id_cliente = p.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    WHERE 
      p.nombre ILIKE $1 OR 
      p.apellido ILIKE $1 OR 
      ca.nombre ILIKE $1 OR 
      r.estado::text ILIKE $1
    ORDER BY r.fecha_reserva DESC
    LIMIT $2 OFFSET $3
  `;

  const totalQuery = `
    SELECT COUNT(*) 
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario p ON c.id_cliente = p.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    WHERE 
      p.nombre ILIKE $1 OR 
      p.apellido ILIKE $1 OR 
      ca.nombre ILIKE $1 OR 
      r.estado::text ILIKE $1
  `;

  const [datos, total] = await Promise.all([
    pool.query(query, [termino, limite, offset]),
    pool.query(totalQuery, [termino])
  ]);

  return { reservas: datos.rows, total: parseInt(total.rows[0].count) };
};

const obtenerReservaPorId = async (id) => {
  const query = `
    SELECT 
      r.*,
      ${estadoCalculado},
      c.id_cliente,
      p.nombre AS cliente_nombre,
      p.apellido AS cliente_apellido,
      p.correo AS cliente_correo,
      ca.id_cancha,
      ca.nombre AS cancha_nombre,
      MIN(rh.hora_inicio) AS hora_inicio,
      MAX(rh.hora_fin) AS hora_fin
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario p ON c.id_cliente = p.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    LEFT JOIN reserva_horario rh ON r.id_reserva = rh.id_reserva
    WHERE r.id_reserva = $1
    GROUP BY r.id_reserva, c.id_cliente, p.id_persona, ca.id_cancha
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// ===================================================
// ============= CREAR RESERVA =======================
// ===================================================

const crearReserva = async (datos) => {
  if (datos.saldo_pendiente > datos.monto_total)
    throw new Error("El saldo pendiente no puede ser mayor que el monto total");

  let estado = 'pendiente';
  if (datos.saldo_pendiente > 0 && datos.saldo_pendiente < datos.monto_total)
    estado = 'en_cuotas';
  else if (datos.saldo_pendiente === datos.monto_total)
    estado = 'pagada';

  const insertQuery = `
    INSERT INTO reserva (fecha_reserva, cupo, monto_total, saldo_pendiente, estado, id_cliente, id_cancha)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id_reserva
  `;

  const { rows } = await pool.query(insertQuery, [
    datos.fecha_reserva,
    datos.cupo || null,
    datos.monto_total,
    datos.saldo_pendiente,
    estado,
    datos.id_cliente,
    datos.id_cancha
  ]);

  const id_reserva = rows[0].id_reserva;

  if (datos.hora_inicio && datos.hora_fin) {
    const bloques = generarBloques(
      datos.fecha_reserva,
      datos.hora_inicio,
      datos.hora_fin,
      datos.monto_total
    );

    for (const b of bloques) {
      await pool.query(
        `INSERT INTO reserva_horario (id_reserva, fecha, hora_inicio, hora_fin, monto)
         VALUES ($1, $2, $3, $4, $5)`,
        [id_reserva, b.fecha, b.hora_inicio, b.hora_fin, b.monto]
      );
    }
  }

  return { id_reserva };
};

// ===================================================
// ============= ACTUALIZAR RESERVA ==================
// ===================================================

const actualizarReserva = async (id, datos) => {
  const camposPermitidos = [
    'fecha_reserva',
    'cupo',
    'monto_total',
    'saldo_pendiente',
    'estado',
    'id_cliente',
    'id_cancha'
  ];

  const campos = Object.keys(datos).filter((k) => camposPermitidos.includes(k));

  if (campos.length === 0) throw new Error("No hay campos validos para actualizar");

  const setClause = campos.map((campo, i) => `${campo} = $${i + 2}`).join(', ');
  const values = campos.map((c) => datos[c]);

  const updateQuery = `
    UPDATE reserva SET ${setClause}
    WHERE id_reserva = $1
    RETURNING *
  `;

  const result = await pool.query(updateQuery, [id, ...values]);

  // BORRAR horarios previos
  await pool.query(`DELETE FROM reserva_horario WHERE id_reserva = $1`, [id]);

  if (datos.hora_inicio && datos.hora_fin) {
    const bloques = generarBloques(
      datos.fecha_reserva,
      datos.hora_inicio,
      datos.hora_fin,
      datos.monto_total
    );

    for (const b of bloques) {
      await pool.query(
        `INSERT INTO reserva_horario (id_reserva, fecha, hora_inicio, hora_fin, monto)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, b.fecha, b.hora_inicio, b.hora_fin, b.monto]
      );
    }
  }

  return result.rows[0];
};

// ===================================================
// ============= ELIMINAR RESERVA ====================
// ===================================================

const eliminarReserva = async (id) => {
  await pool.query(`DELETE FROM reserva_horario WHERE id_reserva = $1`, [id]);
  const result = await pool.query(`DELETE FROM reserva WHERE id_reserva = $1 RETURNING id_reserva`, [id]);
  return result.rows[0] || null;
};

// ===================================================
// ============= CONTROLADORES ========================
// ===================================================

const obtenerReservasActivasController = async (req, res) => {
  try {
    const reservas = await obtenerReservasActivas();
    res.json(respuesta(true, "Reservas activas obtenidas correctamente", { reservas }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const datos = await obtenerDatosEspecificos(limit, offset);

    res.json(respuesta(true, "Reservas obtenidas correctamente", datos));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const obtenerReservasFiltradasController = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const valid = ['fecha', 'monto', 'estado'];
    if (!tipo || !valid.includes(tipo))
      return res.status(400).json(respuesta(false, "Tipo de filtro invalido"));

    const datos = await obtenerReservasFiltradas(tipo, limit, offset);

    res.json(respuesta(true, "Reservas filtradas correctamente", datos));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const buscarReservasController = async (req, res) => {
  try {
    const q = req.query.q;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) return res.status(400).json(respuesta(false, "Parametro q requerido"));

    const datos = await buscarReservas(q, limit, offset);

    res.json(respuesta(true, "Reservas encontradas", datos));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const obtenerReservaPorIdController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id) return res.status(400).json(respuesta(false, "ID invalido"));

    const reserva = await obtenerReservaPorId(id);

    if (!reserva)
      return res.status(404).json(respuesta(false, "Reserva no encontrada"));

    res.json(respuesta(true, "Reserva obtenida correctamente", { reserva }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const crearReservaController = async (req, res) => {
  try {
    const nueva = await crearReserva(req.body);
    res.json(respuesta(true, "Reserva creada correctamente", { reserva: nueva }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const actualizarReservaController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const datos = req.body;

    const actualizada = await actualizarReserva(id, datos);

    res.json(respuesta(true, "Reserva actualizada correctamente", { reserva: actualizada }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const eliminarReservaController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const eliminada = await eliminarReserva(id);

    res.json(respuesta(true, "Reserva eliminada", { reserva: eliminada }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const cancelarReservasVencidasController = async (req, res) => {
  try {
    const q = `
      WITH now_data AS (
        SELECT
          (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date AS fecha_hoy,
          (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::time AS hora_ahora
      ),
      primer_horario AS (
        SELECT
          rh.id_reserva,
          MIN(rh.fecha) AS fecha,
          MIN(rh.hora_inicio) AS hora_inicio
        FROM reserva_horario rh
        GROUP BY rh.id_reserva
      ),
      actualizadas AS (
        UPDATE reserva r
        SET estado = 'cancelada'
        FROM primer_horario ph, now_data n
        WHERE r.id_reserva = ph.id_reserva
          AND r.estado IN ('pendiente','en_cuotas')
          AND (
            ph.fecha < n.fecha_hoy
            OR (ph.fecha = n.fecha_hoy AND ph.hora_inicio <= n.hora_ahora)
          )
        RETURNING r.id_reserva
      )
      SELECT COUNT(*) AS total
      FROM actualizadas
    `;
    const result = await pool.query(q);
    res.json(respuesta(true, "Reservas vencidas canceladas", result.rows[0]));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

// ===================================================
// =================== RUTAS =========================
// ===================================================

router.get('/activas', obtenerReservasActivasController);
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerReservasFiltradasController);
router.get('/buscar', buscarReservasController);
router.get('/dato-individual/:id', obtenerReservaPorIdController);
router.post('/', crearReservaController);
router.patch('/:id', actualizarReservaController);
router.delete('/:id', eliminarReservaController);
router.post('/cancelar-vencidas', cancelarReservasVencidasController);

module.exports = router;
