import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Configuración de permisos por rol
const permissionsConfig = {
  CLIENTE: {
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

const ReservaCliente = () => {
  const [reservas, setReservas] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentReserva, setCurrentReserva] = useState(null);
  const [formData, setFormData] = useState({
    fecha_reserva: '',
    cupo: '',
    monto_total: '',
    saldo_pendiente: '',
    estado: '',
    id_cancha: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(null);
  const [idCliente, setIdCliente] = useState(null);

  // Obtener el rol e id_cliente desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setRole(parsedUser.role);
        setIdCliente(parsedUser.id_persona);
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

  // Fetch canchas disponibles
  useEffect(() => {
    const fetchCanchas = async () => {
      try {
        const response = await api.get('/reserva-cliente/datos-especificos');
        if (response.data.exito) {
          setCanchas(response.data.datos.canchas || []);
        }
      } catch (err) {
        console.error('Error al obtener canchas:', err);
        setError('Error al cargar canchas');
      }
    };
    fetchCanchas();
  }, []);

  // Fetch reservas con paginación y filtros
  const fetchReservas = async (params = {}) => {
    if (!idCliente) return;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset, id_cliente: idCliente };
    try {
      let response;
      if (params.q) {
        response = await api.get('/reserva-cliente/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/reserva-cliente/filtro', { params: fullParams });
      } else {
        response = await api.get('/reserva-cliente/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setReservas(response.data.datos.reservas);
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
    fetchReservas();
  }, [page, idCliente]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchReservas({ q: searchTerm });
    } else {
      fetchReservas();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchReservas({ tipo });
    } else {
      fetchReservas();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('¿Estás seguro de eliminar esta reserva?')) return;
    try {
      const response = await api.delete(`/reserva-cliente/${id}`, {
        params: { id_cliente: idCliente },
      });
      if (response.data.exito) {
        fetchReservas();
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
      fecha_reserva: '',
      cupo: '',
      monto_total: '',
      saldo_pendiente: '',
      estado: '',
      id_cancha: '',
    });
    setCurrentReserva(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/reserva-cliente/dato-individual/${id}`, {
        params: { id_cliente: idCliente },
      });
      if (response.data.exito) {
        const reserva = response.data.datos.reserva;
        setFormData({
          fecha_reserva: reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: reserva.cupo || '',
          monto_total: reserva.monto_total || '',
          saldo_pendiente: reserva.saldo_pendiente || '',
          estado: reserva.estado || '',
          id_cancha: reserva.id_cancha || '',
        });
        setCurrentReserva(reserva);
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
      const response = await api.get(`/reserva-cliente/dato-individual/${id}`, {
        params: { id_cliente: idCliente },
      });
      if (response.data.exito) {
        const reserva = response.data.datos.reserva;
        setFormData({
          fecha_reserva: reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: reserva.cupo || '',
          monto_total: reserva.monto_total || '',
          saldo_pendiente: reserva.saldo_pendiente || '',
          estado: reserva.estado || '',
          id_cancha: reserva.id_cancha || '',
        });
        setCurrentReserva(reserva);
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
    setCurrentReserva(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;

    try {
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['fecha_reserva', 'estado', 'id_cancha'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones
      if (!filteredData.fecha_reserva) {
        setError('La fecha de reserva es obligatoria');
        return;
      }
      if (new Date(filteredData.fecha_reserva).toString() === 'Invalid Date') {
        setError('La fecha de reserva no es válida');
        return;
      }
      if (filteredData.cupo && (isNaN(filteredData.cupo) || filteredData.cupo <= 0)) {
        setError('El cupo debe ser un número positivo');
        return;
      }
      if (filteredData.monto_total && (isNaN(filteredData.monto_total) || filteredData.monto_total < 0)) {
        setError('El monto total debe ser un número no negativo');
        return;
      }
      if (filteredData.saldo_pendiente && (isNaN(filteredData.saldo_pendiente) || filteredData.saldo_pendiente < 0)) {
        setError('El saldo pendiente debe ser un número no negativo');
        return;
      }
      if (
        filteredData.monto_total &&
        filteredData.saldo_pendiente &&
        Number(filteredData.saldo_pendiente) > Number(filteredData.monto_total)
      ) {
        setError('El saldo pendiente no puede ser mayor al monto total');
        return;
      }
      const estadosValidos = ['pendiente', 'pagada', 'en_cuotas', 'cancelada'];
      if (!filteredData.estado || !estadosValidos.includes(filteredData.estado)) {
        setError(`El estado debe ser uno de: ${estadosValidos.join(', ')}`);
        return;
      }
      if (!filteredData.id_cancha || !canchas.some((cancha) => cancha.id_cancha === parseInt(filteredData.id_cancha))) {
        setError('La cancha seleccionada no es válida');
        return;
      }

      filteredData.id_cliente = idCliente;

      let response;
      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar reserva ID:', currentReserva.id_reserva);
        response = await api.patch(`/reserva-cliente/${currentReserva.id_reserva}`, filteredData);
      } else {
        console.log('📤 Enviando POST para crear reserva...');
        response = await api.post('/reserva-cliente/', filteredData);
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchReservas();
      } else {
        alert('Error: ' + response.data.mensaje);
      }
    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  if (!role || !idCliente) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Reservas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, apellido, cancha o estado..."
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
            <option value="monto">💰 Ordenar por monto</option>
            <option value="estado">🟢 Ordenar por estado</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>📅</span>
              <span>Crear Reserva</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando reservas...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Cupo</th>
                  <th className="px-4 py-2 text-left">Monto Total</th>
                  <th className="px-4 py-2 text-left">Saldo Pendiente</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva, index) => (
                  <tr key={reserva.id_reserva} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{reserva.cancha_nombre}</td>
                    <td className="px-4 py-2">
                      {reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-2">{reserva.cupo || '-'}</td>
                    <td className="px-4 py-2">{reserva.monto_total ? `$${reserva.monto_total}` : '-'}</td>
                    <td className="px-4 py-2">{reserva.saldo_pendiente ? `$${reserva.saldo_pendiente}` : '-'}</td>
                    <td className="px-4 py-2">{reserva.estado || '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(reserva.id_reserva)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(reserva.id_reserva)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(reserva.id_reserva)}
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
              {viewMode ? 'Ver Datos de Reserva' : editMode ? 'Editar Reserva' : 'Crear Reserva'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de Reserva</label>
                <input
                  name="fecha_reserva"
                  value={formData.fecha_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="date"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cupo</label>
                <input
                  name="cupo"
                  value={formData.cupo}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  min="1"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto Total</label>
                <input
                  name="monto_total"
                  value={formData.monto_total}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Saldo Pendiente</label>
                <input
                  name="saldo_pendiente"
                  value={formData.saldo_pendiente}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.01"
                  min="0"
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
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="en_cuotas">En Cuotas</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cancha</label>
                <select
                  name="id_cancha"
                  value={formData.id_cancha}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione una cancha</option>
                  {canchas.map((cancha) => (
                    <option key={cancha.id_cancha} value={cancha.id_cancha}>
                      {cancha.nombre}
                    </option>
                  ))}
                </select>
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

export default ReservaCliente;