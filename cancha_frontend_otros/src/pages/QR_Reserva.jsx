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
  CONTROL: {
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

const QRReserva = () => {
  const [qrs, setQRs] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: '',
    fecha_generado: new Date().toISOString().slice(0, 16),
    fecha_expira: '',
    qr_url_imagen: '',
    codigo_qr: '',
    estado: 'activo',
    id_control: '',
    verificado: false,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [previewQR, setPreviewQR] = useState(null);
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

  // Function to generate image URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  // Fetch reservas y controles válidos al cargar el componente
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

    const fetchControles = async () => {
      try {
        const response = await api.get('/control/datos-especificos');
        if (response.data.exito) {
          setControles(response.data.datos.controles || []);
        }
      } catch (err) {
        console.error('Error al obtener controles:', err);
      }
    };

    fetchReservas();
    fetchControles();
  }, []);

  const openDetailModal = (qr) => {
    if (!permissions.canView) return; // Verificar permiso
    setSelectedQR(qr);
    setPreviewQR(qr.qr_url_imagen ? getImageUrl(qr.qr_url_imagen) : null);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedQR(null);
    setPreviewQR(null);
  };

  const fetchQRs = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/qr_reserva/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/qr_reserva/filtro', { params: fullParams });
      } else {
        response = await api.get('/qr_reserva/datos-especificos', { params: fullParams });
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
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
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
    setSearchTerm('');
    if (tipo) {
      fetchQRs({ tipo });
    } else {
      fetchQRs();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return; // Verificar permiso
    if (!window.confirm('¿Estás seguro de eliminar este QR de reserva?')) return;
    try {
      const response = await api.delete(`/qr_reserva/${id}`);
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
    if (!permissions.canCreate) return; // Verificar permiso
    setEditMode(false);
    setFormData({
      id_reserva: '',
      fecha_generado: new Date().toISOString().slice(0, 16),
      fecha_expira: '',
      qr_url_imagen: '',
      codigo_qr: '',
      estado: 'activo',
      id_control: '',
      verificado: false,
    });
    setPreviewQR(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return; // Verificar permiso
    try {
      const response = await api.get(`/qr_reserva/dato-individual/${id}`);
      if (response.data.exito) {
        const qr = response.data.datos.qr;
        setFormData({
          id_reserva: qr.id_reserva || '',
          fecha_generado: qr.fecha_generado ? new Date(qr.fecha_generado).toISOString().slice(0, 16) : '',
          fecha_expira: qr.fecha_expira ? new Date(qr.fecha_expira).toISOString().slice(0, 16) : '',
          qr_url_imagen: qr.qr_url_imagen || '',
          codigo_qr: qr.codigo_qr || '',
          estado: qr.estado || 'activo',
          id_control: qr.id_control || '',
          verificado: qr.verificado || false,
        });
        setPreviewQR(qr.qr_url_imagen ? getImageUrl(qr.qr_url_imagen) : null);
        setCurrentQR(qr);
        setEditMode(true);
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
    setPreviewQR(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!permissions.canCreate && !editMode || !permissions.canEdit && editMode) return; // Verificar permiso
    try {
      let response;

      // Filtrar datos a enviar
      const filteredData = {};
      Object.keys(formData).forEach((key) => {
        const value = formData[key];

        // Excluir qr_url_imagen en modo creación
        if (!editMode && key === 'qr_url_imagen') return;

        // Incluir campos obligatorios
        if (key === 'id_reserva' || key === 'fecha_generado') {
          filteredData[key] = value;
          return;
        }

        // Incluir campo verificado
        if (key === 'verificado') {
          filteredData[key] = value;
          return;
        }

        // Incluir otros campos si tienen valor
        if (value !== '' && value !== null && value !== undefined) {
          filteredData[key] = value;
        }
      });

      // Validaciones frontend
      if (!filteredData.id_reserva) {
        setError('La reserva es obligatoria');
        return;
      }

      if (!filteredData.fecha_generado) {
        setError('La fecha de generación es obligatoria');
        return;
      }

      const fechaGenerado = new Date(filteredData.fecha_generado);
      if (isNaN(fechaGenerado.getTime())) {
        setError('La fecha de generación no es válida');
        return;
      }

      if (filteredData.fecha_expira) {
        const fechaExpira = new Date(filteredData.fecha_expira);
        if (isNaN(fechaExpira.getTime())) {
          setError('La fecha de expiración no es válida');
          return;
        }
        if (fechaExpira <= fechaGenerado) {
          setError('La fecha de expiración debe ser posterior a la fecha de generación');
          return;
        }
      }

      // Convertir datos a los tipos correctos
      const datosParaEnviar = {
        ...filteredData,
        id_reserva: parseInt(filteredData.id_reserva),
        id_control: filteredData.id_control ? parseInt(filteredData.id_control) : null,
        verificado: Boolean(filteredData.verificado),
      };

      if (editMode) {
        response = await api.patch(`/qr_reserva/${currentQR.id_qr}`, datosParaEnviar);
      } else {
        response = await api.post('/qr_reserva/', datosParaEnviar);
      }

      if (response.data.exito) {
        // Actualizar la vista previa con la imagen devuelta por el servidor
        if (response.data.datos?.qr?.qr_url_imagen) {
          setPreviewQR(getImageUrl(response.data.datos.qr.qr_url_imagen));
        }
        closeModal();
        fetchQRs();
      } else {
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
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
      <h2 className="text-xl font-semibold mb-4">Gestión de QR de Reservas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha o código QR..."
              className="border rounded-l px-4 py-2 w-full"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
          >
            <option value="">Todos - Sin orden</option>
            <option value="cliente_nombre">👤 Cliente (A-Z)</option>
            <option value="fecha_generado">📅 Fecha (reciente)</option>
            <option value="verificado_si">✅ Solo verificados</option>
            <option value="verificado_no">❌ Solo no verificados</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear QR
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando QRs de reserva...</p>
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
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          qr.estado === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : qr.estado === 'expirado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {qr.estado === 'activo' ? '🟢 Activo' : qr.estado === 'expirado' ? '🔴 Expirado' : '🟡 Usado'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          qr.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {qr.verificado ? '✔️ Sí' : '❌ No'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
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
                          className="text-red-500 hover:text-red-700 mr-2"
                        >
                          Eliminar
                        </button>
                      )}
                      {permissions.canView && qr.qr_url_imagen && (
                        <button
                          onClick={() => openDetailModal(qr)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver QR
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
            <span className="px-4 py-2 bg-gray-100">Página {page} de {Math.ceil(total / limit)}</span>
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
              {editMode ? 'Editar QR de Reserva' : 'Crear QR de Reserva'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map((reserva) => (
                    <option key={reserva.id_reserva} value={reserva.id_reserva}>
                      #{reserva.id_reserva} - {reserva.cliente_nombre} {reserva.cliente_apellido} (
                      {reserva.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Generación</label>
                <input
                  name="fecha_generado"
                  value={formData.fecha_generado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  type="datetime-local"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Expiración</label>
                <input
                  name="fecha_expira"
                  value={formData.fecha_expira}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  type="datetime-local"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código QR</label>
                <input
                  name="codigo_qr"
                  value={formData.codigo_qr}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  type="text"
                  maxLength="255"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="activo">Activo</option>
                  <option value="expirado">Expirado</option>
                  <option value="usado">Usado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Control</label>
                <select
                  name="id_control"
                  value={formData.id_control}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Ninguno</option>
                  {controles.map((control) => (
                    <option key={control.id_control} value={control.id_control}>
                      #{control.id_control} - {control.nombre}
                    </option>
                  ))}
                </select>
              </div>
              {/* Campo de Imagen QR: Solo visible y no editable en modo edición */}
              {editMode && formData.qr_url_imagen && (
                <div>
                  <label className="block text-sm font-medium mb-1">Imagen QR</label>
                  <input
                    name="qr_url_imagen"
                    value={formData.qr_url_imagen}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    type="text"
                    disabled
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Verificado</label>
                <div
                  className="relative inline-flex items-center cursor-pointer"
                  onClick={() => setFormData((prev) => ({ ...prev, verificado: !prev.verificado }))}
                >
                  <input
                    type="checkbox"
                    name="verificado"
                    checked={formData.verificado}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, verificado: e.target.checked }))
                    }
                    className="sr-only"
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
              {/* Vista previa del QR */}
              {previewQR && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Vista previa del QR</label>
                  <img
                    src={previewQR}
                    alt="Vista previa del QR"
                    className="max-w-xs h-auto rounded"
                    onError={(e) => console.error('Error loading QR image:', e.target.src)}
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
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {editMode ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        </div>
      )}

      {detailModalOpen && selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Detalles Completos del QR</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">ID del QR:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">#{selectedQR.id_qr}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Reserva:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">#{selectedQR.id_reserva}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Cliente:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedQR.cliente_nombre} {selectedQR.cliente_apellido}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Cancha:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">{selectedQR.cancha_nombre}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Fecha de Generación:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {new Date(selectedQR.fecha_generado).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Fecha de Expiración:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedQR.fecha_expira
                      ? new Date(selectedQR.fecha_expira).toLocaleString()
                      : 'No expira'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Estado:</label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQR.estado === 'activo'
                          ? 'bg-green-100 text-green-800'
                          : selectedQR.estado === 'expirado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedQR.estado === 'activo'
                        ? '🟢 Activo'
                        : selectedQR.estado === 'expirado'
                        ? '🔴 Expirado'
                        : '🟡 Usado'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Verificado:</label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQR.verificado ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedQR.verificado ? '✅ Verificado' : '❌ No verificado'}
                    </span>
                  </div>
                </div>
              </div>
              {selectedQR.id_control && (
                <div>
                  <label className="font-medium text-gray-700">Control Asociado:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    #{selectedQR.id_control} - {selectedQR.control_nombre || 'Control'}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {selectedQR.qr_url_imagen && (
                  <div>
                    <label className="font-medium text-gray-700">Imagen QR:</label>
                    <p className="mt-1 p-2 bg-gray-100 rounded break-words font-mono text-sm">
                      {selectedQR.qr_url_imagen}
                    </p>
                    <img
                      src={getImageUrl(selectedQR.qr_url_imagen)}
                      alt="QR de la reserva"
                      className="mt-2 max-w-xs h-auto rounded"
                      onError={(e) => console.error('Error loading QR image:', e.target.src)}
                    />
                  </div>
                )}
                {selectedQR.codigo_qr && (
                  <div>
                    <label className="font-medium text-gray-700">Código QR:</label>
                    <p className="mt-1 p-2 bg-gray-100 rounded break-words font-mono text-sm">
                      {selectedQR.codigo_qr}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={closeDetailModal}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRReserva;