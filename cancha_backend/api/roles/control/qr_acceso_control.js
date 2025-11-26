const express = require("express");
const pool = require("../../../config/database");
const { verifyToken, checkRole } = require("../../../middleware/auth");

const router = express.Router();
const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });


// ======================================================
// FUNCION: Obtener QR + validar que pertenezca al espacio
// ======================================================
const obtenerQRParaControl = async (codigo_qr, id_control) => {
  const q = `
    SELECT 
      qr.id_qr,
      qr.codigo_qr,
      qr.estado AS estado_qr,
      qr.id_reserva,
      r.cupo,
      r.estado AS estado_reserva,
      (
        SELECT COUNT(*) 
        FROM control_acceso ca 
        WHERE ca.id_qr = qr.id_qr
      ) AS accesos_usados,
      u.nombre AS cliente_nombre,
      u.apellido AS cliente_apellido,
      rh.hora_inicio,
      rh.hora_fin,
      r.fecha_reserva
    FROM qr_reserva qr
    JOIN reserva r ON r.id_reserva = qr.id_reserva
    JOIN cancha c ON c.id_cancha = r.id_cancha
    JOIN control ctrl ON ctrl.id_espacio = c.id_espacio
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    LEFT JOIN (
      SELECT id_reserva, MIN(hora_inicio) AS hora_inicio, MAX(hora_fin) AS hora_fin
      FROM reserva_horario
      GROUP BY id_reserva
    ) rh ON rh.id_reserva = r.id_reserva
    WHERE qr.codigo_qr = $1 AND ctrl.id_control = $2
    LIMIT 1
  `;

  const result = await pool.query(q, [codigo_qr, id_control]);
  const qr = result.rows[0];

  if (qr) {
    await pool.query(
      `UPDATE qr_reserva SET id_control = $1 WHERE id_qr = $2`,
      [id_control, qr.id_qr]
    );
  }

  return qr;
};


// =========================================
// FUNCION: Registrar acceso real (INSERT)
// =========================================
const registrarAcceso = async (id_qr, id_control) => {
  const q = `
    INSERT INTO control_acceso(id_qr, registrado_por)
    VALUES ($1, $2)
    RETURNING *
  `;
  const r = await pool.query(q, [id_qr, id_control]);
  return r.rows[0];
};


