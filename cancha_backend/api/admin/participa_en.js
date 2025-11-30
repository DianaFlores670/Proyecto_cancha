const express = require('express');
const pool = require('../../config/database');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos
});

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

const crearParticipaEn = async (datosParticipaEn) => {
  try {
    if (!datosParticipaEn.id_deportista || isNaN(datosParticipaEn.id_deportista)) {
      throw new Error('El ID del deportista es obligatorio y debe ser un numero');
    }
    if (!datosParticipaEn.id_reserva || isNaN(datosParticipaEn.id_reserva)) {
      throw new Error('El ID de la reserva es obligatorio y debe ser un numero');
    }

    let fechaReserva = null;
    if (datosParticipaEn.fecha_reserva) {
      const d = dayjs
        .tz(datosParticipaEn.fecha_reserva, 'America/La_Paz')
        .startOf('day');
      if (!d.isValid()) {
        throw new Error('La fecha de reserva no es valida');
      }
      fechaReserva = d.format('YYYY-MM-DD');
    }

    const deportistaQuery = `
      SELECT id_deportista FROM deportista WHERE id_deportista = $1
    `;
    const deportistaResult = await pool.query(deportistaQuery, [datosParticipaEn.id_deportista]);
    if (!deportistaResult.rows[0]) {
      throw new Error('El deportista asociado no existe');
    }

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
      fechaReserva
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error al crear relacion participa_en:', error.message);
    throw new Error(error.message);
  }
};

const actualizarParticipaEn = async (id_deportista, id_reserva, camposActualizar) => {
  try {
    const camposPermitidos = ['fecha_reserva'];

    const campos = Object.keys(camposActualizar).filter(key => 
      camposPermitidos.includes(key)
    );

    if (campos.length === 0) {
      throw new Error('No hay campos validos para actualizar');
    }

    if (camposActualizar.fecha_reserva) {
      const d = dayjs
        .tz(camposActualizar.fecha_reserva, 'America/La_Paz')
        .startOf('day');
      if (!d.isValid()) {
        throw new Error('La fecha de reserva no es valida');
      }
      camposActualizar.fecha_reserva = d.format('YYYY-MM-DD');
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

/* NUEVOS MODELOS AGRUPADOS POR RESERVA */

const obtenerReservasConParticipantes = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        r.estado,
        c.id_cliente,
        p_c.nombre AS cliente_nombre,
        p_c.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id_deportista', pe.id_deportista,
              'fecha_reserva', pe.fecha_reserva,
              'nombre', p_d.nombre,
              'apellido', p_d.apellido
            )
          ) FILTER (WHERE pe.id_deportista IS NOT NULL),
          '[]'::json
        ) AS participantes
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p_c ON c.id_cliente = p_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN participa_en pe ON pe.id_reserva = r.id_reserva
      LEFT JOIN deportista d ON pe.id_deportista = d.id_deportista
      LEFT JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      GROUP BY
        r.id_reserva,
        c.id_cliente,
        p_c.nombre,
        p_c.apellido,
        ca.id_cancha,
        ca.nombre
      ORDER BY r.id_reserva ASC
      LIMIT $1 OFFSET $2
    `;

    const queryTotal = `
      SELECT COUNT(*) AS total
      FROM reserva
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].total)
    };
  } catch (error) {
    throw error;
  }
};

