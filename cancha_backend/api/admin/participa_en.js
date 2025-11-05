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
 * Obtener datos específicos de relaciones participa_en con información de deportista y reserva
 */
const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT pe.id_deportista, pe.id_reserva, pe.fecha_reserva,
             p_d.nombre AS deportista_nombre, p_d.apellido AS deportista_apellido,
             r.id_reserva, c.id_cliente, p_c.nombre AS cliente_nombre, p_c.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM participa_en pe
      JOIN deportista d ON pe.id_deportista = d.id_deportista
      JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      JOIN reserva r ON pe.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p_c ON c.id_cliente = p_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY pe.id_deportista, pe.id_reserva
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM participa_en`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);
    return {
      participa_en: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener relaciones participa_en con filtros de ordenamiento
 */
const obtenerParticipaEnFiltradas = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      deportista: 'pe.id_deportista ASC',
      reserva: 'pe.id_reserva ASC',
      fecha: 'pe.fecha_reserva DESC',
      default: 'pe.id_deportista ASC, pe.id_reserva ASC'
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const queryDatos = `
      SELECT pe.id_deportista, pe.id_reserva, pe.fecha_reserva,
             p_d.nombre AS deportista_nombre, p_d.apellido AS deportista_apellido,
             r.id_reserva, c.id_cliente, p_c.nombre AS cliente_nombre, p_c.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM participa_en pe
      JOIN deportista d ON pe.id_deportista = d.id_deportista
      JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      JOIN reserva r ON pe.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p_c ON c.id_cliente = p_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY ${orden}
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM participa_en`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      participa_en: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw new Error(`Error al obtener relaciones participa_en filtradas: ${error.message}`);
  }
};

/**
 * Buscar relaciones participa_en por texto en múltiples campos
 */
const buscarParticipaEn = async (texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT pe.id_deportista, pe.id_reserva, pe.fecha_reserva,
             p_d.nombre AS deportista_nombre, p_d.apellido AS deportista_apellido,
             r.id_reserva, c.id_cliente, p_c.nombre AS cliente_nombre, p_c.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM participa_en pe
      JOIN deportista d ON pe.id_deportista = d.id_deportista
      JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      JOIN reserva r ON pe.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p_c ON c.id_cliente = p_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p_d.nombre ILIKE $1 OR 
        p_d.apellido ILIKE $1 OR 
        p_c.nombre ILIKE $1 OR 
        p_c.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1
      ORDER BY pe.id_deportista, pe.id_reserva
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM participa_en pe
      JOIN deportista d ON pe.id_deportista = d.id_deportista
      JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      JOIN reserva r ON pe.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p_c ON c.id_cliente = p_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p_d.nombre ILIKE $1 OR 
        p_d.apellido ILIKE $1 OR 
        p_c.nombre ILIKE $1 OR 
        p_c.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1
    `;
    
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda])
    ]);

    return {
      participa_en: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener relación participa_en por ID compuesto (id_deportista, id_reserva)
 */
const obtenerParticipaEnPorId = async (id_deportista, id_reserva) => {
  try {
    const query = `
      SELECT pe.*, 
             p_d.nombre AS deportista_nombre, p_d.apellido AS deportista_apellido,
             r.id_reserva, c.id_cliente, p_c.nombre AS cliente_nombre, p_c.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM participa_en pe
      JOIN deportista d ON pe.id_deportista = d.id_deportista
      JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      JOIN reserva r ON pe.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p_c ON c.id_cliente = p_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE pe.id_deportista = $1 AND pe.id_reserva = $2
    `;
    const result = await pool.query(query, [id_deportista, id_reserva]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Crear nueva relación participa_en
 */
const crearParticipaEn = async (datosParticipaEn) => {
  try {
    // Validaciones básicas
    if (!datosParticipaEn.id_deportista || isNaN(datosParticipaEn.id_deportista)) {
      throw new Error('El ID del deportista es obligatorio y debe ser un número');
    }
    if (!datosParticipaEn.id_reserva || isNaN(datosParticipaEn.id_reserva)) {
      throw new Error('El ID de la reserva es obligatorio y debe ser un número');
    }
    if (datosParticipaEn.fecha_reserva) {
      const fechaReserva = new Date(datosParticipaEn.fecha_reserva);
      if (isNaN(fechaReserva.getTime())) {
        throw new Error('La fecha de reserva no es válida');
      }
    }

    // Verificar si el deportista existe
    const deportistaQuery = `
      SELECT id_deportista FROM deportista WHERE id_deportista = $1
    `;
    const deportistaResult = await pool.query(deportistaQuery, [datosParticipaEn.id_deportista]);
    if (!deportistaResult.rows[0]) {
      throw new Error('El deportista asociado no existe');
    }

    // Verificar si la reserva existe
    const reservaQuery = `
      SELECT id_reserva FROM reserva WHERE id_reserva = $1
    `;
    const reservaResult = await pool.query(reservaQuery, [datosParticipaEn.id_reserva]);
    if (!reservaResult.rows[0]) {
      throw new Error('La reserva asociada no existe');
    }

    const query = `
      INSERT INTO participa_en (
        id_deportista, id_reserva, fecha_reserva
      ) 
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      datosParticipaEn.id_deportista,
      datosParticipaEn.id_reserva,
      datosParticipaEn.fecha_reserva || null
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error al crear relación participa_en:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Actualizar relación participa_en parcialmente
 */
const actualizarParticipaEn = async (id_deportista, id_reserva, camposActualizar) => {
  try {
    const camposPermitidos = ['fecha_reserva'];

    const campos = Object.keys(camposActualizar).filter(key => 
      camposPermitidos.includes(key)
    );

    if (campos.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    // Validar fecha_reserva
    if (camposActualizar.fecha_reserva) {
      const fechaReserva = new Date(camposActualizar.fecha_reserva);
      if (isNaN(fechaReserva.getTime())) {
        throw new Error('La fecha de reserva no es válida');
      }
    }

    const setClause = campos.map((campo, index) => `${campo} = $${index + 3}`).join(', ');
    const values = campos.map(campo => camposActualizar[campo] || null);
    
    const query = `
      UPDATE participa_en 
      SET ${setClause}
      WHERE id_deportista = $1 AND id_reserva = $2
      RETURNING *
    `;

    const result = await pool.query(query, [id_deportista, id_reserva, ...values]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar relación participa_en
 */
const eliminarParticipaEn = async (id_deportista, id_reserva) => {
  try {
    const query = `
      DELETE FROM participa_en 
      WHERE id_deportista = $1 AND id_reserva = $2 
      RETURNING id_deportista, id_reserva
    `;
    const result = await pool.query(query, [id_deportista, id_reserva]);
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

    const { participa_en, total } = await obtenerDatosEspecificos(limite, offset);
    
    res.json(respuesta(true, 'Relaciones participa_en obtenidas correctamente', {
      participa_en,
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
const obtenerParticipaEnFiltradasController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['deportista', 'reserva', 'fecha'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parámetro "tipo" es inválido o no proporcionado'));
    }

    const { participa_en, total } = await obtenerParticipaEnFiltradas(tipo, limite, offset);

    res.json(respuesta(true, `Relaciones participa_en filtradas por ${tipo} obtenidas correctamente`, {
      participa_en,
      filtro: tipo,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en obtenerParticipaEnFiltradas:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar
 */
const buscarParticipaEnController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { participa_en, total } = await buscarParticipaEn(q, limite, offset);
    
    res.json(respuesta(true, 'Relaciones participa_en obtenidas correctamente', {
      participa_en,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en buscarParticipaEn:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /dato-individual/:id_deportista/:id_reserva
 */
const obtenerParticipaEnPorIdController = async (req, res) => {
  try {
    const { id_deportista, id_reserva } = req.params;

    if (!id_deportista || isNaN(id_deportista) || !id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'IDs de deportista y reserva no válidos'));
    }

    const participaEn = await obtenerParticipaEnPorId(parseInt(id_deportista), parseInt(id_reserva));

    if (!participaEn) {
      return res.status(404).json(respuesta(false, 'Relación participa_en no encontrada'));
    }

    res.json(respuesta(true, 'Relación participa_en obtenida correctamente', { participa_en: participaEn }));
  } catch (error) {
    console.error('Error en obtenerParticipaEnPorId:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para POST - Crear relación participa_en
 */
const crearParticipaEnController = async (req, res) => {
  try {
    const datos = req.body;

    // Validaciones básicas
    const camposObligatorios = ['id_deportista', 'id_reserva'];
    const faltantes = camposObligatorios.filter(campo => !datos[campo] || datos[campo].toString().trim() === '');

    if (faltantes.length > 0) {
      return res.status(400).json(
        respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`)
      );
    }

    const nuevaParticipaEn = await crearParticipaEn(datos);

    res.status(201).json(respuesta(true, 'Relación participa_en creada correctamente', { participa_en: nuevaParticipaEn }));
  } catch (error) {
    console.error('Error en crearParticipaEn:', error.message);
    
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json(respuesta(false, 'La relación participa_en ya existe'));
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para PATCH - Actualizar relación participa_en
 */
const actualizarParticipaEnController = async (req, res) => {
  try {
    const { id_deportista, id_reserva } = req.params;
    const camposActualizar = req.body;

    if (!id_deportista || isNaN(id_deportista) || !id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'IDs de deportista y reserva no válidos'));
    }

    if (Object.keys(camposActualizar).length === 0) {
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const participaEnActualizada = await actualizarParticipaEn(parseInt(id_deportista), parseInt(id_reserva), camposActualizar);

    if (!participaEnActualizada) {
      return res.status(404).json(respuesta(false, 'Relación participa_en no encontrada'));
    }

    res.json(respuesta(true, 'Relación participa_en actualizada correctamente', { participa_en: participaEnActualizada }));
  } catch (error) {
    console.error('Error en actualizarParticipaEn:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para DELETE - Eliminar relación participa_en
 */
const eliminarParticipaEnController = async (req, res) => {
  try {
    const { id_deportista, id_reserva } = req.params;

    if (!id_deportista || isNaN(id_deportista) || !id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'IDs de deportista y reserva no válidos'));
    }

    const participaEnEliminada = await eliminarParticipaEn(parseInt(id_deportista), parseInt(id_reserva));

    if (!participaEnEliminada) {
      return res.status(404).json(respuesta(false, 'Relación participa_en no encontrada'));
    }

    res.json(respuesta(true, 'Relación participa_en eliminada correctamente'));
  } catch (error) {
    console.error('Error en eliminarParticipaEn:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

// RUTAS

// GET endpoints
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerParticipaEnFiltradasController);
router.get('/buscar', buscarParticipaEnController);
router.get('/dato-individual/:id_deportista/:id_reserva', obtenerParticipaEnPorIdController);

// POST, PATCH, DELETE endpoints
router.post('/', crearParticipaEnController);
router.patch('/:id_deportista/:id_reserva', actualizarParticipaEnController);
router.delete('/:id_deportista/:id_reserva', eliminarParticipaEnController);

module.exports = router;