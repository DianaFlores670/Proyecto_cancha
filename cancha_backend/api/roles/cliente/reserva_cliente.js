const express = require('express');
const pool = require('../../../config/database');

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos,
});

const obtenerDatosEspecificos = async (id_cliente, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        CASE 
          WHEN r.estado <> 'pagada' AND r.fecha_reserva < NOW() THEN 'cancelada'
          ELSE r.estado
        END AS estado,
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        re.id_resena,
        re.estrellas AS resena_estrellas,
        re.comentario AS resena_comentario,
        re.verificado AS resena_verificado
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN resena re ON re.id_reserva = r.id_reserva
      WHERE r.id_cliente = $1
      ORDER BY r.id_reserva
      LIMIT $2 OFFSET $3
    `;
    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva 
      WHERE id_cliente = $1
    `;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [id_cliente, limite, offset]),
      pool.query(queryTotal, [id_cliente]),
    ]);
    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    console.log('Error en obtenerDatosEspecificos:', { error: error.message, stack: error.stack });
    throw error;
  }
};

const obtenerReservasFiltradas = async (id_cliente, tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      fecha: 'r.fecha_reserva DESC',
      monto: 'r.monto_total ASC',
      estado: 'r.estado ASC',
      default: 'r.id_reserva ASC',
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const queryDatos = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        CASE 
          WHEN r.estado <> 'pagada' AND r.fecha_reserva < NOW() THEN 'cancelada'
          ELSE r.estado
        END AS estado,
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        re.id_resena,
        re.estrellas AS resena_estrellas,
        re.comentario AS resena_comentario,
        re.verificado AS resena_verificado
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN resena re ON re.id_reserva = r.id_reserva
      WHERE r.id_cliente = $1
      ORDER BY ${orden}
      LIMIT $2 OFFSET $3
    `;
    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva 
      WHERE id_cliente = $1
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [id_cliente, limite, offset]),
      pool.query(queryTotal, [id_cliente]),
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    console.log('Error en obtenerReservasFiltradas:', { error: error.message, stack: error.stack });
    throw new Error(`Error al obtener reservas filtradas: ${error.message}`);
  }
};

const buscarReservas = async (id_cliente, texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        CASE 
          WHEN r.estado <> 'pagada' AND r.fecha_reserva < NOW() THEN 'cancelada'
          ELSE r.estado
        END AS estado,
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        re.id_resena,
        re.estrellas AS resena_estrellas,
        re.comentario AS resena_comentario,
        re.verificado AS resena_verificado
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN resena re ON re.id_reserva = r.id_reserva
      WHERE r.id_cliente = $1 AND (
        p.nombre ILIKE $2 OR 
        p.apellido ILIKE $2 OR 
        ca.nombre ILIKE $2 OR 
        r.estado ILIKE $2
      )
      ORDER BY r.fecha_reserva DESC
      LIMIT $3 OFFSET $4
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE r.id_cliente = $1 AND (
        p.nombre ILIKE $2 OR 
        p.apellido ILIKE $2 OR 
        ca.nombre ILIKE $2 OR 
        r.estado ILIKE $2
      )
    `;

    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [id_cliente, terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [id_cliente, terminoBusqueda]),
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    console.log('Error en buscarReservas:', { error: error.message, stack: error.stack });
    throw error;
  }
};

const obtenerReservaPorId = async (id, id_cliente) => {
  try {
    const query = `
      SELECT 
        r.*,
        CASE 
          WHEN r.estado <> 'pagada' AND r.fecha_reserva < NOW() THEN 'cancelada'
          ELSE r.estado
        END AS estado,
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        p.correo AS cliente_correo,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        re.id_resena,
        re.estrellas AS resena_estrellas,
        re.comentario AS resena_comentario,
        re.verificado AS resena_verificado
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN resena re ON re.id_reserva = r.id_reserva
      WHERE r.id_reserva = $1 AND r.id_cliente = $2
    `;
    const result = await pool.query(query, [id, id_cliente]);
    return result.rows[0] || null;
  } catch (error) {
    console.log('Error en obtenerReservaPorId:', { error: error.message, stack: error.stack });
    throw error;
  }
};

