const express = require('express');
const pool = require('../../config/database');
const bcrypt = require('bcrypt');

const path = require("path");
const fs = require("fs").promises;
const { unlinkFile, createUploadAndProcess } = require("../../middleware/multer");

const router = express.Router();

// Función de respuesta estandarizada
const respuesta = (exito, mensaje, datos = null) => ({
  exito,
  mensaje,
  datos,
});

// En tu archivo de modelo (usuario.js)
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

// MODELOS - Funciones puras para operaciones de base de datos

/**
 * Obtener 3 atributos importantes de cada usuario
 */
const obtenerDatosEspecificos = async (limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT id_persona, nombre, apellido, correo, usuario
      FROM usuario 
      ORDER BY id_persona 
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM usuario`;
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);
    return {
      usuarios: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error('Error in obtenerDatosEspecificos:', error);
    throw error;
  }
};

/**
 * Obtener usuarios con filtros de ordenamiento
 */
const obtenerUsuariosFiltrados = async (tipoFiltro, limite = 10, offset = 0) => {
  try {
    const ordenesPermitidas = {
      nombre: 'nombre ASC, apellido ASC',
      fecha: 'fecha_creacion DESC',
      correo: 'correo ASC',
      default: 'id_persona ASC'
    };

    const orden = ordenesPermitidas[tipoFiltro] || ordenesPermitidas.default;

    const queryDatos = `
      SELECT id_persona, nombre, apellido, correo, usuario
      FROM usuario 
      ORDER BY ${orden}
      LIMIT $1 OFFSET $2
    `;
    const queryTotal = `SELECT COUNT(*) FROM usuario`;

    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [limite, offset]),
      pool.query(queryTotal)
    ]);

    return {
      usuarios: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error('Error in obtenerUsuariosFiltrados:', error);
    throw new Error(`Error al obtener usuarios filtrados: ${error.message}`);
  }
};

/**
 * Buscar usuarios por texto en múltiples campos
 */
const buscarUsuarios = async (texto, limite = 10, offset = 0) => {
  try {
    const queryDatos = `
      SELECT id_persona, nombre, apellido, correo, usuario
      FROM usuario 
      WHERE 
        nombre ILIKE $1 OR 
        apellido ILIKE $1 OR 
        correo ILIKE $1 OR 
        usuario ILIKE $1 OR
        telefono ILIKE $1
      ORDER BY nombre, apellido
      LIMIT $2 OFFSET $3
    `;

    const queryTotal = `
      SELECT COUNT(*) 
      FROM usuario 
      WHERE 
        nombre ILIKE $1 OR 
        apellido ILIKE $1 OR 
        correo ILIKE $1 OR 
        usuario ILIKE $1 OR
        telefono ILIKE $1
    `;
    
    const sanitizeInput = (input) => input.replace(/[%_\\]/g, '\\$&');
    const terminoBusqueda = `%${sanitizeInput(texto)}%`;
    
    const [resultDatos, resultTotal] = await Promise.all([
      pool.query(queryDatos, [terminoBusqueda, limite, offset]),
      pool.query(queryTotal, [terminoBusqueda])
    ]);

    return {
      usuarios: resultDatos.rows,
      total: parseInt(resultTotal.rows[0].count)
    };
  } catch (error) {
    console.error('Error in buscarUsuarios:', error);
    throw error;
  }
};

/**
 * Obtener usuario por ID con TODOS sus roles
 */
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

/**
 * Obtener rol actual de un usuario
 */
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
    let { latitud, longitud } = datosUsuario;

    if (latitud !== undefined && longitud !== undefined) {
      const dentroDeLaPaz =
        latitud >= LAT_MIN && latitud <= LAT_MAX &&
        longitud >= LON_MIN && longitud <= LON_MAX;

      if (!dentroDeLaPaz) {
        throw new Error('Las coordenadas deben estar dentro del área de La Paz, Bolivia');
      }
    } else {
      // Coordenadas aleatorias dentro del rango
      const randomInRange = (min, max) => Math.random() * (max - min) + min;
      latitud = parseFloat(randomInRange(LAT_MIN, LAT_MAX).toFixed(6));
      longitud = parseFloat(randomInRange(LON_MIN, LON_MAX).toFixed(6));
    }

    // --- Validaciones adicionales ---
    const validarCorreo = (correo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
    const validarTelefono = (telefono) => /^\+?\d{8,15}$/.test(telefono);

    if (!validarCorreo(datosUsuario.correo)) {
      throw new Error('El correo electrónico no es válido');
    }

    if (datosUsuario.telefono && !validarTelefono(datosUsuario.telefono)) {
      throw new Error('El número de teléfono no es válido');
    }

    if (datosUsuario.sexo) {
      const sexosPermitidos = await obtenerValoresEnum('sexo_enum');
      if (!sexosPermitidos.includes(datosUsuario.sexo)) {
        throw new Error(`El valor para sexo no es válido. Valores permitidos: ${sexosPermitidos.join(', ')}`);
      }
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
        nombre, apellido, contrasena, telefono, correo, 
        sexo, imagen_perfil, usuario, latitud, longitud
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id_persona
    `;
    const valuesUsuario = [
      datosUsuario.nombre || null,
      datosUsuario.apellido || null,
      contrasenaHash,
      datosUsuario.telefono || null,
      datosUsuario.correo,
      datosUsuario.sexo || null,
      datosUsuario.imagen_perfil || null,
      datosUsuario.usuario,
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

/**
 * Actualizar usuario parcialmente - SOPORTE MULTI-ROL
 */
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

    // Validar coordenadas si se proporcionan
    if (camposUsuario.latitud !== undefined && camposUsuario.longitud !== undefined) {
      const LAT_MIN = -16.65;
      const LAT_MAX = -16.45;
      const LON_MIN = -68.25;
      const LON_MAX = -68.05;
      const dentroDeLaPaz =
        camposUsuario.latitud >= LAT_MIN && camposUsuario.latitud <= LAT_MAX &&
        camposUsuario.longitud >= LON_MIN && camposUsuario.longitud <= LON_MAX;
      if (!dentroDeLaPaz) {
        throw new Error('Las coordenadas deben estar dentro del área de La Paz, Bolivia');
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

    // Manejar roles - NUEVA LÓGICA
    let rolAgregado = null;
    let rolEliminado = null;

    // Agregar rol si se proporciona
    if (rolAAgregar) {
      const rolesDisponibles = obtenerRolesDisponibles().map(r => r.valor);
      if (!rolesDisponibles.includes(rolAAgregar)) {
        throw new Error(`El rol ${rolAAgregar} no es válido`);
      }
      rolAgregado = await agregarRolUsuario(id, rolAAgregar, datosEspecificos);
    }

    // Eliminar rol si se proporciona
    if (rolAEliminar) {
      rolEliminado = await removerRolUsuario(id, rolAEliminar);
    }

    // Retornar datos completos
    const usuarioCompleto = await obtenerUsuarioPorId(id);
    return { 
      ...usuarioCompleto, 
      rol_agregado: rolAgregado,
      rol_eliminado: rolEliminado
    };
  } catch (error) {
    console.error('Error in actualizarUsuario:', error);
    throw error;
  }
};

/**
 * Eliminar usuario
 */
const eliminarUsuario = async (id) => {
  try {
    const query = 'DELETE FROM usuario WHERE id_persona = $1 RETURNING id_persona';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in eliminarUsuario:', error);
    throw error;
  }
};

/**
 * Agregar rol a usuario (sin eliminar roles existentes)
 */
const agregarRolUsuario = async (idUsuario, rol, datosEspecificos = {}) => {
  try {
    // Verificar si ya tiene el rol
    const rolesExistentes = await obtenerRolesUsuario(idUsuario);
    const yaTieneRol = rolesExistentes.some(r => r.rol === rol);
    
    if (yaTieneRol) {
      throw new Error(`El usuario ya tiene el rol: ${rol}`);
    }

    // Asignar nuevo rol
    return await asignarRolUsuario(idUsuario, rol, datosEspecificos);
  } catch (error) {
    console.error('Error in agregarRolUsuario:', error);
    throw error;
  }
};

/**
 * Remover rol específico de un usuario
 */
const removerRolUsuario = async (idUsuario, rol) => {
  try {
    const tablasMap = {
      'cliente': 'cliente',
      'administrador': 'administrador', 
      'admin_esp_dep': 'admin_esp_dep',
      'deportista': 'deportista',
      'control': 'control',
      'encargado': 'encargado'
    };

    const tabla = tablasMap[rol];
    if (!tabla) {
      throw new Error(`Rol no válido: ${rol}`);
    }

    const query = `DELETE FROM ${tabla} WHERE id_${tabla} = $1 RETURNING *`;
    const result = await pool.query(query, [idUsuario]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error in removerRolUsuario:', error);
    throw error;
  }
};

/**
 * Asignar/Remover rol a usuario
 */
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
 * Remover todos los roles de un usuario
 */
const removerRolesUsuario = async (idUsuario) => {
  try {
    const tablasRoles = [
      'cliente', 'administrador', 'admin_esp_dep', 
      'deportista', 'control', 'encargado'
    ];

    for (const tabla of tablasRoles) {
      await pool.query(`DELETE FROM ${tabla} WHERE id_${tabla} = $1`, [idUsuario]);
    }
  } catch (error) {
    console.error('Error in removerRolesUsuario:', error);
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

// CONTROLADORES - Manejan las request y response

/**
 * Controlador para GET /datos-especificos
 */
const obtenerDatosEspecificosController = async (req, res) => {
  try {
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const { usuarios, total } = await obtenerDatosEspecificos(limite, offset);
    
    res.json(respuesta(true, 'Datos específicos obtenidos correctamente', {
      usuarios,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error in obtenerDatosEspecificosController:', error);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /filtro
 */
const obtenerUsuariosFiltradosController = async (req, res) => {
  try {
    const { tipo } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const tiposValidos = ['nombre', 'fecha', 'correo'];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json(respuesta(false, 'El parámetro "tipo" es inválido o no proporcionado'));
    }

    const { usuarios, total } = await obtenerUsuariosFiltrados(tipo, limite, offset);

    res.json(respuesta(true, `Usuarios filtrados por ${tipo} obtenidos correctamente`, {
      usuarios,
      filtro: tipo,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error in obtenerUsuariosFiltradosController:', error);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /buscar
 */
const buscarUsuariosController = async (req, res) => {
  try {
    const { q } = req.query;
    const limite = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    if (!q) {
      return res.status(400).json(respuesta(false, 'El parámetro de búsqueda "q" es requerido'));
    }

    const { usuarios, total } = await buscarUsuarios(q, limite, offset);
    
    res.json(respuesta(true, 'Usuarios obtenidos correctamente', {
      usuarios,
      paginacion: { limite, offset, total }
    }));
  } catch (error) {
    console.error('Error in buscarUsuariosController:', error);
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para GET /dato-individual/:id
 */
const obtenerUsuarioPorIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de usuario no válido'));
    }

    const usuario = await obtenerUsuarioPorId(parseInt(id));

    if (!usuario) {
      return res.status(404).json(respuesta(false, 'Usuario no encontrado'));
    }

    res.json(respuesta(true, 'Usuario obtenido correctamente', { usuario }));
  } catch (error) {
    console.error('Error in obtenerUsuarioPorIdController:', error);
    res.status(500).json(respuesta(false, error.message));
  }
};



/**
 * Controlador para POST - Crear usuario (con Multer para form-data)
 */
const crearUsuarioController = async (req, res) => {
  let uploadedFile = null;
  const nombreFolder = "usuario";

  try {
    // Procesar archivo subido con Multer (imagen_perfil, opcional)
    const processedFiles = await createUploadAndProcess(["imagen_perfil"], nombreFolder, nombreFolder)(req, res);

    const datos = { ...req.body };

    // Validaciones básicas
    const camposObligatorios = ['correo', 'usuario', 'contrasena'];
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

    // Agregar ruta de archivo subido al objeto datos, si existe
    if (processedFiles.imagen_perfil) {
      datos.imagen_perfil = processedFiles.imagen_perfil;
      uploadedFile = datos.imagen_perfil;
    }

    const nuevoUsuario = await crearUsuario(datos);

    let mensaje = 'Usuario creado correctamente';
    if (processedFiles.imagen_perfil) {
      mensaje += '. Imagen de perfil subida';
    }

    res.status(201).json(respuesta(true, mensaje, { usuario: nuevoUsuario }));
  } catch (error) {
    console.error('Error in crearUsuarioController:', error);

    // Limpiar archivo subido en caso de error
    if (uploadedFile) {
      await unlinkFile(uploadedFile);
    }

    if (error.code === '23505') {
      return res.status(400).json(respuesta(false, 'El correo o usuario ya existe'));
    }
    res.status(500).json(respuesta(false, error.message));
  }
};

/**
 * Controlador para PATCH - Actualizar usuario (MULTI-ROL con Multer para form-data)
 */
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




/**
 * Controlador para DELETE - Eliminar usuario
 */
const eliminarUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(respuesta(false, 'ID de usuario no válido'));
    }

    const usuarioEliminado = await eliminarUsuario(parseInt(id));

    if (!usuarioEliminado) {
      return res.status(404).json(respuesta(false, 'Usuario no encontrado'));
    }

    res.json(respuesta(true, 'Usuario eliminado correctamente'));
  } catch (error) {
    console.error('Error in eliminarUsuarioController:', error);
    res.status(500).json(respuesta(false, error.message));
  }
};

// RUTAS
router.get('/datos-especificos', obtenerDatosEspecificosController);
router.get('/filtro', obtenerUsuariosFiltradosController);
router.get('/buscar', buscarUsuariosController);
router.get('/dato-individual/:id', obtenerUsuarioPorIdController);
router.post('/', crearUsuarioController);
router.patch('/:id', actualizarUsuarioController);
router.delete('/:id', eliminarUsuarioController);

module.exports = router;