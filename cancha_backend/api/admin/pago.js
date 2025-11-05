const express = require('express');
const pool = require('../../config/database');

const router = express.Router();

// Función de respuesta estandarizada
const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos,
});

// MODELOS - Funciones puras para operaciones de base de datos

/**
 * Obtener datos específicos de pagos con información de la reserva
 */
const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT p.id_pago, p.monto, p.metodo_pago, p.fecha_pago,
             r.id_reserva, c.id_cliente, per.nombre AS cliente_nombre, per.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario per ON c.id_cliente = per.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY p.id_pago
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM pago`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);
    return {
      pagos: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener pagos con filtros de ordenamiento
 */
const obtenerPagosFiltrados = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      fecha: 'p.fecha_pago DESC',
      monto: 'p.monto ASC',
      metodo: 'p.metodo_pago ASC',
      default: 'p.id_pago ASC'
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const queryDatos = `
      SELECT p.id_pago, p.monto, p.metodo_pago, p.fecha_pago,
             r.id_reserva, c.id_cliente, per.nombre AS cliente_nombre, per.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario per ON c.id_cliente = per.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY ${orden}
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM pago`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      pagos: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw new Error(`Error al obtener pagos filtrados: ${error.message}`);
  }
};

/**
 * Buscar pagos por texto en múltiples campos
 */
const buscarPagos = async (texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT p.id_pago, p.monto, p.metodo_pago, p.fecha_pago,
             r.id_reserva, c.id_cliente, per.nombre AS cliente_nombre, per.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario per ON c.id_cliente = per.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        per.nombre ILIKE $1 OR 
        per.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        p.metodo_pago ILIKE $1
      ORDER BY p.fecha_pago DESC
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario per ON c.id_cliente = per.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        per.nombre ILIKE $1 OR 
        per.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        p.metodo_pago ILIKE $1
    `;
    
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda])
    ]);

    return {
      pagos: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener pago por ID
 */
const obtenerPagoPorId = async (id) => {
  try {
    const query = `
      SELECT p.*, 
             r.id_reserva, c.id_cliente, per.nombre AS cliente_nombre, per.apellido AS cliente_apellido, per.correo AS cliente_correo,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM pago p
      JOIN reserva r ON p.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario per ON c.id_cliente = per.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE p.id_pago = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Crear nuevo pago
 */
const crearPago = async (datosPago) => {
  try {
    // Validaciones básicas
    if (!datosPago.id_reserva || isNaN(datosPago.id_reserva)) {
      throw new Error('El ID de la reserva es obligatorio y debe ser un número');
    }
    if (!datosPago.monto || isNaN(datosPago.monto) || datosPago.monto <= 0) {
      throw new Error('El monto es obligatorio y debe ser un número positivo');
    }
    if (!datosPago.metodo_pago) {
      throw new Error('El método de pago es obligatorio');
    }

    // Validar fecha_pago si se proporciona
    if (datosPago.fecha_pago) {
      const fechaPago = new Date(datosPago.fecha_pago);
      if (isNaN(fechaPago.getTime())) {
        throw new Error('La fecha de pago no es válida');
      }
    }

    // Validar metodo_pago
    const metodosValidos = ['tarjeta', 'efectivo', 'transferencia', 'QR'];
    if (!metodosValidos.includes(datosPago.metodo_pago)) {
      throw new Error(`El método de pago debe ser uno de: ${metodosValidos.join(', ')}`);
    }

    // Verificar si la reserva existe
    const reservaQuery = `
      SELECT id_reserva, monto_total, saldo_pendiente 
      FROM reserva 
      WHERE id_reserva = $1
    `;
    const reservaResult = await pool.query(reservaQuery, [datosPago.id_reserva]);
    if (!reservaResult.rows[0]) {
      throw new Error('La reserva asociada no existe');
    }

    // Validar que el monto no exceda el saldo pendiente
    const { monto_total, saldo_pendiente } = reservaResult.rows[0];
    if (saldo_pendiente !== null && datosPago.monto > saldo_pendiente) {
      throw new Error('El monto del pago excede el saldo pendiente de la reserva');
    }

    const query = `
      INSERT INTO pago (
        monto, metodo_pago, fecha_pago, id_reserva
      ) 
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      datosPago.monto,
      datosPago.metodo_pago,
      datosPago.fecha_pago || new Date().toISOString().split('T')[0],
      datosPago.id_reserva
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error al crear pago:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Actualizar pago parcialmente
 */
const actualizarPago = async (id, camposActualizar) => {
  try {
    const camposPermitidos = ['monto', 'metodo_pago', 'fecha_pago', 'id_reserva'];

    const campos = Object.keys(camposActualizar).filter(key => 
      camposPermitidos.includes(key)
    );

    if (campos.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    // Validar monto
    if (camposActualizar.monto && (isNaN(camposActualizar.monto) || camposActualizar.monto <= 0)) {
      throw new Error('El monto debe ser un número positivo');
    }

    // Validar fecha_pago
    if (camposActualizar.fecha_pago) {
      const fechaPago = new Date(camposActualizar.fecha_pago);
      if (isNaN(fechaPago.getTime())) {
        throw new Error('La fecha de pago no es válida');
      }
    }

    // Validar metodo_pago
    const metodosValidos = ['tarjeta', 'efectivo', 'transferencia', 'QR'];
    if (camposActualizar.metodo_pago && !metodosValidos.includes(camposActualizar.metodo_pago)) {
      throw new Error(`El método de pago debe ser uno de: ${metodosValidos.join(', ')}`);
    }

    // Validar reserva si se proporciona
    if (camposActualizar.id_reserva) {
      const reservaQuery = `
        SELECT id_reserva, monto_total, saldo_pendiente 
        FROM reserva 
        WHERE id_reserva = $1
      `;
      const reservaResult = await pool.query(reservaQuery, [camposActualizar.id_reserva]);
      if (!reservaResult.rows[0]) {
        throw new Error('La reserva asociada no existe');
      }

      // Validar que el monto no exceda el saldo pendiente si se actualiza
      if (camposActualizar.monto) {
        const { saldo_pendiente } = reservaResult.rows[0];
        if (saldo_pendiente !== null && camposActualizar.monto > saldo_pendiente) {
          throw new Error('El monto del pago excede el saldo pendiente de la reserva');
        }
      }
    }

    const setClause = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    const values = campos.map(campo => camposActualizar[campo] || null);
    
    const query = `
      UPDATE pago 
      SET ${setClause}
      WHERE id_pago = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar pago
 */
const eliminarPago = async (id) => {
  try {
    const query = 'DELETE FROM pago WHERE id_pago = $1 RETURNING id_pago';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

// CONTROLADORES - Manejan las request y response

/**
 * Controlador para GET /datos-especificos
 */
const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const { pagos, total } = await obtenerDatosEspecificos(limite, offset);
    
    res.json(respuesta(true, 'Pagos obtenidos correctamente', {
      pagos,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en obtenerDatosEspecificos:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /filtro
 */
const obtenerPagosFiltradosController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['fecha', 'monto', 'metodo'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parámetro "tipo" es inválido o no proporcionado'));
    }

    const { pagos, total } = await obtenerPagosFiltrados(tipo, limite, offset);

    res.json(respuesta(true, `Pagos filtrados por ${tipo} obtenidos correctamente`, {
      pagos,
      filtro: tipo,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en obtenerPagosFiltrados:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar
 */
const buscarPagosController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { pagos, total } = await buscarPagos(q, limite, offset);
    
    res.json(respuesta(true, 'Pagos obtenidos correctamente', {
      pagos,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en buscarPagos:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /dato-individual/:id
 */
const obtenerPagoPorIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de pago no válido'));
    }

    const pago = await obtenerPagoPorId(parseInt(id));

    if (!pago) {
      return res.status(404).json(respuesta(false, 'Pago no encontrado'));
    }

    res.json(respuesta(true, 'Pago obtenido correctamente', { pago }));
  } catch (error) {
    console.error('Error en obtenerPagoPorId:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para POST - Crear pago
 */
const crearPagoController = async (req, res) => {
  try {
    const datos = req.body;

    // Validaciones básicas
    const camposObligatorios = ['monto', 'metodo_pago', 'id_reserva'];
    const faltantes = camposObligatorios.filter(campo => !datos[campo] || datos[campo].toString().trim() === '');

    if (faltantes.length > 0) {
      return res.status(400).json(
        respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`)
      );
    }

    const nuevoPago = await crearPago(datos);

    res.status(201).json(respuesta(true, 'Pago creado correctamente', { pago: nuevoPago }));
  } catch (error) {
    console.error('Error en crearPago:', error.message);
    
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json(respuesta(false, 'El pago ya existe'));
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para PATCH - Actualizar pago
 */
const actualizarPagoController = async (req, res) => {
  try {
    const { id } = req.params;
    const camposActualizar = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de pago no válido'));
    }

    if (Object.keys(camposActualizar).length === 0) {
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const pagoActualizado = await actualizarPago(parseInt(id), camposActualizar);

    if (!pagoActualizado) {
      return res.status(404).json(respuesta(false, 'Pago no encontrado'));
    }

    res.json(respuesta(true, 'Pago actualizado correctamente', { pago: pagoActualizado }));
  } catch (error) {
    console.error('Error en actualizarPago:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para DELETE - Eliminar pago
 */
const eliminarPagoController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de pago no válido'));
    }

    const pagoEliminado = await eliminarPago(parseInt(id));

    if (!pagoEliminado) {
      return res.status(404).json(respuesta(false, 'Pago no encontrado'));
    }

    res.json(respuesta(true, 'Pago eliminado correctamente'));
  } catch (error) {
    console.error('Error en eliminarPago:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

// RUTAS

// GET endpoints
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerPagosFiltradosController);
router.get('/buscar', buscarPagosController);
router.get('/dato-individual/:id', obtenerPagoPorIdController);

// POST, PATCH, DELETE endpoints
router.post('/', crearPagoController);
router.patch('/:id', actualizarPagoController);
router.delete('/:id', eliminarPagoController);

module.exports = router;