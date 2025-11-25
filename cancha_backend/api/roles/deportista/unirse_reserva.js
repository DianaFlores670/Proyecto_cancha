const express = require("express");
const pool = require("../../../config/database");

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos
});

const obtenerReservaDesdeCodigo = async (code) => {
  const queryQr = `
    SELECT 
      qr.id_qr,
      qr.fecha_generado,
      qr.fecha_expira,
      qr.estado AS qr_estado,
      qr.codigo_qr,
      r.id_reserva,
      r.fecha_reserva,
      r.cupo,
      r.monto_total,
      r.saldo_pendiente,
      r.estado AS reserva_estado,
      c.id_cliente,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      ca.id_cancha,
      ca.nombre AS cancha_nombre
    FROM qr_reserva qr
    JOIN reserva r ON qr.id_reserva = r.id_reserva
    JOIN cliente c ON r.id_cliente = c.id_cliente
    JOIN usuario u ON c.id_cliente = u.id_persona
    JOIN cancha ca ON r.id_cancha = ca.id_cancha
    WHERE qr.codigo_qr = $1
    LIMIT 1
  `;
  const resultQr = await pool.query(queryQr, [code]);
  const row = resultQr.rows[0];
  if (!row) {
    return null;
  }

  if (row.qr_estado !== "activo") {
    throw new Error("El codigo ya no esta activo");
  }

  if (row.fecha_expira) {
    const ahora = new Date();
    const expira = new Date(row.fecha_expira);
    if (!isNaN(expira.getTime()) && expira.getTime() <= ahora.getTime()) {
      throw new Error("El codigo ya expiro");
    }
  }

  const queryCupo = `
    SELECT COUNT(*) AS total
    FROM reserva_deportista
    WHERE id_reserva = $1
      AND estado = 'activo'
  `;
  const resultCupo = await pool.query(queryCupo, [row.id_reserva]);
  const cupoOcupado = parseInt(resultCupo.rows[0].total, 10) || 0;

  const reserva = {
    id_reserva: row.id_reserva,
    fecha_reserva: row.fecha_reserva,
    cupo: row.cupo,
    monto_total: row.monto_total,
    saldo_pendiente: row.saldo_pendiente,
    estado: row.reserva_estado,
    id_cliente: row.id_cliente,
    cliente_nombre: row.cliente_nombre,
    cliente_apellido: row.cliente_apellido,
    id_cancha: row.id_cancha,
    cancha_nombre: row.cancha_nombre,
    cupo_ocupado: cupoOcupado
  };

  return { qr: row, reserva };
};

