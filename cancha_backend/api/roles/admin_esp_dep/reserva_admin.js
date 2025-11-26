const express = require('express');
const pool = require('../../../config/database');

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos
});

const obtenerDatosEspecificos = async (id_admin_esp_dep, limite = 10, offset = 0, id_cancha = null) => {
  try {
    const params = [id_admin_esp_dep];
    let filterCancha = '';

    if (id_cancha) {
      params.push(id_cancha);
      filterCancha = `AND ca.id_cancha = $${params.length}`;
    }

    params.push(limite, offset);

    const queryDatos = `
      SELECT 
        r.id_reserva, r.fecha_reserva, r.cupo, r.monto_total, r.saldo_pendiente, r.estado,
        c.id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        ca.id_cancha, ca.nombre AS cancha_nombre,
        e.id_espacio, e.nombre AS espacio_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep = $1
      ${filterCancha}
      ORDER BY r.fecha_reserva DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const totalParams = id_cancha
      ? [id_admin_esp_dep, id_cancha]
      : [id_admin_esp_dep];

    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva r
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep = $1
      ${filterCancha}
    `;

    const resultDatos = await pool.query(queryDatos, params);
    const resultTotal = await pool.query(queryTotal, totalParams);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error('Error en obtenerDatosEspecificos:', error);
    throw error;
  }
};

