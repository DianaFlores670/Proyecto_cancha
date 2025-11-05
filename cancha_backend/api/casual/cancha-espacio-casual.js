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
 * Obtener todas las canchas por ID de espacio deportivo
 */
const obtenerCanchasPorEspacio = async (idEspacio, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT c.id_cancha, c.nombre, c.ubicacion, c.monto_por_hora, 
             c.imagen_cancha, e.id_espacio, e.nombre AS espacio_nombre,
             COALESCE(
               (SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
                 'nombre', d.nombre
               )) 
                FROM se_practica sp
                JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
                WHERE sp.id_cancha = c.id_cancha),
               '{}'
             ) AS disciplinas
      FROM cancha c
      JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      WHERE c.id_espacio = $1
      ORDER BY c.id_cancha
      LIMIT $2 OFFSET $3
    `;
    const queryTotal = `
      SELECT COUNT(*) 
      FROM cancha 
      WHERE id_espacio = $1
    `;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [idEspacio, limite, offset]),
      pool.query(queryTotal, [idEspacio]),
    ]);
    return {
      canchas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    throw new Error(`Error al obtener canchas por espacio: ${error.message}`);
  }
};

/**
 * Buscar canchas por texto en múltiples campos DENTRO de un espacio específico
 */
const buscarCanchasEnEspacio = async (idEspacio, texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT c.id_cancha, c.nombre, c.ubicacion, c.capacidad, c.estado, c.monto_por_hora, 
             c.imagen_cancha, e.id_espacio, e.nombre AS espacio_nombre,
             COALESCE(
               (SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
                 'nombre', d.nombre
               )) 
                FROM se_practica sp
                JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
                WHERE sp.id_cancha = c.id_cancha),
               '{}'
             ) AS disciplinas
      FROM cancha c
      JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      WHERE c.id_espacio = $1 AND (
        c.nombre ILIKE $2 OR 
        c.ubicacion ILIKE $2
      )
      ORDER BY c.nombre
      LIMIT $3 OFFSET $4
    `;
    const queryTotal = `
      SELECT COUNT(*) 
      FROM cancha c
      JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      WHERE c.id_espacio = $1 AND (
        c.nombre ILIKE $2 OR 
        c.ubicacion ILIKE $2
      )
    `;
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [idEspacio, terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [idEspacio, terminoBusqueda]),
    ]);
    return {
      canchas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    throw new Error(`Error al buscar canchas en espacio: ${error.message}`);
  }
};

/**
 * Obtener canchas con filtros de ordenamiento por nombre, ubicación o disciplina DENTRO de un espacio específico
 */
const obtenerCanchasFiltradasEnEspacio = async (idEspacio, tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      nombre: 'c.nombre ASC',
      monto: 'c.monto_por_hora ASC',
      disciplina: 'd.nombre ASC',
      default: 'c.id_cancha ASC',
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    let queryDatos = '';
    let queryTotal = '';
    const queryParams = [idEspacio, limite, offset];

    if (tipoFiltro === 'disciplina') {
      queryDatos = `
        SELECT DISTINCT c.id_cancha, c.nombre, c.ubicacion, c.capacidad, c.estado, c.monto_por_hora, 
               c.imagen_cancha, e.id_espacio, e.nombre AS espacio_nombre,
               d.nombre AS disciplina_nombre,
               COALESCE(
                 (SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
                   'nombre', d2.nombre
                 )) 
                  FROM se_practica sp2
                  JOIN disciplina d2 ON sp2.id_disciplina = d2.id_disciplina
                  WHERE sp2.id_cancha = c.id_cancha),
                 '{}'
               ) AS disciplinas
        FROM cancha c
        JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
        LEFT JOIN se_practica sp ON c.id_cancha = sp.id_cancha
        LEFT JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
        WHERE c.id_espacio = $1
        ORDER BY ${orden}
        LIMIT $2 OFFSET $3
      `;
      queryTotal = `
        SELECT COUNT(DISTINCT c.id_cancha)
        FROM cancha c
        JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
        LEFT JOIN se_practica sp ON c.id_cancha = sp.id_cancha
        LEFT JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
        WHERE c.id_espacio = $1
      `;
    } else {
      queryDatos = `
        SELECT c.id_cancha, c.nombre, c.ubicacion, c.capacidad, c.estado, c.monto_por_hora, 
               c.imagen_cancha, e.id_espacio, e.nombre AS espacio_nombre,
               COALESCE(
                 (SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
                   'id_disciplina', d.id_disciplina,
                   'nombre', d.nombre,
                   'descripcion', d.descripcion,
                   'frecuencia_practica', sp.frecuencia_practica
                 )) 
                  FROM se_practica sp
                  JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
                  WHERE sp.id_cancha = c.id_cancha),
                 '{}'
               ) AS disciplinas
        FROM cancha c
        JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
        WHERE c.id_espacio = $1
        ORDER BY ${orden}
        LIMIT $2 OFFSET $3
      `;
      queryTotal = `
        SELECT COUNT(*) 
        FROM cancha c
        JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
        WHERE c.id_espacio = $1
      `;
    }

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, queryParams),
      pool.query(queryTotal, [idEspacio]),
    ]);

    return {
      canchas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    throw new Error(`Error al obtener canchas filtradas en espacio: ${error.message}`);
  }
};

