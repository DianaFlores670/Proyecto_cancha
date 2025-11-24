/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  CONTROL: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  ENCARGADO: { canView: true, canCreate: false, canEdit: false, canDelete: false },
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
        setTotal(response.data.datos.paginacion?.total || 0);
      } else {
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

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar esta reserva?')) return;
    try {
      const response = await api.delete(`/reserva/${id}`);
      if (response.data?.exito) fetchReservas();
      else setError(response.data?.mensaje || 'No se pudo eliminar');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
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
      if (response.data?.exito) {
        const r = response.data.datos.reserva;
        setFormData({
          fecha_reserva: r.fecha_reserva ? new Date(r.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: r.cupo || '',
          monto_total: r.monto_total || '',
          saldo_pendiente: r.saldo_pendiente || '',
          estado: r.estado || 'pendiente',
          id_cliente: r.id_cliente ? String(r.id_cliente) : '',
          id_cancha: r.id_cancha ? String(r.id_cancha) : ''
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
          id_cancha: r.id_cancha ? String(r.id_cancha) : ''
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
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;
    try {
      const filtered = {
        fecha_reserva: formData.fecha_reserva,
        estado: formData.estado,
        id_cliente: formData.id_cliente ? parseInt(formData.id_cliente) : undefined,
        id_cancha: formData.id_cancha ? parseInt(formData.id_cancha) : undefined,
        cupo: formData.cupo ? parseInt(formData.cupo) : undefined,
        monto_total: formData.monto_total ? parseFloat(formData.monto_total) : undefined,
        saldo_pendiente: formData.saldo_pendiente ? parseFloat(formData.saldo_pendiente) : undefined
      };
      if (!filtered.fecha_reserva) { setError('La fecha de reserva es obligatoria'); return; }
      const f = new Date(filtered.fecha_reserva);
      if (isNaN(f.getTime())) { setError('La fecha de reserva no es valida'); return; }
      if (filtered.cupo && (isNaN(filtered.cupo) || filtered.cupo <= 0)) { setError('El cupo debe ser numero positivo'); return; }
      if (filtered.monto_total && (isNaN(filtered.monto_total) || filtered.monto_total < 0)) { setError('El monto total debe ser numero no negativo'); return; }
      if (filtered.saldo_pendiente && (isNaN(filtered.saldo_pendiente) || filtered.saldo_pendiente < 0)) { setError('El saldo pendiente debe ser numero no negativo'); return; }
      if (filtered.monto_total && filtered.saldo_pendiente && filtered.saldo_pendiente > filtered.monto_total) { setError('El saldo pendiente no puede ser mayor al monto total'); return; }
      const estadosValidos = ['pendiente', 'pagada', 'en_cuotas', 'cancelada'];
      if (!estadosValidos.includes(filtered.estado)) { setError('Estado invalido'); return; }
      if (!filtered.id_cliente || !clientes.some(c => c.id_cliente === filtered.id_cliente)) { setError('Cliente invalido'); return; }
      if (!filtered.id_cancha || !canchas.some(ca => ca.id_cancha === filtered.id_cancha)) { setError('Cancha invalida'); return; }

      let response;
      if (editMode) response = await api.patch(`/reserva/${currentReserva.id_reserva}`, filtered);
      else response = await api.post('/reserva/', filtered);

      if (response.data?.exito) { closeModal(); fetchReservas(); }
      else setError(response.data?.mensaje || 'No se pudo guardar');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Reservas</h2>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha, estado"
              className="border rounded-l px-3 py-2 w-full text-sm"
              disabled={!permissions.canView}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap text-sm"
              disabled={!permissions.canView}
            >
              Buscar
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
            <option value="">Sin filtro</option>
            <option value="fecha">Fecha</option>
            <option value="monto">Monto</option>
            <option value="estado">Estado</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 whitespace-nowrap text-sm"
            >
              Crear
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
              Pagina {page} de {Math.ceil(total / limit)}
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
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre} {c.apellido}
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
                  {canchas.map(ca => (
                    <option key={ca.id_cancha} value={ca.id_cancha}>
                      {ca.nombre}
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
