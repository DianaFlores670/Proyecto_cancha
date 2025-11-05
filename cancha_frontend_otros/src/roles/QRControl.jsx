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
  CONTROL: {
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

const QRControl = () => {
  const [qrs, setQRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: '',
    fecha_generado: '',
    fecha_expira: '',
    estado: 'activo',
    verificado: false,
    id_control: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(null);
  const [idControl, setIdControl] = useState(null);

  // Obtener rol e id_control desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setRole(parsedUser.role);
        setIdControl(parsedUser.id_persona);
        setFormData(prev => ({ ...prev, id_control: parsedUser.id_persona }));
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

  // Generar URLs de imágenes
  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  // Fetch QR codes
  const fetchQRs = async (params = {}) => {
    if (!idControl) return;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset, id_control: idControl };
    try {
      let response;
      if (params.q) {
        response = await api.get('/qr-control/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/qr-control/filtro', { params: fullParams });
      } else {
        response = await api.get('/qr-control/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setQRs(response.data.datos.qrs);
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
    fetchQRs();
  }, [page, idControl]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchQRs({ q: searchTerm });
    } else {
      fetchQRs();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchQRs({ tipo });
    } else {
      fetchQRs();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('¿Estás seguro de eliminar este QR de reserva?')) return;
    try {
      const response = await api.delete(`/qr-control/${id}`, {
        params: { id_control: idControl }
      });
      if (response.data.exito) {
        fetchQRs();
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
      id_reserva: '',
      fecha_generado: new Date().toISOString().slice(0, 16),
      fecha_expira: '',
      estado: 'activo',
      verificado: false,
      id_control: idControl || '',
    });
    setCurrentQR(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/qr-control/dato-individual/${id}`, {
        params: { id_control: idControl }
      });
      if (response.data.exito) {
        const qr = response.data.datos.qr;
        setFormData({
          id_reserva: qr.id_reserva.toString(),
          fecha_generado: new Date(qr.fecha_generado).toISOString().slice(0, 16),
          fecha_expira: qr.fecha_expira ? new Date(qr.fecha_expira).toISOString().slice(0, 16) : '',
          estado: qr.estado,
          verificado: qr.verificado,
          id_control: qr.id_control.toString(),
        });
        setCurrentQR(qr);
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
      const response = await api.get(`/qr-control/dato-individual/${id}`, {
        params: { id_control: idControl }
      });
      if (response.data.exito) {
        const qr = response.data.datos.qr;
        setFormData({
          id_reserva: qr.id_reserva.toString(),
          fecha_generado: new Date(qr.fecha_generado).toISOString().slice(0, 16),
          fecha_expira: qr.fecha_expira ? new Date(qr.fecha_expira).toISOString().slice(0, 16) : '',
          estado: qr.estado,
          verificado: qr.verificado,
          id_control: qr.id_control.toString(),
        });
        setCurrentQR(qr);
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
    setCurrentQR(null);
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
          const requiredFields = ['id_reserva', 'fecha_generado', 'estado', 'id_control'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones
      if (!filteredData.id_reserva || isNaN(filteredData.id_reserva)) {
        setError('El ID de la reserva es obligatorio y debe ser un número');
        return;
      }
      const isValidTimestamp = (ts) => !isNaN(Date.parse(ts));
      if (!filteredData.fecha_generado || !isValidTimestamp(filteredData.fecha_generado)) {
        setError('La fecha de generación no es válida');
        return;
      }
      if (filteredData.fecha_expira && !isValidTimestamp(filteredData.fecha_expira)) {
        setError('La fecha de expiración no es válida');
        return;
      }
      if (filteredData.fecha_expira && new Date(filteredData.fecha_expira) <= new Date(filteredData.fecha_generado)) {
        setError('La fecha de expiración debe ser posterior a la fecha de generación');
        return;
      }
      const estadosValidos = ['activo', 'expirado', 'usado'];
      if (!estadosValidos.includes(filteredData.estado)) {
        setError(`El estado debe ser uno de: ${estadosValidos.join(', ')}`);
        return;
      }
      if (typeof filteredData.verificado !== 'boolean') {
        setError('El campo verificado debe ser un valor booleano');
        return;
      }

      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar QR ID:', currentQR.id_qr);
        response = await api.patch(`/qr-control/${currentQR.id_qr}`, {
          ...filteredData,
          regenerar_qr: true, // Indicar regeneración de QR si id_reserva cambia
        });
      } else {
        console.log('📤 Enviando POST para crear QR...');
        response = await api.post('/qr-control/', filteredData);
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchQRs();
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

  if (!role || !idControl) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de QR de Reservas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por cliente, cancha o código QR..."
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
            <option value="verificado_si">✅ Verificados</option>
            <option value="verificado_no">❌ No Verificados</option>
            <option value="cliente_nombre">👤 Ordenar por Cliente</option>
            <option value="fecha_generado">📅 Ordenar por Fecha Generado</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>📱</span>
              <span>Crear QR</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando QR de reservas...</p>
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
                  <th className="px-4 py-2 text-left">Fecha Generado</th>
                  <th className="px-4 py-2 text-left">Fecha Expira</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {qrs.map((qr, index) => (
                  <tr key={qr.id_qr} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${qr.cliente_nombre} ${qr.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{qr.cancha_nombre}</td>
                    <td className="px-4 py-2">{new Date(qr.fecha_generado).toLocaleString()}</td>
                    <td className="px-4 py-2">{qr.fecha_expira ? new Date(qr.fecha_expira).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">{qr.estado}</td>
                    <td className="px-4 py-2">{qr.verificado ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(qr.id_qr)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(qr.id_qr)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(qr.id_qr)}
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
              {viewMode ? 'Ver Datos de QR de Reserva' : editMode ? 'Editar QR de Reserva' : 'Crear QR de Reserva'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID Reserva</label>
                <input
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  required
                  disabled={viewMode || editMode} // No editable en modo edición
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Generado</label>
                <input
                  name="fecha_generado"
                  value={formData.fecha_generado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="datetime-local"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Expira</label>
                <input
                  name="fecha_expira"
                  value={formData.fecha_expira}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="datetime-local"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                >
                  <option value="activo">Activo</option>
                  <option value="expirado">Expirado</option>
                  <option value="usado">Usado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Verificado</label>
                <input
                  name="verificado"
                  type="checkbox"
                  checked={formData.verificado}
                  onChange={handleInputChange}
                  className="w-5 h-5"
                  disabled={viewMode}
                />
              </div>
              {currentQR && currentQR.qr_url_imagen && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Imagen QR</label>
                  <img
                    src={getImageUrl(currentQR.qr_url_imagen)}
                    alt="Código QR"
                    className="w-32 h-32 object-contain rounded mb-2"
                    onError={(e) => console.error('Error loading QR image:', e.target.src)}
                  />
                </div>
              )}
              {currentQR && currentQR.codigo_qr && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Código QR</label>
                  <input
                    value={currentQR.codigo_qr}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    disabled
                  />
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

export default QRControl;