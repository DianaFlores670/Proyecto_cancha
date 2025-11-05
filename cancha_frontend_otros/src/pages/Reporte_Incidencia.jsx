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
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  ENCARGADO: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

const ReporteIncidencia = () => {
  const [reportes, setReportes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [encargados, setEncargados] = useState([]);
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
    id_encargado: '',
    id_reserva: '',
    verificado: false
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(null);

  // Obtener el rol del usuario desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setRole(parsedUser.role);
      } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
      }
    }
  }, []);

  // Obtener permisos según el rol (o DEFAULT si no hay rol o no está definido)
  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  // Fetch reservas y encargados válidos al cargar el componente
  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const response = await api.get('/reserva/datos-especificos');
        if (response.data.exito) {
          setReservas(response.data.datos.reservas || []);
        }
      } catch (err) {
        console.error('Error al obtener reservas:', err);
      }
    };

    const fetchEncargados = async () => {
      try {
        const response = await api.get('/encargado/datos-especificos');
        if (response.data.exito) {
          setEncargados(response.data.datos.encargados || []);
        }
      } catch (err) {
        console.error('Error al obtener encargados:', err);
      }
    };

    fetchReservas();
    fetchEncargados();
  }, []);

  const fetchReportes = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/reporte_incidencia/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/reporte_incidencia/filtro', { params: fullParams });
      } else {
        response = await api.get('/reporte_incidencia/datos-especificos', { params: fullParams });
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
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
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
    setSearchTerm('');
    if (tipo) {
      fetchReportes({ tipo });
    } else {
      fetchReportes();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return; // Verificar permiso
    if (!window.confirm('¿Estás seguro de eliminar este reporte de incidencia?')) return;
    try {
      const response = await api.delete(`/reporte_incidencia/${id}`);
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
    if (!permissions.canCreate) return; // Verificar permiso
    setEditMode(false);
    setViewMode(false);
    setFormData({
      detalle: '',
      sugerencia: '',
      id_encargado: '',
      id_reserva: '',
      verificado: false
    });
    setCurrentReporte(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return; // Verificar permiso
    try {
      const response = await api.get(`/reporte_incidencia/dato-individual/${id}`);
      if (response.data.exito) {
        const reporte = response.data.datos.reporte;
        setFormData({
          detalle: reporte.detalle || '',
          sugerencia: reporte.sugerencia || '',
          id_encargado: reporte.id_encargado || '',
          id_reserva: reporte.id_reserva || '',
          verificado: reporte.verificado || false
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
    if (!permissions.canView) return; // Verificar permiso
    try {
      const response = await api.get(`/reporte_incidencia/dato-individual/${id}`);
      if (response.data.exito) {
        const reporte = response.data.datos.reporte;
        setFormData({
          detalle: reporte.detalle || '',
          sugerencia: reporte.sugerencia || '',
          id_encargado: reporte.id_encargado || '',
          id_reserva: reporte.id_reserva || '',
          verificado: reporte.verificado || false
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return; // Verificar permisos
    try {
      let response;
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['id_encargado', 'id_reserva'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones frontend
      if (!filteredData.id_encargado || !encargados.some(encargado => encargado.id_encargado === parseInt(filteredData.id_encargado))) {
        setError('El encargado seleccionado no es válido');
        return;
      }
      if (!filteredData.id_reserva || !reservas.some(reserva => reserva.id_reserva === parseInt(filteredData.id_reserva))) {
        setError('La reserva seleccionada no es válida');
        return;
      }

      if (editMode) {
        response = await api.patch(`/reporte_incidencia/${currentReporte.id_reporte}`, filteredData);
      } else {
        response = await api.post('/reporte_incidencia/', filteredData);
      }
      if (response.data.exito) {
        closeModal();
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
      <h2 className="text-xl font-semibold mb-4">Gestión de Reportes de Incidencia</h2>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por encargado, cliente, cancha o descripción..."
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
            <option value="fecha">📅 Ordenar por fecha</option>
            <option value="prioridad">⚠️ Ordenar por prioridad</option>
            <option value="estado">🔄 Ordenar por estado</option>
            <option value="verificado_si">✅ Solo verificados</option>
            <option value="verificado_no">❌ Solo no verificados</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>📝</span>
              <span>Crear Incidencia</span>
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
                  <th className="px-4 py-2 text-left">Encargado</th>
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
                    <td className="px-4 py-2">{`${reporte.encargado_nombre} ${reporte.encargado_apellido}`}</td>
                    <td className="px-4 py-2">{reporte.detalle ? reporte.detalle.substring(0, 50) + (reporte.detalle.length > 50 ? '...' : '') : '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        reporte.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}> {reporte.verificado ? '✔️ Sí' : '❌ No'}</span>
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
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode ? 'Ver Datos de Reporte de Incidencia' : editMode ? 'Editar Reporte de Incidencia' : 'Crear Reporte de Incidencia'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
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
                      #{reserva.id_reserva} - {reserva.cliente_nombre} {reserva.cliente_apellido} ({reserva.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Encargado</label>
                <select
                  name="id_encargado"
                  value={formData.id_encargado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un encargado</option>
                  {encargados.map(encargado => (
                    <option key={encargado.id_encargado} value={encargado.id_encargado}>
                      #{encargado.id_encargado} - {encargado.nombre} {encargado.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Detalle</label>
                <textarea
                  name="detalle"
                  value={formData.detalle}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="4"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Sugerencia</label>
                <textarea
                  name="sugerencia"
                  value={formData.sugerencia}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="4"
                  disabled={viewMode}
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Verificado</label>
                <div
                  className="relative inline-flex items-center cursor-pointer"
                  onClick={() => !viewMode && setFormData((prev) => ({ ...prev, verificado: !prev.verificado }))}
                >
                  <input
                    type="checkbox"
                    name="verificado"
                    checked={formData.verificado}
                    onChange={(e) => !viewMode && setFormData((prev) => ({ ...prev, verificado: e.target.checked }))}
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
                  {formData.verificado ? 'Verificado' : 'No verificado'}
                </span>
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

export default ReporteIncidencia;