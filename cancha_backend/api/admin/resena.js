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
 * Obtener datos específicos de reseñas con información de la reserva
 */
const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT re.id_resena, re.estrellas, re.comentario, re.fecha_creacion, re.estado, re.verificado,
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM resena re
      JOIN reserva r ON re.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY re.id_resena
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM resena`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);
    return {
      resenas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener reseñas con filtros de ordenamiento - VERSIÓN CORREGIDA
 */
const obtenerResenasFiltradas = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    let whereClause = '';
    let orderClause = 're.id_resena ASC';
    
    // Definir filtros - SOLO LOS REQUERIDOS
    switch(tipoFiltro) {
      case 'verificado_si':
        whereClause = 'WHERE re.verificado = true';
        orderClause = 're.fecha_creacion DESC';
        break;
      case 'verificado_no':
        whereClause = 'WHERE re.verificado = false';
        orderClause = 're.fecha_creacion DESC';
        break;
      case 'cliente_nombre':
        orderClause = 'p.nombre ASC, p.apellido ASC';
        break;
      case 'cancha_nombre':
        orderClause = 'ca.nombre ASC';
        break;
      default:
        orderClause = 're.id_resena ASC';
    }

    const queryDatos = `
      SELECT re.id_resena, re.estrellas, re.comentario, re.fecha_creacion, re.estado, re.verificado,
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM resena re
      JOIN reserva r ON re.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $1 OFFSET $2
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM resena re
      ${whereClause}
    `;

    console.log('🔍 Query ejecutada:', queryDatos);
    console.log('🎯 Filtro aplicado:', { tipoFiltro, whereClause, orderClause });

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      resenas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw new Error(`Error al obtener reseñas filtradas: ${error.message}`);
  }
};


/**
 * Buscar reseñas por texto en múltiples campos
 */
const buscarResenas = async (texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT re.id_resena, re.estrellas, re.comentario, re.fecha_creacion, re.estado, re.verificado,
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM resena re
      JOIN reserva r ON re.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        re.comentario ILIKE $1
      ORDER BY re.fecha_creacion DESC
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM resena re
      JOIN reserva r ON re.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        re.comentario ILIKE $1
    `;
    
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda])
    ]);

    return {
      resenas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener reseña por ID
 */
const obtenerResenaPorId = async (id) => {
  try {
    const query = `
      SELECT re.*, 
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido, p.correo AS cliente_correo,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM resena re
      JOIN reserva r ON re.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE re.id_resena = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Crear nueva reseña
 */
const crearResena = async (datosResena) => {
  try {
    // Validaciones básicas
    if (!datosResena.id_reserva || isNaN(datosResena.id_reserva)) {
      throw new Error('El ID de la reserva es obligatorio y debe ser un número');
    }
    if (!datosResena.estrellas || isNaN(datosResena.estrellas) || datosResena.estrellas < 1 || datosResena.estrellas > 5) {
      throw new Error('Las estrellas son obligatorias y deben estar entre 1 y 5');
    }

    // Validar estado si se proporciona
    if (datosResena.estado !== undefined && typeof datosResena.estado !== 'boolean') {
      throw new Error('El estado debe ser un valor booleano');
    }

    // Validar verificado
    if (datosResena.verificado !== undefined && typeof datosResena.verificado !== 'boolean') {
      throw new Error('El campo verificado debe ser un valor booleano');
    }

    // Verificar si la reserva existe
    const reservaQuery = `
      SELECT id_reserva FROM reserva WHERE id_reserva = $1
    `;
    const reservaResult = await pool.query(reservaQuery, [datosResena.id_reserva]);
    if (!reservaResult.rows[0]) {
      throw new Error('La reserva asociada no existe');
    }

    // Verificar si ya existe una reseña para esta reserva (por la restricción UNIQUE)
    const resenaExistenteQuery = `
      SELECT id_resena FROM resena WHERE id_reserva = $1
    `;
    const resenaExistenteResult = await pool.query(resenaExistenteQuery, [datosResena.id_reserva]);
    if (resenaExistenteResult.rows[0]) {
      throw new Error('Ya existe una reseña asociada a esta reserva');
    }

    const query = `
      INSERT INTO resena (
        id_reserva, estrellas, comentario, estado, verificado
      ) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      datosResena.id_reserva,
      datosResena.estrellas,
      datosResena.comentario || null,
      datosResena.estado !== undefined ? datosResena.estado : false,
      datosResena.verificado !== undefined ? datosResena.verificado : false
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error al crear reseña:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Actualizar reseña parcialmente
 */
const actualizarResena = async (id, camposActualizar) => {
  try {
    const camposPermitidos = ['id_reserva', 'estrellas', 'comentario', 'estado', 'verificado'];

    const campos = Object.keys(camposActualizar).filter(key => 
      camposPermitidos.includes(key)
    );

    if (campos.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    // Validar estrellas
    if (camposActualizar.estrellas && (isNaN(camposActualizar.estrellas) || camposActualizar.estrellas < 1 || camposActualizar.estrellas > 5)) {
      throw new Error('Las estrellas deben estar entre 1 y 5');
    }

    // Validar estado
    if (camposActualizar.estado !== undefined && typeof camposActualizar.estado !== 'boolean') {
      throw new Error('El estado debe ser un valor booleano');
    }

    // Validar verificado
    if (camposActualizar.verificado !== undefined && typeof camposActualizar.verificado !== 'boolean') {
      throw new Error('El campo verificado debe ser un valor booleano');
    }

    // Validar reserva si se proporciona
    if (camposActualizar.id_reserva) {
      const reservaQuery = `
        SELECT id_reserva FROM reserva WHERE id_reserva = $1
      `;
      const reservaResult = await pool.query(reservaQuery, [camposActualizar.id_reserva]);
      if (!reservaResult.rows[0]) {
        throw new Error('La reserva asociada no existe');
      }
      // Verificar unicidad de id_reserva
      const resenaExistenteQuery = `
        SELECT id_resena FROM resena WHERE id_reserva = $1 AND id_resena != $2
      `;
      const resenaExistenteResult = await pool.query(resenaExistenteQuery, [camposActualizar.id_reserva, id]);
      if (resenaExistenteResult.rows[0]) {
        throw new Error('Ya existe otra reseña asociada a esta reserva');
      }
    }

    const setClause = campos.map((campo, index) => `${campo} = $${index + 2}`).join(', ');
    
    // ⚠️ CORRECCIÓN: No usar || null para booleanos
    const values = campos.map(campo => {
      const value = camposActualizar[campo];
      
      // Para campos string/texto, usar null si está vacío
      if (['comentario'].includes(campo)) {
        return value || null;
      }
      
      // Para campos booleanos, preservar false
      if (['estado', 'verificado'].includes(campo)) {
        return value; // Mantener tanto true como false
      }
      
      // Para otros campos
      return value !== undefined && value !== null ? value : null;
    });

    const query = `
      UPDATE resena 
      SET ${setClause}
      WHERE id_resena = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar reseña
 */
const eliminarResena = async (id) => {
  try {
    const query = 'DELETE FROM resena WHERE id_resena = $1 RETURNING id_resena';
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

    const { resenas, total } = await obtenerDatosEspecificos(limite, offset);
    
    res.json(respuesta(true, 'Reseñas obtenidas correctamente', {
      resenas,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en obtenerDatosEspecificos:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /filtro - ACTUALIZADO
 */
// En el controlador obtenerResenasFiltradasController, actualiza los tipos válidos:
const obtenerResenasFiltradasController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Tipos válidos ACTUALIZADOS - SOLO LOS REQUERIDOS
    const tiposValidos = ['verificado_si', 'verificado_no', 'cliente_nombre', 'cancha_nombre'];
    
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 
        `El parámetro "tipo" es inválido. Valores permitidos: ${tiposValidos.join(', ')}`
      ));
    }

    const { resenas, total } = await obtenerResenasFiltradas(tipo, limite, offset);

    res.json(respuesta(true, `Reseñas filtradas por ${tipo} obtenidas correctamente`, {
      resenas,
      filtro: tipo,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en obtenerResenasFiltradas:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar
 */
const buscarResenasController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { resenas, total } = await buscarResenas(q, limite, offset);
    
    res.json(respuesta(true, 'Reseñas obtenidas correctamente', {
      resenas,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en buscarResenas:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /dato-individual/:id
 */
const obtenerResenaPorIdController = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Solicitando reseña con ID:', id); // ← DEBUG

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de reseña no válido'));
    }

    const resena = await obtenerResenaPorId(parseInt(id));

    if (!resena) {
      return res.status(404).json(respuesta(false, 'Reseña no encontrada'));
    }

    res.json(respuesta(true, 'Reseña obtenida correctamente', { resena }));
  } catch (error) {
    console.error('Error en obtenerResenaPorId:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para POST - Crear reseña
 */
const crearResenaController = async (req, res) => {
  try {
    const datos = req.body;

    // Validaciones básicas
    const camposObligatorios = ['id_reserva', 'estrellas'];
    const faltantes = camposObligatorios.filter(campo => !datos[campo] || datos[campo].toString().trim() === '');

    if (faltantes.length > 0) {
      return res.status(400).json(
        respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`)
      );
    }

    const nuevaResena = await crearResena(datos);

    res.status(201).json(respuesta(true, 'Reseña creada correctamente', { resena: nuevaResena }));
  } catch (error) {
    console.error('Error en crearResena:', error.message);
    
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json(respuesta(false, 'Ya existe una reseña asociada a esta reserva'));
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para PATCH - Actualizar reseña
 */
const actualizarResenaController = async (req, res) => {
  try {
    const { id } = req.params;
    const camposActualizar = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de reseña no válido'));
    }

    if (Object.keys(camposActualizar).length === 0) {
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const resenaActualizada = await actualizarResena(parseInt(id), camposActualizar);

    if (!resenaActualizada) {
      return res.status(404).json(respuesta(false, 'Reseña no encontrada'));
    }

    res.json(respuesta(true, 'Reseña actualizada correctamente', { resena: resenaActualizada }));
  } catch (error) {
    console.error('Error en actualizarResena:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para DELETE - Eliminar reseña
 */
const eliminarResenaController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de reseña no válido'));
    }

    const resenaEliminada = await eliminarResena(parseInt(id));

    if (!resenaEliminada) {
      return res.status(404).json(respuesta(false, 'Reseña no encontrada'));
    }

    res.json(respuesta(true, 'Reseña eliminada correctamente'));
  } catch (error) {
    console.error('Error en eliminarResena:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

// RUTAS

// GET endpoints
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerResenasFiltradasController);
router.get('/buscar', buscarResenasController);
router.get('/dato-individual/:id', obtenerResenaPorIdController);

// POST, PATCH, DELETE endpoints
router.post('/', crearResenaController);
router.patch('/:id', actualizarResenaController);
router.delete('/:id', eliminarResenaController);

module.exports = router;