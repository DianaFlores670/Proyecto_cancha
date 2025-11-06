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
  ADMIN_ESP_DEP: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  CONTROL: {
    canView: true,
    canCreate: false,
    canEdit: true,
    canDelete: false,
  },
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

const Resena = () => {
  const [resenas, setResenas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentResena, setCurrentResena] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: '',
    estrellas: '',
    comentario: '',
    fecha_creacion: new Date().toISOString().split('T')[0],
    estado: false,
    verificado: false
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

  // Fetch todas las reservas válidas al cargar el componente
  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const response = await api.get('/reserva/datos-especificos', { params: { limit: 1000 } });
        if (response.data.exito) {
          setReservas(response.data.datos.reservas || []);
        }
      } catch (err) {
        console.error('Error al obtener reservas:', err);
      }
    };
    fetchReservas();
  }, []);

  const fetchResenas = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/resena/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/resena/filtro', { params: fullParams });
      } else {
        response = await api.get('/resena/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setResenas(response.data.datos.resenas);
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
    fetchResenas();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
    if (searchTerm.trim()) {
      fetchResenas({ q: searchTerm });
    } else {
      fetchResenas();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm('');
    if (tipo) {
      fetchResenas({ tipo });
    } else {
      fetchResenas();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return; // Verificar permiso
    if (!window.confirm('¿Estás seguro de eliminar esta reseña?')) return;
    try {
      const response = await api.delete(`/resena/${id}`);
      if (response.data.exito) {
        fetchResenas();
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
      id_reserva: '',
      estrellas: '',
      comentario: '',
      fecha_creacion: new Date().toISOString().split('T')[0],
      estado: false,
      verificado: false
    });
    setCurrentResena(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return; // Verificar permiso
    try {
      const response = await api.get(`/resena/dato-individual/${id}`);
      if (response.data.exito) {
        const resena = response.data.datos.resena;
        setFormData({
          id_reserva: resena.id_reserva || '',
          estrellas: resena.estrellas || '',
          comentario: resena.comentario || '',
          fecha_creacion: resena.fecha_creacion ? new Date(resena.fecha_creacion).toISOString().split('T')[0] : '',
          estado: resena.estado !== undefined ? resena.estado : false,
          verificado: resena.verificado !== undefined ? resena.verificado : false
        });
        setCurrentResena(resena);
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
      const response = await api.get(`/resena/dato-individual/${id}`);
      if (response.data.exito) {
        const resena = response.data.datos.resena;
        setFormData({
          id_reserva: resena.id_reserva || '',
          estrellas: resena.estrellas || '',
          comentario: resena.comentario || '',
          fecha_creacion: resena.fecha_creacion ? new Date(resena.fecha_creacion).toISOString().split('T')[0] : '',
          estado: resena.estado !== undefined ? resena.estado : false,
          verificado: resena.verificado !== undefined ? resena.verificado : false
        });
        setCurrentResena(resena);
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
    setCurrentResena(null);
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
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return; // Verificar permisos
    try {
      let response;
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['id_reserva', 'estrellas'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones frontend
      if (filteredData.estrellas && (isNaN(filteredData.estrellas) || filteredData.estrellas < 1 || filteredData.estrellas > 5)) {
        setError('Las estrellas deben estar entre 1 y 5');
        return;
      }

      if (filteredData.id_reserva && !reservas.some(reserva => reserva.id_reserva === parseInt(filteredData.id_reserva))) {
        setError('La reserva seleccionada no es válida');
        return;
      }

      // Validar que verificado y estado sean booleanos si están presentes
      if (filteredData.verificado !== undefined && typeof filteredData.verificado !== 'boolean') {
        setError('El campo verificado debe ser un valor booleano');
        return;
      }
      if (filteredData.estado !== undefined && typeof filteredData.estado !== 'boolean') {
        setError('El campo estado debe ser un valor booleano');
        return;
      }

      if (editMode) {
        response = await api.patch(`/resena/${currentResena.id_resena}`, filteredData);
      } else {
        response = await api.post('/resena/', filteredData);
      }
      if (response.data.exito) {
        closeModal();
        fetchResenas();
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
      <h2 className="text-xl font-semibold mb-4">Gestión de Reseñas</h2>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por cliente, cancha o comentario..."
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
            <option value="cliente_nombre">👤 Ordenar por cliente</option>
            <option value="cancha_nombre">🏟️ Ordenar por cancha</option>
            <option value="verificado_si">✅ Solo verificadas</option>
            <option value="verificado_no">❌ Solo no verificadas</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>⭐</span>
              <span>Crear Reseña</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando reseñas...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Estrellas</th>
                  <th className="px-4 py-2 text-left">Comentario</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resenas.map((resena, index) => (
                  <tr key={resena.id_resena} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${resena.cliente_nombre} ${resena.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{resena.cancha_nombre}</td>
                    <td className="px-4 py-2">{resena.estrellas}</td>
                    <td className="px-4 py-2">{resena.comentario || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        resena.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}> {resena.verificado ? '✔️ Sí' : '❌ No'}</span>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(resena.id_resena)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(resena.id_resena)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(resena.id_resena)}
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
              {viewMode ? 'Ver Datos de Reseña' : editMode ? 'Editar Reseña' : 'Crear Reseña'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map(reserva => (
                    <option key={reserva.id_reserva} value={reserva.id_reserva}>
                      Reserva #{reserva.id_reserva} - {reserva.cliente_nombre} {reserva.cliente_apellido} ({reserva.cancha_nombre}) - {new Date(reserva.fecha_reserva).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estrellas</label>
                <input
                  name="estrellas"
                  value={formData.estrellas}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  min="1"
                  max="5"
                  required
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Comentario</label>
                <textarea
                  name="comentario"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              {editMode && (
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de Creación</label>
                  <input
                    name="fecha_creacion"
                    value={formData.fecha_creacion}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fecha automática asignada por el sistema
                  </p>
                </div>
              )}
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <div 
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={() => !viewMode && setFormData(prev => ({ ...prev, estado: !prev.estado }))}
                  >
                    <input
                      type="checkbox"
                      name="estado"
                      checked={formData.estado}
                      onChange={handleInputChange}
                      className="sr-only"
                      disabled={viewMode}
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                        formData.estado ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    ></div>
                    <div
                      className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${
                        formData.estado ? 'translate-x-5' : ''
                      }`}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm text-gray-600">
                    {formData.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Verificado</label>
                  <div 
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={() => !viewMode && setFormData(prev => ({ ...prev, verificado: !prev.verificado }))}
                  >
                    <input
                      type="checkbox"
                      name="verificado"
                      checked={formData.verificado}
                      onChange={handleInputChange}
                      className="sr-only"
                      disabled={viewMode}
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                        formData.verificado ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></div>
                    <div
                      className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${
                        formData.verificado ? 'translate-x-5' : ''
                      }`}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm text-gray-600">
                    {formData.verificado ? 'Sí' : 'No'}
                  </span>
                </div>
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

export default Resena;