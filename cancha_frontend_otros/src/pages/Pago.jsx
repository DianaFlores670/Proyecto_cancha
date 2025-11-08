/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: false, canCreate: false, canEdit: false, canDelete: false },
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
      else if (r && typeof r === 'object') ['rol','role','nombre','name'].forEach(k => { if (r[k]) bag.add(r[k]); });
    }
    if (bag.size === 0 && u?.role) bag.add(u.role);
  } catch {}
  const tok = localStorage.getItem('token');
  if (bag.size === 0 && tok && tok.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      const t = Array.isArray(payload?.roles) ? payload.roles : (payload?.rol ? [payload.rol] : []);
      t.forEach(v => bag.add(v));
    } catch {}
  }
  const norm = Array.from(bag).map(v => String(v || '').trim().toUpperCase().replace(/\s+/g,'_'));
  const map = v => v === 'ADMIN' ? 'ADMINISTRADOR' : v;
  const norm2 = norm.map(map);
  const prio = ['ADMINISTRADOR','ADMIN_ESP_DEP'];
  return prio.find(r => norm2.includes(r) && keys.includes(r)) || norm2.find(r => keys.includes(r)) || 'DEFAULT';
};

const Pago = () => {
  const [pagos, setPagos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentPago, setCurrentPago] = useState(null);
  const [formData, setFormData] = useState({
    monto: '',
    metodo_pago: 'tarjeta',
    fecha_pago: '',
    id_reserva: ''
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

  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const response = await api.get('/reserva/datos-especificos');
        if (response.data?.exito) setReservas(response.data.datos.reservas || []);
        else setError(response.data?.mensaje || 'Error al obtener reservas');
      } catch (err) {
        setError(err.response?.data?.mensaje || 'Error de conexion al obtener reservas');
      }
    };
    if (permissions.canView) fetchReservas();
  }, [role]);

  const fetchPagos = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver los datos'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) response = await api.get('/pago/buscar', { params: fullParams });
      else if (params.tipo) response = await api.get('/pago/filtro', { params: fullParams });
      else response = await api.get('/pago/datos-especificos', { params: fullParams });
      if (response.data?.exito) {
        setPagos(response.data.datos.pagos || []);
        setTotal(response.data.datos.paginacion?.total || 0);
      } else {
        setError(response.data?.mensaje || 'Error al cargar pagos');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPagos(); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchPagos({ q: searchTerm });
    else fetchPagos();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchPagos({ tipo });
    else fetchPagos();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar este pago?')) return;
    try {
      const response = await api.delete(`/pago/${id}`);
      if (response.data?.exito) fetchPagos();
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
      monto: '',
      metodo_pago: 'tarjeta',
      fecha_pago: new Date().toISOString().split('T')[0],
      id_reserva: ''
    });
    setCurrentPago(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/pago/dato-individual/${id}`);
      if (response.data?.exito) {
        const p = response.data.datos.pago;
        setFormData({
          monto: p.monto || '',
          metodo_pago: p.metodo_pago || 'tarjeta',
          fecha_pago: p.fecha_pago ? new Date(p.fecha_pago).toISOString().split('T')[0] : '',
          id_reserva: p.id_reserva || ''
        });
        setCurrentPago(p);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data?.mensaje || 'No se pudo cargar el registro');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/pago/dato-individual/${id}`);
      if (response.data?.exito) {
        const p = response.data.datos.pago;
        setFormData({
          monto: p.monto || '',
          metodo_pago: p.metodo_pago || 'tarjeta',
          fecha_pago: p.fecha_pago ? new Date(p.fecha_pago).toISOString().split('T')[0] : '',
          id_reserva: p.id_reserva || ''
        });
        setCurrentPago(p);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data?.mensaje || 'No se pudo cargar el registro');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentPago(null);
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
        monto: formData.monto !== '' ? parseFloat(formData.monto) : undefined,
        metodo_pago: formData.metodo_pago || undefined,
        fecha_pago: formData.fecha_pago || undefined,
        id_reserva: formData.id_reserva ? parseInt(formData.id_reserva) : undefined
      };
      if (!filtered.monto || isNaN(filtered.monto) || filtered.monto <= 0) { setError('El monto debe ser positivo'); return; }
      const metodos = ['tarjeta','efectivo','transferencia','QR'];
      if (!filtered.metodo_pago || !metodos.includes(filtered.metodo_pago)) { setError('Metodo de pago invalido'); return; }
      if (!filtered.id_reserva || !reservas.some(r => r.id_reserva === filtered.id_reserva)) { setError('La reserva seleccionada no es valida'); return; }
      if (filtered.fecha_pago) {
        const f = new Date(filtered.fecha_pago);
        if (isNaN(f.getTime())) { setError('La fecha de pago no es valida'); return; }
      }
      let response;
      if (editMode) response = await api.patch(`/pago/${currentPago.id_pago}`, filtered);
      else response = await api.post('/pago/', filtered);
      if (response.data?.exito) { closeModal(); fetchPagos(); }
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
      <h2 className="text-xl font-semibold mb-4">Gestion de Pagos</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha o metodo de pago"
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
            <option value="">Todos - sin filtro</option>
            <option value="fecha">Ordenar por fecha</option>
            <option value="monto">Ordenar por monto</option>
            <option value="metodo">Ordenar por metodo de pago</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear Pago
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando pagos...</p>
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
                  <th className="px-4 py-2 text-left">Monto</th>
                  <th className="px-4 py-2 text-left">Metodo de pago</th>
                  <th className="px-4 py-2 text-left">Fecha de pago</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago, index) => (
                  <tr key={pago.id_pago} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${pago.cliente_nombre} ${pago.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{pago.cancha_nombre}</td>
                    <td className="px-4 py-2">{pago.monto ? `$${pago.monto}` : '-'}</td>
                    <td className="px-4 py-2">{pago.metodo_pago}</td>
                    <td className="px-4 py-2">{pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(pago.id_pago)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(pago.id_pago)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(pago.id_pago)}
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
              {viewMode ? 'Ver Datos de Pago' : editMode ? 'Editar Pago' : 'Crear Pago'}
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
                <label className="block text-sm font-medium mb-1">Monto</label>
                <input
                  name="monto"
                  value={formData.monto}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Metodo de pago</label>
                <select
                  name="metodo_pago"
                  value={formData.metodo_pago}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="tarjeta">Tarjeta</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="QR">QR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha de pago</label>
                <input
                  name="fecha_pago"
                  value={formData.fecha_pago}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="date"
                  disabled={viewMode}
                />
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

export default Pago;