const obtenerParticipantesPorReserva = async (id_reserva) => {
  try {
    const query = `
      SELECT
        pe.id_deportista,
        pe.id_reserva,
        pe.fecha_reserva,
        p_d.nombre AS deportista_nombre,
        p_d.apellido AS deportista_apellido
      FROM participa_en pe
      JOIN deportista d ON pe.id_deportista = d.id_deportista
      JOIN usuario p_d ON d.id_deportista = p_d.id_persona
      WHERE pe.id_reserva = $1
      ORDER BY p_d.nombre, p_d.apellido, pe.id_deportista
    `;
    const result = await pool.query(query, [id_reserva]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

const eliminarParticipantesPorReserva = async (id_reserva) => {
  try {
    const query = `
      DELETE FROM participa_en
      WHERE id_reserva = $1
      RETURNING id_deportista, id_reserva
    `;
    const result = await pool.query(query, [id_reserva]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

/* CONTROLADORES EXISTENTES */

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

const obtenerParticipaEnFiltradasController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['deportista', 'reserva', 'fecha'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parametro "tipo" es invalido o no proporcionado'));
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

const buscarParticipaEnController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parametro de busqueda "q" es requerido'));
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

const obtenerParticipaEnPorIdController = async (req, res) => {
  try {
    const { id_deportista, id_reserva } = req.params;

    if (!id_deportista || isNaN(id_deportista) || !id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'IDs de deportista y reserva no validos'));
    }

    const participaEn = await obtenerParticipaEnPorId(parseInt(id_deportista), parseInt(id_reserva));

    if (!participaEn) {
      return res.status(404).json(respuesta(false, 'Relacion participa_en no encontrada'));
    }

    res.json(respuesta(true, 'Relacion participa_en obtenida correctamente', { participa_en: participaEn }));
  } catch (error) {
    console.error('Error en obtenerParticipaEnPorId:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const crearParticipaEnController = async (req, res) => {
  try {
    const datos = req.body;

    const camposObligatorios = ['id_deportista', 'id_reserva'];
    const faltantes = camposObligatorios.filter(campo => !datos[campo] || datos[campo].toString().trim() === '');

    if (faltantes.length > 0) {
      return res.status(400).json(
        respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`)
      );
    }

    const nuevaParticipaEn = await crearParticipaEn(datos);

    res.status(201).json(respuesta(true, 'Relacion participa_en creada correctamente', { participa_en: nuevaParticipaEn }));
  } catch (error) {
    console.error('Error en crearParticipaEn:', error.message);
    
    if (error.code === '23505') {
      return res.status(400).json(respuesta(false, 'La relacion participa_en ya existe'));
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

const actualizarParticipaEnController = async (req, res) => {
  try {
    const { id_deportista, id_reserva } = req.params;
    const camposActualizar = req.body;

    if (!id_deportista || isNaN(id_deportista) || !id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'IDs de deportista y reserva no validos'));
    }

    if (Object.keys(camposActualizar).length === 0) {
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const participaEnActualizada = await actualizarParticipaEn(parseInt(id_deportista), parseInt(id_reserva), camposActualizar);

    if (!participaEnActualizada) {
      return res.status(404).json(respuesta(false, 'Relacion participa_en no encontrada'));
    }

    res.json(respuesta(true, 'Relacion participa_en actualizada correctamente', { participa_en: participaEnActualizada }));
  } catch (error) {
    console.error('Error en actualizarParticipaEn:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const eliminarParticipaEnController = async (req, res) => {
  try {
    const { id_deportista, id_reserva } = req.params;

    if (!id_deportista || isNaN(id_deportista) || !id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'IDs de deportista y reserva no validos'));
    }

    const participaEnEliminada = await eliminarParticipaEn(parseInt(id_deportista), parseInt(id_reserva));

    if (!participaEnEliminada) {
      return res.status(404).json(respuesta(false, 'Relacion participa_en no encontrada'));
    }

    res.json(respuesta(true, 'Relacion participa_en eliminada correctamente'));
  } catch (error) {
    console.error('Error en eliminarParticipaEn:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/* NUEVOS CONTROLADORES AGRUPADOS POR RESERVA */

const obtenerReservasConParticipantesController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const { reservas, total } = await obtenerReservasConParticipantes(limite, offset);

    res.json(
      respuesta(true, 'Reservas con participantes obtenidas correctamente', {
        reservas,
        paginacion: { limite, offset, total }
      })
    );
  } catch (error) {
    console.error('Error en obtenerReservasConParticipantes:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const obtenerParticipantesPorReservaController = async (req, res) => {
  try {
    const { id_reserva } = req.params;

    if (!id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'ID de reserva no valido'));
    }

    const participantes = await obtenerParticipantesPorReserva(parseInt(id_reserva));

    res.json(
      respuesta(true, 'Participantes de la reserva obtenidos correctamente', {
        participantes
      })
    );
  } catch (error) {
    console.error('Error en obtenerParticipantesPorReserva:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const agregarParticipanteReservaController = async (req, res) => {
  try {
    const { id_reserva } = req.params;
    const { id_cliente, fecha_reserva } = req.body;

    if (!id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'ID de reserva no valido'));
    }
    if (!id_cliente || isNaN(id_cliente)) {
      return res.status(400).json(respuesta(false, 'ID de cliente no valido'));
    }

    const idReservaNum = parseInt(id_reserva);
    const idClienteNum = parseInt(id_cliente);

    // -------------------------------------------------------------------------
    // 1. OBTENER RESERVA + CUPOS
    // -------------------------------------------------------------------------
    const reservaQuery = `
      SELECT id_reserva, id_cliente, fecha_reserva, estado, cupo
      FROM reserva
      WHERE id_reserva = $1
      LIMIT 1
    `;
    const reservaResult = await pool.query(reservaQuery, [idReservaNum]);
    const reservaRow = reservaResult.rows[0];

    if (!reservaRow) {
      return res.status(404).json(respuesta(false, 'No se encontro la reserva'));
    }

    if (reservaRow.estado === 'cancelada') {
      return res.status(400).json(respuesta(false, 'La reserva esta cancelada'));
    }

    // -------------------------------------------------------------------------
    // 2. EL CLIENTE RESPONSABLE NO PUEDE UNIRSE COMO DEPORTISTA
    // -------------------------------------------------------------------------
    if (Number(reservaRow.id_cliente) === idClienteNum) {
      return res.status(400).json(
        respuesta(false, 'El cliente responsable no puede unirse como deportista')
      );
    }

    // -------------------------------------------------------------------------
    // 3. VALIDAR QUE EL CLIENTE EXISTA
    // -------------------------------------------------------------------------
    const clienteQuery = `
      SELECT id_cliente
      FROM cliente
      WHERE id_cliente = $1
      LIMIT 1
    `;
    const clienteResult = await pool.query(clienteQuery, [idClienteNum]);
    if (!clienteResult.rows[0]) {
      return res.status(400).json(respuesta(false, 'El cliente no existe'));
    }

    // -------------------------------------------------------------------------
    // 4. EVITAR DUPLICADO EN LA MISMA RESERVA
    // -------------------------------------------------------------------------
    const existeQuery = `
      SELECT 1
      FROM participa_en
      WHERE id_reserva = $1 AND id_deportista = $2
      LIMIT 1
    `;
    const existeResult = await pool.query(existeQuery, [idReservaNum, idClienteNum]);
    if (existeResult.rows[0]) {
      return res.status(400).json(
        respuesta(false, 'Ya se encuentra inscrito en esta reserva')
      );
    }

    // -------------------------------------------------------------------------
    // 5. VALIDAR CUPO DISPONIBLE (cupo total - 1 por cliente responsable)
    // -------------------------------------------------------------------------
    const cupo = Number(reservaRow.cupo) || 0;
    const maxDeportistas = cupo > 1 ? cupo - 1 : 0;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM participa_en
      WHERE id_reserva = $1
    `;
    const countResult = await pool.query(countQuery, [idReservaNum]);
    const totalDeportistas = parseInt(countResult.rows[0].total, 10) || 0;

    if (totalDeportistas >= maxDeportistas) {
      return res.status(400).json(
        respuesta(false, 'No hay cupos disponibles para esta reserva')
      );
    }

    // -------------------------------------------------------------------------
    // 6. AÑADIR A TABLA DEPORTISTA SI NO EXISTE
    // -------------------------------------------------------------------------
    const insertDeportistaQuery = `
      INSERT INTO deportista (id_deportista)
      VALUES ($1)
      ON CONFLICT (id_deportista) DO NOTHING
    `;
    await pool.query(insertDeportistaQuery, [idClienteNum]);

    // -------------------------------------------------------------------------
    // 7. PROCESAR FECHA
    // -------------------------------------------------------------------------
    let fechaFinal = fecha_reserva || reservaRow.fecha_reserva || null;
    if (fechaFinal) {
      const d = dayjs.tz(fechaFinal, 'America/La_Paz').startOf('day');
      if (!d.isValid()) {
        return res.status(400).json(respuesta(false, 'La fecha de reserva no es valida'));
      }
      fechaFinal = d.format('YYYY-MM-DD');
    }

    // -------------------------------------------------------------------------
    // 8. INSERTAR EN PARTICIPA_EN
    // -------------------------------------------------------------------------
    const insertParticipaQuery = `
      INSERT INTO participa_en (id_deportista, id_reserva, fecha_reserva)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    let nuevaRelacion;
    try {
      const insertResult = await pool.query(insertParticipaQuery, [
        idClienteNum,
        idReservaNum,
        fechaFinal
      ]);
      nuevaRelacion = insertResult.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        return res
          .status(400)
          .json(respuesta(false, 'La relacion participa_en ya existe'));
      }
      throw error;
    }

    // -------------------------------------------------------------------------
    // 9. RESPUESTA FINAL
    // -------------------------------------------------------------------------
    res.status(201).json(
      respuesta(true, 'Participante agregado correctamente', {
        participa_en: nuevaRelacion
      })
    );

  } catch (error) {
    console.error('Error en agregarParticipanteReserva:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const eliminarParticipanteReservaController = async (req, res) => {
  try {
    const { id_reserva, id_deportista } = req.params;

    if (!id_reserva || isNaN(id_reserva) || !id_deportista || isNaN(id_deportista)) {
      return res.status(400).json(respuesta(false, 'IDs de reserva o deportista no validos'));
    }

    const eliminada = await eliminarParticipaEn(
      parseInt(id_deportista),
      parseInt(id_reserva)
    );

    if (!eliminada) {
      return res.status(404).json(respuesta(false, 'Relacion participa_en no encontrada'));
    }

    res.json(
      respuesta(true, 'Participante eliminado de la reserva correctamente')
    );
  } catch (error) {
    console.error('Error en eliminarParticipanteReserva:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const eliminarTodosParticipantesReservaController = async (req, res) => {
  try {
    const { id_reserva } = req.params;

    if (!id_reserva || isNaN(id_reserva)) {
      return res.status(400).json(respuesta(false, 'ID de reserva no valido'));
    }

    const eliminados = await eliminarParticipantesPorReserva(parseInt(id_reserva));

    if (!eliminados || eliminados.length === 0) {
      return res
        .status(404)
        .json(respuesta(false, 'No existian participantes para esta reserva'));
    }

    res.json(
      respuesta(true, 'Todos los participantes de la reserva fueron eliminados correctamente', {
        cantidad: eliminados.length
      })
    );
  } catch (error) {
    console.error('Error en eliminarTodosParticipantesReserva:', error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const buscarReservasController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q || q.trim() === "") {
      return res.status(400).json(
        respuesta(false, 'Debe proporcionar un termino de busqueda')
      );
    }

    const term = `%${q.toLowerCase()}%`;

    const query = `
      SELECT
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        c.id_cliente,
        u_c.nombre AS cliente_nombre,
        u_c.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id_deportista', pe.id_deportista,
              'nombre', u_d.nombre,
              'apellido', u_d.apellido
            )
          ) FILTER (WHERE pe.id_deportista IS NOT NULL),
          '[]'::json
        ) AS participantes
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u_c ON c.id_cliente = u_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN participa_en pe ON pe.id_reserva = r.id_reserva
      LEFT JOIN deportista d ON pe.id_deportista = d.id_deportista
      LEFT JOIN usuario u_d ON d.id_deportista = u_d.id_persona
      WHERE 
        LOWER(u_c.nombre) LIKE $1 OR
        LOWER(u_c.apellido) LIKE $1 OR
        LOWER(ca.nombre) LIKE $1 OR
        LOWER(u_d.nombre) LIKE $1 OR
        LOWER(u_d.apellido) LIKE $1
      GROUP BY
        r.id_reserva, c.id_cliente, u_c.nombre, u_c.apellido, ca.id_cancha, ca.nombre
      ORDER BY r.id_reserva ASC
      LIMIT $2 OFFSET $3
    `;

    const [datos] = await Promise.all([
      pool.query(query, [term, limite, offset])
    ]);

    res.json(
      respuesta(true, 'Reservas filtradas correctamente', {
        reservas: datos.rows,
        paginacion: { limite, offset, total: datos.rows.length }
      })
    );

  } catch (error) {
    console.error("Error en buscarReservasController:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const filtrarReservasController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    let orderBy = "r.id_reserva ASC";

    switch (tipo) {
      case "fecha_asc":
        orderBy = "r.fecha_reserva ASC";
        break;

      case "fecha_desc":
        orderBy = "r.fecha_reserva DESC";
        break;

      case "cliente":
        orderBy = "u_c.nombre ASC, u_c.apellido ASC";
        break;

      case "cancha":
        orderBy = "ca.nombre ASC";
        break;

      default:
        return res.status(400).json(respuesta(false, "Filtro invalido"));
    }

    const query = `
      SELECT
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        c.id_cliente,
        u_c.nombre AS cliente_nombre,
        u_c.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id_deportista', pe.id_deportista,
              'nombre', u_d.nombre,
              'apellido', u_d.apellido
            )
          ) FILTER (WHERE pe.id_deportista IS NOT NULL),
          '[]'::json
        ) AS participantes
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u_c ON c.id_cliente = u_c.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN participa_en pe ON pe.id_reserva = r.id_reserva
      LEFT JOIN deportista d ON pe.id_deportista = d.id_deportista
      LEFT JOIN usuario u_d ON d.id_deportista = u_d.id_persona
      GROUP BY
        r.id_reserva, c.id_cliente, u_c.nombre, u_c.apellido, ca.id_cancha, ca.nombre
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2
    `;

    const [result] = await Promise.all([
      pool.query(query, [limite, offset])
    ]);

    res.json(
      respuesta(true, "Reservas filtradas correctamente", {
        reservas: result.rows,
        paginacion: {
          limite,
          offset,
          total: result.rows.length
        }
      })
    );

  } catch (error) {
    console.error("Error en filtrarReservasController:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

/* NUEVAS RUTAS AGRUPADAS POR RESERVA */
router.get('/por-reserva', obtenerReservasConParticipantesController);
router.get('/reserva/:id_reserva/participantes', obtenerParticipantesPorReservaController);
router.post('/reserva/:id_reserva/agregar', agregarParticipanteReservaController);

/* IMPORTANTE → ESTA RUTA DEBE IR PRIMERO */
router.delete(
  '/reserva/:id_reserva/deportista/:id_deportista',
  eliminarParticipanteReservaController
);

/* LUEGO ESTA → eliminar TODOS */
router.delete('/reserva/:id_reserva', eliminarTodosParticipantesReservaController);

/* RUTAS EXISTENTES (DEPORTISTA/RESERVA) */
router.get('/dato-individual/:id_deportista/:id_reserva', obtenerParticipaEnPorIdController);
router.patch('/:id_deportista/:id_reserva', actualizarParticipaEnController);
router.delete('/:id_deportista/:id_reserva', eliminarParticipaEnController);

router.post('/', crearParticipaEnController);
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/buscar', buscarReservasController);
router.get('/filtro', filtrarReservasController);

module.exports = router;