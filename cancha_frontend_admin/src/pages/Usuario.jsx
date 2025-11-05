import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Usuario = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false); // Nuevo estado para modo visualización
  const [currentUser, setCurrentUser] = useState(null);
  const rolesDisponibles = [
    { valor: 'cliente', etiqueta: 'Cliente' },
    { valor: 'administrador', etiqueta: 'Administrador' },
    { valor: 'admin_esp_dep', etiqueta: 'Administrado Espacio Deportivo' },
    { valor: 'deportista', etiqueta: 'Deportista' },
    { valor: 'control', etiqueta: 'Control' },
    { valor: 'encargado', etiqueta: 'Encargado' }
  ];
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    usuario: '',
    telefono: '',
    sexo: '',
    imagen_perfil: '',
    latitud: '',
    longitud: '',
    contrasena: '',
    fecha_creacion: '',
    rol: '',
    datos_especificos: {}
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const sexosPermitidos = ['masculino', 'femenino'];

  const [selectedFile, setSelectedFile] = useState(null); // 🔥
  const [imagePreview, setImagePreview] = useState(null); // 🔥

  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  const fetchUsuarios = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/usuario/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/usuario/filtro', { params: fullParams });
      } else {
        response = await api.get('/usuario/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setUsuarios(response.data.datos.usuarios);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.error('Error in fetchUsuarios:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchUsuarios({ q: searchTerm });
    } else {
      fetchUsuarios();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchUsuarios({ tipo });
    } else {
      fetchUsuarios();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const response = await api.delete(`/usuario/${id}`);
      if (response.data.exito) {
        fetchUsuarios();
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      console.error('Error in handleDelete:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: '',
      apellido: '',
      correo: '',
      usuario: '',
      telefono: '',
      sexo: '',
      imagen_perfil: '',
      latitud: '',
      longitud: '',
      contrasena: '',
      rol: '',
      datos_especificos: {}
    });
    setSelectedFile(null); // 🔥
    setImagePreview(null); // 🔥
    setCurrentUser(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    try {
      const response = await api.get(`/usuario/dato-individual/${id}`);
      if (response.data.exito) {
        const user = response.data.datos.usuario;
        setFormData({
          nombre: user.nombre || '',
          apellido: user.apellido || '',
          correo: user.correo || '',
          usuario: user.usuario || '',
          telefono: user.telefono || '',
          sexo: user.sexo || '',
          imagen_perfil: user.imagen_perfil || '',
          latitud: user.latitud || '',
          longitud: user.longitud || '',
          contrasena: '',
          fecha_creacion: user.fecha_creacion ? new Date(user.fecha_creacion).toISOString().split('T')[0] : '',
          rol: user.rol || '',
          datos_especificos: user.datos_rol || {}
        });
        setImagePreview(user.imagen_perfil ? getImageUrl(user.imagen_perfil) : null); // 🔥
        setSelectedFile(null); // 🔥
        setCurrentUser(user);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      console.error('Error in openEditModal:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    }
  };

  const openViewModal = async (id) => {
    try {
      const response = await api.get(`/usuario/dato-individual/${id}`);
      if (response.data.exito) {
        const user = response.data.datos.usuario;
        setFormData({
          nombre: user.nombre || '',
          apellido: user.apellido || '',
          correo: user.correo || '',
          usuario: user.usuario || '',
          telefono: user.telefono || '',
          sexo: user.sexo || '',
          imagen_perfil: user.imagen_perfil || '',
          latitud: user.latitud || '',
          longitud: user.longitud || '',
          contrasena: '',
          fecha_creacion: user.fecha_creacion ? new Date(user.fecha_creacion).toISOString().split('T')[0] : '',
          rol: user.rol || '',
          datos_especificos: user.datos_rol || {}
        });
        setImagePreview(user.imagen_perfil ? getImageUrl(user.imagen_perfil) : null); // 🔥
        setSelectedFile(null); // 🔥
        setCurrentUser(user);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      console.error('Error in openViewModal:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentUser(null);
    setError(null);
    setViewMode(false);
    setSelectedFile(null); // 🔥
    setImagePreview(null); // 🔥
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDatosEspecificosChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      datos_especificos: { ...prev.datos_especificos, [name]: value }
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }; // 🔥


  const handleSubmit = async (e) => {
  e.preventDefault();
  if (viewMode) return;

  try {
    let response;
    
    // USAR FormData PARA ENVIAR ARCHIVOS
    const data = new FormData();
    
    // Campos básicos (solo enviar si tienen valor)
    const campos = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      correo: formData.correo,
      usuario: formData.usuario,
      telefono: formData.telefono || '',
      sexo: formData.sexo || '',
      latitud: formData.latitud || '',
      longitud: formData.longitud || '',
    };

    // Agregar campos que no estén vacíos
    Object.entries(campos).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        data.append(key, value);
      }
    });
    
    // Datos específicos como string JSON (solo si hay datos)
    if (formData.datos_especificos && Object.keys(formData.datos_especificos).length > 0) {
      data.append('datos_especificos', JSON.stringify(formData.datos_especificos));
    }
    
    // 🔥 ARCHIVO DE IMAGEN
    if (selectedFile) {
      data.append('imagen_perfil', selectedFile);
      console.log('📸 Archivo seleccionado:', selectedFile.name);
    }
    
    // Configuración de headers para multipart
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    if (!editMode) {
      // Para CREAR
      if (formData.contrasena) {
        data.append('contrasena', formData.contrasena);
      }
      if (formData.rol_agregar) {
        data.append('rol_agregar', formData.rol_agregar);
      }
      
      console.log('📤 Enviando POST para crear usuario...');
      response = await api.post('/usuario/', data, config);
    } else {
      // Para ACTUALIZAR
      if (formData.rol_agregar) {
        data.append('rol_agregar', formData.rol_agregar);
      }
      if (formData.rol_eliminar) {
        data.append('rol_eliminar', formData.rol_eliminar);
      }
      
      console.log('📤 Enviando PATCH para actualizar usuario ID:', currentUser.id_persona);
      console.log('📦 Datos enviados:');
      for (let [key, value] of data.entries()) {
        console.log(`   ${key}:`, key === 'imagen_perfil' ? `[File: ${value.name}]` : value);
      }
      
      response = await api.patch(`/usuario/${currentUser.id_persona}`, data, config);
    }

    if (response.data.exito) {
      console.log('✅ Operación exitosa:', response.data.mensaje);
      closeModal();
      fetchUsuarios();
    } else {
      alert('Error: ' + response.data.mensaje);
    }
  } catch (err) {
    console.error('❌ Error in handleSubmit:', err);
    console.error('❌ Detalles del error:', err.response?.data);
    const errorMessage = err.response?.data?.mensaje || err.message || 'Error de conexión al servidor';
    setError(errorMessage);
    alert(`Error: ${errorMessage}`);
  }
};


  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Usuarios</h2>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, apellido, correo, usuario o teléfono..."
              className="border rounded-l px-4 py-2 w-full"
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
            >
              🔎 Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
          >
            <option value="">📋 Todos - Sin filtro</option>
            <option value="nombre">👤 Ordenar por nombre</option>
            <option value="fecha">📅 Ordenar por fecha</option>
            <option value="correo">📧 Ordenar por correo</option>
          </select>

          <button
            onClick={openCreateModal}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
          >
            <span>➕</span>
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando usuarios...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Apellido</th>
                  <th className="px-4 py-2 text-left">Correo</th>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario, index) => (
                  <tr key={usuario.id_persona} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{usuario.nombre}</td>
                    <td className="px-4 py-2">{usuario.apellido}</td>
                    <td className="px-4 py-2">{usuario.correo}</td>
                    <td className="px-4 py-2">{usuario.usuario}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openViewModal(usuario.id_persona)}
                        className="text-green-500 hover:text-green-700 mr-2"
                      >
                        Ver Datos
                      </button>
                      <button
                        onClick={() => openEditModal(usuario.id_persona)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(usuario.id_persona)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center mt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-l hover:bg-gray-400 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100">
              Página {page} de {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-r hover:bg-gray-400 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode ? 'Ver Datos de Usuario' : editMode ? 'Editar Usuario' : 'Crear Usuario'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellido</label>
                <input
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correo</label>
                <input
                  name="correo"
                  value={formData.correo}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="email"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Usuario</label>
                <input
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required={!editMode && !viewMode}
                  disabled={editMode || viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sexo</label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                >
                  <option value="">Seleccione</option>
                  {sexosPermitidos.map(sexo => (
                    <option key={sexo} value={sexo}>{sexo.charAt(0).toUpperCase() + sexo.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen de Perfil</label>
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Perfil" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading image:', e.target.src, ' - Check path or server')} // Debug // 🔥
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen de perfil</p> // 🔥
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  /> // 🔥
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latitud</label>
                <input
                  name="latitud"
                  value={formData.latitud}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.000001"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitud</label>
                <input
                  name="longitud"
                  value={formData.longitud}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.000001"
                  disabled={viewMode}
                />
              </div>
              {!editMode && !viewMode && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Contraseña</label>
                  <input
                    name="contrasena"
                    value={formData.contrasena || ''}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    type="password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional: si no se proporciona, se asignará '123456' por defecto.</p>
                </div>
              )}

              {(editMode || viewMode) && (
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Creación</label>
                  <input
                    name="fecha_creacion"
                    value={formData.fecha_creacion}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    type="date"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Solo lectura</p>
                </div>
              )}

              <div className="col-span-2 border-t pt-4 mt-4">
                <h4 className="text-lg font-medium mb-3">
                  {editMode ? 'Gestión de Roles' : viewMode ? 'Roles Asignados' : 'Asignar Rol Inicial'}
                </h4>
                
                {editMode ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Roles Actuales</label>
                      <div className="flex flex-wrap gap-2">
                        {currentUser?.roles?.map((rolObj, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {rolesDisponibles.find(r => r.valor === rolObj.rol)?.etiqueta || rolObj.rol}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  rol_eliminar: rolObj.rol
                                }));
                              }}
                              className="ml-2 text-red-500 hover:text-red-700"
                              disabled={viewMode}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(!currentUser?.roles || currentUser.roles.length === 0) && (
                          <span className="text-gray-500">Sin roles asignados</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Agregar Nuevo Rol</label>
                        <select
                          name="rol_agregar"
                          value={formData.rol_agregar || ''}
                          onChange={handleInputChange}
                          className="w-full border rounded px-3 py-2 bg-gray-100"
                          disabled={viewMode}
                        >
                          <option value="">Seleccionar rol para agregar...</option>
                          {rolesDisponibles
                            .filter(rol => !currentUser?.roles?.some(r => r.rol === rol.valor))
                            .map(rol => (
                              <option key={rol.valor} value={rol.valor}>
                                {rol.etiqueta}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Eliminar Rol</label>
                        <select
                          name="rol_eliminar"
                          value={formData.rol_eliminar || ''}
                          onChange={handleInputChange}
                          className="w-full border rounded px-3 py-2 bg-gray-100"
                          disabled={viewMode}
                        >
                          <option value="">Seleccionar rol para eliminar...</option>
                          {currentUser?.roles?.map(rolObj => (
                            <option key={rolObj.rol} value={rolObj.rol}>
                              {rolesDisponibles.find(r => r.valor === rolObj.rol)?.etiqueta || rolObj.rol}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : viewMode ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Roles Actuales</label>
                    <div className="flex flex-wrap gap-2">
                      {currentUser?.roles?.map((rolObj, index) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {rolesDisponibles.find(r => r.valor === rolObj.rol)?.etiqueta || rolObj.rol}
                        </span>
                      ))}
                      {(!currentUser?.roles || currentUser.roles.length === 0) && (
                        <span className="text-gray-500">Sin roles asignados</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Asignar Rol Inicial</label>
                    <select
                      name="rol_agregar"
                      value={formData.rol_agregar || ''}
                      onChange={handleInputChange}
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                      disabled={viewMode}
                    >
                      <option value="">Seleccionar rol inicial (opcional)...</option>
                      {rolesDisponibles.map(rol => (
                        <option key={rol.valor} value={rol.valor}>
                          {rol.etiqueta}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Puedes agregar más roles después de crear el usuario
                    </p>
                  </div>
                )}
                
                {formData.rol_agregar && (
                  <div className="mt-4 p-4 bg-gray-50 rounded">
                    <h5 className="font-medium mb-3">Datos específicos para {rolesDisponibles.find(r => r.valor === formData.rol_agregar)?.etiqueta}</h5>
                    {/* Aquí van los campos específicos según el rol seleccionado */}
                  </div>
                )}
              </div>

              <div className="col-span-2 flex justify-end mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
                >
                  Cerrar
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {editMode ? 'Actualizar' : 'Crear'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuario;