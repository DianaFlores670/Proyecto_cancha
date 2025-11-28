const express = require('express');
const pool = require('../../config/database');

const router = express.Router();

// RESPUESTA ESTANDAR
const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos,
});

// ===================================================
// ============== MODELOS BASE DE DATOS ==============
// ===================================================

// REGRA UNIVERSAL DE ESTADO CALCULADO
const estadoCalculado = `
  CASE 
    WHEN r.estado <> 'pagada'
         AND r.fecha_reserva < (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')
    THEN 'cancelada'
    ELSE r.estado
  END AS estado
`;


// -----------------------------------------------
// 1. RESERVAS ACTIVAS = pendiente + en_cuotas
// -----------------------------------------------
const obtenerReservasActivas = async () => {
  try {
    const query = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        ${estadoCalculado},
        r.monto_total,
        c.id_cliente,
        u.nombre AS cliente_nombre,
        u.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario u ON c.id_cliente = u.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE r.estado IN ('pendiente', 'en_cuotas')
      ORDER BY r.fecha_reserva ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.log("Error en obtenerReservasActivas:", error);
    throw error;
  }
};


// -----------------------------------------------
// 2. DATOS ESPECIFICOS + PAGINACION
// -----------------------------------------------
const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        ${estadoCalculado},
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY r.id_reserva
      LIMIT $1 OFFSET $2
    `;

    const queryTotal = `SELECT COUNT(*) FROM reserva`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.log("Error en obtenerDatosEspecificos:", error);
    throw error;
  }
};


// -----------------------------------------------
// 3. RESERVAS FILTRADAS
// -----------------------------------------------
const obtenerReservasFiltradas = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      fecha: 'r.fecha_reserva DESC',
      monto: 'r.monto_total ASC',
      estado: 'estado ASC',
      default: 'r.id_reserva ASC'
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const queryDatos = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        ${estadoCalculado},
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY ${orden}
      LIMIT $1 OFFSET $2
    `;

    const queryTotal = `SELECT COUNT(*) FROM reserva`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.log("Error en obtenerReservasFiltradas:", error);
    throw error;
  }
};


// -----------------------------------------------
// 4. BUSCAR RESERVAS
// -----------------------------------------------
const buscarReservas = async (texto, limite = 10, offset = 0) => {
  try {
    const sanitize = (t) => t.replace(/[%_\\]/g, '\\$&');
    const termino = `%${sanitize(texto)}%`;

    const queryDatos = `
      SELECT 
        r.id_reserva,
        r.fecha_reserva,
        r.cupo,
        r.monto_total,
        r.saldo_pendiente,
        ${estadoCalculado},
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        ca.id_cancha,
        ca.nombre AS cancha_nombre
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        r.estado ILIKE $1
      ORDER BY r.fecha_reserva DESC
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        r.estado ILIKE $1
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [termino, limite, offset]),
      pool.query(queryTotal, [termino])
    ]);

    return {
      reservas: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.log("Error en buscarReservas:", error);
    throw error;
  }
};

const obtenerReservaPorId = async (id) => {
  try {
    const query = `
      SELECT 
        r.*,
        ${estadoCalculado},
        c.id_cliente,
        p.nombre AS cliente_nombre,
        p.apellido AS cliente_apellido,
        p.correo AS cliente_correo,
        ca.id_cancha,
        ca.nombre AS cancha_nombre,
        -- Obtener el minimo hora_inicio y el máximo hora_fin
        MIN(rh.hora_inicio) AS hora_inicio,
        MAX(rh.hora_fin) AS hora_fin
      FROM reserva r
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      LEFT JOIN reserva_horario rh ON r.id_reserva = rh.id_reserva
      WHERE r.id_reserva = $1
      GROUP BY r.id_reserva, c.id_cliente, p.id_persona, ca.id_cancha
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.log("Error en obtenerReservaPorId:", error);
    throw error;
  }
};

// 6. CREAR RESERVA CON VALIDACIONES Y HORARIOS
const crearReserva = async (datos) => {
  try {
    // Validar saldo pendiente no mayor que el monto total
    if (datos.saldo_pendiente > datos.monto_total) {
      throw new Error("El saldo pendiente no puede ser mayor que el monto total");
    }

    // Establecer estado según el saldo pendiente
    let estado = 'pendiente';
    if (datos.saldo_pendiente > 0 && datos.saldo_pendiente < datos.monto_total) {
      estado = 'en_cuotas';
    } else if (datos.saldo_pendiente === datos.monto_total) {
      estado = 'pagada';
    }

    // Crear la reserva
    const query = `
      INSERT INTO reserva (fecha_reserva, cupo, monto_total, saldo_pendiente, estado, id_cliente, id_cancha)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_reserva, fecha_reserva, estado
    `;
    const values = [
      datos.fecha_reserva,
      datos.cupo || null,
      datos.monto_total || 0,
      datos.saldo_pendiente || 0,
      estado,
      datos.id_cliente,
      datos.id_cancha
    ];
    const { rows } = await pool.query(query, values);
    const nuevaReserva = rows[0];

    // Insertar horarios si existen
    if (datos.hora_inicio && datos.hora_fin) {
      const horarios = [];
      let hora_inicio = new Date(`1970-01-01T${datos.hora_inicio}:00`);
      let hora_fin = new Date(`1970-01-01T${datos.hora_fin}:00`);

      // Generar bloques de 1 hora
      while (hora_inicio < hora_fin) {
        let hora_fin_bloque = new Date(hora_inicio);
        hora_fin_bloque.setHours(hora_inicio.getHours() + 1); // Cada bloque de 1 hora

        horarios.push({
          fecha: datos.fecha_reserva,
          hora_inicio: hora_inicio.toTimeString().slice(0, 5),
          hora_fin: hora_fin_bloque.toTimeString().slice(0, 5),
          monto: datos.monto_total / horarios.length  // Distribuir el monto total entre los bloques
        });

        // Mover la hora de inicio al siguiente bloque
        hora_inicio = new Date(hora_fin_bloque);
      }

      // Insertar los horarios generados en la base de datos
      const horariosPromises = horarios.map(horario => {
        const horarioQuery = `
          INSERT INTO reserva_horario (id_reserva, fecha, hora_inicio, hora_fin, monto)
          VALUES ($1, $2, $3, $4, $5)
        `;
        return pool.query(horarioQuery, [nuevaReserva.id_reserva, horario.fecha, horario.hora_inicio, horario.hora_fin, horario.monto]);
      });
      await Promise.all(horariosPromises);
    }

    return nuevaReserva;
  } catch (err) {
    console.log("Error en crearReserva:", err);
    throw err;
  }
};

// 7. ACTUALIZAR RESERVA
const actualizarReserva = async (id, datos) => {
  try {
    // Actualizar la reserva (mismo código que ya tienes)
    const camposPermitidos = ['fecha_reserva', 'cupo', 'monto_total', 'saldo_pendiente', 'estado', 'id_cliente', 'id_cancha'];
    const campos = Object.keys(datos).filter(k => camposPermitidos.includes(k));
    const setClause = campos.map((campo, i) => `${campo} = $${i + 2}`).join(', ');
    const values = campos.map(c => datos[c] || null);
    const query = `UPDATE reserva SET ${setClause} WHERE id_reserva = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);

    // Eliminar horarios antiguos
    await pool.query(`DELETE FROM reserva_horario WHERE id_reserva = $1`, [id]);

    // Insertar nuevos horarios si existe hora_inicio y hora_fin
    if (datos.hora_inicio && datos.hora_fin) {
      const horarios = [];
      let hora_inicio = new Date(`1970-01-01T${datos.hora_inicio}:00`);
      let hora_fin = new Date(`1970-01-01T${datos.hora_fin}:00`);

      // Generar bloques de 1 hora
      while (hora_inicio < hora_fin) {
        let hora_fin_bloque = new Date(hora_inicio);
        hora_fin_bloque.setHours(hora_inicio.getHours() + 1); // Cada bloque de 1 hora

        horarios.push({
          fecha: datos.fecha_reserva,
          hora_inicio: hora_inicio.toTimeString().slice(0, 5),
          hora_fin: hora_fin_bloque.toTimeString().slice(0, 5),
          monto: datos.monto_total / horarios.length  // Distribuir el monto total entre los bloques
        });

        // Mover la hora de inicio al siguiente bloque
        hora_inicio = new Date(hora_fin_bloque);
      }

      // Insertar los horarios generados en la base de datos
      const horariosPromises = horarios.map(horario => {
        const horarioQuery = `
          INSERT INTO reserva_horario (id_reserva, fecha, hora_inicio, hora_fin, monto)
          VALUES ($1, $2, $3, $4, $5)
        `;
        return pool.query(horarioQuery, [id, horario.fecha, horario.hora_inicio, horario.hora_fin, horario.monto]);
      });
      await Promise.all(horariosPromises);
    }

    return result.rows[0];
  } catch (error) {
    console.log("Error en actualizarReserva:", error);
    throw error;
  }
};


// 8. ELIMINAR RESERVA
const eliminarReserva = async (id) => {
  try {
    // Eliminar horarios primero
    await pool.query(`DELETE FROM reserva_horario WHERE id_reserva = $1`, [id]);

    // Eliminar la reserva
    const query = `DELETE FROM reserva WHERE id_reserva = $1 RETURNING id_reserva`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.log("Error en eliminarReserva:", error);
    throw error;
  }
};

// 9. CANCELAR RESERVAS VENCIDAS
const cancelarReservasVencidas = async () => {
  try {
    const query = `
      WITH now_data AS (
        SELECT
          (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date AS fecha_hoy,
          (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::time AS hora_ahora
      ),
      primer_horario AS (
        SELECT
          rh.id_reserva,
          MIN(rh.fecha) AS fecha,
          MIN(rh.hora_inicio) AS hora_inicio
        FROM reserva_horario rh
        GROUP BY rh.id_reserva
      ),
      actualizadas AS (
        UPDATE reserva r
        SET estado = 'cancelada'
        FROM primer_horario ph, now_data n
        WHERE r.id_reserva = ph.id_reserva
          AND r.estado IN ('pendiente','en_cuotas')
          AND (
            ph.fecha < n.fecha_hoy
            OR (ph.fecha = n.fecha_hoy AND ph.hora_inicio <= n.hora_ahora)
          )
        RETURNING r.id_reserva
      )
      SELECT COUNT(*) AS total
      FROM actualizadas
    `;
    const result = await pool.query(query);
    const total = parseInt(result.rows[0].total);
    return { totalActualizadas: total };
  } catch (error) {
    console.log("Error en cancelarReservasVencidas:", error);
    throw error;
  }
};

// ===================================================
// ================ CONTROLADORES ====================
// ===================================================

const obtenerReservasActivasController = async (req, res) => {
  try {
    const reservas = await obtenerReservasActivas();
    res.json(respuesta(true, "Reservas activas obtenidas correctamente", { reservas }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const resultado = await obtenerDatosEspecificos(limite, offset);

    res.json(respuesta(true, "Reservas obtenidas correctamente", resultado));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


const obtenerReservasFiltradasController = async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['fecha', 'monto', 'estado'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'Tipo de filtro invalido'));
    }

    const resultado = await obtenerReservasFiltradas(tipo, limite, offset);

    res.json(respuesta(true, "Reservas filtradas correctamente", resultado));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


const buscarReservasController = async (req, res) => {
  try {
    const q = req.query.q;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'Parametro q requerido'));
    }

    const resultado = await buscarReservas(q, limite, offset);

    res.json(respuesta(true, "Reservas obtenidas correctamente", resultado));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


const obtenerReservaPorIdController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (!id) return res.status(400).json(respuesta(false, "ID invalido"));

    const reserva = await obtenerReservaPorId(id);

    if (!reserva) {
      return res.status(404).json(respuesta(false, "Reserva no encontrada"));
    }

    res.json(respuesta(true, "Reserva obtenida correctamente", { reserva }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const crearReservaController = async (req, res) => {
  try {
    const datos = req.body;

    // Llamar a la función que crea la reserva y sus horarios
    const nueva = await crearReserva(datos);

    res.json(respuesta(true, "Reserva creada correctamente", { reserva: nueva }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};

const actualizarReservaController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const datos = req.body;

    const actualizada = await actualizarReserva(id, datos);

    res.json(respuesta(true, "Reserva actualizada", { reserva: actualizada }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


const eliminarReservaController = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const eliminada = await eliminarReserva(id);

    res.json(respuesta(true, "Reserva eliminada", { reserva: eliminada }));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


const cancelarReservasVencidasController = async (req, res) => {
  try {
    const resultado = await cancelarReservasVencidas();
    res.json(respuesta(true, "Reservas vencidas canceladas", resultado));
  } catch (err) {
    res.status(500).json(respuesta(false, err.message));
  }
};


// ===================================================
// ====================== RUTAS ======================
// ===================================================

router.get('/activas', obtenerReservasActivasController);
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerReservasFiltradasController);
router.get('/buscar', buscarReservasController);
router.get('/dato-individual/:id', obtenerReservaPorIdController);
router.post('/', crearReservaController);
router.patch('/:id', actualizarReservaController);
router.delete('/:id', eliminarReservaController);
router.post('/cancelar-vencidas', cancelarReservasVencidasController);

module.exports = router;