const obtenerReservasFiltradas = async (id_admin_esp_dep, tipoFiltro, limite = 10, offset = 0, id_cancha = null) => {
  try {
    if (!id_admin_esp_dep || isNaN(id_admin_esp_dep)) {
      throw new Error('id_admin_esp_dep es requerido y debe ser numerico');
    }

    const ordenesPermitidas = {
      fecha: 'r.fecha_reserva DESC',
      monto: 'r.monto_total ASC',
      estado: 'r.estado ASC',
      default: 'r.id_reserva ASC'
    };
    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const params = [id_admin_esp_dep];
    let filterCancha = '';
    if (id_cancha) {
      params.push(id_cancha);
      filterCancha = `AND ca.id_cancha = $${params.length}`;
    }

    params.push(limite, offset);

    const queryDatos = `
      SELECT 
        r.id_reserva, r.fecha_reserva, r.cupo, r.monto_total, r.saldo_pendiente, r.estado,
        c.id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        ca.id_cancha, ca.nombre AS cancha_nombre,
        e.id_espacio, e.nombre AS espacio_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep = $1
      ${filterCancha}
      ORDER BY ${orden}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva r
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep = $1
      ${filterCancha}
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, params),
      pool.query(queryTotal, params.slice(0, id_cancha ? 2 : 1))
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error('Error en obtenerReservasFiltradas:', error);
    throw error;
  }
};

const buscarReservas = async (id_admin_esp_dep, texto, limite = 10, offset = 0, id_cancha = null) => {
  try {
    const params = [id_admin_esp_dep];
    let filterCancha = '';
    if (id_cancha) {
      params.push(id_cancha);
      filterCancha = `AND ca.id_cancha = $${params.length}`;
    }

    params.push(`%${texto.replace(/[%_\\]/g, '\\$&')}%`, limite, offset);

    const queryDatos = `
      SELECT 
        r.id_reserva, r.fecha_reserva, r.cupo, r.monto_total, r.saldo_pendiente, r.estado,
        c.id_cliente, u.nombre AS cliente_nombre, u.apellido AS cliente_apellido,
        ca.id_cancha, ca.nombre AS cancha_nombre,
        e.id_espacio, e.nombre AS espacio_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep = $1
      ${filterCancha}
        AND (
          u.nombre ILIKE $${params.length - 2} OR 
          u.apellido ILIKE $${params.length - 2} OR 
          ca.nombre ILIKE $${params.length - 2} OR 
          r.estado::text ILIKE $${params.length - 2}
        )
      ORDER BY r.fecha_reserva DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE e.id_admin_esp_dep = $1
      ${filterCancha}
        AND (
          u.nombre ILIKE $${params.length - 2} OR 
          u.apellido ILIKE $${params.length - 2} OR 
          ca.nombre ILIKE $${params.length - 2} OR 
          r.estado::text ILIKE $${params.length - 2}
        )
    `;

    const baseParams = params.slice(0, id_cancha ? 2 : 1);
    const searchParam = params[params.length - 3];

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, params),
      pool.query(queryTotal, baseParams.concat(searchParam))
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error('Error en buscarReservas:', error);
    throw error;
  }
};

const obtenerReservaPorId = async (id_reserva, id_admin_esp_dep) => {
  try {
    const query = `
      SELECT
        r.*,
        c.id_cliente,
        u.nombre AS cliente_nombre,
        u.apellido AS cliente_apellido,
        u.correo AS cliente_correo,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        e.id_espacio,
        e.nombre AS espacio_nombre,
        qr.id_qr,
        qr.codigo_qr,
        qr.estado AS qr_estado,
        qr.fecha_generado AS qr_fecha_generado,
        qr.fecha_expira AS qr_fecha_expira,
        qr.verificado AS qr_verificado
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      LEFT JOIN LATERAL (
        SELECT
          id_qr,
          codigo_qr,
          estado,
          fecha_generado,
          fecha_expira,
          verificado
        FROM qr_reserva
        WHERE id_reserva = r.id_reserva
        ORDER BY fecha_generado DESC
        LIMIT 1
      ) qr ON true
      WHERE r.id_reserva = $1
        AND e.id_admin_esp_dep = $2
    `;

    const result = await pool.query(query, [id_reserva, id_admin_esp_dep]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error en obtenerReservaPorId:', error);
    throw error;
  }
};

const crearReserva = async (datos) => {
  try {
    const { id_cliente, id_cancha, fecha_reserva, cupo, monto_total, saldo_pendiente, estado } = datos;

    if (!id_cliente || !id_cancha || !fecha_reserva || !estado) {
      throw new Error('Faltan campos obligatorios');
    }

    const validacion = `
      SELECT e.id_admin_esp_dep
      FROM cancha ca
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      WHERE ca.id_cancha = $1 AND e.id_admin_esp_dep = $2
    `;
    const resultVal = await pool.query(validacion, [id_cancha, datos.id_admin_esp_dep]);
    if (!resultVal.rows.length) throw new Error('La cancha no pertenece al administrador actual');

    const query = `
      INSERT INTO reserva (fecha_reserva, cupo, monto_total, saldo_pendiente, estado, id_cliente, id_cancha)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `;
    const values = [fecha_reserva, cupo || null, monto_total || 0, saldo_pendiente || 0, estado, id_cliente, id_cancha];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error en crearReserva:', error);
    throw error;
  }
};

const actualizarReserva = async (id, id_admin_esp_dep, camposActualizar) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reserva = await obtenerReservaPorId(id, id_admin_esp_dep);
    if (!reserva) throw new Error('Reserva no encontrada o no pertenece al administrador');

    const camposPermitidos = [
      'fecha_reserva',
      'cupo',
      'monto_total',
      'saldo_pendiente',
      'estado',
      'id_cliente',
      'id_cancha'
    ];
    const campos = Object.keys(camposActualizar).filter(c => camposPermitidos.includes(c));
    if (!campos.length) throw new Error('No hay campos validos para actualizar');

    if (camposActualizar.id_cliente) {
      const clienteExiste = await client.query('SELECT 1 FROM cliente WHERE id_cliente=$1', [camposActualizar.id_cliente]);
      if (!clienteExiste.rows.length) throw new Error('El cliente indicado no existe');
    }

    if (camposActualizar.id_cancha) {
      const canchaValida = await client.query(
        `
         SELECT ca.id_cancha
         FROM cancha ca
         JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
         WHERE ca.id_cancha=$1 AND e.id_admin_esp_dep=$2
        `,
        [camposActualizar.id_cancha, id_admin_esp_dep]
      );
      if (!canchaValida.rows.length) throw new Error('La cancha indicada no pertenece a este administrador');
    }

    const setClause = campos.map((c, i) => `${c}=$${i + 3}`).join(', ');
    const values = [id, id_admin_esp_dep, ...campos.map(c => camposActualizar[c])];

    const queryReserva = `
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
    const result = await client.query(queryReserva, values);
    const updated = result.rows[0];
    if (!updated) throw new Error('No se pudo actualizar la reserva');

    if (updated && (camposActualizar.fecha_reserva || camposActualizar.monto_total)) {
      const queryUpdateHorario = `
        UPDATE reserva_horario
        SET
          ${camposActualizar.fecha_reserva ? 'fecha = $2' : 'fecha = fecha'},
          ${camposActualizar.monto_total ? 'monto = $3' : 'monto = monto'}
        WHERE id_reserva = $1
      `;
      const v2 = [
        id,
        camposActualizar.fecha_reserva || null,
        camposActualizar.monto_total || null
      ];
      await client.query(queryUpdateHorario, v2);
    }

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en actualizarReserva:', error);
    throw error;
  } finally {
    client.release();
  }
};

