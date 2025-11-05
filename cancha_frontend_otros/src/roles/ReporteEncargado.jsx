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
  ENCARGADO: {
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

const ReporteEncargado = () => {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentReporte, setCurrentReporte] = useState(null);
  const [formData, setFormData] = useState({
    detalle: '',
    sugerencia: '',
    id_reserva: '',
    verificado: false,
    id_encargado: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(null);
  const [idEncargado, setIdEncargado] = useState(null);

  // Obtener rol e id_encargado desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setRole(parsedUser.role);
        setIdEncargado(parsedUser.id_persona);
        setFormData(prev => ({ ...prev, id_encargado: parsedUser.id_persona }));
      } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
        setError('Error al cargar datos del usuario');
      }
    } else {
      setError('No se encontraron datos de usuario');
    }
  }, []);

  // Obtener permisos según el rol
  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  // Fetch reportes de incidencia
  const fetchReportes = async (params = {}) => {
    if (!idEncargado) return;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset, id_encargado: idEncargado };
    try {
      let response;
      if (params.q) {
        response = await api.get('/reporte-encargado/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/reporte-encargado/filtro', { params: fullParams });
      } else {
        response = await api.get('/reporte-encargado/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setReportes(response.data.datos.reportes);
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
    fetchReportes();
  }, [page, idEncargado]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchReportes({ q: searchTerm });
    } else {
      fetchReportes();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchReportes({ tipo });
    } else {
      fetchReportes();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('¿Estás seguro de eliminar este reporte de incidencia?')) return;
    try {
      const response = await api.delete(`/reporte-encargado/${id}`, {
        params: { id_encargado: idEncargado }
      });
      if (response.data.exito) {
        fetchReportes();
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
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      detalle: '',
      sugerencia: '',
      id_reserva: '',
      verificado: false,
      id_encargado: idEncargado || '',
    });
    setCurrentReporte(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/reporte-encargado/dato-individual/${id}`, {
        params: { id_encargado: idEncargado }
      });
      if (response.data.exito) {
        const reporte = response.data.datos.reporte;
        setFormData({
          detalle: reporte.detalle || '',
          sugerencia: reporte.sugerencia || '',
          id_reserva: reporte.id_reserva.toString(),
          verificado: reporte.verificado,
          id_encargado: reporte.id_encargado.toString(),
        });
        setCurrentReporte(reporte);
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
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/reporte-encargado/dato-individual/${id}`, {
        params: { id_encargado: idEncargado }
      });
      if (response.data.exito) {
        const reporte = response.data.datos.reporte;
        setFormData({
          detalle: reporte.detalle || '',
          sugerencia: reporte.sugerencia || '',
          id_reserva: reporte.id_reserva.toString(),
          verificado: reporte.verificado,
          id_encargado: reporte.id_encargado.toString(),
        });
        setCurrentReporte(reporte);
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
    setCurrentReporte(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;

    try {
      let response;
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['id_reserva', 'id_encargado'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones
      if (!filteredData.id_reserva || isNaN(filteredData.id_reserva)) {
        setError('El ID de la reserva es obligatorio y debe ser un número');
        return;
      }
      if (typeof filteredData.verificado !== 'boolean') {
        setError('El campo verificado debe ser un valor booleano');
        return;
      }

      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar reporte ID:', currentReporte.id_reporte);
        response = await api.patch(`/reporte-encargado/${currentReporte.id_reporte}`, filteredData);
      } else {
        console.log('📤 Enviando POST para crear reporte...');
        response = await api.post('/reporte-encargado/', filteredData);
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchReportes();
      } else {
        alert('Error: ' + response.data.mensaje);
      }
    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
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

  if (!role || !idEncargado) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Reportes de Incidencia</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por encargado, cliente, cancha, detalle o sugerencia..."
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
            <option value="verificado_si">✅ Verificados</option>
            <option value="verificado_no">❌ No Verificados</option>
            <option value="cliente_nombre">👤 Ordenar por Cliente</option>
            <option value="cancha_nombre">🎾 Ordenar por Cancha</option>
            <option value="encargado_nombre">👨‍💼 Ordenar por Encargado</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>⚠️</span>
              <span>Crear Reporte</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando reportes de incidencia...</p>
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
                  <th className="px-4 py-2 text-left">Detalle</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((reporte, index) => (
                  <tr key={reporte.id_reporte} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${reporte.cliente_nombre} ${reporte.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{reporte.cancha_nombre}</td>
                    <td className="px-4 py-2 max-w-xs truncate" title={reporte.detalle}>
                      {reporte.detalle || '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        reporte.verificado 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {reporte.verificado ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(reporte.id_reporte)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(reporte.id_reporte)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(reporte.id_reporte)}
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
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode ? 'Ver Datos de Reporte de Incidencia' : editMode ? 'Editar Reporte de Incidencia' : 'Crear Reporte de Incidencia'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ID Reserva</label>
                  <input
                    name="id_reserva"
                    value={formData.id_reserva}
                    onChange={handleInputChange}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    type="number"
                    required
                    disabled={viewMode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Verificado</label>
                  <input
                    name="verificado"
                    type="checkbox"
                    checked={formData.verificado}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1"
                    disabled={viewMode}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detalle</label>
                <textarea
                  name="detalle"
                  value={formData.detalle}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sugerencia</label>
                <textarea
                  name="sugerencia"
                  value={formData.sugerencia}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              {currentReporte && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cliente</label>
                    <input
                      value={`${currentReporte.cliente_nombre} ${currentReporte.cliente_apellido}`}
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cancha</label>
                    <input
                      value={currentReporte.cancha_nombre}
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Encargado</label>
                    <input
                      value={`${currentReporte.encargado_nombre} ${currentReporte.encargado_apellido}`}
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                      disabled
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end mt-4 space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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

export default ReporteEncargado;