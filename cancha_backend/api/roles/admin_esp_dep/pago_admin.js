const express = require('express');
const pool = require('../../../config/database');

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });

// =====================================================================================
// FILTRO GENERAL DE PAGOS SEGUN LAS CANCHAS DEL ADMIN
// =====================================================================================

const obtenerPagosAdmin = async (
  id_admin_esp_dep,
  limite = 10,
  offset = 0,
  id_reserva = null,
  id_cancha = null,
  id_espacio = null,
  id_canchas = []
) => {
  try {
    const params = [id_admin_esp_dep];
    let filtros = 'WHERE e.id_admin_esp_dep = $1';

    // filtro por canchas del admin (ARRAY REAL)
    if (Array.isArray(id_canchas) && id_canchas.length > 0) {
      const pos = id_canchas.map((_, i) => `$${params.length + i + 1}`).join(',');
      filtros += ` AND ca.id_cancha IN (${pos})`;
      params.push(...id_canchas.map(Number));
    }

    // filtro por id_reserva exacto
    if (id_reserva) {
      params.push(id_reserva);
      filtros += ` AND p.id_reserva = $${params.length}`;
    }

    // filtro por cancha especifica de la URL
    if (id_cancha) {
      params.push(id_cancha);
      filtros += ` AND ca.id_cancha = $${params.length}`;
    }

    // filtro por espacio especifico
    if (id_espacio) {
      params.push(id_espacio);
      filtros += ` AND e.id_espacio = $${params.length}`;
    }

    params.push(limite, offset);

    const query = `
      SELECT 
        p.id_pago, p.monto, p.metodo_pago, p.fecha_pago,
        r.id_reserva, r.estado AS estado_reserva,
        c.id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        ca.id_cancha, ca.nombre AS cancha_nombre,
        e.id_espacio, e.nombre AS espacio_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      ${filtros}
      ORDER BY p.fecha_pago DESC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      ${filtros};
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(query, params),
      pool.query(queryTotal, params.slice(0, params.length - 2))
    ]);

    return {
      pagos: resultDatos.rows,
      total: Number(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error("Error en obtenerPagosAdmin:", error);
    throw error;
  }
};

// =====================================================================================
// BUSQUEDA GENERAL
// =====================================================================================

const buscarPagosAdmin = async (id_admin_esp_dep, texto, limite = 10, offset = 0, id_canchas = []) => {
  try {
    const termino = `%${texto.replace(/[%_\\]/g, '\\$&')}%`;
    const params = [id_admin_esp_dep];
    let filtros = `WHERE e.id_admin_esp_dep = $1`;

    if (Array.isArray(id_canchas) && id_canchas.length > 0) {
      const pos = id_canchas.map((_, i) => `$${params.length + i + 1}`).join(",");
      filtros += ` AND ca.id_cancha IN (${pos})`;
      params.push(...id_canchas.map(Number));
    }

    params.push(termino, limite, offset);

    const query = `
      SELECT 
        p.id_pago, p.monto, p.metodo_pago, p.fecha_pago,
        r.id_reserva, r.estado AS estado_reserva,
        c.id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        ca.id_cancha, ca.nombre AS cancha_nombre,
        e.id_espacio, e.nombre AS espacio_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      ${filtros}
      AND (
        u.nombre ILIKE $${params.length - 2} OR
        u.apellido ILIKE $${params.length - 2} OR
        ca.nombre ILIKE $${params.length - 2} OR
        p.metodo_pago::text ILIKE $${params.length - 2}
      )
      ORDER BY p.fecha_pago DESC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;

    const queryTotal = `
      SELECT COUNT(*)
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      ${filtros}
      AND (
        u.nombre ILIKE $${params.length - 2} OR
        u.apellido ILIKE $${params.length - 2} OR
        ca.nombre ILIKE $${params.length - 2} OR
        p.metodo_pago::text ILIKE $${params.length - 2}
      );
    `;

    const baseParamsTotal = params.slice(0, Array.isArray(id_canchas) && id_canchas.length > 0 ? 1 + id_canchas.length : 1);
    const paramsTotal = [...baseParamsTotal, termino];

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(query, params),
      pool.query(queryTotal, paramsTotal)
    ]);

    return {
      pagos: resultDatos.rows,
      total: Number(resultTotal.rows[0].count)
    };

  } catch (e) {
    console.error("Error en buscarPagosAdmin:", e);
    throw e;
  }
};

// =====================================================================================
// FILTROS (fecha, monto, metodo)
// =====================================================================================