/**
 * Obtener cancha por ID con todos sus datos
 */
const obtenerCanchaPorId = async (id) => {
  try {
    const query = `
      SELECT c.*, e.id_espacio, e.nombre AS espacio_nombre, e.direccion AS espacio_direccion
      FROM cancha c
      JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      WHERE c.id_cancha = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw new Error(`Error al obtener cancha por ID: ${error.message}`);
  }
};

/**
 * Obtener disciplinas de una cancha específica
 */
const obtenerDisciplinasCancha = async (id_cancha) => {
  try {
    const query = `
      SELECT d.id_disciplina, d.nombre, d.descripcion, sp.frecuencia_practica
      FROM se_practica sp
      JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
      WHERE sp.id_cancha = $1
    `;
    const result = await pool.query(query, [id_cancha]);
    return result.rows;
  } catch (error) {
    throw new Error(`Error al obtener disciplinas de la cancha: ${error.message}`);
  }
};

// CONTROLADORES - Manejan las request y response

/**
 * Controlador para GET /datos-especificos/:idEspacio
 */
const obtenerCanchasPorEspacioController = async (req, res) => {
  try {
    const { idEspacio } = req.params;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!idEspacio || isNaN(idEspacio)) {
      return res.status(400).json(respuesta(false, 'ID de espacio deportivo no válido'));
    }

    const { canchas, total } = await obtenerCanchasPorEspacio(parseInt(idEspacio), limite, offset);

    res.json(respuesta(true, 'Canchas obtenidas correctamente', {
      canchas,
      paginacion: { limite, offset, total },
    }));
  } catch (error) {
    console.error('Error en obtenerCanchasPorEspacio:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar/:idEspacio
 */
const buscarCanchasEnEspacioController = async (req, res) => {
  try {
    const { idEspacio } = req.params;
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!idEspacio || isNaN(idEspacio)) {
      return res.status(400).json(respuesta(false, 'ID de espacio deportivo no válido'));
    }

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { canchas, total } = await buscarCanchasEnEspacio(parseInt(idEspacio), q, limite, offset);

    res.json(respuesta(true, 'Canchas obtenidas correctamente', {
      canchas,
      paginacion: { limite, offset, total },
    }));
  } catch (error) {
    console.error('Error en buscarCanchasEnEspacio:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /filtro/:idEspacio
 */
const obtenerCanchasFiltradasEnEspacioController = async (req, res) => {
  try {
    const { idEspacio } = req.params;
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!idEspacio || isNaN(idEspacio)) {
      return res.status(400).json(respuesta(false, 'ID de espacio deportivo no válido'));
    }

    const tiposValidos = ['nombre', 'monto', 'disciplina'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parámetro "tipo" es inválido o no proporcionado'));
    }

    const { canchas, total } = await obtenerCanchasFiltradasEnEspacio(parseInt(idEspacio), tipo, limite, offset);

    res.json(respuesta(true, `Canchas filtradas por ${tipo} obtenidas correctamente`, {
      canchas,
      filtro: tipo,
      paginacion: { limite, offset, total },
    }));
  } catch (error) {
    console.error('Error en obtenerCanchasFiltradasEnEspacio:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /dato-individual/:id
 */
const obtenerCanchaPorIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de cancha no válido'));
    }

    const cancha = await obtenerCanchaPorId(parseInt(id));
    if (!cancha) {
      return res.status(404).json(respuesta(false, 'Cancha no encontrada'));
    }

    // Obtener disciplinas de la cancha
    const disciplinas = await obtenerDisciplinasCancha(parseInt(id));

    res.json(respuesta(true, 'Cancha obtenida correctamente', {
      cancha: { ...cancha, disciplinas },
    }));
  } catch (error) {
    console.error('Error en obtenerCanchaPorId:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

// RUTAS - Manteniendo las mismas rutas
router.get('/datos-especificos/:idEspacio', obtenerCanchasPorEspacioController);
router.get('/buscar/:idEspacio', buscarCanchasEnEspacioController);
router.get('/filtro/:idEspacio', obtenerCanchasFiltradasEnEspacioController);
router.get('/dato-individual/:id', obtenerCanchaPorIdController);

module.exports = router;