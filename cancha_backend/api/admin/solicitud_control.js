/**
 * Rutas para gestionar solicitudes de rol CONTROL
 */

const express = require('express');
const pool = require('../../config/database');
const { verifyToken, checkRole } = require('../../middleware/auth');
const {
    notifyAdminNuevaSolicitudRol,
    notifyUsuarioResultadoRol
} = require('../../lib/mailer');

const router = express.Router();

const respuesta = (exito, mensaje, datos = null) => ({ exito, mensaje, datos });

/* ============================================================
   ============================ MODELOS ========================
   ============================================================ */

/**
 * Validaciones previas:
 * - Ya pertenece al rol control
 * - Ya tiene solicitud pendiente
 * - Ya tiene solicitud aprobada
 */
const validarDuplicado = async (id_usuario) => {

    const chkRol = await pool.query(
        `SELECT 1 FROM control WHERE id_control = $1`,
        [id_usuario]
    );
    if (chkRol.rowCount > 0)
        throw new Error('Ya eres parte del rol control');

    const chkPend = await pool.query(
        `SELECT 1 
     FROM solicitud_rol 
     WHERE id_usuario = $1 AND rol_destino='control' AND estado='pendiente'`,
        [id_usuario]
    );
    if (chkPend.rowCount > 0)
        throw new Error('Ya existe una solicitud pendiente');

    const chkAprob = await pool.query(
        `SELECT 1 
     FROM solicitud_rol 
     WHERE id_usuario = $1 AND rol_destino='control' AND estado='aprobada'`,
        [id_usuario]
    );
    if (chkAprob.rowCount > 0)
        throw new Error('Ya existe una solicitud aprobada anteriormente');
};


/**
 * Crear solicitud de control
 */
const crearSolicitud = async ({ id_usuario, motivo, id_espacio }) => {
    await validarDuplicado(id_usuario);

    const q = `
    INSERT INTO solicitud_rol(id_usuario, rol_destino, motivo, id_espacio)
    VALUES($1, 'control', $2, $3)
    RETURNING *
  `;

    const r = await pool.query(q, [id_usuario, motivo, id_espacio]);
    return r.rows[0];
};


/**
 * Aprobar solicitud
 */
const aprobarSolicitud = async ({ id_solicitud, adminId }) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const s = await client.query(
            `SELECT * FROM solicitud_rol WHERE id_solicitud=$1 FOR UPDATE`,
            [id_solicitud]
        );
        if (!s.rowCount) throw new Error('Solicitud no encontrada');

        const sol = s.rows[0];
        if (sol.estado !== 'pendiente')
            throw new Error('La solicitud ya fue procesada');

        const id_usuario = sol.id_usuario;

        // Agregar al rol control
        await client.query(
            `INSERT INTO control(id_control, fecha_asignacion, estado, id_espacio)
       VALUES ($1, CURRENT_DATE, true, $2)`,
            [id_usuario, sol.id_espacio]
        );

        // Convertirlo también en cliente si no existe
        const chkc = await client.query(
            `SELECT 1 FROM cliente WHERE id_cliente=$1`,
            [id_usuario]
        );

        if (!chkc.rowCount) {
            await client.query(
                `INSERT INTO cliente(id_cliente) VALUES($1)`,
                [id_usuario]
            );
        }

        // Actualizar solicitud
        await client.query(
            `UPDATE solicitud_rol
       SET estado='aprobada',
           decidido_por_admin=$1,
           fecha_decision=NOW()
       WHERE id_solicitud=$2`,
            [adminId, id_solicitud]
        );

        await client.query('COMMIT');

        const usr = await pool.query(
            `SELECT usuario, correo FROM usuario WHERE id_persona=$1`,
            [id_usuario]
        );

        return {
            to: usr.rows[0]?.correo,
            usuario: usr.rows[0]?.usuario
        };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};


/**
 * Rechazar solicitud
 */