const obtenerParticipanteEnReserva = async (idReserva, idPersona) => {
  const query = `
    SELECT id_reserva_deportista, estado
    FROM reserva_deportista
    WHERE id_reserva = $1
      AND id_persona = $2
    ORDER BY id_reserva_deportista DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [idReserva, idPersona]);
  return result.rows[0] || null;
};

/**
 * NUEVO: listar deportistas de una reserva con paginacion
 * GET /unirse-reserva/deportistas?id_reserva=...&limit=...&offset=...
 */
const listarDeportistasReservaController = async (req, res) => {
  try {
    const idReservaRaw = req.query.id_reserva;
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;

    const idReserva = idReservaRaw ? parseInt(idReservaRaw, 10) : NaN;
    const limit = limitRaw ? parseInt(limitRaw, 10) : 10;
    const offset = offsetRaw ? parseInt(offsetRaw, 10) : 0;

    if (!idReserva || isNaN(idReserva)) {
      return res
        .status(400)
        .json(respuesta(false, "id_reserva no valido o no proporcionado"));
    }

    const queryReserva = `
      SELECT cupo
      FROM reserva
      WHERE id_reserva = $1
      LIMIT 1
    `;
    const resultReserva = await pool.query(queryReserva, [idReserva]);
    const reservaRow = resultReserva.rows[0];

    if (!reservaRow) {
      return res
        .status(404)
        .json(respuesta(false, "No se encontro la reserva"));
    }

    const cupoTotalRaw = Number(reservaRow.cupo);
    const cupoTotal = !Number.isNaN(cupoTotalRaw) && cupoTotalRaw > 0 ? cupoTotalRaw : 0;
    const cupoMaxDeportistas =
      !Number.isNaN(cupoTotalRaw) && cupoTotalRaw > 1 ? cupoTotalRaw - 1 : 0;

    const queryTotal = `
      SELECT COUNT(*) AS total
      FROM reserva_deportista rd
      WHERE rd.id_reserva = $1
        AND rd.estado = 'activo'
    `;
    const resultTotal = await pool.query(queryTotal, [idReserva]);
    const total = parseInt(resultTotal.rows[0].total, 10) || 0;

    const queryLista = `
      SELECT 
        rd.id_reserva_deportista,
        rd.id_persona,
        rd.fecha_union,
        rd.estado,
        u.nombre,
        u.apellido
      FROM reserva_deportista rd
      JOIN usuario u ON rd.id_persona = u.id_persona
      WHERE rd.id_reserva = $1
        AND rd.estado = 'activo'
      ORDER BY rd.fecha_union ASC, rd.id_reserva_deportista ASC
      LIMIT $2 OFFSET $3
    `;
    const resultLista = await pool.query(queryLista, [idReserva, limit, offset]);
    const deportistas = resultLista.rows || [];

    return res.json(
      respuesta(true, "Deportistas obtenidos", {
        deportistas,
        paginacion: {
          total,
          limit,
          offset
        },
        cupo_total: cupoTotal,
        cupo_ocupado: total,
        cupo_max_deportistas: cupoMaxDeportistas,
        indice_cupo: cupoTotal > 0 ? `${total}/${cupoTotal}` : `0/0`
      })
    );
  } catch (error) {
    console.error("Error en listarDeportistasReservaController:", error.message);
    return res
      .status(500)
      .json(
        respuesta(
          false,
          error.message || "Error al obtener los deportistas de la reserva"
        )
      );
  }
};

const infoUnirseReservaController = async (req, res) => {
  try {
    const { code } = req.query;
    const idPersonaRaw = req.query.id_persona;
    const idPersona = idPersonaRaw ? parseInt(idPersonaRaw, 10) : null;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res
        .status(400)
        .json(respuesta(false, "Codigo no valido o no proporcionado"));
    }

    const data = await obtenerReservaDesdeCodigo(code);
    if (!data) {
      return res
        .status(404)
        .json(respuesta(false, "No se encontro una reserva para este codigo"));
    }

    const reserva = data.reserva;
    const cupoTotalRaw = Number(reserva.cupo);
    const cupoMaxDeportistas =
      !Number.isNaN(cupoTotalRaw) && cupoTotalRaw > 1
        ? cupoTotalRaw - 1
        : 0;

    const cupoOcupado = reserva.cupo_ocupado || 0;

    let cupoLleno = false;
    if (cupoMaxDeportistas > 0) {
      cupoLleno = cupoOcupado >= cupoMaxDeportistas;
    }

    let yaUnido = false;
    if (idPersona) {
      const participante = await obtenerParticipanteEnReserva(
        reserva.id_reserva,
        idPersona
      );
      yaUnido = Boolean(participante && participante.estado === "activo");
    }

    let esClienteResponsable = false;
    if (idPersona && reserva.id_cliente) {
      esClienteResponsable = Number(reserva.id_cliente) === idPersona;
    }

    let puedeUnirse = true;
    if (cupoLleno) {
      puedeUnirse = false;
    }
    if (reserva.estado === "cancelada") {
      puedeUnirse = false;
    }
    if (yaUnido) {
      puedeUnirse = false;
    }
    if (esClienteResponsable) {
      puedeUnirse = false;
    }

    return res.json(
      respuesta(true, "Informacion de reserva obtenida", {
        reserva: {
          ...reserva,
          cupo_max_deportistas: cupoMaxDeportistas
        },
        puede_unirse: puedeUnirse,
        ya_unido: yaUnido,
        cupo_lleno: cupoLleno,
        es_cliente_responsable: esClienteResponsable
      })
    );
  } catch (error) {
    console.error("Error en infoUnirseReservaController:", error.message);
    return res
      .status(500)
      .json(respuesta(false, error.message || "Error al obtener la informacion"));
  }
};

const unirseReservaController = async (req, res) => {
  try {
    const { code, id_persona } = req.body;

    // Validación de parámetros
    if (!code || typeof code !== "string" || code.trim() === "") {
      return res
        .status(400)
        .json(respuesta(false, "Codigo no valido o no proporcionado"));
    }
    if (!id_persona || isNaN(parseInt(id_persona, 10))) {
      return res
        .status(400)
        .json(respuesta(false, "id_persona no valido o no proporcionado"));
    }

    const idPersona = parseInt(id_persona, 10);

    // Verificar existencia del usuario
    const usuarioQuery = `
      SELECT id_persona
      FROM usuario
      WHERE id_persona = $1
      LIMIT 1
    `;
    const usuarioResult = await pool.query(usuarioQuery, [idPersona]);
    if (!usuarioResult.rows[0]) {
      return res
        .status(400)
        .json(respuesta(false, "El usuario no existe en el sistema"));
    }

    // Obtener la reserva mediante el código QR
    const data = await obtenerReservaDesdeCodigo(code);
    if (!data) {
      return res
        .status(404)
        .json(respuesta(false, "No se encontro una reserva para este codigo"));
    }

    const reserva = data.reserva;

    // El cliente responsable NO puede unirse como deportista
    if (Number(reserva.id_cliente) === idPersona) {
      return res
        .status(400)
        .json(
          respuesta(
            false,
            "El cliente responsable no puede unirse como deportista en su propia reserva"
          )
        );
    }

    // Si la reserva está cancelada, no puede unirse
    if (reserva.estado === "cancelada") {
      return res
        .status(400)
        .json(respuesta(false, "La reserva esta cancelada"));
    }

    // Verificar si ya estaba en la reserva
    const participanteExistente = await obtenerParticipanteEnReserva(
      reserva.id_reserva,
      idPersona
    );

    if (participanteExistente && participanteExistente.estado === "activo") {
      return res
        .status(400)
        .json(respuesta(false, "Ya se encuentra inscrito en esta reserva"));
    }

    // Cálculo de cupos
    const cupoTotalRaw = Number(reserva.cupo);
    const cupoMaxDeportistas =
      !Number.isNaN(cupoTotalRaw) && cupoTotalRaw > 1
        ? cupoTotalRaw - 1
        : 0;

    const queryCupo = `
      SELECT COUNT(*) AS total
      FROM reserva_deportista
      WHERE id_reserva = $1
        AND estado = 'activo'
    `;
    const resultCupo = await pool.query(queryCupo, [reserva.id_reserva]);
    const cupoOcupado = parseInt(resultCupo.rows[0].total, 10) || 0;

    if (cupoMaxDeportistas > 0 && cupoOcupado >= cupoMaxDeportistas) {
      return res
        .status(400)
        .json(respuesta(false, "No hay cupos disponibles para esta reserva"));
    }

    // Inserción o reactivación en reserva_deportista
    let participante;
    if (participanteExistente) {
      const updateQuery = `
        UPDATE reserva_deportista
        SET estado = 'activo',
            fecha_union = now()
        WHERE id_reserva_deportista = $1
        RETURNING *
      `;
      const updateResult = await pool.query(updateQuery, [
        participanteExistente.id_reserva_deportista
      ]);
      participante = updateResult.rows[0];
    } else {
      const insertQuery = `
        INSERT INTO reserva_deportista (
          id_reserva,
          id_persona,
          fecha_union,
          estado
        )
        VALUES ($1, $2, now(), 'activo')
        RETURNING *
      `;
      const insertResult = await pool.query(insertQuery, [
        reserva.id_reserva,
        idPersona
      ]);
      participante = insertResult.rows[0];
    }

    /* ============================================================
       🔥 NUEVO 1: creación automática del deportista (si no existe)
       ============================================================ */
    const insertDeportistaQuery = `
      INSERT INTO deportista (id_deportista)
      VALUES ($1)
      ON CONFLICT (id_deportista) DO NOTHING
    `;
    try {
      await pool.query(insertDeportistaQuery, [idPersona]);
    } catch (e) {
      console.error("Error al insertar en deportista:", e.message);
    }

    /* ============================================================
       🔥 NUEVO 2: registrar participación en participa_en
       ============================================================ */
    const insertParticipaQuery = `
      INSERT INTO participa_en (id_deportista, id_reserva, fecha_reserva)
      VALUES ($1, $2, CURRENT_DATE)
      ON CONFLICT (id_deportista, id_reserva) DO NOTHING
    `;
    try {
      await pool.query(insertParticipaQuery, [idPersona, reserva.id_reserva]);
    } catch (e) {
      console.error("Error al insertar en participa_en:", e.message);
    }

    // Cupo actualizado
    const resultCupoFinal = await pool.query(queryCupo, [reserva.id_reserva]);
    const cupoFinal = parseInt(resultCupoFinal.rows[0].total, 10) || 0;

    const reservaFinal = {
      ...reserva,
      cupo_ocupado: cupoFinal,
      cupo_max_deportistas: cupoMaxDeportistas
    };

    // Respuesta final
    return res.json(
      respuesta(true, "Inscripcion a la reserva completada", {
        reserva: reservaFinal,
        participante
      })
    );
  } catch (error) {
    console.error("Error en unirseReservaController:", error.message);
    return res
      .status(500)
      .json(respuesta(false, error.message || "Error al unirse a la reserva"));
  }
};


router.get("/info", infoUnirseReservaController);
router.get("/deportistas", listarDeportistasReservaController); // nuevo
router.post("/", unirseReservaController);

module.exports = router;
