/* eslint-disable no-empty */
import React, { useEffect, useState } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canApprove: true, canReject: true },
  ADMIN_ESP_DEP: { canView: false, canApprove: false, canReject: false },
  DEFAULT: { canView: false, canApprove: false, canReject: false }
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

const basePath = '/solicitud-admin-esp-dep';

const Solicitud = () => {
  const [role, setRole] = useState(() => getEffectiveRole());
  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estado, setEstado] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const [current, setCurrent] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [approveComment, setApproveComment] = useState('');

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

  const fetchSolicitudes = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const full = { ...params, limit, offset };
    try {
      let res;
      if (full.q) res = await api.get(`${basePath}/buscar`, { params: full });
      else if (typeof full.estado === 'string' && full.estado) res = await api.get(`${basePath}/filtro`, { params: full });
      else res = await api.get(`${basePath}/datos-especificos`, { params: full });
      if (res.data?.exito) {
        const d = res.data.datos;
        setItems(d.solicitudes || []);
        setTotal((d.paginacion && d.paginacion.total) || 0);
      } else {
        setError(res.data?.mensaje || 'Error al cargar');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (role) fetchSolicitudes(estado ? { estado } : {}); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchSolicitudes({ q: searchTerm });
    else fetchSolicitudes(estado ? { estado } : {});
  };

  const handleEstadoChange = (e) => {
    const v = e.target.value;
    setEstado(v);
    setPage(1);
    if (v) fetchSolicitudes({ estado: v });
    else fetchSolicitudes();
  };

  const openView = async (id) => {
    if (!permissions.canView) return;
    try {
      const r = await api.get(`${basePath}/dato-individual/${id}`);
      if (r.data?.exito) {
        setCurrent(r.data.datos?.solicitud || null);
        setViewOpen(true);
      } else {
        setError(r.data?.mensaje || 'No se pudo obtener');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const closeView = () => { setViewOpen(false); setCurrent(null); };

  const canAct = (row) => row?.estado === 'pendiente';

  const openApprove = (row) => {
    if (!permissions.canApprove) return;
    setCurrent(row);
    setApproveComment('');
    setApproveOpen(true);
  };

  const closeApprove = () => {
    setApproveOpen(false);
    setCurrent(null);
    setApproveComment('');
  };

  const confirmApprove = async () => {
    if (!current) return;
    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/aprobar`, { comentario_decision: approveComment || null });
      if (r.data?.exito) {
        closeApprove();
        fetchSolicitudes(estado ? { estado } : {});
      } else {
        setError(r.data?.mensaje || 'No se pudo aprobar');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const openReject = (row) => {
    if (!permissions.canReject) return;
    setCurrent(row);
    setRejectComment('');
    setRejectOpen(true);
  };

  const closeReject = () => { setRejectOpen(false); setCurrent(null); setRejectComment(''); };

  const reject = async () => {
    if (!current) return;
    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/rechazar`, { comentario_decision: rejectComment || null });
      if (r.data?.exito) {
        closeReject();
        fetchSolicitudes(estado ? { estado } : {});
      } else {
        setError(r.data?.mensaje || 'No se pudo rechazar');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Solicitudes</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario, correo, espacio o estado"
              className="border rounded-l px-4 py-2 w-full"
              disabled={!permissions.canView}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
              disabled={!permissions.canView}
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={estado}
            onChange={handleEstadoChange}
            className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
            disabled={!permissions.canView}
          >
            <option value="">Sin filtro</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Correo</th>
                  <th className="px-4 py-2 text-left">Espacio</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Fecha Solicitud</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, i) => (
                  <tr key={r.id_solicitud} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-2">{r.id_solicitud}</td>
                    <td className="px-4 py-2">{r.usuario_nombre || '-'}</td>
                    <td className="px-4 py-2">{r.correo || '-'}</td>
                    <td className="px-4 py-2">{r.espacio_nombre || '-'}</td>
                    <td className="px-4 py-2 capitalize">{r.estado}</td>
                    <td className="px-4 py-2">{r.fecha_solicitud ? new Date(r.fecha_solicitud).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openView(r.id_solicitud)}
                        className="text-green-600 hover:text-green-800"
                        disabled={!permissions.canView}
                      >
                        Ver Datos
                      </button>
                      <button
                        onClick={() => openApprove(r)}
                        className={`text-blue-600 hover:text-blue-800 ${!canAct(r) || !permissions.canApprove ? 'opacity-40 cursor-not-allowed' : ''}`}
                        disabled={!canAct(r) || !permissions.canApprove}
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => openReject(r)}
                        className={`text-red-600 hover:text-red-800 ${!canAct(r) || !permissions.canReject ? 'opacity-40 cursor-not-allowed' : ''}`}
                        disabled={!canAct(r) || !permissions.canReject}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>Sin datos</td>
                  </tr>
                )}
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
              Pagina {page} de {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit) || Math.ceil(total / limit) === 0}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-r hover:bg-gray-400 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {viewOpen && current && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Detalle de Solicitud</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">ID</div>
                <div className="font-medium">{current.id_solicitud}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Estado</div>
                <div className="font-medium capitalize">{current.estado}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Usuario</div>
                <div className="font-medium">{current.usuario_nombre || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Correo</div>
                <div className="font-medium">{current.correo || '-'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">Espacio</div>
                <div className="font-medium">{current.espacio_nombre || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fecha solicitud</div>
                <div className="font-medium">{current.fecha_solicitud ? new Date(current.fecha_solicitud).toLocaleString() : '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fecha decision</div>
                <div className="font-medium">{current.fecha_decision ? new Date(current.fecha_decision).toLocaleString() : '-'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">Motivo</div>
                <div className="font-medium whitespace-pre-wrap">{current.motivo || '-'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-gray-600">Comentario decision</div>
                <div className="font-medium whitespace-pre-wrap">{current.comentario_decision || '-'}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={closeView} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {approveOpen && current && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Aprobar Solicitud</h3>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Comentario decision (opcional)</div>
              <textarea
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2 bg-gray-100"
                placeholder="Comentario de aprobacion"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeApprove} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                Cancelar
              </button>
              <button onClick={confirmApprove} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Confirmar aprobacion
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && current && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Rechazar Solicitud</h3>
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">Comentario decision (opcional)</div>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                className="w-full border rounded px-3 py-2 bg-gray-100"
                placeholder="Motivo del rechazo"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={closeReject} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                Cancelar
              </button>
              <button onClick={reject} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Solicitud;