const rechazarSolicitud = async ({ id_solicitud, comentario, adminId }) => {

    const q = `
    UPDATE solicitud_rol
    SET estado='rechazada',
        comentario_decision=$1,
        decidido_por_admin=$2,
        fecha_decision=NOW()
    WHERE id_solicitud=$3 AND estado='pendiente'
    RETURNING *
  `;

    const r = await pool.query(q, [comentario, adminId, id_solicitud]);
    if (!r.rowCount) throw new Error('Solicitud no encontrada o ya procesada');

    const sol = r.rows[0];

    const u = await pool.query(
        `SELECT usuario, correo FROM usuario WHERE id_persona=$1`,
        [sol.id_usuario]
    );

    return {
        to: u.rows[0]?.correo,
        usuario: u.rows[0]?.usuario,
        comentario
    };
};


/**
 * Listado general
 */
const obtenerSolicitudes = async (limite, offset) => {

    const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_rol s
    JOIN usuario u ON u.id_persona = s.id_usuario
    LEFT JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE rol_destino='control'
    ORDER BY fecha_solicitud DESC
    LIMIT $1 OFFSET $2
  `;

    const qt = `
    SELECT COUNT(*) 
    FROM solicitud_rol 
    WHERE rol_destino='control'
  `;

    const [r1, r2] = await Promise.all([
        pool.query(q, [limite, offset]),
        pool.query(qt)
    ]);

    return {
        solicitudes: r1.rows,
        total: Number(r2.rows[0].count)
    };
};


/**
 * Filtrar por estado
 */
const filtrarSolicitudes = async ({ estado, limite, offset }) => {

    const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_rol s
    JOIN usuario u ON u.id_persona = s.id_usuario
    LEFT JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE rol_destino='control' AND s.estado::text = $1
    ORDER BY fecha_solicitud DESC
    LIMIT $2 OFFSET $3
  `;

    const qt = `
    SELECT COUNT(*) 
    FROM solicitud_rol 
    WHERE rol_destino='control' AND estado::text = $1
  `;

    const [r1, r2] = await Promise.all([
        pool.query(q, [estado, limite, offset]),
        pool.query(qt, [estado])
    ]);

    return {
        solicitudes: r1.rows,
        total: Number(r2.rows[0].count)
    };
};


/**
 * Buscar
 */
