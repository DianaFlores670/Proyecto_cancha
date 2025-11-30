const express = require("express");
const pool = require("../../../config/database");
const generarCodigoQR = require("../../../utils/generarCodigoQR");

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos
});

const generarBloques = (fecha_reserva, hora_inicio, hora_fin, monto_total) => {
  const inicio = new Date(`1970-01-01T${hora_inicio}:00`);
  const fin = new Date(`1970-01-01T${hora_fin}:00`);
  const diff = (fin - inicio) / (1000 * 60 * 60);
  if (diff <= 0) throw new Error("hora_fin debe ser mayor");

  const montoBloque = monto_total / diff;
  const lista = [];
  let h = new Date(inicio);

  while (h < fin) {
    const h2 = new Date(h);
    h2.setHours(h.getHours() + 1);

    lista.push({
      fecha: fecha_reserva,
      hora_inicio: h.toTimeString().slice(0, 5),
      hora_fin: h2.toTimeString().slice(0, 5),
      monto: montoBloque
    });

    h = h2;
  }
  return lista;
};

const regenerarQrReserva = async (id_reserva) => {
  const ahora = new Date();
  const fechaGenerado = ahora.toISOString();
  const fechaExpira = new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const codigo = generarCodigoQR(id_reserva);

  const resExistente = await pool.query(
    "SELECT id_qr FROM qr_reserva WHERE id_reserva = $1 LIMIT 1",
    [id_reserva]
  );

  if (resExistente.rows[0]) {
    const id_qr = resExistente.rows[0].id_qr;
    const upd = await pool.query(
      `
      UPDATE qr_reserva
      SET fecha_generado = $1,
          fecha_expira = $2,
          codigo_qr = $3,
          estado = $4,
          verificado = $5
      WHERE id_qr = $6
      RETURNING *
      `,
      [fechaGenerado, fechaExpira, codigo, "activo", false, id_qr]
    );
    return upd.rows[0];
  } else {
    const ins = await pool.query(
      `
      INSERT INTO qr_reserva
      (fecha_generado, fecha_expira, codigo_qr, estado, id_reserva, id_control, verificado)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [fechaGenerado, fechaExpira, codigo, "activo", id_reserva, null, false]
    );
    return ins.rows[0];
  }
};

const obtenerDatosEspecificos = async (id_admin_esp_dep, limit, offset, id_cancha) => {
  const params = [id_admin_esp_dep];
  let flt = "";

  if (id_cancha) {
    params.push(id_cancha);
    flt = `AND ca.id_cancha = $${params.length}`;
  }

  params.push(limit, offset);

  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.id_cliente,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre,
      MIN(rh.hora_inicio) AS hora_inicio,
      MAX(rh.hora_fin) AS hora_fin
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    LEFT JOIN reserva_horario rh ON r.id_reserva = rh.id_reserva
    WHERE e.id_admin_esp_dep = $1
    ${flt}
    GROUP BY r.id_reserva, c.id_cliente, u.id_persona, ca.id_cancha
    ORDER BY r.fecha_reserva DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const q2 = `
    SELECT COUNT(*) 
    FROM reserva r
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    WHERE e.id_admin_esp_dep = $1
    ${flt}
  `;

  const [datos, total] = await Promise.all([
    pool.query(q, params),
    pool.query(q2, params.slice(0, id_cancha ? 2 : 1))
  ]);

  return {
    reservas: datos.rows,
    total: parseInt(total.rows[0].count, 10)
  };
};

const obtenerReservasFiltradas = async (id_admin_esp_dep, tipo, limit, offset, id_cancha) => {
  const ordenes = {
    fecha: "r.fecha_reserva DESC",
    monto: "r.monto_total ASC",
    estado: "r.estado ASC",
    default: "r.id_reserva ASC"
  };

  const orden = ordenes[tipo] || ordenes.default;
  const params = [id_admin_esp_dep];
  let flt = "";

  if (id_cancha) {
    params.push(id_cancha);
    flt = `AND ca.id_cancha = $${params.length}`;
  }

  params.push(limit, offset);

  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.id_cliente,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre,
      MIN(rh.hora_inicio) AS hora_inicio,
      MAX(rh.hora_fin) AS hora_fin
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    LEFT JOIN reserva_horario rh ON r.id_reserva = rh.id_reserva
    WHERE e.id_admin_esp_dep = $1
    ${flt}
    GROUP BY r.id_reserva, c.id_cliente, u.id_persona, ca.id_cancha
    ORDER BY ${orden}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const q2 = `
    SELECT COUNT(*) 
    FROM reserva r
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    WHERE e.id_admin_esp_dep = $1
    ${flt}
  `;

  const [datos, total] = await Promise.all([
    pool.query(q, params),
    pool.query(q2, params.slice(0, id_cancha ? 2 : 1))
  ]);

  return {
    reservas: datos.rows,
    total: parseInt(total.rows[0].count, 10)
  };
};

const buscarReservas = async (id_admin_esp_dep, texto, limit, offset, id_cancha) => {
  const params = [id_admin_esp_dep];
  let flt = "";

  if (id_cancha) {
    params.push(id_cancha);
    flt = `AND ca.id_cancha = $${params.length}`;
  }

  const safe = `%${texto.replace(/[%_\\]/g, "\\$&")}%`;

  params.push(safe, limit, offset);

  const q = `
    SELECT 
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado,
      c.id_cliente,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre,
      MIN(rh.hora_inicio) AS hora_inicio,
      MAX(rh.hora_fin) AS hora_fin
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    LEFT JOIN reserva_horario rh ON r.id_reserva = rh.id_reserva
    WHERE e.id_admin_esp_dep = $1
    ${flt}
    AND (
      u.nombre ILIKE $${params.length - 2} OR
      u.apellido ILIKE $${params.length - 2} OR
      ca.nombre ILIKE $${params.length - 2} OR
      r.estado::text ILIKE $${params.length - 2}
    )
    GROUP BY r.id_reserva, c.id_cliente, u.id_persona, ca.id_cancha
    ORDER BY r.fecha_reserva DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const q2 = `
    SELECT COUNT(*)
    FROM reserva r
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    WHERE e.id_admin_esp_dep = $1
    ${flt}
    AND (
      u.nombre ILIKE $2 OR
      u.apellido ILIKE $2 OR
      ca.nombre ILIKE $2 OR
      r.estado::text ILIKE $2
    )
  `;

  const baseParams = params.slice(0, id_cancha ? 2 : 1);

  const [datos, total] = await Promise.all([
    pool.query(q, params),
    pool.query(q2, baseParams.concat(safe))
  ]);

  return {
    reservas: datos.rows,
    total: parseInt(total.rows[0].count, 10)
  };
};

const obtenerReservaPorId = async (id_reserva, id_admin_esp_dep) => {
  const q = `
    SELECT 
      r.*,
      c.id_cliente,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre,
      e.id_espacio,
      e.nombre AS espacio_nombre,
      MIN(rh.hora_inicio) AS hora_inicio,
      MAX(rh.hora_fin) AS hora_fin,
      MAX(qr.codigo_qr) AS codigo_qr
    FROM reserva r
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    LEFT JOIN reserva_horario rh ON r.id_reserva = rh.id_reserva
    LEFT JOIN LATERAL (
      SELECT codigo_qr
      FROM qr_reserva
      WHERE id_reserva = r.id_reserva
      ORDER BY fecha_generado DESC
      LIMIT 1
    ) qr ON true
    WHERE r.id_reserva = $1
    AND e.id_admin_esp_dep = $2
    GROUP BY r.id_reserva, c.id_cliente, u.id_persona, ca.id_cancha, e.id_espacio
  `;

  const result = await pool.query(q, [id_reserva, id_admin_esp_dep]);
  return result.rows[0] || null;
};

const crearReserva = async (datos) => {
  const estado = datos.estado || "pendiente";

  const q = `
    INSERT INTO reserva 
    (fecha_reserva, cupo, monto_total, saldo_pendiente, estado, id_cliente, id_cancha)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id_reserva
  `;

  const r = await pool.query(q, [
    datos.fecha_reserva,
    datos.cupo || null,
    datos.monto_total,
    datos.saldo_pendiente,
    estado,
    datos.id_cliente,
    datos.id_cancha
  ]);

  const id_reserva = r.rows[0].id_reserva;

  if (datos.hora_inicio && datos.hora_fin) {
    const bloques = generarBloques(
      datos.fecha_reserva,
      datos.hora_inicio,
      datos.hora_fin,
      datos.monto_total
    );

    for (const b of bloques) {
      await pool.query(
        `
        INSERT INTO reserva_horario (id_reserva, fecha, hora_inicio, hora_fin, monto)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [id_reserva, b.fecha, b.hora_inicio, b.hora_fin, b.monto]
      );
    }
  }

  const qr = await regenerarQrReserva(id_reserva);

  return { id_reserva, codigo_qr: qr ? qr.codigo_qr : null };
};

const actualizarReserva = async (id_reserva, id_admin_esp_dep, datos) => {
  const camposPermitidos = [
    "fecha_reserva",
    "cupo",
    "monto_total",
    "saldo_pendiente",
    "estado",
    "id_cliente",
    "id_cancha"
  ];

  const campos = Object.keys(datos).filter(c => camposPermitidos.includes(c));
  if (!campos.length) throw new Error("No hay campos validos");

  const setClause = campos.map((c, i) => `${c}=$${i + 3}`).join(", ");
  const values = campos.map(c => datos[c]);

  const q = `
    UPDATE reserva
    SET ${setClause}
    WHERE id_reserva=$1
    AND id_cancha IN (
      SELECT ca.id_cancha
      FROM cancha ca
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep=$2
    )
    RETURNING *
  `;

  const r = await pool.query(q, [id_reserva, id_admin_esp_dep, ...values]);
  const updated = r.rows[0];
  if (!updated) throw new Error("No se pudo actualizar");

  await pool.query("DELETE FROM reserva_horario WHERE id_reserva=$1", [id_reserva]);

  if (datos.hora_inicio && datos.hora_fin) {
    const bloques = generarBloques(
      updated.fecha_reserva,
      datos.hora_inicio,
      datos.hora_fin,
      updated.monto_total
    );

    for (const b of bloques) {
      await pool.query(
        `
        INSERT INTO reserva_horario (id_reserva, fecha, hora_inicio, hora_fin, monto)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [id_reserva, b.fecha, b.hora_inicio, b.hora_fin, b.monto]
      );
    }
  }

  const qr = await regenerarQrReserva(id_reserva);

  return { ...updated, codigo_qr: qr ? qr.codigo_qr : null };
};

const eliminarReserva = async (id_reserva, id_admin_esp_dep) => {
  const q = `
    DELETE FROM reserva
    WHERE id_reserva=$1
    AND id_cancha IN (
      SELECT ca.id_cancha
      FROM cancha ca
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep=$2
    )
    RETURNING id_reserva
  `;

  await pool.query("DELETE FROM reserva_horario WHERE id_reserva=$1", [id_reserva]);
  await pool.query("DELETE FROM qr_reserva WHERE id_reserva=$1", [id_reserva]);

  const r = await pool.query(q, [id_reserva, id_admin_esp_dep]);
  return r.rows[0] || null;
};

const obtenerCalendario = async (id_admin_esp_dep, startISO, endISO, id_cancha, id_espacio) => {
  const flt = [
    "e.id_admin_esp_dep = $1",
    "tsrange(($2)::timestamp, ($3)::timestamp, '[)') && tsrange(rh.fecha + rh.hora_inicio, rh.fecha + rh.hora_fin, '[)')"
  ];
  const values = [id_admin_esp_dep, startISO, endISO];
  let i = 4;

  if (id_cancha) {
    flt.push(`ca.id_cancha = $${i}`);
    values.push(parseInt(id_cancha, 10));
    i++;
  }

  if (id_espacio) {
    flt.push(`e.id_espacio = $${i}`);
    values.push(parseInt(id_espacio, 10));
    i++;
  }

  const q = `
    SELECT
      rh.id_horario,
      r.id_reserva,
      (rh.fecha + rh.hora_inicio) AS start_ts,
      (rh.fecha + rh.hora_fin) AS end_ts,
      r.estado,
      ca.id_cancha,
      ca.nombre AS cancha_nombre,
      e.id_espacio,
      e.nombre AS espacio_nombre,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido
    FROM reserva_horario rh
    JOIN reserva r ON rh.id_reserva = r.id_reserva
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    WHERE ${flt.join(" AND ")}
    ORDER BY start_ts ASC
  `;

  const r = await pool.query(q, values);
  return r.rows;
};

const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const id = parseInt(req.query.id_admin_esp_dep, 10);
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha, 10) : null;

    if (isNaN(id)) {
      return res.status(400).json(respuesta(false, "id_admin_esp_dep requerido"));
    }

    const d = await obtenerDatosEspecificos(id, limit, offset, id_cancha);

    res.json(
      respuesta(true, "OK", {
        reservas: d.reservas,
        paginacion: { limite: limit, offset, total: d.total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerReservasFiltradasController = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const id = parseInt(req.query.id_admin_esp_dep, 10);
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha, 10) : null;

    if (isNaN(id)) {
      return res.status(400).json(respuesta(false, "id_admin_esp_dep requerido"));
    }

    const d = await obtenerReservasFiltradas(id, tipo, limit, offset, id_cancha);

    res.json(
      respuesta(true, "OK", {
        reservas: d.reservas,
        paginacion: { limite: limit, offset, total: d.total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const buscarReservasController = async (req, res) => {
  try {
    const { q: texto, id_admin_esp_dep } = req.query;

    const id = parseInt(id_admin_esp_dep, 10);
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha, 10) : null;

    if (isNaN(id)) {
      return res.status(400).json(respuesta(false, "id_admin_esp_dep requerido"));
    }

    if (!texto || texto.trim() === "") {
      return res.status(400).json(respuesta(false, "q requerido"));
    }

    const d = await buscarReservas(id, texto, limit, offset, id_cancha);

    res.json(
      respuesta(true, "OK", {
        reservas: d.reservas,
        paginacion: { limite: limit, offset, total: d.total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerReservaPorIdController = async (req, res) => {
  try {
    const id_reserva = parseInt(req.params.id, 10);
    const id = parseInt(req.query.id_admin_esp_dep, 10);

    if (isNaN(id_reserva) || isNaN(id)) {
      return res.status(400).json(respuesta(false, "Parametros invalidos"));
    }

    const d = await obtenerReservaPorId(id_reserva, id);
    if (!d) {
      return res.status(404).json(respuesta(false, "No encontrado"));
    }

    res.json(respuesta(true, "OK", { reserva: d }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const crearReservaController = async (req, res) => {
  try {
    const id = parseInt(req.query.id_admin_esp_dep || req.body.id_admin_esp_dep, 10);
    if (isNaN(id)) {
      return res.status(400).json(respuesta(false, "id_admin_esp_dep requerido"));
    }

    const nueva = await crearReserva(req.body);

    res.json(respuesta(true, "OK", { reserva: nueva }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const actualizarReservaController = async (req, res) => {
  try {
    const id_reserva = parseInt(req.params.id, 10);
    const id = parseInt(req.query.id_admin_esp_dep, 10);

    if (isNaN(id_reserva) || isNaN(id)) {
      return res.status(400).json(respuesta(false, "Datos invalidos"));
    }

    const updated = await actualizarReserva(id_reserva, id, req.body);

    res.json(respuesta(true, "OK", { reserva: updated }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const eliminarReservaController = async (req, res) => {
  try {
    const id_reserva = parseInt(req.params.id, 10);
    const id = parseInt(req.query.id_admin_esp_dep, 10);

    if (isNaN(id_reserva) || isNaN(id)) {
      return res.status(400).json(respuesta(false, "Datos invalidos"));
    }

    const d = await eliminarReserva(id_reserva, id);
    if (!d) {
      return res.status(404).json(respuesta(false, "No se pudo eliminar"));
    }

    res.json(respuesta(true, "OK"));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerCalendarioController = async (req, res) => {
  try {
    const id = parseInt(req.query.id_admin_esp_dep, 10);
    const start = req.query.start;
    const end = req.query.end;
    const id_cancha = req.query.id_cancha || null;
    const id_espacio = req.query.id_espacio || null;

    if (isNaN(id) || !start || !end) {
      return res.status(400).json(respuesta(false, "Parametros requeridos"));
    }

    const eventos = await obtenerCalendario(id, start, end, id_cancha, id_espacio);

    res.json(respuesta(true, "OK", { eventos }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

router.get("/datos-especificos", obtenerDatosEspecificosController);
router.get("/filtro", obtenerReservasFiltradasController);
router.get("/buscar", buscarReservasController);
router.get("/dato-individual/:id", obtenerReservaPorIdController);
router.post("/", crearReservaController);
router.patch("/:id", actualizarReservaController);
router.delete("/:id", eliminarReservaController);
router.get("/calendario", obtenerCalendarioController);

module.exports = router;