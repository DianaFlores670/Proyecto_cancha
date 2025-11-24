const express = require("express");
const pool = require("../../../config/database");
const { verifyToken, checkRole } = require("../../../middleware/auth");

const router = express.Router();
const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });

/* ============================================================================
   =============================== MODELOS ====================================
   ============================================================================ */

/**
 * Buscar QR y validar que pertenece al control actual
 */
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
      u.apellido AS cliente_apellido
    FROM qr_reserva qr
    JOIN reserva r ON r.id_reserva = qr.id_reserva
    JOIN cancha c ON c.id_cancha = r.id_cancha
    JOIN control ctrl ON ctrl.id_espacio = c.id_espacio
    JOIN cliente cli ON cli.id_cliente = r.id_cliente
    JOIN usuario u ON u.id_persona = cli.id_cliente
    WHERE qr.codigo_qr = $1 AND ctrl.id_control = $2
    LIMIT 1
  `;

  const result = await pool.query(q, [codigo_qr, id_control]);
  const qr = result.rows[0];

  if (qr) {
    const updateControl = `
      UPDATE qr_reserva
      SET id_control = $1
      WHERE id_qr = $2
      RETURNING *
    `;
    await pool.query(updateControl, [id_control, qr.id_qr]);
  }

  return qr;
};

/**
 * Registrar un acceso
 */
const registrarAcceso = async (id_qr, id_control) => {
  const q = `
    INSERT INTO control_acceso(id_qr, registrado_por)
    VALUES ($1, $2)
    RETURNING *
  `;

  const r = await pool.query(q, [id_qr, id_control]);
  return r.rows[0];
};

/* ============================================================================
   =============================== CONTROLADORES ===============================
   ============================================================================ */

/**
 * Escanear QR (control de acceso)
 */
const scanQRController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const { codigo_qr } = req.body;

    if (!codigo_qr || codigo_qr.trim() === "")
      return res.status(400).json(respuesta(false, "QR inválido"));

    // Obtener QR + validación de pertenencia al control
    const qr = await obtenerQRParaControl(codigo_qr, id_control);

    if (!qr)
      return res
        .status(404)
        .json(respuesta(false, "QR no pertenece a este espacio o no existe"));

    // verificar estado del QR
    if (qr.estado_qr !== "activo")
      return res
        .status(400)
        .json(respuesta(false, "QR no está activo"));

    // verificar estado de la reserva
    if (qr.estado_reserva !== "pagada")
      return res
        .status(400)
        .json(respuesta(false, "La reserva no está pagada o activa"));

    // verificar cupo disponible
    if (qr.accesos_usados >= qr.cupo)
      return res.json(
        respuesta(false, "Cupo agotado, no se permiten mas accesos")
      );

    return res.json(
      respuesta(true, "QR valido, pendiente de confirmar acceso", {
        id_qr: qr.id_qr,
        id_reserva: qr.id_reserva,
        accesos_usados: qr.accesos_usados,
        cupo_total: qr.cupo,
        cliente_nombre: qr.cliente_nombre,
        cliente_apellido: qr.cliente_apellido
      })
    );

  } catch (e) {
    console.error(e);
    res.status(500).json(respuesta(false, e.message));
  }
};

/**
 * Historial de accesos para un QR
 */
const historialAccesosController = async (req, res) => {
  try {
    const id_qr = Number(req.params.id_qr);

    const q = `
      SELECT *
      FROM control_acceso
      WHERE id_qr = $1
      ORDER BY fecha_acceso DESC
    `;

    const r = await pool.query(q, [id_qr]);

    res.json(respuesta(true, "Historial obtenido", { accesos: r.rows }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const permitirAccesoController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const { id_qr } = req.body;

    if (!id_qr) {
      return res
        .status(400)
        .json(respuesta(false, "id_qr requerido"));
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
      return res
        .status(404)
        .json(respuesta(false, "QR no pertenece a este espacio o no existe"));
    }

    if (qr.accesos_usados >= qr.cupo) {
      return res.json(
        respuesta(false, "Cupo agotado, no se permiten mas accesos")
      );
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

/* ============================================================================
   ================================= RUTAS ====================================
   ============================================================================ */

router.post("/scan", verifyToken, checkRole(["CONTROL"]), scanQRController);

router.get("/historial/:id_qr", verifyToken, checkRole(["CONTROL"]), historialAccesosController);

router.post("/permitir", verifyToken, checkRole(["CONTROL"]), permitirAccesoController);

module.exports = router;