const buscarSolicitudes = async ({ q, limite, offset }) => {

    const like = `%${q}%`;

    const query = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_rol s
    JOIN usuario u ON u.id_persona = s.id_usuario
    LEFT JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE rol_destino='control'
      AND (
            u.usuario ILIKE $1 OR
            u.correo ILIKE $1 OR
            e.nombre ILIKE $1 OR
            s.estado::text ILIKE $1 OR
            CAST(s.id_solicitud AS TEXT) ILIKE $1
          )
    ORDER BY fecha_solicitud DESC
    LIMIT $2 OFFSET $3
  `;

    const queryTotal = `
    SELECT COUNT(*)
    FROM solicitud_rol s
    JOIN usuario u ON u.id_persona = s.id_usuario
    LEFT JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE rol_destino='control'
      AND (
            u.usuario ILIKE $1 OR
            u.correo ILIKE $1 OR
            e.nombre ILIKE $1 OR
            s.estado::text ILIKE $1 OR
            CAST(s.id_solicitud AS TEXT) ILIKE $1
          )
  `;

    const [r1, r2] = await Promise.all([
        pool.query(query, [like, limite, offset]),
        pool.query(queryTotal, [like])
    ]);

    return {
        solicitudes: r1.rows,
        total: Number(r2.rows[0].count)
    };
};


/**
 * Detalle por id
 */
const obtenerDetalle = async (id) => {
    const q = `
    SELECT s.*, u.usuario AS usuario_nombre, u.correo, e.nombre AS espacio_nombre
    FROM solicitud_rol s
    JOIN usuario u ON u.id_persona = s.id_usuario
    LEFT JOIN espacio_deportivo e ON e.id_espacio = s.id_espacio
    WHERE s.id_solicitud=$1
  `;

    const r = await pool.query(q, [id]);
    return r.rows[0] || null;
};



/* ============================================================
   ======================== CONTROLADORES =====================
   ============================================================ */

const crearSolicitudController = async (req, res) => {
    try {
        const { id_usuario, motivo, id_espacio } = req.body;

        if (!id_usuario) {
            return res.status(400).json(respuesta(false, 'id_usuario es obligatorio'));
        }


        const s = await crearSolicitud({
            id_usuario,
            motivo,
            id_espacio
        });

        notifyAdminNuevaSolicitudRol({
            id_solicitud: s.id_solicitud,
            id_usuario,
            rol: 'control'
        }).catch(err => console.error("EMAIL ERROR:", err));

        res.json(respuesta(true, 'Solicitud creada', s));

    } catch (e) {
        res.status(400).json(respuesta(false, e.message));
    }
};


const aprobarController = async (req, res) => {
    try {
        const id_solicitud = Number(req.params.id);
        const adminId = req.user.id_persona;

        const out = await aprobarSolicitud({ id_solicitud, adminId });

        notifyUsuarioResultadoRol({
            to: out.to,
            aprobado: true,
            rol: 'control'
        }).catch(err => console.error("EMAIL ERROR:", err));

        res.json(respuesta(true, 'Solicitud aprobada'));

    } catch (e) {
        res.status(400).json(respuesta(false, e.message));
    }
};


const rechazarController = async (req, res) => {
    try {
        const id_solicitud = Number(req.params.id);
        const adminId = req.user.id_persona;
        const { comentario } = req.body;

        const out = await rechazarSolicitud({
            id_solicitud,
            comentario,
            adminId
        });

        notifyUsuarioResultadoRol({
            to: out.to,
            aprobado: false,
            comentario: out.comentario,
            rol: 'control'
        }).catch(err => console.error("EMAIL ERROR:", err));

        res.json(respuesta(true, 'Solicitud rechazada'));

    } catch (e) {
        res.status(400).json(respuesta(false, e.message));
    }
};


const listarController = async (req, res) => {
    try {
        const estado = req.query.estado || 'pendiente';
        const limite = Number(req.query.limit || 10);
        const offset = Number(req.query.offset || 0);

        const data = await filtrarSolicitudes({ estado, limite, offset });

        res.json(respuesta(true, 'Solicitudes obtenidas', {
            solicitudes: data.solicitudes,
            paginacion: {
                limite,
                offset,
                total: data.total
            }
        }));

    } catch {
        res.status(500).json(respuesta(false, 'Error interno'));
    }
};


const buscarController = async (req, res) => {
    try {
        const q = req.query.q || '';
        const limite = Number(req.query.limit || 10);
        const offset = Number(req.query.offset || 0);

        const data = await buscarSolicitudes({ q, limite, offset });

        res.json(respuesta(true, 'Resultados', {
            solicitudes: data.solicitudes,
            paginacion: {
                total: data.total,
                limite,
                offset
            }
        }));

    } catch {
        res.status(500).json(respuesta(false, 'Error interno'));
    }
};


const detalleController = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const sol = await obtenerDetalle(id);

        if (!sol)
            return res.status(404).json(respuesta(false, 'No encontrado'));

        res.json(respuesta(true, 'OK', { solicitud: sol }));

    } catch {
        res.status(500).json(respuesta(false, 'Error interno'));
    }
};


const datosGeneralesController = async (req, res) => {
    try {
        const limite = Number(req.query.limit || 10);
        const offset = Number(req.query.offset || 0);

        const data = await obtenerSolicitudes(limite, offset);

        res.json(respuesta(true, 'Solicitudes obtenidas', {
            solicitudes: data.solicitudes,
            paginacion: {
                limite,
                offset,
                total: data.total
            }
        }));

    } catch (e) {
        res.status(500).json(respuesta(false, e.message));
    }
};



/* ============================================================
   ============================= RUTAS =========================
   ============================================================ */

router.post('/', crearSolicitudController);

router.get('/', verifyToken, checkRole(['ADMINISTRADOR']), listarController);
router.get('/buscar', verifyToken, checkRole(['ADMINISTRADOR']), buscarController);
router.get('/dato-individual/:id', verifyToken, checkRole(['ADMINISTRADOR']), detalleController);
router.get('/datos-especificos', verifyToken, checkRole(['ADMINISTRADOR']), datosGeneralesController);
router.get('/filtro', verifyToken, checkRole(['ADMINISTRADOR']), listarController);

router.post('/:id/aprobar', verifyToken, checkRole(['ADMINISTRADOR']), aprobarController);
router.post('/:id/rechazar', verifyToken, checkRole(['ADMINISTRADOR']), rechazarController);

module.exports = router;
