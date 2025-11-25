/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

const norm = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '_');

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

const readTokenPayload = () => {
  try {
    const t = localStorage.getItem('token');
    if (!t || t.split('.').length !== 3) return {};
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b.length % 4)) % 4);
    return JSON.parse(atob(b + pad));
  } catch { return {}; }
};

const pickRole = (u, p) => {
  const bag = new Set();
  const arr = Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
  arr.forEach(r => bag.add(norm(typeof r === 'string' ? r : r?.rol || r?.role || r?.nombre || r?.name)));
  const parr = Array.isArray(p?.roles) ? p.roles : (p?.rol ? [p.rol] : []);
  parr.forEach(r => bag.add(norm(r)));
  const list = Array.from(bag);
  if (list.includes('ADMIN_ESP_DEP')) return 'ADMIN_ESP_DEP';
  if (list.includes('ADMIN') || list.includes('ADMINISTRADOR')) return 'ADMINISTRADOR';
  return list[0] || 'DEFAULT';
};

const resolveAdminId = (u, p) => {
  if (Number.isInteger(u?.id_admin_esp_dep)) return u.id_admin_esp_dep;
  if (Number.isInteger(u?.id_persona)) return u.id_persona;
  if (Number.isInteger(u?.id)) return u.id;
  if (Number.isInteger(u?.persona?.id_persona)) return u.persona.id_persona;
  if (Number.isInteger(p?.id_admin_esp_dep)) return p.id_admin_esp_dep;
  if (Number.isInteger(p?.id_persona)) return p.id_persona;
  if (Number.isInteger(p?.id)) return p.id;
  return null;
};

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  DEFAULT: { canView: false, canCreate: false, canEdit: false, canDelete: false },
};

const ReservaAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);

  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [canchas, setCanchas] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

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

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const canchaId = params.get('cancha');
  const idReserva = params.get('id_reserva');

  useEffect(() => {
    const u = readUser();
    const p = readTokenPayload();
    const r = pickRole(u, p);
    setRole(r);
    const idGuess = resolveAdminId(u, p);
    setIdAdminEspDep(r === 'ADMIN_ESP_DEP' ? idGuess : null);
  }, []);

  const permissions = permissionsConfig[role || 'DEFAULT'] || permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.get('/cliente/datos-especificos', {
          params: { limit: 1000, offset: 0 }
        });
        if (response.data?.exito) setClientes(response.data.datos.clientes || []);
        else setError(response.data?.mensaje || 'Error al obtener clientes');
      } catch (err) {
        setError('Error de conexion al obtener clientes');
      }
    };

    const fetchCanchas = async () => {
      if (!idAdminEspDep) return;
      try {
        const res = await api.get('/cancha-admin/datos-especificos', { params: { id_admin_esp_dep: idAdminEspDep } });
        if (res.data?.exito) setCanchas(res.data.datos.canchas || []);
      } catch (e) { setError('Error al cargar canchas'); }
    };

    if (permissions.canView) {
      fetchClientes();
      fetchCanchas();
    }
  }, [role, idAdminEspDep]);

  const fetchReservas = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;

    try {
      if (!idAdminEspDep) {
        setError('No se detecto id_admin_esp_dep del usuario actual');
        setLoading(false);
        return;
      }

      let resp;

      if (params.q) {
        resp = await api.get('/reserva-admin/buscar', {
          params: { ...params, id_admin_esp_dep: idAdminEspDep, limit, offset }
        });
      } else if (params.tipo) {
        resp = await api.get('/reserva-admin/filtro', {
          params: { ...params, id_admin_esp_dep: idAdminEspDep, limit, offset }
        });
      } else {
        resp = await api.get('/reserva-admin/datos-especificos', {
          params: { ...params, id_admin_esp_dep: idAdminEspDep, id_cancha: canchaId || undefined, limit, offset }
        });
      }

      if (resp.data?.exito) {
        const datos = resp.data.datos || resp.data;
        setReservas(datos.reservas || []);
        setTotal(datos?.paginacion?.total || datos.total || 0);
      } else {
        setError(resp.data?.mensaje || 'Error al cargar reservas');
      }

    } catch (e) {
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!role || !idAdminEspDep) return;

    if (idReserva) {
      api.get(`/reserva-admin/dato-individual/${idReserva}`, {
        params: { id_admin_esp_dep: idAdminEspDep }
      })
        .then(r => {
          if (r.data?.exito) {
            setReservas([r.data.datos.reserva]);
            setTotal(1);
          } else {
            setReservas([]);
            setError('No se encontro la reserva');
          }
        })
        .catch(() => setError('Error de conexion'));
    } else {
      fetchReservas({ id_cancha: canchaId });
    }
  }, [role, idAdminEspDep, page, canchaId, idReserva]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    const baseParams = canchaId ? { id_cancha: canchaId } : {};
    if (searchTerm.trim()) fetchReservas({ q: searchTerm, ...baseParams });
    else fetchReservas(baseParams);
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    const baseParams = canchaId ? { id_cancha: canchaId } : {};
    if (tipo) fetchReservas({ tipo, ...baseParams });
    else fetchReservas(baseParams);
  };

  const openCreateModal = () => {
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
      const response = await api.get(`/reserva-admin/dato-individual/${id}`, {
        params: { id_admin_esp_dep: idAdminEspDep },
      });

      if (response.data?.exito) {
        const r = response.data.datos.reserva;
        setFormData({
          fecha_reserva: r.fecha_reserva ? new Date(r.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: r.cupo || '',
          monto_total: r.monto_total || '',
          saldo_pendiente: r.saldo_pendiente || '',
          estado: r.estado || 'pendiente',
          id_cliente: String(r.id_cliente || ''),
          id_cancha: String(r.id_cancha || '')
        });
        setCurrentReserva(r);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError('No se pudo cargar la reserva');
      }
    } catch {
      setError('Error de conexion al servidor');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/reserva-admin/dato-individual/${id}`, {
        params: { id_admin_esp_dep: idAdminEspDep },
      });
      if (response.data?.exito) {
        const r = response.data.datos.reserva;
        setFormData({
          fecha_reserva: r.fecha_reserva ? new Date(r.fecha_reserva).toISOString().split('T')[0] : '',
          cupo: r.cupo || '',
          monto_total: r.monto_total || '',
          saldo_pendiente: r.saldo_pendiente || '',
          estado: r.estado || 'pendiente',
          id_cliente: String(r.id_cliente || ''),
          id_cancha: String(r.id_cancha || '')
        });
        setCurrentReserva(r);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError('No se pudo cargar la reserva');
      }
    } catch {
      setError('Error de conexion al servidor');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        fecha_reserva: formData.fecha_reserva,
        estado: formData.estado,
        id_cliente: parseInt(formData.id_cliente),
        id_cancha: parseInt(formData.id_cancha),
        cupo: formData.cupo ? parseInt(formData.cupo) : null,
        monto_total: formData.monto_total ? parseFloat(formData.monto_total) : null,
        saldo_pendiente: formData.saldo_pendiente ? parseFloat(formData.saldo_pendiente) : null
      };

      if (!data.fecha_reserva || isNaN(data.id_cliente) || isNaN(data.id_cancha)) {
        setError('Faltan campos obligatorios');
        return;
      }

      let resp;
      if (editMode) {
        resp = await api.patch(
          `/reserva-admin/${currentReserva.id_reserva}`,
          data,
          { params: { id_admin_esp_dep: idAdminEspDep } }
        );
      } else {
        resp = await api.post('/reserva-admin/', { ...data, id_admin_esp_dep: idAdminEspDep });
      }

      if (resp.data?.exito) {
        setModalOpen(false);
        fetchReservas();
      } else {
        setError('Error al guardar');
      }
    } catch {
      setError('Error de conexion');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar reserva?')) return;
    try {
      const r = await api.delete(`/reserva-admin/${id}`);
      if (r.data?.exito) fetchReservas();
      else setError('No se pudo eliminar');
    } catch {
      setError('Error de conexion');
    }
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(total / limit);
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  if (!role || (role === 'ADMIN_ESP_DEP' && !idAdminEspDep)) return <p>Cargando permisos...</p>;

  const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/$/, '') : '';
  const qrImageUrl = currentReserva && currentReserva.qr_url_imagen ? `${baseUrl}${currentReserva.qr_url_imagen}` : '';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        {idReserva ? `Detalle de la Reserva #${idReserva}` : 'Gestion de Reservas'}
      </h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente o cancha"
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
            <option value="">Sin filtro</option>
            <option value="fecha">Fecha</option>
            <option value="monto">Monto</option>
            <option value="estado">Estado</option>
          </select>
          <button
            onClick={openCreateModal}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap"
          >
            Crear reserva
          </button>
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
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Monto</th>
                  <th className="px-4 py-2 text-left">Saldo</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r, i) => (
                  <tr key={r.id_reserva} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-2">{`${r.cliente_nombre} ${r.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{r.cancha_nombre}</td>
                    <td className="px-4 py-2">{new Date(r.fecha_reserva).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{r.monto_total ? `Bs. ${r.monto_total}` : '-'}</td>
                    <td className="px-4 py-2">{r.saldo_pendiente ? `Bs. ${r.saldo_pendiente}` : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={() => openViewModal(r.id_reserva)} className="text-green-500 hover:text-green-700">Ver</button>
                      <button onClick={() => openEditModal(r.id_reserva)} className="text-blue-500 hover:text-blue-700">Editar</button>
                      <button onClick={() => handleDelete(r.id_reserva)} className="text-red-500 hover:text-red-700">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
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
          )}
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode ? 'Ver reserva' : editMode ? 'Editar reserva' : 'Crear reserva'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <select
                  name="id_cliente"
                  value={String(formData.id_cliente || '')}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={String(c.id_cliente)}>
                      {c.nombre} {c.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cancha</label>
                <select
                  name="id_cancha"
                  value={String(formData.id_cancha || '')}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione una cancha</option>
                  {canchas.map(ca => (
                    <option key={ca.id_cancha} value={String(ca.id_cancha)}>
                      {ca.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  name="fecha_reserva"
                  value={formData.fecha_reserva}
                  onChange={handleInputChange}
                  type="date"
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cupo</label>
                <input
                  name="cupo"
                  value={formData.cupo}
                  onChange={handleInputChange}
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Monto total</label>
                <input
                  name="monto_total"
                  value={formData.monto_total}
                  onChange={handleInputChange}
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Saldo pendiente</label>
                <input
                  name="saldo_pendiente"
                  value={formData.saldo_pendiente}
                  onChange={handleInputChange}
                  type="number"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 bg-gray-100"
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
                  disabled={viewMode}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                  <option value="en_cuotas">En cuotas</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              {viewMode && currentReserva && (
                <div className="col-span-2 mt-4 border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-medium mb-2">Codigo QR de la reserva</p>
                  {qrImageUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={qrImageUrl}
                        alt="Codigo QR"
                        className="w-40 h-40 object-contain"
                      />
                      {currentReserva.codigo_qr && (
                        <p className="text-xs text-gray-700 break-all">
                          {currentReserva.codigo_qr}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Esta reserva no tiene codigo QR registrado
                    </p>
                  )}
                </div>
              )}

              <div className="col-span-2 flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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

export default ReservaAdmin;
