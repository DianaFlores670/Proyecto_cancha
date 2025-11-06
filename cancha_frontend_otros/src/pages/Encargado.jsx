import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Configuración de permisos por rol
const permissionsConfig = {
  ADMINISTRADOR: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

const Encargado = () => {
  const [encargados, setEncargados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentEncargado, setCurrentEncargado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    usuario: '',
    responsabilidad: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    hora_ingreso: '',
    hora_salida: '',
    estado: true,
    contrasena: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState('DEFAULT');

  // Obtener el rol del usuario desde localStorage
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (!userData) return;

  try {
    const u = JSON.parse(userData);

    // 1) Normaliza a array en MAYÚSCULAS
    const rolesArr = Array.isArray(u?.roles)
      ? u.roles.map(r => String(r).toUpperCase())
      : (u?.role ? [String(u.role).toUpperCase()] : []);

    // 2) Elige un rol que exista en permissionsConfig, con prioridad
    const keys = Object.keys(permissionsConfig);
    const PRIORIDAD = ['ADMINISTRADOR']; // ajusta tu prioridad
    const efectivo =
      PRIORIDAD.find(r => rolesArr.includes(r) && keys.includes(r)) ||
      rolesArr.find(r => keys.includes(r)) ||
      'DEFAULT';

    setRole(efectivo);
  } catch (err) {
    console.error('Error al parsear datos del usuario:', err);
    setRole('DEFAULT');
  }
}, []);

  // Obtener permisos según el rol (o DEFAULT si no hay rol o no está definido)
  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  const fetchEncargados = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/encargado/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/encargado/filtro', { params: fullParams });
      } else {
        response = await api.get('/encargado/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setEncargados(response.data.datos.encargados);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEncargados();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchEncargados({ q: searchTerm });
    } else {
      fetchEncargados();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchEncargados({ tipo });
    } else {
      fetchEncargados();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return; // Verificar permiso
    if (!window.confirm('¿Estás seguro de eliminar este encargado?')) return;
    try {
      const response = await api.delete(`/encargado/${id}`);
      if (response.data.exito) {
        fetchEncargados();
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return; // Verificar permiso
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: '',
      apellido: '',
      correo: '',
      usuario: '',
      responsabilidad: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      hora_ingreso: '',
      hora_salida: '',
      estado: true,
      contrasena: ''
    });
    setCurrentEncargado(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return; // Verificar permiso
    try {
      const response = await api.get(`/encargado/dato-individual/${id}`);
      if (response.data.exito) {
        const encargado = response.data.datos.encargado;
        setFormData({
          nombre: encargado.nombre || '',
          apellido: encargado.apellido || '',
          correo: encargado.correo || '',
          usuario: encargado.usuario || '',
          responsabilidad: encargado.responsabilidad || '',
          fecha_inicio: encargado.fecha_inicio ? new Date(encargado.fecha_inicio).toISOString().split('T')[0] : '',
          hora_ingreso: encargado.hora_ingreso || '',
          hora_salida: encargado.hora_salida || '',
          estado: encargado.estado !== undefined ? encargado.estado : true,
          contrasena: ''
        });
        setCurrentEncargado(encargado);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return; // Verificar permiso
    try {
      const response = await api.get(`/encargado/dato-individual/${id}`);
      if (response.data.exito) {
        const encargado = response.data.datos.encargado;
        setFormData({
          nombre: encargado.nombre || '',
          apellido: encargado.apellido || '',
          correo: encargado.correo || '',
          usuario: encargado.usuario || '',
          responsabilidad: encargado.responsabilidad || '',
          fecha_inicio: encargado.fecha_inicio ? new Date(encargado.fecha_inicio).toISOString().split('T')[0] : '',
          hora_ingreso: encargado.hora_ingreso || '',
          hora_salida: encargado.hora_salida || '',
          estado: encargado.estado !== undefined ? encargado.estado : true,
          contrasena: ''
        });
        setCurrentEncargado(encargado);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEncargado(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;
    try {
      let response;
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['nombre', 'apellido', 'correo', 'usuario', 'contrasena'];
          if (editMode && ['usuario', 'contrasena'].includes(key)) return false;
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones frontend
      if (filteredData.responsabilidad && filteredData.responsabilidad.length > 255) {
        setError('La responsabilidad no debe exceder los 255 caracteres');
        return;
      }
      if (filteredData.fecha_inicio) {
        const fechaInicio = new Date(filteredData.fecha_inicio);
        if (isNaN(fechaInicio.getTime()) || fechaInicio > new Date()) {
          setError('La fecha de inicio no es válida o está en el futuro');
          return;
        }
      }
      const validarHora = (hora) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(hora);
      if (filteredData.hora_ingreso && !validarHora(filteredData.hora_ingreso)) {
        setError('La hora de ingreso no es válida (formato HH:MM:SS)');
        return;
      }
      if (filteredData.hora_salida && !validarHora(filteredData.hora_salida)) {
        setError('La hora de salida no es válida (formato HH:MM:SS)');
        return;
      }

      if (editMode) {
        response = await api.patch(`/encargado/${currentEncargado.id_encargado}`, filteredData);
      } else {
        response = await api.post('/encargado/', filteredData);
      }
      if (response.data.exito) {
        closeModal();
        fetchEncargados();
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  if (!role) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Encargados</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, apellido, correo o responsabilidad..."
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
            className="border rounded px-3 py-2 flex-1 sm:min-w-[200px]"
          >
            <option value="">📋 Todos - Sin filtro</option>
            <option value="nombre">👤 Ordenar por nombre</option>
            <option value="fecha">📅 Ordenar por fecha de inicio</option>
            <option value="correo">📧 Ordenar por correo</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>👨‍💼</span>
              <span>Crear Encargado</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando encargados...</p>
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
                  <th className="px-4 py-2 text-left">Responsabilidad</th>
                  <th className="px-4 py-2 text-left">Fecha Inicio</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {encargados.map((encargado, index) => (
                  <tr key={encargado.id_encargado} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{encargado.nombre}</td>
                    <td className="px-4 py-2">{encargado.apellido}</td>
                    <td className="px-4 py-2">{encargado.correo}</td>
                    <td className="px-4 py-2">{encargado.responsabilidad || '-'}</td>
                    <td className="px-4 py-2">{encargado.fecha_inicio || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        encargado.estado
                          ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}> {encargado.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(encargado.id_encargado)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(encargado.id_encargado)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(encargado.id_encargado)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      )}
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
              {viewMode ? 'Ver Datos de Encargado' : editMode ? 'Editar Encargado' : 'Crear Encargado'}
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
                <label className="block text-sm font-medium mb-1">Responsabilidad</label>
                <input
                  name="responsabilidad"
                  value={formData.responsabilidad}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Inicio</label>
                <input
                  name="fecha_inicio"
                  value={formData.fecha_inicio}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="date"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora de Ingreso</label>
                <input
                  name="hora_ingreso"
                  value={formData.hora_ingreso}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora de Salida</label>
                <input
                  name="hora_salida"
                  value={formData.hora_salida}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-3">Estado</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, estado: !prev.estado }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.estado ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    disabled={viewMode}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.estado ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {formData.estado ? (
                      <span className="text-green-600 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Activo
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Inactivo
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {!editMode && !viewMode && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Contraseña</label>
                  <input
                    name="contrasena"
                    value={formData.contrasena}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    type="password"
                    disabled={viewMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Opcional: si no se proporciona, se asignará '123456' por defecto.
                  </p>
                </div>
              )}
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

export default Encargado;