const crearReserva = async (datosReserva) => {
  try {
    console.log('Datos recibidos para crear reserva:', datosReserva);
    if (!datosReserva.id_cliente || isNaN(datosReserva.id_cliente)) {
      throw new Error('El ID del cliente es obligatorio y debe ser un numero');
    }
    if (!datosReserva.id_cancha || isNaN(datosReserva.id_cancha)) {
      throw new Error('El ID de la cancha es obligatorio y debe ser un numero');
    }
    if (!datosReserva.fecha_reserva) {
      throw new Error('La fecha de reserva es obligatoria');
    }
    if (!datosReserva.estado) {
      throw new Error('El estado es obligatorio');
    }

    const fechaReserva = new Date(datosReserva.fecha_reserva);
    if (isNaN(fechaReserva.getTime())) {
      throw new Error('La fecha de reserva no es valida');
    }

    if (datosReserva.cupo && (isNaN(datosReserva.cupo) || datosReserva.cupo <= 0)) {
      throw new Error('El cupo debe ser un numero positivo');
    }

    if (datosReserva.monto_total && (isNaN(datosReserva.monto_total) || datosReserva.monto_total < 0)) {
      throw new Error('El monto total debe ser un numero no negativo');
    }

    if (datosReserva.saldo_pendiente && (isNaN(datosReserva.saldo_pendiente) || datosReserva.saldo_pendiente < 0)) {
      throw new Error('El saldo pendiente debe ser un numero no negativo');
    }

    if (datosReserva.monto_total && datosReserva.saldo_pendiente && Number(datosReserva.saldo_pendiente) > Number(datosReserva.monto_total)) {
      throw new Error('El saldo pendiente no puede ser mayor al monto total');
    }

    const estadosValidos = ['pendiente', 'pagada', 'en_cuotas', 'cancelada'];
    if (!estadosValidos.includes(datosReserva.estado)) {
      throw new Error(`El estado debe ser uno de: ${estadosValidos.join(', ')}`);
    }

    const clienteQuery = `
      SELECT id_cliente FROM cliente WHERE id_cliente = $1
    `;
    const clienteResult = await pool.query(clienteQuery, [datosReserva.id_cliente]);
    if (!clienteResult.rows[0]) {
      throw new Error('El cliente asociado no existe');
    }

    const canchaQuery = `
      SELECT id_cancha, capacidad 
      FROM cancha 
      WHERE id_cancha = $1
    `;
    const canchaResult = await pool.query(canchaQuery, [datosReserva.id_cancha]);
    const canchaRow = canchaResult.rows[0];
    if (!canchaRow) {
      throw new Error('La cancha asociada no existe');
    }

    if (datosReserva.cupo && canchaRow.capacidad != null && Number(datosReserva.cupo) > Number(canchaRow.capacidad)) {
      throw new Error('El cupo no puede superar la capacidad de la cancha');
    }

    const query = `
      INSERT INTO reserva (
        fecha_reserva, cupo, monto_total, saldo_pendiente, estado, id_cliente, id_cancha
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      datosReserva.fecha_reserva,
      datosReserva.cupo || null,
      datosReserva.monto_total || null,
      datosReserva.saldo_pendiente || null,
      datosReserva.estado,
      datosReserva.id_cliente,
      datosReserva.id_cancha,
    ];

    console.log('Ejecutando query de creacion con valores:', values);
    const { rows } = await pool.query(query, values);
    console.log('Reserva creada:', rows[0]);
    return rows[0];
  } catch (error) {
    console.log('Error en crearReserva:', { error: error.message, stack: error.stack, datosReserva });
    throw new Error(error.message);
  }
};

const actualizarReserva = async (id, id_cliente, camposActualizar) => {
  try {
    console.log('Datos recibidos para actualizar reserva:', { id, camposActualizar });
    const camposPermitidos = ['fecha_reserva', 'cupo', 'monto_total', 'saldo_pendiente', 'estado', 'id_cliente', 'id_cancha'];

    const campos = Object.keys(camposActualizar).filter((key) => camposPermitidos.includes(key));

    if (campos.length === 0) {
      throw new Error('No hay campos validos para actualizar');
    }

    const reservaQuery = `
      SELECT id_reserva 
      FROM reserva 
      WHERE id_reserva = $1 AND id_cliente = $2
    `;
    const reservaResult = await pool.query(reservaQuery, [id, id_cliente]);
    if (!reservaResult.rows[0]) {
      throw new Error('Reserva no encontrada o no pertenece al cliente');
    }

    const reservaBase = await obtenerReservaPorId(id, id_cliente);
    if (!reservaBase) {
      throw new Error('Reserva no encontrada o no pertenece al cliente');
    }

    const cupoFinal = camposActualizar.cupo != null ? Number(camposActualizar.cupo) : Number(reservaBase.cupo);
    const canchaFinal = camposActualizar.id_cancha != null ? Number(camposActualizar.id_cancha) : Number(reservaBase.id_cancha);

    if (cupoFinal && canchaFinal) {
      const canchaQuery = `
        SELECT capacidad 
        FROM cancha 
        WHERE id_cancha = $1
      `;
      const canchaResult = await pool.query(canchaQuery, [canchaFinal]);
      const canchaRow = canchaResult.rows[0];
      if (canchaRow && canchaRow.capacidad != null && cupoFinal > Number(canchaRow.capacidad)) {
        throw new Error('El cupo no puede superar la capacidad de la cancha');
      }
    }

    if (camposActualizar.fecha_reserva) {
      const fechaReserva = new Date(camposActualizar.fecha_reserva);
      if (isNaN(fechaReserva.getTime())) {
        throw new Error('La fecha de reserva no es valida');
      }
    }

    if (camposActualizar.cupo && (isNaN(camposActualizar.cupo) || camposActualizar.cupo <= 0)) {
      throw new Error('El cupo debe ser un numero positivo');
    }

    if (camposActualizar.monto_total && (isNaN(camposActualizar.monto_total) || camposActualizar.monto_total < 0)) {
      throw new Error('El monto total debe ser un numero no negativo');
    }

    if (camposActualizar.saldo_pendiente && (isNaN(camposActualizar.saldo_pendiente) || camposActualizar.saldo_pendiente < 0)) {
      throw new Error('El saldo pendiente debe ser un numero no negativo');
    }

    const montoTotal = camposActualizar.monto_total || (await obtenerReservaPorId(id, id_cliente))?.monto_total;
    if (montoTotal && camposActualizar.saldo_pendiente && Number(camposActualizar.saldo_pendiente) > Number(montoTotal)) {
      throw new Error('El saldo pendiente no puede ser mayor al monto total');
    }

    const estadosValidos = ['pendiente', 'pagada', 'en_cuotas', 'cancelada'];
    if (camposActualizar.estado && !estadosValidos.includes(camposActualizar.estado)) {
      throw new Error(`El estado debe ser uno de: ${estadosValidos.join(', ')}`);
    }

    if (camposActualizar.id_cliente) {
      const clienteQuery = `
        SELECT id_cliente FROM cliente WHERE id_cliente = $1
      `;
      const clienteResult = await pool.query(clienteQuery, [camposActualizar.id_cliente]);
      if (!clienteResult.rows[0]) {
        throw new Error('El cliente asociado no existe');
      }
    }

    if (camposActualizar.id_cancha) {
      const canchaQuery = `
        SELECT id_cancha 
        FROM cancha 
        WHERE id_cancha = $1
      `;
      const canchaResult = await pool.query(canchaQuery, [camposActualizar.id_cancha]);
      if (!canchaResult.rows[0]) {
        throw new Error('La cancha asociada no existe');
      }
    }

    const setClause = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const values = campos.map((campo) => camposActualizar[campo] || null);

    const query = `
      UPDATE reserva 
      SET ${setClause}
      WHERE id_reserva = $1
      RETURNING *
    `;

    console.log('Ejecutando query de actualizacion con valores:', [id, ...values]);
    const result = await pool.query(query, [id, ...values]);
    console.log('Reserva actualizada:', result.rows[0]);
    return result.rows[0] || null;
  } catch (error) {
    console.log('Error en actualizarReserva:', { error: error.message, stack: error.stack, id, camposActualizar });
    throw error;
  }
};

const eliminarReserva = async (id, id_cliente) => {
  try {
    const query = `
      DELETE FROM reserva 
      WHERE id_reserva = $1 AND id_cliente = $2 
      RETURNING id_reserva
    `;
    const result = await pool.query(query, [id, id_cliente]);
    console.log('Reserva eliminada:', result.rows[0]);
    return result.rows[0] || null;
  } catch (error) {
    console.log('Error en eliminarReserva:', { error: error.message, stack: error.stack, id });
    throw error;
  }
};

const cancelarReserva = async (id, id_cliente) => {
  try {
    const selectQuery = `
      SELECT id_reserva, estado
      FROM reserva
      WHERE id_reserva = $1 AND id_cliente = $2
    `;
    const selectResult = await pool.query(selectQuery, [id, id_cliente]);
    const reserva = selectResult.rows[0];

    if (!reserva) {
      throw new Error('Reserva no encontrada o no pertenece al cliente');
    }

    if (reserva.estado === 'pagada') {
      throw new Error('No se puede cancelar una reserva pagada');
    }

    if (reserva.estado === 'cancelada') {
      throw new Error('La reserva ya esta cancelada');
    }

    const updateReservaQuery = `
      UPDATE reserva
      SET estado = 'cancelada',
          saldo_pendiente = 0
      WHERE id_reserva = $1
      RETURNING *
    `;
    const updateReservaResult = await pool.query(updateReservaQuery, [id]);
    const reservaActualizada = updateReservaResult.rows[0];

    const updateQrQuery = `
      UPDATE qr_reserva
      SET estado = 'expirado',
          verificado = false
      WHERE id_reserva = $1
    `;
    await pool.query(updateQrQuery, [id]);

    return reservaActualizada;
  } catch (error) {
    console.log('Error en cancelarReserva:', { error: error.message, stack: error.stack, id, id_cliente });
    throw error;
  }
};

const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const id_cliente = parseInt(req.query.id_cliente);
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!id_cliente || isNaN(id_cliente)) {
      console.log('ID de cliente no valido:', req.query.id_cliente);
      return res.status(400).json(respuesta(false, 'ID de cliente no valido o no proporcionado'));
    }

    const { reservas, total } = await obtenerDatosEspecificos(id_cliente, limite, offset);

    res.json(
      respuesta(true, 'Reservas obtenidas correctamente', {
        reservas,
        paginacion: { limite, offset, total },
      }),
    );
  } catch (error) {
    console.log('Error en obtenerDatosEspecificosController:', { error: error.message, stack: error.stack });
    res.status(500).json(respuesta(false, error.message || 'Error al obtener reservas'));
  }
};

const obtenerReservasFiltradasController = async (req, res) => {
  try {
    const { tipo, id_cliente } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!id_cliente || isNaN(id_cliente)) {
      console.log('ID de cliente no valido:', req.query.id_cliente);
      return res.status(400).json(respuesta(false, 'ID de cliente no valido o no proporcionado'));
    }

    const tiposValidos = ['fecha', 'monto', 'estado'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      console.log('Parametro tipo invalido:', tipo);
      return res.status(400).json(respuesta(false, 'El parametro "tipo" es invalido o no proporcionado'));
    }

    const { reservas, total } = await obtenerReservasFiltradas(id_cliente, tipo, limite, offset);

    res.json(
      respuesta(true, `Reservas filtradas por ${tipo} obtenidas correctamente`, {
        reservas,
        filtro: tipo,
        paginacion: { limite, offset, total },
      }),
    );
  } catch (error) {
    console.log('Error en obtenerReservasFiltradasController:', { error: error.message, stack: error.stack });
    res.status(500).json(respuesta(false, error.message || 'Error al obtener reservas filtradas'));
  }
};

const buscarReservasController = async (req, res) => {
  try {
    const { q, id_cliente } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!id_cliente || isNaN(id_cliente)) {
      console.log('ID de cliente no valido:', req.query.id_cliente);
      return res.status(400).json(respuesta(false, 'ID de cliente no valido o no proporcionado'));
    }

    if (!q) {
      console.log('Parametro de busqueda "q" no proporcionado');
      return res.status(400).json(respuesta(false, 'El parametro de busqueda "q" es requerido'));
    }

    const { reservas, total } = await buscarReservas(id_cliente, q, limite, offset);

    res.json(
      respuesta(true, 'Reservas obtenidas correctamente', {
        reservas,
        paginacion: { limite, offset, total },
      }),
    );
  } catch (error) {
    console.log('Error en buscarReservasController:', { error: error.message, stack: error.stack });
    res.status(500).json(respuesta(false, error.message || 'Error en la busqueda'));
  }
};

const obtenerReservaPorIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente } = req.query;

    if (!id || isNaN(id)) {
      console.log('ID de reserva no valido:', id);
      return res.status(400).json(respuesta(false, 'ID de reserva no valido'));
    }
    if (!id_cliente || isNaN(id_cliente)) {
      console.log('ID de cliente no valido:', id_cliente);
      return res.status(400).json(respuesta(false, 'ID de cliente no valido o no proporcionado'));
    }

    const reserva = await obtenerReservaPorId(parseInt(id), parseInt(id_cliente));

    if (!reserva) {
      console.log('Reserva no encontrada para ID:', id, 'y cliente:', id_cliente);
      return res.status(404).json(respuesta(false, 'Reserva no encontrada o no pertenece al cliente'));
    }

    res.json(respuesta(true, 'Reserva obtenida correctamente', { reserva }));
  } catch (error) {
    console.log('Error en obtenerReservaPorIdController:', { error: error.message, stack: error.stack });
    res.status(500).json(respuesta(false, error.message || 'Error al obtener la reserva'));
  }
};

const crearReservaController = async (req, res) => {
  try {
    const datos = req.body;

    const camposObligatorios = ['fecha_reserva', 'id_cliente', 'id_cancha'];
    const faltantes = camposObligatorios.filter(
      (campo) => !datos[campo] || datos[campo].toString().trim() === '',
    );

    if (faltantes.length > 0) {
      return res
        .status(400)
        .json(respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`));
    }

    datos.estado = datos.estado || 'pendiente';

    const nuevaReserva = await crearReserva(datos);

    res
      .status(201)
      .json(respuesta(true, 'Reserva creada correctamente', { reserva: nuevaReserva }));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json(respuesta(false, 'La reserva ya existe'));
    }
    res.status(500).json(respuesta(false, error.message || 'Error al crear la reserva'));
  }
};

