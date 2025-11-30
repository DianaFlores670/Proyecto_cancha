/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiMoreVertical, FiX } from 'react-icons/fi';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  DEFAULT: { canView: false, canCreate: false, canEdit: false, canDelete: false },
};

const getEffectiveRole = () => {
  const keys = Object.keys(permissionsConfig);
  const bag = new Set();
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const arr = Array.isArray(u?.roles) ? u.roles : [];
    for (const r of arr) {
      if (typeof r === 'string') bag.add(r);
      else if (r && typeof r === 'object') ['rol', 'role', 'nombre', 'name'].forEach(k => { if (r[k]) bag.add(r[k]); });
    }
    if (bag.size === 0 && u?.role) bag.add(u.role);
  } catch { }
  const tok = localStorage.getItem('token');
  if (bag.size === 0 && tok && tok.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const t = Array.isArray(payload?.roles) ? payload.roles : (payload?.rol ? [payload.rol] : []);
      t.forEach(v => bag.add(v));
    } catch { }
  }
  const norm = Array.from(bag).map(v => String(v || '').trim().toUpperCase().replace(/\s+/g, '_'));
  const map = v => v === 'ADMIN' ? 'ADMINISTRADOR' : v;
  const norm2 = norm.map(map);
  const prio = ['ADMINISTRADOR', 'ADMIN_ESP_DEP', 'CONTROL', 'ENCARGADO'];
  return prio.find(r => norm2.includes(r) && keys.includes(r)) || norm2.find(r => keys.includes(r)) || 'DEFAULT';
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
  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [currentReserva, setCurrentReserva] = useState(null);
  const [formData, setFormData] = useState({
    fecha_reserva: '',
    cupo: '',
    monto_total: '',
    saldo_pendiente: '',
    estado: 'pendiente',
    id_cliente: '',
    id_cancha: '',
    hora_inicio: '',
    hora_fin: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(() => getEffectiveRole());

  useEffect(() => {
    const sync = () => setRole(getEffectiveRole());
    window.addEventListener('storage', sync);
    window.addEventListener('auth-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('auth-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  useEffect(() => { setError(null); }, [role]);

  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.get('/cliente/datos-especificos', {
          params: { limit: 1000, offset: 0 }
        });
        if (response.data?.exito) setClientes(response.data.datos.clientes || []);
        else setError(response.data?.mensaje || 'Error al obtener clientes');
      } catch (err) {
        setError(err.response?.data?.mensaje || 'Error de conexion al obtener clientes');
      }
    };

    const fetchCanchas = async () => {
      try {
        const response = await api.get('/cancha/datos-especificos', {
          params: { limit: 1000, offset: 0 }
        });
        if (response.data?.exito) setCanchas(response.data.datos.canchas || []);
        else setError(response.data?.mensaje || 'Error al obtener canchas');
      } catch (err) {
        setError(err.response?.data?.mensaje || 'Error de conexion al obtener canchas');
      }
    };

    if (permissions.canView) {
      fetchClientes();
      fetchCanchas();
    }
  }, [role]);

  const fetchReservas = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver reservas'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) response = await api.get('/reserva/buscar', { params: fullParams });
      else if (params.tipo) response = await api.get('/reserva/filtro', { params: fullParams });
      else response = await api.get('/reserva/datos-especificos', { params: fullParams });
      if (response.data?.exito) {
        setReservas(response.data.datos.reservas || []);
        setTotal(response.data.datos.total || 0);
      }
      else {
        setError(response.data?.mensaje || 'Error al cargar reservas');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (role) fetchReservas(); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) fetchReservas({ q: searchTerm });
    else fetchReservas();
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchReservas({ tipo });
    else fetchReservas();
  };

  const handleDelete = (reserva) => {
    setDeleteUser(reserva);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;

    if (!permissions.canDelete) {
      setError('No tienes permisos para eliminar reservas');
      return;
    }

    try {
      // Llamada a la API para eliminar el control
      const response = await api.delete(`/reserva/${deleteUser.id_reserva}`);

      // Verificar la respuesta de la API
      if (response.data.exito) {
        setDeleteOpen(false);  // Cerrar el modal de eliminación
        setDeleteUser(null);  // Limpiar el control a eliminar
        fetchReservas();  // Recargar la lista de controles
      } else {
        setError(response.data.mensaje || 'No se pudo eliminar');  // Si hay un mensaje de error, mostrarlo
      }
    } catch (err) {
      // Capturar cualquier error de la llamada a la API
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);  // Mostrar el mensaje de error
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);  // Cerrar el modal de eliminación
    setDeleteUser(null);  // Limpiar el control a eliminar
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
      id_cancha: '',
      hora_inicio: '',
      hora_fin: '',
    });
    setCurrentReserva(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/reserva/dato-individual/${id}`);
      if (response.data?.exito) {
        const r = response.data.datos.reserva;
        setFormData({
          fecha_reserva: r.fecha_reserva ? new Date(r.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: r.cupo || '',
          monto_total: r.monto_total || '',
          saldo_pendiente: r.saldo_pendiente || '',
          estado: r.estado || 'pendiente',
          id_cliente: r.id_cliente ? String(r.id_cliente) : '',
          id_cancha: r.id_cancha ? String(r.id_cancha) : '',
          hora_inicio: r.hora_inicio || '',
          hora_fin: r.hora_fin || '',
        });
        setCurrentReserva(r);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data?.mensaje || 'No se pudo cargar la reserva');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/reserva/dato-individual/${id}`);
      if (response.data?.exito) {
        const r = response.data.datos.reserva;
        setFormData({
          fecha_reserva: r.fecha_reserva ? new Date(r.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: r.cupo || '',
          monto_total: r.monto_total || '',
          saldo_pendiente: r.saldo_pendiente || '',
          estado: r.estado || 'pendiente',
          id_cliente: r.id_cliente ? String(r.id_cliente) : '',
          id_cancha: r.id_cancha ? String(r.id_cancha) : '',
          hora_inicio: r.hora_inicio || '',
          hora_fin: r.hora_fin || '',
        });
        setCurrentReserva(r);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data?.mensaje || 'No se pudo cargar la reserva');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentReserva(null);
    setError(null);
    setViewMode(false);
    setModalError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones de campos obligatorios y valores
    const filtered = {
      fecha_reserva: formData.fecha_reserva,
      estado: formData.estado,
      id_cliente: parseInt(formData.id_cliente),
      id_cancha: parseInt(formData.id_cancha),
      cupo: formData.cupo,
      monto_total: parseFloat(formData.monto_total),
      saldo_pendiente: parseFloat(formData.saldo_pendiente),
      hora_inicio: formData.hora_inicio,
      hora_fin: formData.hora_fin,
    };

    // Validaciones
    if (!filtered.fecha_reserva) {
      setError('La fecha de reserva es obligatoria');
      return;
    }
    const f = new Date(filtered.fecha_reserva);
    if (isNaN(f.getTime())) {
      setError('La fecha de reserva no es válida');
      return;
    }

    if (filtered.cupo && (isNaN(filtered.cupo) || filtered.cupo <= 0)) {
      setError('El cupo debe ser número positivo');
      return;
    }

    if (filtered.monto_total && (isNaN(filtered.monto_total) || filtered.monto_total < 0)) {
      setError('El monto total debe ser número no negativo');
      return;
    }

    if (filtered.saldo_pendiente && (isNaN(filtered.saldo_pendiente) || filtered.saldo_pendiente < 0)) {
      setError('El saldo pendiente debe ser número no negativo');
      return;
    }

    if (filtered.monto_total && filtered.saldo_pendiente && filtered.saldo_pendiente > filtered.monto_total) {
      setError('El saldo pendiente no puede ser mayor al monto total');
      return;
    }

    const estadosValidos = ['pendiente', 'pagada', 'en_cuotas', 'cancelada'];
    if (!estadosValidos.includes(filtered.estado)) {
      setError('Estado inválido');
      return;
    }

    if (!filtered.id_cliente || !clientes.some(c => c.id_cliente === filtered.id_cliente)) {
      setError('Cliente inválido');
      return;
    }

    if (!filtered.id_cancha || !canchas.some(ca => ca.id_cancha === filtered.id_cancha)) {
      setError('Cancha inválida');
      return;
    }

    try {
      let response;
      if (editMode) {
        response = await api.patch(`/reserva/${currentReserva.id_reserva}`, filtered);
      } else {
        response = await api.post('/reserva/', filtered);
      }

      if (response.data?.exito) {
        closeModal();
        fetchReservas();
      } else {
        const mensajeError = response.data.mensaje || "No se pudo guardar";
        setModalError(mensajeError);  // Mostrar el mensaje de error del backend
        setTimeout(() => {
          setModalError(null);
        }, 5000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setModalError(errorMessage); // Mostramos el mensaje amigable desde el servidor
      setTimeout(() => {
        setModalError(null);
      }, 5000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestion de Reservas</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido o correo"
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
              disabled={!permissions.canView}
            />
            <button
              type="submit"
              className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full"
              disabled={!permissions.canView}
            >
              Buscar
            </button>
          </form>
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
            disabled={!permissions.canView}
          >
            <option value="">Sin filtro</option>
            <option value="fecha">Fecha</option>
            <option value="monto">Monto</option>
            <option value="estado">Estado</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              Crear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando reservas...</p>
      ) : error ? (
        <p className="text-red-500 mt-3">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha Reserva</th>
                  <th className="px-4 py-2 text-left">Monto Total</th>
                  <th className="px-4 py-2 text-left">Saldo</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {reservas.map((reserva, index) => (
                  <tr key={reserva.id_reserva} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">{`${reserva.cliente_nombre} ${reserva.cliente_apellido}`}</td>
                    <td className="px-4 py-3">{reserva.cancha_nombre}</td>
                    <td className="px-4 py-3">{new Date(reserva.fecha_reserva).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{reserva.monto_total ? `$${reserva.monto_total}` : '-'}</td>
                    <td className="px-4 py-3">{reserva.saldo_pendiente ? `$${reserva.saldo_pendiente}` : '-'}</td>
                    <td className="px-4 py-3">{reserva.estado}</td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(reserva.id_reserva)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(reserva.id_reserva)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(reserva)}
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
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {reservas.map((reserva, index) => (
              <div
                key={reserva.id_reserva}
                className="border bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    {/* CLIENTE */}
                    <div className="font-bold text-[#23475F]">
                      {reserva.cliente_nombre} {reserva.cliente_apellido}
                    </div>

                    {/* NUMERO DE RESERVA */}
                    <div className="text-xs text-gray-500">
                      Reserva #{(page - 1) * limit + index + 1}
                    </div>

                    <div className="mt-3 text-sm space-y-1">
                      {/* CANCHA */}
                      <div>
                        <span className="font-semibold">Cancha: </span>
                        {reserva.cancha_nombre}
                      </div>

                      {/* FECHA */}
                      <div>
                        <span className="font-semibold">Fecha: </span>
                        {new Date(reserva.fecha_reserva).toLocaleDateString()}
                      </div>

                      {/* Monto */}
                      <div>
                        <span className="font-semibold">Monto Total: </span>
                        {reserva.monto_total ? `$${reserva.monto_total}` : '-'}
                      </div>

                      {/* Saldo */}
                      <div>
                        <span className="font-semibold">Saldo: </span>
                        {reserva.saldo_pendiente ? `$${reserva.saldo_pendiente}` : '-'}
                      </div>

                      {/* Estado */}
                      <div>
                        <span className="font-semibold">Estado: </span>
                        <span
                          className={
                            reserva.estado === 'pagada'
                              ? 'text-green-600 font-semibold'
                              : reserva.estado === 'cancelada'
                                ? 'text-red-600 font-semibold'
                                : 'text-blue-600 font-semibold'
                          }
                        >
                          {reserva.estado}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BOTON MORE */}
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(reserva)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* PAGINACION SOLO MOVIL */}
            <div className="md:hidden w-full flex justify-center items-center gap-3 py-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Anterior
              </button>

              <div className="px-4 py-2 bg-gray-100 rounded-full text-sm">
                Pag {page} de {Math.ceil(total / limit) || 1}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === Math.ceil(total / limit)}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
          {/* PAGINACION STICKY */}
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-50 mt-6">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} de {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              {viewMode ? 'Ver Datos de Reserva' : editMode ? 'Editar Reserva' : 'Crear Reserva'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
              <div className="">
                <label className="block text-sm font-semibold mb-1">Cliente</label>
                <select
                  name="id_cliente"
                  value={formData.id_cliente}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="">
                <label className="block text-sm font-semibold mb-1">Cancha</label>
                <select
                  name="id_cancha"
                  value={formData.id_cancha}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione una cancha</option>
                  {canchas.map(ca => (
                    <option key={ca.id_cancha} value={ca.id_cancha}>
                      {ca.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Fecha de Reserva</label>
                <input
                  name="fecha_reserva"
                  value={formData.fecha_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="date"
                  required
                  disabled={viewMode}
                />
              </div>
              <div className="">
                <label className="block text-sm font-semibold mb-1">Hora de Inicio</label>
                <input
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="time"
                  required
                  disabled={viewMode}
                />
              </div>

              <div className="">
                <label className="block text-sm font-semibold mb-1">Hora de Fin</label>
                <input
                  name="hora_fin"
                  value={formData.hora_fin}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="time"
                  required
                  disabled={viewMode}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Cupo</label>
                <input
                  name="cupo"
                  value={formData.cupo}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  min="1"
                  disabled={viewMode}
                />
              </div>
              <div className="">
                <label className="block text-sm font-semibold mb-1">Monto Total</label>
                <input
                  name="monto_total"
                  value={formData.monto_total}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div className="">
                <label className="block text-sm font-semibold mb-1">Saldo Pendiente</label>
                <input
                  name="saldo_pendiente"
                  value={formData.saldo_pendiente}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              {/* Validaciones de estado */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="en_cuotas">En Cuotas</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="md:col-span-2 border-t pt-4 mt-4">
                {modalError && (
                  <div className="bg-red-100 text-red-600 p-3 mb-4 rounded-md text-sm">
                    {modalError}
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end mt-1 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
                >
                  Cerrar
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#23475F] text-white rounded-full text-md font-medium hover:bg-[#1d3a4e]"
                  >
                    {editMode ? 'Actualizar' : 'Crear'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {mobileModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-72 p-5 shadow-xl animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#23475F] text-lg">Opciones</h3>
              <button onClick={() => setMobileModal(null)}>
                <FiX size={20} />
              </button>
            </div>

            <div className="flex flex-col text-md">
              {/* Ver datos del control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_reserva); // Abre el modal para ver datos del control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              {/* Editar control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_reserva); // Abre el modal para editar control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
              </button>

              {/* Eliminar control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);  // Abre el modal de eliminación
                  setDeleteUser(mobileModal); // Establece el control a eliminar
                }}
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
              >
                Eliminar
              </button>

              {/* Cancelar opción */}
              <button
                onClick={() => setMobileModal(null)}
                className="px-3 py-2 text-left text-gray-700 hover:bg-gray-100 mt-1 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteOpen && deleteUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">

            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Eliminar reserva
            </h3>
            <p className="text-gray-700 text-md">
              ¿Estás seguro de eliminar <span className="font-bold">#{deleteUser.id_reserva} {deleteUser.cliente_nombre} {deleteUser.cliente_apellido}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              {/* Botón de cancelar */}
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

              {/* Botón de eliminar */}
              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-full text-md font-medium hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Reserva;