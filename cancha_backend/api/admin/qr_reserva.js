const express = require("express");
const pool = require("../../config/database");
const generarCodigoQR = require("../../utils/generarCodigoQR");

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos
});

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

const isValidTimestamp = (ts) => {
  if (!ts) return false;
  const d = new Date(ts);
  return d instanceof Date && !isNaN(d.getTime());
};

const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT qr.id_qr, qr.fecha_generado, qr.fecha_expira, qr.codigo_qr, qr.estado, qr.verificado,
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM qr_reserva qr
      JOIN reserva r ON qr.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ORDER BY qr.id_qr
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM qr_reserva`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);
    return {
      qrs: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count, 10)
    };
  } catch (error) {
    throw error;
  }
};

const obtenerQRsFiltrados = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    let whereClause = "";
    let orderClause = "qr.id_qr ASC";

    switch (tipoFiltro) {
      case "verificado_si":
        whereClause = "WHERE qr.verificado = true";
        orderClause = "qr.fecha_generado DESC";
        break;
      case "verificado_no":
        whereClause = "WHERE qr.verificado = false";
        orderClause = "qr.fecha_generado DESC";
        break;
      case "cliente_nombre":
        orderClause = "p.nombre ASC, p.apellido ASC";
        break;
      case "fecha_generado":
        orderClause = "qr.fecha_generado DESC";
        break;
      default:
        orderClause = "qr.id_qr ASC";
    }

    const queryDatos = `
      SELECT qr.id_qr, qr.fecha_generado, qr.fecha_expira, qr.codigo_qr, qr.estado, qr.verificado,
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM qr_reserva qr
      JOIN reserva r ON qr.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $1 OFFSET $2
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM qr_reserva qr
      ${whereClause}
    `;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      qrs: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count, 10)
    };
  } catch (error) {
    throw new Error(`Error al obtener QRs filtrados: ${error.message}`);
  }
};

const buscarQRs = async (texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT qr.id_qr, qr.fecha_generado, qr.fecha_expira, qr.codigo_qr, qr.estado, qr.verificado,
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM qr_reserva qr
      JOIN reserva r ON qr.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        CAST(r.id_reserva AS TEXT) ILIKE $1
      ORDER BY qr.fecha_generado DESC
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM qr_reserva qr
      JOIN reserva r ON qr.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE 
        p.nombre ILIKE $1 OR 
        p.apellido ILIKE $1 OR 
        ca.nombre ILIKE $1 OR 
        CAST(r.id_reserva AS TEXT) ILIKE $1
    `;

    const sanitizeInput = (input) => input.replace(/[%_\\]/g, "\\$&");
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda])
    ]);

    return {
      qrs: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count, 10)
    };
  } catch (error) {
    throw error;
  }
};

const obtenerQRPorId = async (id) => {
  try {
    const query = `
      SELECT qr.*, 
             r.id_reserva, c.id_cliente, p.nombre AS cliente_nombre, p.apellido AS cliente_apellido, p.correo AS cliente_correo,
             ca.id_cancha, ca.nombre AS cancha_nombre
      FROM qr_reserva qr
      JOIN reserva r ON qr.id_reserva = r.id_reserva
      JOIN cliente c ON r.id_cliente = c.id_cliente
      JOIN usuario p ON c.id_cliente = p.id_persona
      JOIN cancha ca ON r.id_cancha = ca.id_cancha
      WHERE qr.id_qr = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

const obtenerQRPorReserva = async (id_reserva) => {
  const query = `
    SELECT *
    FROM qr_reserva
    WHERE id_reserva = $1
    ORDER BY fecha_generado DESC
    LIMIT 1
  `;
  const result = await pool.query(query, [id_reserva]);
  return result.rows[0] || null;
};

const crearQR = async (datosQR) => {
  try {
    if (!datosQR.id_reserva || isNaN(datosQR.id_reserva)) {
      throw new Error("El ID de la reserva es obligatorio y debe ser un numero");
    }

    if (!datosQR.fecha_generado) {
      throw new Error("La fecha de generacion es obligatoria");
    }

    const fechaGenerado = new Date(datosQR.fecha_generado);
    if (isNaN(fechaGenerado.getTime())) {
      throw new Error("La fecha de generacion no es valida");
    }

    if (datosQR.fecha_expira) {
      const fechaExpira = new Date(datosQR.fecha_expira);
      if (isNaN(fechaExpira.getTime())) {
        throw new Error("La fecha de expiracion no es valida");
      }
      if (fechaExpira <= fechaGenerado) {
        throw new Error("La fecha de expiracion debe ser posterior a la fecha de generacion");
      }
    }

    const reservaResult = await pool.query(
      "SELECT id_reserva FROM reserva WHERE id_reserva = $1",
      [datosQR.id_reserva]
    );

    if (!reservaResult.rows[0]) {
      throw new Error("La reserva asociada no existe");
    }

    const qrExistenteResult = await pool.query(
      "SELECT id_qr FROM qr_reserva WHERE id_reserva = $1"
    , [datosQR.id_reserva]);

    if (qrExistenteResult.rows[0]) {
      throw new Error("Ya existe un QR asociado a esta reserva");
    }

    if (datosQR.id_control) {
      const controlResult = await pool.query(
        "SELECT id_control FROM control WHERE id_control = $1",
        [datosQR.id_control]
      );
      if (!controlResult.rows[0]) {
        throw new Error("El control asociado no existe");
      }
    }

    const query = `
      INSERT INTO qr_reserva (
        fecha_generado, 
        fecha_expira, 
        codigo_qr, 
        estado, 
        id_reserva, 
        id_control, 
        verificado
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      datosQR.fecha_generado,
      datosQR.fecha_expira || null,
      datosQR.codigo_qr || null,
      datosQR.estado || "activo",
      datosQR.id_reserva,
      datosQR.id_control || null,
      datosQR.verificado !== undefined ? datosQR.verificado : false
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error al crear QR de reserva:", error.message);
    throw new Error(error.message);
  }
};

const actualizarQR = async (id, camposActualizar) => {
  try {
    const camposPermitidos = [
      "fecha_generado",
      "fecha_expira",
      "codigo_qr",
      "estado",
      "id_reserva",
      "id_control",
      "verificado"
    ];

    const campos = Object.keys(camposActualizar).filter((key) =>
      camposPermitidos.includes(key)
    );

    if (campos.length === 0) {
      throw new Error("No hay campos validos para actualizar");
    }

    if (camposActualizar.fecha_generado) {
      const fechaGenerado = new Date(camposActualizar.fecha_generado);
      if (isNaN(fechaGenerado.getTime())) {
        throw new Error("La fecha de generacion no es valida");
      }
      if (camposActualizar.fecha_expira) {
        const fechaExpira = new Date(camposActualizar.fecha_expira);
        if (isNaN(fechaExpira.getTime())) {
          throw new Error("La fecha de expiracion no es valida");
        }
        if (fechaExpira <= fechaGenerado) {
          throw new Error("La fecha de expiracion debe ser posterior a la fecha de generacion");
        }
      }
    }

    if (camposActualizar.codigo_qr && camposActualizar.codigo_qr.length > 255) {
      throw new Error("El codigo QR no debe exceder los 255 caracteres");
    }

    const estadosValidos = ["activo", "expirado", "usado"];
    if (camposActualizar.estado && !estadosValidos.includes(camposActualizar.estado)) {
      throw new Error(`El estado debe ser uno de: ${estadosValidos.join(", ")}`);
    }

    if (camposActualizar.verificado !== undefined && typeof camposActualizar.verificado !== "boolean") {
      throw new Error("El campo verificado debe ser un valor booleano");
    }

    if (camposActualizar.id_reserva) {
      const reservaQuery = `
        SELECT id_reserva FROM reserva WHERE id_reserva = $1
      `;
      const reservaResult = await pool.query(reservaQuery, [camposActualizar.id_reserva]);
      if (!reservaResult.rows[0]) {
        throw new Error("La reserva asociada no existe");
      }
      const qrExistenteQuery = `
        SELECT id_qr FROM qr_reserva WHERE id_reserva = $1 AND id_qr != $2
      `;
      const qrExistenteResult = await pool.query(qrExistenteQuery, [
        camposActualizar.id_reserva,
        id
      ]);
      if (qrExistenteResult.rows[0]) {
        throw new Error("Ya existe otro QR asociado a esta reserva");
      }
    }

    if (camposActualizar.id_control) {
      const controlQuery = `
        SELECT id_control FROM control WHERE id_control = $1
      `;
      const controlResult = await pool.query(controlQuery, [camposActualizar.id_control]);
      if (!controlResult.rows[0]) {
        throw new Error("El control asociado no existe");
      }
    }

    const setClause = campos
      .map((campo, index) => `${campo} = $${index + 2}`)
      .join(", ");

    const values = campos.map((campo) => {
      const value = camposActualizar[campo];
      if (campo === "verificado") {
        return value;
      }
      if (campo === "codigo_qr") {
        return value || null;
      }
      return value !== undefined && value !== null ? value : null;
    });

    const query = `
      UPDATE qr_reserva 
      SET ${setClause}
      WHERE id_qr = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

const eliminarQR = async (id) => {
  try {
    const query = "DELETE FROM qr_reserva WHERE id_qr = $1 RETURNING id_qr";
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
};

const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const { qrs, total } = await obtenerDatosEspecificos(limite, offset);

    res.json(
      respuesta(true, "QRs de reserva obtenidos correctamente", {
        qrs,
        paginacion: { limite, offset, total }
      })
    );
  } catch (error) {
    console.error("Error en obtenerDatosEspecificos:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const obtenerQRsFiltradosController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const tiposValidos = ["verificado_si", "verificado_no", "cliente_nombre", "fecha_generado"];

    if (!tipo || !tiposValidos.includes(tipo)) {
      return res
        .status(400)
        .json(
          respuesta(
            false,
            `El parametro "tipo" es invalido. Valores permitidos: ${tiposValidos.join(", ")}`
          )
        );
    }

    const { qrs, total } = await obtenerQRsFiltrados(tipo, limite, offset);

    res.json(
      respuesta(true, `QRs de reserva filtrados por ${tipo} obtenidos correctamente`, {
        qrs,
        filtro: tipo,
        paginacion: { limite, offset, total }
      })
    );
  } catch (error) {
    console.error("Error en obtenerQRsFiltrados:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const buscarQRsController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!q) {
      return res
        .status(400)
        .json(respuesta(false, 'El parametro de busqueda "q" es requerido'));
    }

    const { qrs, total } = await buscarQRs(q, limite, offset);

    res.json(
      respuesta(true, "QRs de reserva obtenidos correctamente", {
        qrs,
        paginacion: { limite, offset, total }
      })
    );
  } catch (error) {
    console.error("Error en buscarQRs:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const obtenerQRPorIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, "ID de QR no valido"));
    }

    const qr = await obtenerQRPorId(parseInt(id, 10));

    if (!qr) {
      return res.status(404).json(respuesta(false, "QR de reserva no encontrado"));
    }

    res.json(respuesta(true, "QR de reserva obtenido correctamente", { qr }));
  } catch (error) {
    console.error("Error en obtenerQRPorId:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const crearQRController = async (req, res) => {
  try {
    const datos = { ...req.body };

    const camposObligatorios = ["id_reserva", "fecha_generado", "estado"];
    const faltantes = camposObligatorios.filter(
      (campo) => !datos[campo] || datos[campo].toString().trim() === ""
    );

    if (faltantes.length > 0) {
      return res
        .status(400)
        .json(
          respuesta(false, `Faltan campos obligatorios: ${faltantes.join(", ")}`)
        );
    }

    const estadosValidos = ["activo", "expirado", "usado"];
    if (!estadosValidos.includes(datos.estado)) {
      return res
        .status(400)
        .json(
          respuesta(
            false,
            `Estado invalido. Debe ser uno de: ${estadosValidos.join(", ")}`
          )
        );
    }

    if (!isValidTimestamp(datos.fecha_generado)) {
      return res
        .status(400)
        .json(respuesta(false, "La fecha de generacion no es valida"));
    }
    if (datos.fecha_expira && !isValidTimestamp(datos.fecha_expira)) {
      return res
        .status(400)
        .json(respuesta(false, "La fecha de expiracion no es valida"));
    }

    const codigo = generarCodigoQR(datos.id_reserva);

    datos.codigo_qr = codigo;
    datos.verificado = datos.verificado || false;

    const nuevoQR = await crearQR(datos);

    const linkUnirse = `${FRONTEND_BASE_URL}/unirse-reserva?code=${encodeURIComponent(codigo)}`;

    res
      .status(201)
      .json(
        respuesta(true, "QR de reserva creado correctamente", {
          qr: nuevoQR,
          link_unirse: linkUnirse
        })
      );
  } catch (error) {
    console.error("Error en crearQRController:", error.message);

    if (error.code === "23505") {
      return res
        .status(400)
        .json(respuesta(false, "Ya existe un QR asociado a esta reserva"));
    }

    if (error.code === "23503") {
      return res
        .status(400)
        .json(respuesta(false, "La reserva o control asociado no existe"));
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

const actualizarQRController = async (req, res) => {
  try {
    const { id } = req.params;
    const camposActualizar = { ...req.body };

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, "ID de QR no valido"));
    }

    if (Object.keys(camposActualizar).length === 0) {
      return res
        .status(400)
        .json(respuesta(false, "No se proporcionaron campos para actualizar"));
    }

    const qrActual = await obtenerQRPorId(parseInt(id, 10));
    if (!qrActual) {
      return res.status(404).json(respuesta(false, "QR de reserva no encontrado"));
    }

    if (camposActualizar.estado) {
      const estadosValidos = ["activo", "expirado", "usado"];
      if (!estadosValidos.includes(camposActualizar.estado)) {
        return res
          .status(400)
          .json(
            respuesta(
              false,
              `Estado invalido. Debe ser uno de: ${estadosValidos.join(", ")}`
            )
          );
      }
    }

    if (
      camposActualizar.fecha_generado &&
      !isValidTimestamp(camposActualizar.fecha_generado)
    ) {
      return res
        .status(400)
        .json(respuesta(false, "La fecha de generacion no es valida"));
    }
    if (camposActualizar.fecha_expira && !isValidTimestamp(camposActualizar.fecha_expira)) {
      return res
        .status(400)
        .json(respuesta(false, "La fecha de expiracion no es valida"));
    }

    if (camposActualizar.regenerar_qr || camposActualizar.id_reserva) {
      const idReservaFinal = camposActualizar.id_reserva || qrActual.id_reserva;
      let codigo = qrActual.codigo_qr;
      if (!codigo || camposActualizar.regenerar_qr) {
        codigo = generarCodigoQR(idReservaFinal);
      }
      camposActualizar.codigo_qr = codigo;
      delete camposActualizar.regenerar_qr;
    }

    const qrActualizado = await actualizarQR(parseInt(id, 10), camposActualizar);

    if (!qrActualizado) {
      return res.status(404).json(respuesta(false, "QR de reserva no encontrado"));
    }

    res.json(
      respuesta(true, "QR de reserva actualizado correctamente", {
        qr: qrActualizado
      })
    );
  } catch (error) {
    console.error("Error en actualizarQRController:", error.message);

    if (error.code === "23505") {
      return res
        .status(400)
        .json(respuesta(false, "Ya existe un QR asociado a esta reserva"));
    }

    if (error.code === "23503") {
      return res
        .status(400)
        .json(respuesta(false, "La reserva o control asociado no existe"));
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

const eliminarQRController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, "ID de QR no valido"));
    }

    const qrEliminado = await eliminarQR(parseInt(id, 10));

    if (!qrEliminado) {
      return res.status(404).json(respuesta(false, "QR de reserva no encontrado"));
    }

    res.json(respuesta(true, "QR de reserva eliminado correctamente"));
  } catch (error) {
    console.error("Error en eliminarQR:", error.message);
    res.status(500).json(respuesta(false, error.message));
  }
};

const regenerarQRPorReservaController = async (req, res) => {
  try {
    const { idReserva } = req.params;

    if (!idReserva || isNaN(idReserva)) {
      return res.status(400).json(respuesta(false, "idReserva no valido"));
    }

    const idReservaNum = parseInt(idReserva, 10);

    const qrActual = await obtenerQRPorReserva(idReservaNum);

    const ahora = new Date();
    const fechaGenerado = ahora.toISOString();
    const fechaExpira = new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString();

    let codigo;
    if (qrActual && qrActual.codigo_qr && !req.body?.forzar_nuevo_codigo) {
      codigo = qrActual.codigo_qr;
    } else {
      codigo = generarCodigoQR(idReservaNum);
    }

    const payload = {
      fecha_generado: fechaGenerado,
      fecha_expira: fechaExpira,
      codigo_qr: codigo,
      estado: "activo",
      verificado: false
    };

    let qrResult;

    if (qrActual) {
      qrResult = await actualizarQR(qrActual.id_qr, payload);
    } else {
      qrResult = await crearQR({
        id_reserva: idReservaNum,
        ...payload
      });
    }

    return res.json(
      respuesta(true, "QR regenerado correctamente", { qr: qrResult })
    );
  } catch (error) {
    console.error("Error en regenerarQRPorReservaController:", error.message);
    return res.status(500).json(respuesta(false, error.message));
  }
};

const obtenerQRPorReservaController = async (req, res) => {
  try {
    const { id_reserva } = req.params;

    if (!id_reserva || isNaN(id_reserva)) {
      return res
        .status(400)
        .json(respuesta(false, "ID de reserva no valido"));
    }

    const qr = await obtenerQRPorReserva(parseInt(id_reserva, 10));

    if (!qr) {
      return res
        .status(404)
        .json(respuesta(false, "No existe un QR para esta reserva"));
    }

    return res.json(
      respuesta(true, "QR obtenido correctamente", { qr })
    );
  } catch (error) {
    console.error("Error en obtenerQRPorReservaController:", error.message);
    return res
      .status(500)
      .json(respuesta(false, error.message || "Error interno"));
  }
};

router.get("/datos-especificos", obtenerDatosEspecificosController);
router.get("/filtro", obtenerQRsFiltradosController);
router.get("/buscar", buscarQRsController);
router.get("/dato-individual/:id", obtenerQRPorIdController);

router.post("/", crearQRController);
router.patch("/:id", actualizarQRController);
router.delete("/:id", eliminarQRController);

router.post("/regenerar-por-reserva/:idReserva", regenerarQRPorReservaController);
router.get("/por-reserva/:id_reserva", obtenerQRPorReservaController);

module.exports = router;