const obtenerPagosFiltradosAdmin = async (
  id_admin_esp_dep,
  tipoFiltro,
  limite = 10,
  offset = 0,
  id_canchas = []
) => {
  try {
    const ordenes = {
      fecha: 'p.fecha_pago DESC',
      monto: 'p.monto DESC',
      metodo: 'p.metodo_pago ASC',
      default: 'p.id_pago ASC'
    };

    const orden = ordenes[tipoFiltro] || ordenes.default;

    const params = [id_admin_esp_dep];
    let filtros = `WHERE e.id_admin_esp_dep = $1`;

    if (Array.isArray(id_canchas) && id_canchas.length > 0) {
      const pos = id_canchas.map((_, i) => `$${params.length + i + 1}`).join(",");
      filtros += ` AND ca.id_cancha IN (${pos})`;
      params.push(...id_canchas.map(Number));
    }

    params.push(limite, offset);

    const query = `
      SELECT 
        p.id_pago, p.monto, p.metodo_pago, p.fecha_pago,
        r.id_reserva, r.estado AS estado_reserva,
        c.id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        ca.id_cancha, ca.nombre AS cancha_nombre,
        e.id_espacio, e.nombre AS espacio_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      ${filtros}
      ORDER BY ${orden}
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;

    const queryTotal = `
      SELECT COUNT(*)
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      ${filtros};
    `;

    const baseParams = params.slice(0, params.length - 2);

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(query, params),
      pool.query(queryTotal, baseParams)
    ]);

    return {
      pagos: resultDatos.rows,
      total: Number(resultTotal.rows[0].count)
    };

  } catch (error) {
    console.error("Error en obtenerPagosFiltradosAdmin:", error);
    throw error;
  }
};

// =====================================================================================
// CREAR PAGO
// =====================================================================================

const crearPago = async (input) => {
  const client = await pool.connect();
  try {
    const idReserva = parseInt(input.id_reserva);
    const montoNum = Number(input.monto);
    const metodoPago = String(input.metodo_pago || '').trim();
    const fechaPago = input.fecha_pago ? new Date(input.fecha_pago) : new Date();

    if (!Number.isInteger(idReserva)) throw new Error("id_reserva invalido");
    if (!Number.isFinite(montoNum) || montoNum <= 0) throw new Error("Monto invalido");
    if (!metodoPago) throw new Error("metodo_pago requerido");

    await client.query("BEGIN");

    const resReserva = await client.query(
      `
      SELECT id_reserva, monto_total, saldo_pendiente, estado
      FROM reserva
      WHERE id_reserva = $1
      FOR UPDATE
      `,
      [idReserva]
    );

    if (!resReserva.rows[0]) throw new Error("Reserva no encontrada");

    const reserva = resReserva.rows[0];

    if (reserva.estado === "cancelada") throw new Error("Reserva cancelada");
    if (reserva.estado === "pagada") throw new Error("Reserva ya pagada");

    if (reserva.monto_total == null) throw new Error("Reserva sin monto_total");

    const montoTotal = Number(reserva.monto_total || 0);

    let saldoPendiente =
      reserva.saldo_pendiente != null ? Number(reserva.saldo_pendiente) : null;

    if (saldoPendiente === null) {
      const resSuma = await client.query(
        "SELECT COALESCE(SUM(monto),0) AS total_pagado FROM pago WHERE id_reserva = $1",
        [idReserva]
      );
      const totalPagado = Number(resSuma.rows[0].total_pagado || 0);
      saldoPendiente = montoTotal - totalPagado;
      if (saldoPendiente < 0) saldoPendiente = 0;
    }

    if (montoNum > saldoPendiente)
      throw new Error("El monto supera el saldo pendiente");

    const nuevoSaldo = Math.max(0, saldoPendiente - montoNum);
    const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "en_cuotas";

    const resPago = await client.query(
      `
      INSERT INTO pago (id_reserva, monto, metodo_pago, fecha_pago)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [idReserva, montoNum, metodoPago, fechaPago]
    );

    const pago = resPago.rows[0];

    await client.query(
      `
      UPDATE reserva
      SET saldo_pendiente = $2,
          estado = $3
      WHERE id_reserva = $1
      `,
      [idReserva, nuevoSaldo, nuevoEstado]
    );

    await client.query("COMMIT");

    return {
      pago,
      reserva_actualizada: {
        id_reserva: idReserva,
        saldo_pendiente: nuevoSaldo,
        estado: nuevoEstado
      }
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

// =====================================================================================
// CONTROLADORES
// =====================================================================================

const obtenerPagosAdminController = async (req, res) => {
  try {
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep);
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const id_reserva = req.query.id_reserva ? parseInt(req.query.id_reserva) : null;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha) : null;
    const id_espacio = req.query.id_espacio ? parseInt(req.query.id_espacio) : null;

    let id_canchas = [];
    if (req.query.id_canchas) id_canchas = JSON.parse(req.query.id_canchas);

    if (isNaN(id_admin_esp_dep))
      return res.status(400).json(respuesta(false, "id_admin_esp_dep requerido"));

    const { pagos, total } = await obtenerPagosAdmin(
      id_admin_esp_dep,
      limite,
      offset,
      id_reserva,
      id_cancha,
      id_espacio,
      id_canchas
    );

    res.json(
      respuesta(true, "OK", {
        pagos,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const buscarPagosAdminController = async (req, res) => {
  try {
    const { q, id_admin_esp_dep } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let id_canchas = [];
    if (req.query.id_canchas) id_canchas = JSON.parse(req.query.id_canchas);

    if (!q) return res.status(400).json(respuesta(false, "Texto requerido"));

    const { pagos, total } = await buscarPagosAdmin(
      parseInt(id_admin_esp_dep),
      q,
      limite,
      offset,
      id_canchas
    );

    res.json(
      respuesta(true, "OK", {
        pagos,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerPagosFiltradosAdminController = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep);
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let id_canchas = [];
    if (req.query.id_canchas) id_canchas = JSON.parse(req.query.id_canchas);

    const { pagos, total } = await obtenerPagosFiltradosAdmin(
      id_admin_esp_dep,
      tipo,
      limite,
      offset,
      id_canchas
    );

    res.json(
      respuesta(true, "OK", {
        pagos,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const crearPagoController = async (req, res) => {
  try {
    const { id_reserva, monto, metodo_pago, fecha_pago } = req.body;
    const result = await crearPago({ id_reserva, monto, metodo_pago, fecha_pago });
    res.status(201).json(respuesta(true, "OK", result));
  } catch (e) {
    res.status(400).json(respuesta(false, e.message));
  }
};

//  RUTAS
router.post("/", crearPagoController);
router.get("/datos-especificos", obtenerPagosAdminController);
router.get("/buscar", buscarPagosAdminController);
router.get("/filtro", obtenerPagosFiltradosAdminController);

module.exports = router;