const eliminarReserva = async (id, id_admin_esp_dep) => {
  try {
    const query = `
      DELETE FROM reserva
      WHERE id_reserva=$1 AND id_cancha IN (
        SELECT ca.id_cancha
        FROM cancha ca
        JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
        WHERE e.id_admin_esp_dep=$2
      )
      RETURNING id_reserva
    `;
    const result = await pool.query(query, [id, id_admin_esp_dep]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error en eliminarReserva:', error);
    throw error;
  }
};

const obtenerCalendario = async (id_admin_esp_dep, startISO, endISO, id_cancha, id_espacio) => {
  try {
    const filtros = [
      'e.id_admin_esp_dep = $1',
      "tsrange(($2)::timestamp, ($3)::timestamp, '[)') && tsrange(rh.fecha + rh.hora_inicio, rh.fecha + rh.hora_fin, '[)')"
    ];
    const values = [id_admin_esp_dep, startISO, endISO];
    let idx = 4;
    if (id_cancha) {
      filtros.push(`ca.id_cancha = $${idx}`);
      values.push(parseInt(id_cancha));
      idx++;
    }
    if (id_espacio) {
      filtros.push(`e.id_espacio = $${idx}`);
      values.push(parseInt(id_espacio));
      idx++;
    }

    const query = `
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
        u.apellido AS cliente_apellido,
        CASE
          WHEN r.estado = 'pagada' THEN '#16a34a'
          WHEN r.estado = 'pendiente' THEN '#f59e0b'
          WHEN r.estado = 'en_cuotas' THEN '#3b82f6'
          WHEN r.estado = 'cancelada' THEN '#6b7280'
          ELSE '#64748b'
        END AS color
      FROM reserva_horario rh
      JOIN reserva r ON rh.id_reserva = r.id_reserva
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      JOIN espacio_deportivo e ON ca.id_espacio = e.id_espacio
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      WHERE ${filtros.join(' AND ')}
      ORDER BY start_ts ASC
    `;
    const result = await pool.query(query, values);
    return result.rows;
  } catch (e) {
    throw e;
  }
};

const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep);
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha) : null;

    if (isNaN(id_admin_esp_dep)) {
      return res.status(400).json(respuesta(false, 'id_admin_esp_dep es requerido y debe ser numerico'));
    }

    const { reservas, total } = await obtenerDatosEspecificos(id_admin_esp_dep, limite, offset, id_cancha);
    res.json(
      respuesta(true, 'Reservas obtenidas correctamente', {
        reservas,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    console.error('Error en obtenerDatosEspecificosController:', e);
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerReservasFiltradasController = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep);
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha) : null;

    if (isNaN(id_admin_esp_dep)) {
      return res.status(400).json(respuesta(false, 'id_admin_esp_dep es requerido y debe ser numerico'));
    }

    const { reservas, total } = await obtenerReservasFiltradas(id_admin_esp_dep, tipo, limite, offset, id_cancha);
    res.json(
      respuesta(true, 'Reservas filtradas correctamente', {
        reservas,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const buscarReservasController = async (req, res) => {
  try {
    const { q, id_admin_esp_dep } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const id_cancha = req.query.id_cancha ? parseInt(req.query.id_cancha) : null;

    const idAdmin = parseInt(id_admin_esp_dep);

    if (isNaN(idAdmin)) {
      return res.status(400).json(respuesta(false, 'id_admin_esp_dep es requerido y debe ser numerico'));
    }

    if (!q || q.trim() === '') {
      return res.status(400).json(respuesta(false, 'Parametro q requerido'));
    }

    const { reservas, total } = await buscarReservas(idAdmin, q, limite, offset, id_cancha);
    res.json(
      respuesta(true, 'Busqueda realizada correctamente', {
        reservas,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerReservaPorIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep);

    const idNum = parseInt(id);

    if (isNaN(idNum) || isNaN(id_admin_esp_dep)) {
      return res
        .status(400)
        .json(respuesta(false, 'Parametros invalidos: id o id_admin_esp_dep no numericos'));
    }

    const reserva = await obtenerReservaPorId(idNum, id_admin_esp_dep);
    if (!reserva) return res.status(404).json(respuesta(false, 'Reserva no encontrada'));
    res.json(respuesta(true, 'Reserva obtenida correctamente', { reserva }));
  } catch (e) {
    console.error('Error en obtenerReservaPorId:', e);
    res.status(500).json(respuesta(false, e.message));
  }
};

const crearReservaController = async (req, res) => {
  try {
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep || req.body.id_admin_esp_dep);
    if (isNaN(id_admin_esp_dep)) {
      return res.status(400).json(respuesta(false, 'id_admin_esp_dep requerido'));
    }

    const nuevaReserva = await crearReserva({ ...req.body, id_admin_esp_dep });
    res
      .status(201)
      .json(respuesta(true, 'Reserva creada correctamente', { reserva: nuevaReserva }));
  } catch (e) {
    console.error('Error en crearReservaController:', e);
    res.status(500).json(respuesta(false, e.message));
  }
};

const actualizarReservaController = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_admin_esp_dep } = req.query;

    const idNum = parseInt(id);
    const idAdmin = parseInt(id_admin_esp_dep);

    if (isNaN(idNum) || isNaN(idAdmin)) {
      return res
        .status(400)
        .json(respuesta(false, 'Parametros invalidos: id o id_admin_esp_dep no numericos'));
    }

    const reservaAct = await actualizarReserva(idNum, idAdmin, req.body);
    if (!reservaAct) {
      return res.status(404).json(respuesta(false, 'No se pudo actualizar la reserva'));
    }
    res.json(respuesta(true, 'Reserva actualizada correctamente', { reserva: reservaAct }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const eliminarReservaController = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_admin_esp_dep } = req.query;

    const idNum = parseInt(id);
    const idAdmin = parseInt(id_admin_esp_dep);

    if (isNaN(idNum) || isNaN(idAdmin)) {
      return res
        .status(400)
        .json(respuesta(false, 'Parametros invalidos: id o id_admin_esp_dep no numericos'));
    }

    const eliminada = await eliminarReserva(idNum, idAdmin);
    if (!eliminada) {
      return res.status(404).json(respuesta(false, 'No se pudo eliminar la reserva'));
    }
    res.json(respuesta(true, 'Reserva eliminada correctamente'));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const obtenerCalendarioController = async (req, res) => {
  try {
    const id_admin_esp_dep = parseInt(req.query.id_admin_esp_dep);
    const start = req.query.start;
    const end = req.query.end;
    const id_cancha = req.query.id_cancha || null;
    const id_espacio = req.query.id_espacio || null;

    if (isNaN(id_admin_esp_dep) || !start || !end) {
      return res
        .status(400)
        .json(respuesta(false, 'id_admin_esp_dep, start y end son requeridos'));
    }
    const eventos = await obtenerCalendario(id_admin_esp_dep, start, end, id_cancha, id_espacio);
    res.json(respuesta(true, 'OK', { eventos }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerReservasFiltradasController);
router.get('/buscar', buscarReservasController);
router.get('/dato-individual/:id', obtenerReservaPorIdController);
router.post('/', crearReservaController);
router.patch('/:id', actualizarReservaController);
router.delete('/:id', eliminarReservaController);
router.get('/calendario', obtenerCalendarioController);

module.exports = router;