// =========================================================
// CONTROLADOR: ESCANEAR QR CON VALIDACIÓN DE FECHA/HORA
// =========================================================
const scanQRController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const { codigo_qr } = req.body;

    if (!codigo_qr || typeof codigo_qr !== "string" || codigo_qr.trim() === "") {
      return res.status(400).json(respuesta(false, "QR invalido"));
    }

    // Decodificar Base64
    let decodedCode;
    try {
      decodedCode = Buffer.from(codigo_qr.trim(), "base64").toString("utf8");
    } catch {
      return res.status(400).json(respuesta(false, "QR invalido (Base64)"));
    }

    const qr = await obtenerQRParaControl(codigo_qr.trim(), id_control);

    if (!qr) {
      return res
        .status(404)
        .json(respuesta(false, "QR no pertenece a este espacio o no existe"));
    }

    if (qr.estado_qr !== "activo") {
      return res.status(400).json(respuesta(false, "QR no esta activo"));
    }

    if (qr.estado_reserva !== "pagada") {
      return res.status(400).json(respuesta(false, "La reserva no esta pagada"));
    }

    // =====================================================
    // VALIDACION DE FECHAS Y HORAS
    // =====================================================

    const hoy = new Date();
    const fechaReserva = new Date(qr.fecha_reserva);

    const horaInicio = new Date(fechaReserva);
    horaInicio.setHours(Number(qr.hora_inicio.split(":")[0]));
    horaInicio.setMinutes(Number(qr.hora_inicio.split(":")[1]));
    horaInicio.setSeconds(0);

    const horaFin = new Date(fechaReserva);
    horaFin.setHours(Number(qr.hora_fin.split(":")[0]));
    horaFin.setMinutes(Number(qr.hora_fin.split(":")[1]));
    horaFin.setSeconds(0);

    const margenInicio = new Date(horaInicio.getTime() - 15 * 60000); // 15 min antes

    // 1) Antes de la ventana permitida
    if (hoy < margenInicio) {
      const diffMin = Math.ceil((margenInicio - hoy) / 60000);
      return res.json(
        respuesta(false, `Aun no puedes ingresar. Falta(n) ${diffMin} minuto(s) para permitir acceso.`)
      );
    }

    // 2) Después de la hora fin → NO ingresa
    if (hoy > horaFin) {
      const diffMin = Math.floor((hoy - horaFin) / 60000);
      return res.json(
        respuesta(false, `La reserva ya termino hace ${diffMin} minuto(s). Acceso denegado.`)
      );
    }

    // SI CUMPLE VENTANA DE TIEMPO → VALIDACIÓN NORMAL
    if (qr.accesos_usados >= qr.cupo) {
      return res.json(
        respuesta(false, "Cupo agotado, no se permiten mas accesos")
      );
    }

    return res.json(
      respuesta(true, "QR valido, pendiente de confirmar acceso", {
        id_qr: qr.id_qr,
        id_reserva: qr.id_reserva,
        accesos_usados: qr.accesos_usados,
        cupo_total: qr.cupo,
        cliente_nombre: qr.cliente_nombre,
        cliente_apellido: qr.cliente_apellido,
        hora_inicio: qr.hora_inicio,
        hora_fin: qr.hora_fin
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json(respuesta(false, e.message));
  }
};


// =============================================================
// CONTROLADOR: PERMITIR ACCESO (REGISTRO REAL)
// =============================================================
const permitirAccesoController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const { id_qr } = req.body;

    if (!id_qr) {
      return res.status(400).json(respuesta(false, "id_qr requerido"));
    }

    const qInfo = `
      SELECT 
        qr.id_qr,
        qr.codigo_qr,
        qr.estado AS estado_qr,
        qr.id_reserva,
        r.cupo,
        r.estado AS estado_reserva,
        (
          SELECT COUNT(*)
          FROM control_acceso ca
          WHERE ca.id_qr = qr.id_qr
        ) AS accesos_usados,
        u.nombre AS cliente_nombre,
        u.apellido AS cliente_apellido
      FROM qr_reserva qr
      JOIN reserva r ON r.id_reserva = qr.id_reserva
      JOIN cancha c ON c.id_cancha = r.id_cancha
      JOIN control ctrl ON ctrl.id_espacio = c.id_espacio
      JOIN cliente cli ON cli.id_cliente = r.id_cliente
      JOIN usuario u ON u.id_persona = cli.id_cliente
      WHERE qr.id_qr = $1 AND ctrl.id_control = $2
      LIMIT 1
    `;

    const info = await pool.query(qInfo, [id_qr, id_control]);
    const qr = info.rows[0];

    if (!qr) {
      return res.status(404).json(respuesta(false, "QR no pertenece a este espacio o no existe"));
    }

    if (qr.accesos_usados >= qr.cupo) {
      return res.json(respuesta(false, "Cupo agotado"));
    }

    await registrarAcceso(qr.id_qr, id_control);

    const info2 = await pool.query(qInfo, [id_qr, id_control]);
    const qr2 = info2.rows[0];

    return res.json(
      respuesta(true, "Acceso permitido", {
        id_qr: qr2.id_qr,
        id_reserva: qr2.id_reserva,
        accesos_usados: qr2.accesos_usados,
        cupo_total: qr2.cupo,
        cliente_nombre: qr2.cliente_nombre,
        cliente_apellido: qr2.cliente_apellido
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};


// ======================================================
// RUTAS
// ======================================================
router.post("/scan", verifyToken, checkRole(["CONTROL"]), scanQRController);
router.post("/permitir", verifyToken, checkRole(["CONTROL"]), permitirAccesoController);

module.exports = router;