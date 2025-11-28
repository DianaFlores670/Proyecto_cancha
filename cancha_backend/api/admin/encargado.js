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
 * Obtener datos específicos de encargados con información de la persona
 */
const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT e.id_encargado, p.nombre, p.apellido, p.correo, e.responsabilidad, e.fecha_inicio, e.hora_ingreso, e.hora_salida, e.estado
      FROM encargado e
      JOIN usuario p ON e.id_encargado = p.id_persona
      ORDER BY e.id_encargado
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM encargado`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);
    return {
      encargados: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener encargados con filtros de ordenamiento
 */
const obtenerEncargadosFiltrados = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      nombre: 'p.nombre ASC, p.apellido ASC',
      fecha: 'e.fecha_inicio DESC',
      correo: 'p.correo ASC',
      default: 'e.id_encargado ASC'
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const queryDatos = `
      SELECT e.id_encargado, p.nombre, p.apellido, p.correo, e.responsabilidad, e.fecha_inicio, e.hora_ingreso, e.hora_salida, e.estado
      FROM encargado e
      JOIN usuario p ON e.id_encargado = p.id_persona
      ORDER BY ${orden}
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM encargado`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      encargados: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw new Error(`Error al obtener encargados filtrados: ${error.message}`);
  }
};

/**
 * Buscar encargados por texto en múltiples campos
 */
const buscarEncargados = async (texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT e.id_encargado, p.nombre, p.apellido, p.correo, e.responsabilidad, e.fecha_inicio, e.hora_ingreso, e.hora_salida, e.estado
      FROM encargado e
      JOIN usuario p ON e.id_encargado = p.id_persona
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        p.correo ILIKE $1 OR 
        e.responsabilidad ILIKE $1
      ORDER BY p.nombre, p.apellido
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM encargado e
      JOIN usuario p ON e.id_encargado = p.id_persona
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        p.correo ILIKE $1 OR 
        e.responsabilidad ILIKE $1
    `;
    
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda])
    ]);

    return {
      encargados: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtener encargado por ID
 */
const obtenerEncargadoPorId = async (id) => {
  try {
    const query = `
      SELECT e.id_encargado, p.nombre, p.apellido, p.correo, p.usuario, e.responsabilidad, e.fecha_inicio, e.hora_ingreso, e.hora_salida, e.estado
      FROM encargado e
      JOIN usuario p ON e.id_encargado = p.id_persona
      WHERE e.id_encargado = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Crear nuevo encargado
 */
const crearEncargado = async (datosEncargado) => {
  try {
    // Asignar contraseña por defecto si no se proporciona
    if (!datosEncargado.contrasena || datosEncargado.contrasena.trim() === '') {
      datosEncargado.contrasena = '123456';
    }

    // Generar latitud y longitud aleatorias en rango de La Paz, Bolivia
    const minLat = -16.55;
    const maxLat = -16.45;
    const minLong = -68.20;
    const maxLong = -68.10;
    const latitud = parseFloat((Math.random() * (maxLat - minLat) + minLat).toFixed(6));
    const longitud = parseFloat((Math.random() * (maxLong - minLong) + minLong).toFixed(6));

    // Validar responsabilidad
    if (datosEncargado.responsabilidad && datosEncargado.responsabilidad.length > 255) {
      throw new Error('La responsabilidad no debe exceder los 255 caracteres');
    }

    // Validar fecha_inicio si se proporciona
    if (datosEncargado.fecha_inicio) {
      const fechaInicio = new Date(datosEncargado.fecha_inicio);
      if (isNaN(fechaInicio.getTime())) {
        throw new Error('La fecha de inicio no es válida o está en el futuro');
      }
    }

    // Validar hora_ingreso y hora_salida
    const validarHora = (hora) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(hora);
    if (datosEncargado.hora_ingreso && !validarHora(datosEncargado.hora_ingreso)) {
      throw new Error('La hora de ingreso no es válida (formato HH:MM:SS)');
    }
    if (datosEncargado.hora_salida && !validarHora(datosEncargado.hora_salida)) {
      throw new Error('La hora de salida no es válida (formato HH:MM:SS)');
    }

    // Insertar en USUARIO primero
    const queryUsuario = `
      INSERT INTO usuario (
        nombre, apellido, contrasena, telefono, correo, sexo, imagen_perfil, usuario, latitud, longitud
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id_persona
    `;
    const valuesUsuario = [
      datosEncargado.nombre || null,
      datosEncargado.apellido || null,
      datosEncargado.contrasena,
      datosEncargado.telefono || null,
      datosEncargado.correo,
      datosEncargado.sexo || null,
      datosEncargado.imagen_perfil || null,
      datosEncargado.usuario,
      latitud,
      longitud
    ];
    const resultUsuario = await pool.query(queryUsuario, valuesUsuario);
    const idEncargado = resultUsuario.rows[0].id_persona;

    // Insertar en ENCARGADO
    const queryEncargado = `
      INSERT INTO encargado (
        id_encargado, responsabilidad, fecha_inicio, hora_ingreso, hora_salida, estado
      ) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const valuesEncargado = [
      idEncargado,
      datosEncargado.responsabilidad || null,
      datosEncargado.fecha_inicio || new Date().toISOString().split('T')[0],
      datosEncargado.hora_ingreso || null,
      datosEncargado.hora_salida || null,
      datosEncargado.estado !== undefined ? datosEncargado.estado : true
    ];
    const resultEncargado = await pool.query(queryEncargado, valuesEncargado);

    // Obtener datos completos para retornar
    const encargadoCompleto = await obtenerEncargadoPorId(idEncargado);
    return encargadoCompleto;
  } catch (error) {
    console.error('Error al crear encargado:', error.message);
    throw new Error(error.message);
  }
};

/**
 * Actualizar encargado parcialmente
 */
const actualizarEncargado = async (id, camposActualizar) => {
  try {
    // Separar campos por tabla
    const camposUser = {};
    const camposEncargado = {};

    // Campos de USUARIO
    ['nombre', 'apellido', 'correo', 'telefono', 'sexo', 'imagen_perfil'].forEach(key => {
      if (key in camposActualizar) {
        camposUser[key] = camposActualizar[key] || null;
      }
    });

    // Campos de ENCARGADO
    ['responsabilidad', 'fecha_inicio', 'hora_ingreso', 'hora_salida', 'estado'].forEach(key => {
      if (key in camposActualizar) {
        camposEncargado[key] = camposActualizar[key] || null;
      }
    });

    if (Object.keys(camposUser).length === 0 && Object.keys(camposEncargado).length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    // Validar responsabilidad si se proporciona
    if (camposEncargado.responsabilidad && camposEncargado.responsabilidad.length > 255) {
      throw new Error('La responsabilidad no debe exceder los 255 caracteres');
    }

    // Validar fecha_inicio si se proporciona
    if (camposEncargado.fecha_inicio) {
      const fechaInicio = new Date(camposEncargado.fecha_inicio);
      if (isNaN(fechaInicio.getTime()) || fechaInicio > new Date()) {
        throw new Error('La fecha de inicio no es válida o está en el futuro');
      }
    }

    // Validar hora_ingreso y hora_salida si se proporcionan
    const validarHora = (hora) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(hora);
    if (camposEncargado.hora_ingreso && !validarHora(camposEncargado.hora_ingreso)) {
      throw new Error('La hora de ingreso no es válida (formato HH:MM:SS)');
    }
    if (camposEncargado.hora_salida && !validarHora(camposEncargado.hora_salida)) {
      throw new Error('La hora de salida no es válida (formato HH:MM:SS)');
    }

    // Actualizar USUARIO si aplica
    if (Object.keys(camposUser).length > 0) {
      const setClauseUser = Object.keys(camposUser).map((campo, index) => `${campo} = $${index + 1}`).join(', ');
      const valuesUser = [...Object.values(camposUser), id];
      const queryUser = `
        UPDATE usuario 
        SET ${setClauseUser}
        WHERE id_persona = $${Object.keys(camposUser).length + 1}
      `;
      await pool.query(queryUser, valuesUser);
    }

    // Actualizar ENCARGADO si aplica
    let encargadoUpdated = null;
    if (Object.keys(camposEncargado).length > 0) {
      const setClauseEncargado = Object.keys(camposEncargado).map((campo, index) => `${campo} = $${index + 2}`).join(', ');
      const valuesEncargado = [id, ...Object.values(camposEncargado)];
      const queryEncargado = `
        UPDATE encargado 
        SET ${setClauseEncargado}
        WHERE id_encargado = $1
        RETURNING *
      `;
      const resultEncargado = await pool.query(queryEncargado, valuesEncargado);
      encargadoUpdated = resultEncargado.rows[0] || null;
    }

    // Retornar datos completos actualizados
    const encargadoCompleto = await obtenerEncargadoPorId(id);
    return encargadoCompleto;
  } catch (error) {
    throw error;
  }
};

/**
 * Eliminar encargado
 */
const eliminarEncargado = async (id) => {
  try {
    const query = 'DELETE FROM encargado WHERE id_encargado = $1 RETURNING id_encargado';
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

    const { encargados, total } = await obtenerDatosEspecificos(limite, offset);
    
    res.json(respuesta(true, 'Encargados obtenidos correctamente', {
      encargados,
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
const obtenerEncargadosFiltradosController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['nombre', 'fecha', 'correo'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parámetro "tipo" es inválido o no proporcionado'));
    }

    const { encargados, total } = await obtenerEncargadosFiltrados(tipo, limite, offset);

    res.json(respuesta(true, `Encargados filtrados por ${tipo} obtenidos correctamente`, {
      encargados,
      filtro: tipo,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en obtenerEncargadosFiltrados:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar
 */
const buscarEncargadosController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { encargados, total } = await buscarEncargados(q, limite, offset);
    
    res.json(respuesta(true, 'Encargados obtenidos correctamente', {
      encargados,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error en buscarEncargados:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /dato-individual/:id
 */
const obtenerEncargadoPorIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de encargado no válido'));
    }

    const encargado = await obtenerEncargadoPorId(parseInt(id));

    if (!encargado) {
      return res.status(404).json(respuesta(false, 'Encargado no encontrado'));
    }

    res.json(respuesta(true, 'Encargado obtenido correctamente', { encargado }));
  } catch (error) {
    console.error('Error en obtenerEncargadoPorId:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para POST - Crear encargado
 */
const crearEncargadoController = async (req, res) => {
  try {
    const datos = req.body;

    // Validaciones básicas
    const camposObligatorios = ['correo', 'usuario'];
    const faltantes = camposObligatorios.filter(campo => !datos[campo] || datos[campo].toString().trim() === '');

    if (faltantes.length > 0) {
      return res.status(400).json(
        respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`)
      );
    }

    const nuevoEncargado = await crearEncargado(datos);

    res.status(201).json(respuesta(true, 'Encargado creado correctamente', { encargado: nuevoEncargado }));
  } catch (error) {
    console.error('Error en crearEncargado:', error.message);
    
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json(respuesta(false, 'El correo o usuario ya existe'));
    }
    
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para PATCH - Actualizar encargado
 */
const actualizarEncargadoController = async (req, res) => {
  try {
    const { id } = req.params;
    const camposActualizar = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de encargado no válido'));
    }

    if (Object.keys(camposActualizar).length === 0) {
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const encargadoActualizado = await actualizarEncargado(parseInt(id), camposActualizar);

    if (!encargadoActualizado) {
      return res.status(404).json(respuesta(false, 'Encargado no encontrado'));
    }

    res.json(respuesta(true, 'Encargado actualizado correctamente', { encargado: encargadoActualizado }));
  } catch (error) {
    console.error('Error en actualizarEncargado:', error.message);
    if (error.code === '23505') { // Violación de unique constraint
      // Verificar si el error es por el correo duplicado
      if (error.constraint === 'persona_correo_key') {
        return res.status(400).json(respuesta(false, 'El correo electrónico ya está registrado. Por favor, use otro correo.'));
      }

      // O si el error es por el usuario duplicado
      if (error.constraint === 'persona_usuario_key') {
        return res.status(400).json(respuesta(false, 'El nombre de usuario ya está en uso. Por favor, elija otro nombre de usuario.'));
      }
    }
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para DELETE - Eliminar encargado
 */
const eliminarEncargadoController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de encargado no válido'));
    }

    const encargadoEliminado = await eliminarEncargado(parseInt(id));

    if (!encargadoEliminado) {
      return res.status(404).json(respuesta(false, 'Encargado no encontrado'));
    }

    res.json(respuesta(true, 'Encargado eliminado correctamente'));
  } catch (error) {
    console.error('Error en eliminarEncargado:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

// RUTAS

// GET endpoints
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerEncargadosFiltradosController);
router.get('/buscar', buscarEncargadosController);
router.get('/dato-individual/:id', obtenerEncargadoPorIdController);

// POST, PATCH, DELETE endpoints
router.post('/', crearEncargadoController);
router.patch('/:id', actualizarEncargadoController);
router.delete('/:id', eliminarEncargadoController);

module.exports = router;