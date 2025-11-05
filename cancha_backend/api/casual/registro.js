const express = require('express');
const pool = require('../../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, checkRole } = require('../../middleware/auth');
const { validateUsuarioFields } = require('../../middleware/validate');
const path = require('path');
const fs = require('fs').promises;
const { unlinkFile, createUploadAndProcess } = require("../../middleware/multer");

// Clave secreta para JWT (en producción, usar variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// --- Modelos ---

const obtenerValoresEnum = async (tipoEnum) => {
  try {
    const query = `
      SELECT unnest(enum_range(NULL::${tipoEnum})) as valor;
    `;
    const result = await pool.query(query);
    return result.rows.map(row => row.valor);
  } catch (error) {
    console.error('Error al obtener valores del enum:', error.message);
    throw error;
  }
};

const asignarRolUsuario = async (idUsuario, rol, datosEspecificos = {}) => {
  try {
    switch (rol) {
      case 'cliente':
        return await asignarRolCliente(idUsuario, datosEspecificos);
      case 'administrador':
        return await asignarRolAdministrador(idUsuario, datosEspecificos);
      case 'admin_esp_dep':
        return await asignarRolAdminEspDep(idUsuario, datosEspecificos);
      case 'deportista':
        return await asignarRolDeportista(idUsuario, datosEspecificos);
      case 'control':
        return await asignarRolControl(idUsuario, datosEspecificos);
      case 'encargado':
        return await asignarRolEncargado(idUsuario, datosEspecificos);
      default:
        throw new Error('Rol no válido');
    }
  } catch (error) {
    console.error('Error in asignarRolUsuario:', error);
    throw error;
  }
};

/**
 * Funciones específicas para cada rol
 */
const asignarRolCliente = async (idUsuario, datos) => {
  const query = `
    INSERT INTO cliente (id_cliente, fecha_registro, fecha_nac, carnet_identidad, ci_complemento)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [
    idUsuario,
    datos.fecha_registro || new Date(),
    datos.fecha_nac || null,
    datos.carnet_identidad || null,
    datos.ci_complemento || null
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};


const obtenerUsuarioPorId = async (id) => {
  try {
    const query = `
      SELECT id_persona, nombre, apellido, correo, usuario, telefono, 
             sexo, imagen_perfil, latitud, longitud, fecha_creacion
      FROM usuario 
      WHERE id_persona = $1
    `;
    const result = await pool.query(query, [id]);

    if (!result.rows[0]) return null;
    
    // Obtener TODOS los roles del usuario
    const rolesUsuario = await obtenerRolesUsuario(id);
    
    // Incluir roles disponibles
    const rolesDisponibles = obtenerRolesDisponibles();
    
    return {
      ...result.rows[0],
      roles: rolesUsuario,  // ← Ahora es un array
      roles_disponibles: rolesDisponibles
    };
  } catch (error) {
    console.error('Error in obtenerUsuarioPorId:', error);
    throw error;
  }
};

const obtenerRolesUsuario = async (idUsuario) => {
  try {
    const tablasRoles = [
      { tabla: 'cliente', rol: 'cliente' },
      { tabla: 'administrador', rol: 'administrador' },
      { tabla: 'admin_esp_dep', rol: 'admin_esp_dep' },
      { tabla: 'deportista', rol: 'deportista' },
      { tabla: 'control', rol: 'control' },
      { tabla: 'encargado', rol: 'encargado' }
    ];

    const roles = [];
    
    for (const { tabla, rol } of tablasRoles) {
      const query = `SELECT * FROM ${tabla} WHERE id_${tabla} = $1`;
      const result = await pool.query(query, [idUsuario]);
      if (result.rows.length > 0) {
        roles.push({ 
          rol, 
          datos: result.rows[0],
          tabla: tabla
        });
      }
    }
    
    return roles;
  } catch (error) {
    console.error('Error in obtenerRolesUsuario:', error);
    throw error;
  }
};

// Lista de roles disponibles (estática)
const obtenerRolesDisponibles = () => {
  return [
    { valor: 'cliente', etiqueta: 'Cliente' },
    { valor: 'administrador', etiqueta: 'Administrador' },
    { valor: 'admin_esp_dep', etiqueta: 'Administrado Espacio Deportivo' },
    { valor: 'deportista', etiqueta: 'Deportista' },
    { valor: 'control', etiqueta: 'Control' },
    { valor: 'encargado', etiqueta: 'Encargado' }
  ];
};

const asignarRolAdministrador = async (idUsuario, datos) => {
  const query = `
    INSERT INTO administrador (id_administrador, direccion, estado, ultimo_login)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [
    idUsuario,
    datos.direccion || null,
    datos.estado !== undefined ? datos.estado : true,
    datos.ultimo_login || null
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const asignarRolAdminEspDep = async (idUsuario, datos) => {
  const query = `
    INSERT INTO admin_esp_dep (id_admin_esp_dep, fecha_ingreso, direccion, estado)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [
    idUsuario,
    datos.fecha_ingreso || new Date(),
    datos.direccion || null,
    datos.estado !== undefined ? datos.estado : true
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const asignarRolDeportista = async (idUsuario, datos) => {
  const query = `
    INSERT INTO deportista (id_deportista, disciplina_principal)
    VALUES ($1, $2)
    RETURNING *
  `;
  const values = [
    idUsuario,
    datos.disciplina_principal || null
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const asignarRolControl = async (idUsuario, datos) => {
  const query = `
    INSERT INTO control (id_control, fecha_asignacion, estado)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const values = [
    idUsuario,
    datos.fecha_asignacion || new Date(),
    datos.estado !== undefined ? datos.estado : true
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const asignarRolEncargado = async (idUsuario, datos) => {
  const query = `
    INSERT INTO encargado (id_encargado, responsabilidad, fecha_inicio, hora_ingreso, hora_salida, estado)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [
    idUsuario,
    datos.responsabilidad || null,
    datos.fecha_inicio || new Date(),
    datos.hora_ingreso || null,
    datos.hora_salida || null,
    datos.estado !== undefined ? datos.estado : true
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

















async function loginUsuario(correo, contrasena) { 
  const query = 'SELECT * FROM USUARIO WHERE correo = $1'; 
  const result = await pool.query(query, [correo]); 
  const usuario = result.rows[0]; 
    
  if (!usuario) throw new Error('Correo no encontrado'); 

  const isMatch = await bcrypt.compare(contrasena, usuario.contrasena); 
  if (!isMatch) throw new Error('contrasena incorrecta'); 

  // Determinar el rol según las tablas relacionadas
  let role = 'X'; // por defecto

  const resAdmin = await pool.query('SELECT 1 FROM ADMINISTRADOR WHERE id_administrador=$1', [usuario.id_persona]);
  if (resAdmin.rowCount > 0) role = 'ADMINISTRADOR';
  
  const resAdminEsp = await pool.query('SELECT 1 FROM ADMIN_ESP_DEP WHERE id_admin_esp_dep=$1', [usuario.id_persona]);
  if (resAdminEsp.rowCount > 0) role = 'ADMIN_ESP_DEP';
  
  const resDeportista = await pool.query('SELECT 1 FROM DEPORTISTA WHERE id_deportista=$1', [usuario.id_persona]);
  if (resDeportista.rowCount > 0) role = 'DEPORTISTA';
  
  const resControl = await pool.query('SELECT 1 FROM CONTROL WHERE id_control=$1', [usuario.id_persona]);
  if (resControl.rowCount > 0) role = 'CONTROL';
  
  const resEncargado = await pool.query('SELECT 1 FROM ENCARGADO WHERE id_encargado=$1', [usuario.id_persona]);
  if (resEncargado.rowCount > 0) role = 'ENCARGADO';

  const resCliente = await pool.query('SELECT 1 FROM CLIENTE WHERE id_cliente=$1', [usuario.id_persona]);
  if (resCliente.rowCount > 0) role = 'CLIENTE';

  console.log(role);

  return { 
    id_persona: usuario.id_persona,
    nombre: usuario.nombre,
    usuario: usuario.usuario,
    apellido: usuario.apellido,
    correo: usuario.correo,
    sexo: usuario.sexo,
    imagen_perfil: usuario.imagen_perfil,
    role
  };
}

/**
 * Crear nuevo usuario
 */
const crearUsuario = async (datosUsuario) => {
  try {
    // --- Rango aproximado de La Paz ---
    const LAT_MIN = -16.65;
    const LAT_MAX = -16.45;
    const LON_MIN = -68.25;
    const LON_MAX = -68.05;

    // --- Validación y asignación de coordenadas ---

      // Coordenadas aleatorias dentro del rango
      const randomInRange = (min, max) => Math.random() * (max - min) + min;
      let latitud = parseFloat(randomInRange(LAT_MIN, LAT_MAX).toFixed(6));
      let longitud = parseFloat(randomInRange(LON_MIN, LON_MAX).toFixed(6));


    // --- Validaciones adicionales ---
    const validarCorreo = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!validarCorreo(datosUsuario.correo)) {
      throw new Error('El correo electrónico no es válido');
    }

    // Validar rol si se proporciona - AHORA SOPORTA rol_agregar TAMBIÉN
    let rolAAgregar = datosUsuario.rol || datosUsuario.rol_agregar;
    let rolAsignado = null;

    if (rolAAgregar) {
      const rolesDisponibles = obtenerRolesDisponibles().map(r => r.valor);
      if (!rolesDisponibles.includes(rolAAgregar)) {
        throw new Error(`El rol ${rolAAgregar} no es válido`);
      }
    }

    // --- Hash de la contraseña ---
    const contrasenaHash = await bcrypt.hash(datosUsuario.contrasena || '123456', 10);

    // --- Inserción SQL en usuario ---
    const queryUsuario = `
      INSERT INTO usuario (
        usuario, contrasena, correo, latitud, longitud
      ) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id_persona
    `;
    const valuesUsuario = [
      datosUsuario.usuario,
      contrasenaHash,
      datosUsuario.correo,
      latitud,
      longitud
    ];
    const resultUsuario = await pool.query(queryUsuario, valuesUsuario);
    const idUsuario = resultUsuario.rows[0].id_persona;

    // --- Asignar rol si se proporciona ---
    if (rolAAgregar) {
      rolAsignado = await asignarRolUsuario(idUsuario, rolAAgregar, datosUsuario.datos_especificos || {});
    }

    // Obtener datos completos para retornar
    const usuarioCompleto = await obtenerUsuarioPorId(idUsuario);
    return { ...usuarioCompleto, rol_asignado: rolAsignado };
  } catch (error) {
    console.error('Error in crearUsuario:', error);
    throw new Error(error.message);
  }
};


const actualizarUsuario = async (id, camposActualizar) => {
  try {
    const camposPermitidosUsuario = [
      'nombre', 'apellido', 'telefono', 'sexo', 'correo',
      'imagen_perfil', 'latitud', 'longitud'
    ];

    // Separar campos
    const camposUsuario = {};
    const datosEspecificos = camposActualizar.datos_especificos || {};
    let rolAAgregar = camposActualizar.rol_agregar;  // ← Usamos rol_agregar
    let rolAEliminar = camposActualizar.rol_eliminar; // ← Usamos rol_eliminar

    camposPermitidosUsuario.forEach(key => {
      if (key in camposActualizar) {
        camposUsuario[key] = camposActualizar[key] || null;
      }
    });

    // Validar sexo si se proporciona
    if (camposUsuario.sexo) {
      const sexosPermitidos = await obtenerValoresEnum('sexo_enum');
      if (!sexosPermitidos.includes(camposUsuario.sexo)) {
        throw new Error(`El valor para sexo no es válido. Valores permitidos: ${sexosPermitidos.join(', ')}`);
      }
    }

    // Validar correo si se proporciona
    if (camposUsuario.correo) {
      const validarCorreo = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
      if (!validarCorreo(camposUsuario.correo)) {
        throw new Error('El correo electrónico no es válido');
      }
    }

    // Validar teléfono si se proporciona
    if (camposUsuario.telefono) {
      const validarTelefono = (telefono) => /^\+?\d{8,15}$/.test(telefono);
      if (!validarTelefono(camposUsuario.telefono)) {
        throw new Error('El número de teléfono no es válido');
      }
    }

    // Actualizar tabla usuario si hay campos
    let usuarioActualizado = null;
    if (Object.keys(camposUsuario).length > 0) {
      const setClause = Object.keys(camposUsuario).map((campo, index) => `${campo} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(camposUsuario)];
      const query = `
        UPDATE usuario 
        SET ${setClause}
        WHERE id_persona = $1
        RETURNING id_persona, nombre, apellido, correo, usuario, telefono, sexo, fecha_creacion, imagen_perfil, latitud, longitud
      `;
      const result = await pool.query(query, values);
      usuarioActualizado = result.rows[0] || null;
    }

    // Retornar datos completos
    const usuarioCompleto = await obtenerUsuarioPorId(id);
    return { 
      ...usuarioCompleto
    };
  } catch (error) {
    console.error('Error in actualizarUsuario:', error);
    throw error;
  }
};

// --- Controladores ---

const response = (success, message, data = null) => ({
  success,
  message,
  data,
});



const login = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json(response(false, 'Correo y contrasena son obligatorios'));
  }

  try {
    const usuario = await loginUsuario(correo, contrasena);
    console.log(usuario.nombre, "logueado")
    const token = jwt.sign(
      { id_persona: usuario.id_persona, role: usuario.role }, 
      JWT_SECRET, 
      { expiresIn: '5h' }
    );
    console.log(`✅ [${req.method}] ejecutada con éxito.`, "url solicitada:", req.originalUrl);
    res.status(200).json(response(true, 'Login exitoso', { token, usuario }));
  } catch (error) {
    console.error('Error en login:', error.message);
    
    if (error.message.includes('Correo no encontrado') || error.message.includes('contrasena incorrecta')) {
      return res.status(401).json(response(false, 'Credenciales inválidas'));
    }
    res.status(500).json(response(false, 'Error interno del servidor'));
  }
};