const actualizarReservaController = async (req, res) => {
  try {
    const { id } = req.params;
    const id_cliente = parseInt(req.body.id_cliente || req.query.id_cliente);
    const camposActualizar = req.body;
    console.log('Datos recibidos en actualizarReservaController:', { id, camposActualizar });

    if (!id || isNaN(id)) {
      console.log('ID de reserva no valido:', id);
      return res.status(400).json(respuesta(false, 'ID de reserva no valido'));
    }
    if (!id_cliente || isNaN(id_cliente)) {
      console.log('ID de cliente no valido:', id_cliente);
      return res.status(400).json(respuesta(false, 'ID de cliente no valido o no proporcionado'));
    }

    if (Object.keys(camposActualizar).length === 0) {
      console.log('No se proporcionaron campos para actualizar');
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const reservaActualizada = await actualizarReserva(parseInt(id), id_cliente, camposActualizar);

    if (!reservaActualizada) {
      console.log('Reserva no encontrada para ID:', id, 'y cliente:', id_cliente);
      return res
        .status(404)
        .json(respuesta(false, 'Reserva no encontrada o no pertenece al cliente'));
    }

    res.json(
      respuesta(true, 'Reserva actualizada correctamente', { reserva: reservaActualizada }),
    );
  } catch (error) {
    console.log('Error en actualizarReservaController:', {
      error: error.message,
      stack: error.stack,
      id,
      camposActualizar,
    });
    res.status(500).json(respuesta(false, error.message || 'Error al actualizar la reserva'));
  }
};

const eliminarReservaController = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente } = req.query;

    if (!id || isNaN(id)) {
      console.log('ID de reserva no valido:', id);
      return res.status(400).json(respuesta(false, 'ID de reserva no valido'));
    }
    if (!id_cliente || isNaN(id_cliente)) {
      console.log('ID de cliente no valido:', id_cliente);
      return res
        .status(400)
        .json(respuesta(false, 'ID de cliente no valido o no proporcionado'));
    }

    const reservaCancelada = await cancelarReserva(parseInt(id), parseInt(id_cliente));

    if (!reservaCancelada) {
      console.log('Reserva no encontrada para ID:', id, 'y cliente:', id_cliente);
      return res
        .status(404)
        .json(respuesta(false, 'Reserva no encontrada o no pertenece al cliente'));
    }

    res.json(
      respuesta(true, 'Reserva cancelada correctamente', {
        reserva: reservaCancelada,
      }),
    );
  } catch (error) {
    console.log('Error en eliminarReservaController:', {
      error: error.message,
      stack: error.stack,
      id,
    });
    res.status(500).json(respuesta(false, error.message || 'Error al cancelar la reserva'));
  }
};

router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerReservasFiltradasController);
router.get('/buscar', buscarReservasController);
router.get('/dato-individual/:id', obtenerReservaPorIdController);
router.post('/', crearReservaController);
router.patch('/:id', actualizarReservaController);
router.delete('/:id', eliminarReservaController);

module.exports = router;
