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

const Reserva = () => {
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
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
    estado: 'pendiente',
    id_cliente: '',
    id_cancha: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState('DEFAULT');
  const limit = 10;

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

  // Fetch clientes y canchas válidas al cargar el componente
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.get('/cliente/datos-especificos');
        if (response.data.exito) {
          setClientes(response.data.datos.clientes || []);
        } else {
          console.log('Error al obtener clientes:', response.data.mensaje);
          setError(response.data.mensaje);
        }
      } catch (err) {
        console.log('Error en fetchClientes:', { error: err.message, stack: err.stack });
        setError(err.response?.data?.mensaje || 'Error al obtener clientes');
      }
    };

    const fetchCanchas = async () => {
      try {
        const response = await api.get('/cancha/datos-especificos');
        if (response.data.exito) {
          setCanchas(response.data.datos.canchas || []);
        } else {
          console.log('Error al obtener canchas:', response.data.mensaje);
          setError(response.data.mensaje);
        }
      } catch (err) {
        console.log('Error en fetchCanchas:', { error: err.message, stack: err.stack });
        setError(err.response?.data?.mensaje || 'Error al obtener canchas');
      }
    };

    fetchClientes();
    fetchCanchas();
  }, []);

  const fetchReservas = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/reserva/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/reserva/filtro', { params: fullParams });
      } else {
        response = await api.get('/reserva/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setReservas(response.data.datos.reservas);
        setTotal(response.data.datos.paginacion.total);
      } else {
        console.log('Error al obtener reservas:', response.data.mensaje);
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.log('Error en fetchReservas:', { error: err.message, stack: err.stack, params: fullParams });
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (permissions.canView) {
      fetchReservas();
    } else {
      setError('No tienes permisos para ver las reservas');
    }
  }, [page, permissions]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) {
      fetchReservas({ q: searchTerm });
    } else {
      fetchReservas();
    }
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
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
      const response = await api.delete(`/reserva/${id}`);
      if (response.data.exito) {
        fetchReservas();
      } else {
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.log('Error en handleDelete:', { error: err.message, stack: err.stack, id });
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
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
      estado: 'pendiente',
      id_cliente: '',
      id_cancha: ''
    });
    setCurrentReserva(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/reserva/dato-individual/${id}`);
      if (response.data.exito) {
        const reserva = response.data.datos.reserva;
        setFormData({
          fecha_reserva: reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: reserva.cupo || '',
          monto_total: reserva.monto_total || '',
          saldo_pendiente: reserva.saldo_pendiente || '',
          estado: reserva.estado || 'pendiente',
          id_cliente: reserva.id_cliente ? String(reserva.id_cliente) : '',
          id_cancha: reserva.id_cancha ? String(reserva.id_cancha) : ''
        });
        setCurrentReserva(reserva);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        console.log('Error al obtener reserva para edición:', response.data.mensaje);
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.log('Error en openEditModal:', { error: err.message, stack: err.stack, id });
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/reserva/dato-individual/${id}`);
      if (response.data.exito) {
        const reserva = response.data.datos.reserva;
        setFormData({
          fecha_reserva: reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: reserva.cupo || '',
          monto_total: reserva.monto_total || '',
          saldo_pendiente: reserva.saldo_pendiente || '',
          estado: reserva.estado || 'pendiente',
          id_cliente: reserva.id_cliente ? String(reserva.id_cliente) : '',
          id_cancha: reserva.id_cancha ? String(reserva.id_cancha) : ''
        });
        setCurrentReserva(reserva);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        console.log('Error al obtener reserva para visualización:', response.data.mensaje);
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.log('Error en openViewModal:', { error: err.message, stack: err.stack, id });
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;
    try {
      const filteredData = {
        fecha_reserva: formData.fecha_reserva,
        estado: formData.estado,
        id_cliente: formData.id_cliente ? parseInt(formData.id_cliente) : undefined,
        id_cancha: formData.id_cancha ? parseInt(formData.id_cancha) : undefined,
        cupo: formData.cupo ? parseInt(formData.cupo) : undefined,
        monto_total: formData.monto_total ? parseFloat(formData.monto_total) : undefined,
        saldo_pendiente: formData.saldo_pendiente ? parseFloat(formData.saldo_pendiente) : undefined
      };

      // Validaciones frontend
      if (!filteredData.fecha_reserva) {
        console.log('Error: La fecha de reserva es obligatoria');
        setError('La fecha de reserva es obligatoria');
        return;
      }
      const fechaReserva = new Date(filteredData.fecha_reserva);
      if (isNaN(fechaReserva.getTime())) {
        console.log('Error: La fecha de reserva no es válida');
        setError('La fecha de reserva no es válida');
        return;
      }
      if (filteredData.cupo && (isNaN(filteredData.cupo) || filteredData.cupo <= 0)) {
        console.log('Error: El cupo debe ser un número positivo');
        setError('El cupo debe ser un número positivo');
        return;
      }
      if (filteredData.monto_total && (isNaN(filteredData.monto_total) || filteredData.monto_total < 0)) {
        console.log('Error: El monto total debe ser un número no negativo');
        setError('El monto total debe ser un número no negativo');
        return;
      }
      if (filteredData.saldo_pendiente && (isNaN(filteredData.saldo_pendiente) || filteredData.saldo_pendiente < 0)) {
        console.log('Error: El saldo pendiente debe ser un número no negativo');
        setError('El saldo pendiente debe ser un número no negativo');
        return;
      }
      if (filteredData.monto_total && filteredData.saldo_pendiente && filteredData.saldo_pendiente > filteredData.monto_total) {
        console.log('Error: El saldo pendiente no puede ser mayor al monto total');
        setError('El saldo pendiente no puede ser mayor al monto total');
        return;
      }
      const estadosValidos = ['pendiente', 'pagada', 'en_cuotas', 'cancelada'];
      if (!estadosValidos.includes(filteredData.estado)) {
        console.log('Error: Estado inválido', filteredData.estado);
        setError(`El estado debe ser uno de: ${estadosValidos.join(', ')}`);
        return;
      }
      if (!filteredData.id_cliente || !clientes.some(cliente => cliente.id_cliente === filteredData.id_cliente)) {
        console.log('Error: Cliente inválido', filteredData.id_cliente);
        setError('El cliente seleccionado no es válido');
        return;
      }
      if (!filteredData.id_cancha || !canchas.some(cancha => cancha.id_cancha === filteredData.id_cancha)) {
        console.log('Error: Cancha inválida', filteredData.id_cancha);
        setError('La cancha seleccionada no es válida');
        return;
      }

      let response;
      if (editMode) {
        response = await api.patch(`/reserva/${currentReserva.id_reserva}`, filteredData);
      } else {
        response = await api.post('/reserva/', filteredData);
      }
      if (response.data.exito) {
        closeModal();
        fetchReservas();
      } else {
        console.log('Error en la respuesta del servidor:', response.data.mensaje);
        setError(response.data.mensaje);
      }
    } catch (err) {
      console.log('Error en handleSubmit:', { error: err.message, stack: err.stack, formData });
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
      <h2 className="text-xl font-semibold mb-4">Gestión de Reservas</h2>
      
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Cliente, cancha, estado..."
              className="border rounded-l px-3 py-2 w-full text-sm"
              disabled={!permissions.canView}
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-3 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap text-sm"
              disabled={!permissions.canView}
            >
              🔎 Buscar
            </button>
          </form>
        </div>

        <div className="flex gap-2">
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="border rounded px-3 py-2 flex-1 text-sm"
            disabled={!permissions.canView}
          >
            <option value="">📋 Todos</option>
            <option value="fecha">📅 Fecha</option>
            <option value="monto">💰 Monto</option>
            <option value="estado">🟢 Estado</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap text-sm flex items-center gap-1"
            >
              <span>📅</span>
              <span>Crear</span>
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
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha Reserva</th>
                  <th className="px-4 py-2 text-left">Monto Total</th>
                  <th className="px-4 py-2 text-left">Saldo Pendiente</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva, index) => (
                  <tr key={reserva.id_reserva} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${reserva.cliente_nombre} ${reserva.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{reserva.cancha_nombre}</td>
                    <td className="px-4 py-2">{new Date(reserva.fecha_reserva).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{reserva.monto_total ? `$${reserva.monto_total}` : '-'}</td>
                    <td className="px-4 py-2">{reserva.saldo_pendiente ? `$${reserva.saldo_pendiente}` : '-'}</td>
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
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <select
                  name="id_cliente"
                  value={formData.id_cliente}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.nombre} {cliente.apellido}
                    </option>
                  ))}
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
                  {canchas.map(cancha => (
                    <option key={cancha.id_cancha} value={cancha.id_cancha}>
                      {cancha.nombre}
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="en_cuotas">En Cuotas</option>
                  <option value="cancelada">Cancelada</option>
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
                    disabled={(!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)}
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

export default Reserva;