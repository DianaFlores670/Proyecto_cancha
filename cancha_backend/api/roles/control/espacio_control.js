const express = require("express");
const pool = require("../../../config/database");
const { verifyToken, checkRole } = require("../../../middleware/auth");

const router = express.Router();
const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });

const obtenerEspacios = async (id_control, limite, offset) => {
  const q = `
    SELECT 
      e.id_espacio,
      e.nombre,
      e.direccion,
      e.descripcion,
      e.latitud,
      e.longitud,
      e.horario_apertura,
      e.horario_cierre,
      e.imagen_principal,
      e.imagen_sec_1,
      e.imagen_sec_2,
      e.imagen_sec_3,
      e.imagen_sec_4,
      a.id_admin_esp_dep,
      u.nombre AS admin_nombre,
      u.apellido AS admin_apellido,
      u.correo AS admin_correo
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    JOIN admin_esp_dep a ON a.id_admin_esp_dep = e.id_admin_esp_dep
    JOIN usuario u ON u.id_persona = a.id_admin_esp_dep
    WHERE c.id_control = $1
    ORDER BY e.nombre ASC
    LIMIT $2 OFFSET $3
  `;

  const qt = `
    SELECT COUNT(*)
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    WHERE c.id_control = $1
  `;

  const [r1, r2] = await Promise.all([
    pool.query(q, [id_control, limite, offset]),
    pool.query(qt, [id_control])
  ]);

  return {
    espacios: r1.rows,
    total: Number(r2.rows[0].count)
  };
};

const obtenerEspaciosFiltrados = async (id_control, tipo, limite, offset) => {
  const tiposValidos = {
    nombre: "e.nombre ASC",
    direccion: "e.direccion ASC"
  };

  const orderBy = tiposValidos[tipo] || tiposValidos.nombre;

  const q = `
    SELECT 
      e.id_espacio,
      e.nombre,
      e.direccion,
      e.descripcion,
      e.latitud,
      e.longitud,
      e.horario_apertura,
      e.horario_cierre,
      e.imagen_principal,
      e.imagen_sec_1,
      e.imagen_sec_2,
      e.imagen_sec_3,
      e.imagen_sec_4,
      a.id_admin_esp_dep,
      u.nombre AS admin_nombre,
      u.apellido AS admin_apellido,
      u.correo AS admin_correo
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    JOIN admin_esp_dep a ON a.id_admin_esp_dep = e.id_admin_esp_dep
    JOIN usuario u ON u.id_persona = a.id_admin_esp_dep
    WHERE c.id_control = $1
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

  const qt = `
    SELECT COUNT(*)
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    WHERE c.id_control = $1
  `;

  const [rows, total] = await Promise.all([
    pool.query(q, [id_control, limite, offset]),
    pool.query(qt, [id_control])
  ]);

  return {
    espacios: rows.rows,
    total: Number(total.rows[0].count)
  };
};

const buscarEspacios = async (id_control, q, limite, offset) => {
  const sanitize = (str) => String(str).replace(/[%_\\]/g, "\\$&");
  const like = `%${sanitize(q)}%`;

  const sql = `
    SELECT 
      e.id_espacio,
      e.nombre,
      e.direccion,
      e.descripcion,
      e.latitud,
      e.longitud,
      e.horario_apertura,
      e.horario_cierre,
      e.imagen_principal,
      e.imagen_sec_1,
      e.imagen_sec_2,
      e.imagen_sec_3,
      e.imagen_sec_4,
      a.id_admin_esp_dep,
      u.nombre AS admin_nombre,
      u.apellido AS admin_apellido,
      u.correo AS admin_correo
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    JOIN admin_esp_dep a ON a.id_admin_esp_dep = e.id_admin_esp_dep
    JOIN usuario u ON u.id_persona = a.id_admin_esp_dep
    WHERE c.id_control = $1
      AND (
        e.nombre ILIKE $2 OR
        e.direccion ILIKE $2 OR
        e.descripcion ILIKE $2 OR
        u.nombre ILIKE $2 OR
        u.apellido ILIKE $2
      )
    ORDER BY e.nombre ASC
    LIMIT $3 OFFSET $4
  `;

  const totalSql = `
    SELECT COUNT(*)
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    JOIN admin_esp_dep a ON a.id_admin_esp_dep = e.id_admin_esp_dep
    JOIN usuario u ON u.id_persona = a.id_admin_esp_dep
    WHERE c.id_control = $1
      AND (
        e.nombre ILIKE $2 OR
        e.direccion ILIKE $2 OR
        e.descripcion ILIKE $2 OR
        u.nombre ILIKE $2 OR
        u.apellido ILIKE $2
      )
  `;

  const [r1, r2] = await Promise.all([
    pool.query(sql, [id_control, like, limite, offset]),
    pool.query(totalSql, [id_control, like])
  ]);

  return {
    espacios: r1.rows,
    total: Number(r2.rows[0].count)
  };
};

const obtenerEspacioPorId = async (id_control, id_espacio) => {
  const q = `
    SELECT 
      e.id_espacio,
      e.nombre,
      e.direccion,
      e.descripcion,
      e.latitud,
      e.longitud,
      e.horario_apertura,
      e.horario_cierre,
      e.imagen_principal,
      e.imagen_sec_1,
      e.imagen_sec_2,
      e.imagen_sec_3,
      e.imagen_sec_4,
      a.id_admin_esp_dep,
      u.nombre AS admin_nombre,
      u.apellido AS admin_apellido,
      u.correo AS admin_correo
    FROM control c
    JOIN espacio_deportivo e ON e.id_espacio = c.id_espacio
    JOIN admin_esp_dep a ON a.id_admin_esp_dep = e.id_admin_esp_dep
    JOIN usuario u ON u.id_persona = a.id_admin_esp_dep
    WHERE c.id_control = $1 AND e.id_espacio = $2
  `;

  const r = await pool.query(q, [id_control, id_espacio]);
  return r.rows[0] || null;
};

const datosEspecificosController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const { espacios, total } = await obtenerEspacios(id_control, limite, offset);

    res.json(
      respuesta(true, "Espacios obtenidos", {
        espacios,
        paginacion: { limite, offset, total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const filtroController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const tipo = req.query.tipo;
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const out = await obtenerEspaciosFiltrados(id_control, tipo, limite, offset);

    res.json(
      respuesta(true, "Espacios filtrados", {
        espacios: out.espacios,
        paginacion: { limite, offset, total: out.total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const buscarController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const q = req.query.q || "";
    const limite = Number(req.query.limit || 10);
    const offset = Number(req.query.offset || 0);

    const out = await buscarEspacios(id_control, q, limite, offset);

    res.json(
      respuesta(true, "Resultados", {
        espacios: out.espacios,
        paginacion: { limite, offset, total: out.total }
      })
    );
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

const detalleController = async (req, res) => {
  try {
    const id_control = req.user.id_persona;
    const id_espacio = Number(req.params.id);

    const espacio = await obtenerEspacioPorId(id_control, id_espacio);

    if (!espacio) {
      return res.status(404).json(respuesta(false, "No encontrado"));
    }

    res.json(respuesta(true, "OK", { espacio }));
  } catch (e) {
    res.status(500).json(respuesta(false, e.message));
  }
};

router.get("/datos-especificos", verifyToken, checkRole(["CONTROL"]), datosEspecificosController);
router.get("/filtro", verifyToken, checkRole(["CONTROL"]), filtroController);
router.get("/buscar", verifyToken, checkRole(["CONTROL"]), buscarController);
router.get("/dato-individual/:id", verifyToken, checkRole(["CONTROL"]), detalleController);

module.exports = router;