/**
 * Controlador para POST - Crear usuario (con Multer para form-data)
 */
const crearUsuarioController = async (req, res) => {


  try {

    const datos = { ...req.body };

    // Validaciones básicas
    const camposObligatorios = ['usuario', 'correo', 'contrasena'];
    const faltantes = camposObligatorios.filter(campo => !datos[campo] || datos[campo].toString().trim() === '');

    if (faltantes.length > 0) {
      // Limpiar archivo subido si faltan campos obligatorios
      if (processedFiles.imagen_perfil) {
        await unlinkFile(processedFiles.imagen_perfil);
      }
      return res.status(400).json(
        respuesta(false, `Faltan campos obligatorios: ${faltantes.join(', ')}`)
      );
    }


    const nuevoUsuario = await crearUsuario(datos);

    let mensaje = 'Usuario casual creado correctamente';

    res.status(201).json(respuesta(true, mensaje, { usuario: nuevoUsuario }));
  } catch (error) {
    console.error('Error in crearUsuarioController:', error);

    if (error.code === '23505') {
      return res.status(400).json(respuesta(false, 'El correo o usuario ya existe'));
    }
    res.status(500).json(respuesta(false, error.message));
  }
};

const actualizarUsuarioController = async (req, res) => {
  let uploadedFile = null;
  let oldFileToDelete = null;
  const nombreFolder = "usuario";

  try {
    const { id } = req.params;
    const usuarioActual = await obtenerUsuarioPorId(parseInt(id));

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de usuario no válido'));
    }

    // Procesar archivo subido con Multer (imagen_perfil, opcional)
    const processedFiles = await createUploadAndProcess(["imagen_perfil"], nombreFolder, usuarioActual.nombre)(req, res);

    // Preparar campos para actualizar
    const camposActualizar = { ...req.body };

    // Si se subió nueva imagen, agregarla a los campos a actualizar
    if (processedFiles.imagen_perfil) {
      camposActualizar.imagen_perfil = processedFiles.imagen_perfil;
      uploadedFile = camposActualizar.imagen_perfil;
      if (usuarioActual && usuarioActual.imagen_perfil) {
        oldFileToDelete = usuarioActual.imagen_perfil;
      }
    }

    if (Object.keys(camposActualizar).length === 0 && !processedFiles.imagen_perfil) {
      // Limpiar archivo nuevo si no hay campos para actualizar
      if (uploadedFile) {
        await unlinkFile(uploadedFile);
      }
      return res.status(400).json(respuesta(false, 'No se proporcionaron campos para actualizar'));
    }

    const usuarioActualizado = await actualizarUsuario(parseInt(id), camposActualizar);

    if (!usuarioActualizado) {
      // Limpiar archivo nuevo si el usuario no existe
      if (uploadedFile) {
        await unlinkFile(uploadedFile);
      }
      return res.status(404).json(respuesta(false, 'Usuario no encontrado'));
    }

    // Eliminar archivo anterior después de una actualización exitosa
    if (oldFileToDelete) {
      await unlinkFile(oldFileToDelete).catch(err => {
        console.warn('⚠️ No se pudo eliminar el archivo anterior:', err.message);
      });
    }

    let mensaje = 'Usuario actualizado correctamente';
    if (usuarioActualizado.rol_agregado) {
      mensaje += `. Rol agregado: ${camposActualizar.rol_agregar}`;
    }
    if (usuarioActualizado.rol_eliminado) {
      mensaje += `. Rol eliminado: ${camposActualizar.rol_eliminar}`;
    }
    if (processedFiles.imagen_perfil) {
      mensaje += '. Imagen de perfil actualizada';
    }

    res.json(respuesta(true, mensaje, { usuario: usuarioActualizado }));
  } catch (error) {
    console.error('Error in actualizarUsuarioController:', error);

    // Limpiar archivo subido en caso de error
    if (uploadedFile) {
      await unlinkFile(uploadedFile);
    }

    res.status(500).json(respuesta(false, error.message));
  }
};

// --- Rutas ---
const router = express.Router();

router.post('/sign-in', login);
router.post('/', crearUsuarioController);
router.patch('/:id', actualizarUsuarioController);

module.exports = router;