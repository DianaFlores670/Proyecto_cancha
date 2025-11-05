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
 * Obtener todas las canchas (sin filtro por espacio)
 */
const obtenerTodasLasCanchas = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      WITH promedio_resenas AS (
        SELECT 
          c.id_cancha,
          COALESCE(AVG(r.estrellas)::numeric(3,2), 0) AS promedio_estrellas
        FROM CANCHA c
        LEFT JOIN RESERVA res ON c.id_cancha = res.id_cancha
        LEFT JOIN RESENA r ON res.id_reserva = r.id_reserva
        GROUP BY c.id_cancha
      )
      SELECT 
        c.id_cancha, 
        c.nombre, 
        c.ubicacion, 
        c.monto_por_hora, 
        c.imagen_cancha, 
        e.id_espacio, 
        e.nombre AS espacio_nombre,
        COALESCE(
          (SELECT ARRAY_AGG(JSONB_BUILD_OBJECT(
            'nombre', d.nombre
          )) 
           FROM se_practica sp
           JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
           WHERE sp.id_cancha = c.id_cancha),
          '{}'
        ) AS disciplinas,
        pr.promedio_estrellas
      FROM cancha c
      JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      LEFT JOIN promedio_resenas pr ON c.id_cancha = pr.id_cancha
      ORDER BY pr.promedio_estrellas DESC, c.id_cancha
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `
      SELECT COUNT(*) 
      FROM cancha
    `;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal),
    ]);
    return {
      canchas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    throw new Error(`Error al obtener todas las canchas: ${error.message}`);
  }
};
/**
 * Buscar canchas por texto en múltiples campos (sin filtro por espacio)
 */
const buscarCanchas = async (texto, limite = 10, offset = 0) => {
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
      WHERE c.nombre ILIKE $1 OR 
            c.ubicacion ILIKE $1 OR
            e.nombre ILIKE $1
      ORDER BY c.nombre
      LIMIT $2 OFFSET $3
    `;
    const queryTotal = `
      SELECT COUNT(*) 
      FROM cancha c
      JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      WHERE c.nombre ILIKE $1 OR 
            c.ubicacion ILIKE $1 OR
            e.nombre ILIKE $1
    `;
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda]),
    ]);
    return {
      canchas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    throw new Error(`Error al buscar canchas: ${error.message}`);
  }
};

/**
 * Obtener canchas con filtros de ordenamiento (sin filtro por espacio)
 */
/**
 * Obtener canchas con filtros de ordenamiento (sin filtro por espacio)
 */
const obtenerCanchasFiltradas = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      nombre: 'c.nombre ASC',
      monto: 'c.monto_por_hora ASC',
      disciplina: 'd.nombre ASC',
      espacio: 'e.nombre ASC',
      default: 'c.id_cancha ASC',
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    let queryDatos = '';
    let queryTotal = '';
    const queryParams = [limite, offset];

    if (tipoFiltro === 'disciplina') {
      queryDatos = `
        SELECT 
          c.id_cancha, 
          c.nombre, 
          c.ubicacion, 
          c.monto_por_hora, 
          c.imagen_cancha, 
          e.id_espacio, 
          e.nombre AS espacio_nombre,
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
        GROUP BY 
          c.id_cancha, 
          c.nombre, 
          c.ubicacion, 
          c.capacidad, 
          c.estado, 
          c.monto_por_hora, 
          c.imagen_cancha, 
          e.id_espacio, 
          e.nombre,
          d.nombre
        ORDER BY ${orden}
        LIMIT $1 OFFSET $2
      `;
      queryTotal = `
        SELECT COUNT(DISTINCT c.id_cancha)
        FROM cancha c
        JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
        LEFT JOIN se_practica sp ON c.id_cancha = sp.id_cancha
        LEFT JOIN disciplina d ON sp.id_disciplina = d.id_disciplina
      `;
    } else {
      queryDatos = `
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
        ORDER BY ${orden}
        LIMIT $1 OFFSET $2
      `;
      queryTotal = `
        SELECT COUNT(*) 
        FROM cancha c
        JOIN espacio_deportivo e ON c.id_espacio = e.id_espacio
      `;
    }

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, queryParams),
      pool.query(queryTotal),
    ]);

    return {
      canchas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count),
    };
  } catch (error) {
    throw new Error(`Error al obtener canchas filtradas: ${error.message}`);
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
 * Controlador para GET /datos-especificos
 */
const obtenerTodasLasCanchasController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;

    const { canchas, total } = await obtenerTodasLasCanchas(limite, offset);

    res.json(respuesta(true, 'Canchas obtenidas correctamente', {
      canchas,
      paginacion: { limite, offset, total },
    }));
  } catch (error) {
    console.error('Error en obtenerTodasLasCanchas:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar
 */
const buscarCanchasController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { canchas, total } = await buscarCanchas(q, limite, offset);

    res.json(respuesta(true, 'Canchas obtenidas correctamente', {
      canchas,
      paginacion: { limite, offset, total },
    }));
  } catch (error) {
    console.error('Error en buscarCanchas:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /filtro
 */
const obtenerCanchasFiltradasController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['nombre', 'monto', 'disciplina', 'espacio'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parámetro "tipo" es inválido o no proporcionado'));
    }

    const { canchas, total } = await obtenerCanchasFiltradas(tipo, limite, offset);

    res.json(respuesta(true, `Canchas filtradas por ${tipo} obtenidas correctamente`, {
      canchas,
      filtro: tipo,
      paginacion: { limite, offset, total },
    }));
  } catch (error) {
    console.error('Error en obtenerCanchasFiltradas:', error.message);
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

// RUTAS ACTUALIZADAS - Sin parámetro de espacio
router.get('/datos-especificos', obtenerTodasLasCanchasController);
router.get('/buscar', buscarCanchasController);
router.get('/filtro', obtenerCanchasFiltradasController);
router.get('/dato-individual/:id', obtenerCanchaPorIdController);

module.exports = router;