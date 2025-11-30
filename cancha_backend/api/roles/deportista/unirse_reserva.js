const express = require("express");
const pool = require("../../../config/database");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos
});

const obtenerReservaDesdeCodigo = async (code) => {
  const cleanCode = (code || "").trim();

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

  const resultQr = await pool.query(queryQr, [cleanCode]);
  const row = resultQr.rows[0];

  if (!row) return null;

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

const listarDeportistasReservaController = async (req, res) => {
  try {
    const idReserva = req.query.id_reserva ? parseInt(req.query.id_reserva, 10) : NaN;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;

    if (!idReserva || isNaN(idReserva)) {
      return res.status(400).json(respuesta(false, "id_reserva no valido o no proporcionado"));
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
      return res.status(404).json(respuesta(false, "No se encontro la reserva"));
    }

    const cupoTotalRaw = Number(reservaRow.cupo);
    const cupoTotal = !Number.isNaN(cupoTotalRaw) && cupoTotalRaw > 0 ? cupoTotalRaw : 0;
    const cupoMaxDeportistas = cupoTotal > 1 ? cupoTotal - 1 : 0;

    const queryTotal = `
      SELECT COUNT(*) AS total
      FROM reserva_deportista
      WHERE id_reserva = $1
        AND estado = 'activo'
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

    return res.json(
      respuesta(true, "Deportistas obtenidos", {
        deportistas: resultLista.rows || [],
        paginacion: { total, limit, offset },
        cupo_total: cupoTotal,
        cupo_ocupado: total,
        cupo_max_deportistas: cupoMaxDeportistas,
        indice_cupo: `${total}/${cupoTotal}`
      })
    );
  } catch (error) {
    return res.status(500).json(respuesta(false, error.message));
  }
};

const infoUnirseReservaController = async (req, res) => {
  try {
    const { code } = req.query;
    const idPersona = req.query.id_persona ? parseInt(req.query.id_persona, 10) : null;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.status(400).json(respuesta(false, "Codigo no valido o no proporcionado"));
    }

    try {
      Buffer.from(code.trim(), "base64").toString();
    } catch {
      return res.status(400).json(respuesta(false, "Codigo QR invalido (no es Base64 valido)"));
    }

    const data = await obtenerReservaDesdeCodigo(code.trim());
    if (!data) {
      return res.status(404).json(respuesta(false, "No se encontro una reserva para este codigo"));
    }

    const reserva = data.reserva;

    const cupoTotalRaw = Number(reserva.cupo);
    const cupoMaxDeportistas = cupoTotalRaw > 1 ? cupoTotalRaw - 1 : 0;
    const cupoOcupado = reserva.cupo_ocupado || 0;

    const cupoLleno = cupoOcupado >= cupoMaxDeportistas;

    const participante = idPersona
      ? await obtenerParticipanteEnReserva(reserva.id_reserva, idPersona)
      : null;

    const yaUnido = participante && participante.estado === "activo";
    const esClienteResponsable = idPersona && reserva.id_cliente == idPersona;

    return res.json(
      respuesta(true, "Informacion de reserva obtenida", {
        reserva: {
          ...reserva,
          cupo_max_deportistas: cupoMaxDeportistas
        },
        puede_unirse:
          !cupoLleno && !yaUnido && !esClienteResponsable && reserva.estado !== "cancelada",
        ya_unido: yaUnido,
        cupo_lleno: cupoLleno,
        es_cliente_responsable: esClienteResponsable
      })
    );
  } catch (error) {
    return res.status(500).json(respuesta(false, error.message));
  }
};

const unirseReservaController = async (req, res) => {
  try {
    const { code, id_persona } = req.body;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.status(400).json(respuesta(false, "Codigo no valido o no proporcionado"));
    }

    if (!id_persona || isNaN(parseInt(id_persona, 10))) {
      return res.status(400).json(respuesta(false, "id_persona no valido o no proporcionado"));
    }

    try {
      Buffer.from(code.trim(), "base64").toString();
    } catch {
      return res.status(400).json(respuesta(false, "Codigo QR invalido (no es Base64 valido)"));
    }

    const idPersona = parseInt(id_persona, 10);

    const usuarioQuery = `
      SELECT id_persona
      FROM usuario
      WHERE id_persona = $1
      LIMIT 1
    `;

    const usuarioResult = await pool.query(usuarioQuery, [idPersona]);
    if (!usuarioResult.rows[0]) {
      return res.status(400).json(respuesta(false, "El usuario no existe en el sistema"));
    }

    const data = await obtenerReservaDesdeCodigo(code.trim());
    if (!data) {
      return res.status(404).json(respuesta(false, "No se encontro una reserva para este codigo"));
    }

    const reserva = data.reserva;

    if (Number(reserva.id_cliente) === idPersona) {
      return res.status(400).json(respuesta(false, "El cliente responsable no puede unirse"));
    }

    if (reserva.estado === "cancelada") {
      return res.status(400).json(respuesta(false, "La reserva esta cancelada"));
    }

    const participanteExistente = await obtenerParticipanteEnReserva(
      reserva.id_reserva,
      idPersona
    );

    if (participanteExistente && participanteExistente.estado === "activo") {
      return res.status(400).json(respuesta(false, "Ya se encuentra inscrito"));
    }

    const cupoTotalRaw = Number(reserva.cupo);
    const cupoMaxDeportistas = cupoTotalRaw > 1 ? cupoTotalRaw - 1 : 0;

    const queryCupo = `
      SELECT COUNT(*) AS total
      FROM reserva_deportista
      WHERE id_reserva = $1
        AND estado = 'activo'
    `;

    const resultCupo = await pool.query(queryCupo, [reserva.id_reserva]);
    const cupoOcupado = parseInt(resultCupo.rows[0].total, 10) || 0;

    if (cupoMaxDeportistas > 0 && cupoOcupado >= cupoMaxDeportistas) {
      return res.status(400).json(respuesta(false, "No hay cupos disponibles"));
    }

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

    const insertDeportistaQuery = `
      INSERT INTO deportista (id_deportista)
      VALUES ($1)
      ON CONFLICT (id_deportista) DO NOTHING
    `;

    await pool.query(insertDeportistaQuery, [idPersona]);

    const insertParticipaQuery = `
      INSERT INTO participa_en (id_deportista, id_reserva, fecha_reserva)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_deportista, id_reserva) DO NOTHING
    `;

    const fechaReservaParticipa = dayjs(reserva.fecha_reserva)
      .tz("America/La_Paz")
      .startOf("day")
      .format("YYYY-MM-DD");

    await pool.query(insertParticipaQuery, [
      idPersona,
      reserva.id_reserva,
      fechaReservaParticipa
    ]);

    const resultCupoFinal = await pool.query(queryCupo, [reserva.id_reserva]);
    const cupoFinal = parseInt(resultCupoFinal.rows[0].total, 10) || 0;

    return res.json(
      respuesta(true, "Inscripcion a la reserva completada", {
        reserva: {
          ...reserva,
          cupo_ocupado: cupoFinal,
          cupo_max_deportistas: cupoMaxDeportistas
        },
        participante
      })
    );
  } catch (error) {
    return res.status(500).json(respuesta(false, error.message));
  }
};

router.get("/info", infoUnirseReservaController);
router.get("/deportistas", listarDeportistasReservaController);
router.post("/", unirseReservaController);

module.exports = router;