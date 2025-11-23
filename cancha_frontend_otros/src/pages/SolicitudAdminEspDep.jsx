/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useEffect, useState } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canApprove: true, canReject: true },
  DEFAULT:       { canView: false, canApprove: false, canReject: false }
};

const getEffectiveRole = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");

    // 1) Revisar si user.role o user.rol existe
    const direct = (u.role || u.rol || "").toUpperCase();
    if (direct === "ADMINISTRADOR") return "ADMINISTRADOR";

    // 2) Revisar si user.roles[] existe
    if (Array.isArray(u.roles)) {
      const r = u.roles.map(x => String(x).toUpperCase());
      if (r.includes("ADMINISTRADOR")) return "ADMINISTRADOR";
    }

    // 3) Decodificar el token
    const token = localStorage.getItem("token");
    if (token && token.split(".").length === 3) {
      try {
        const payload = JSON.parse(
          atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );

        // token.roles[] ?
        if (Array.isArray(payload.roles)) {
          const r = payload.roles.map(x => String(x).toUpperCase());
          if (r.includes("ADMINISTRADOR")) return "ADMINISTRADOR";
        }

        // token.rol ?
        if (payload.rol && String(payload.rol).toUpperCase() === "ADMINISTRADOR") {
          return "ADMINISTRADOR";
        }
      } catch {}
    }

    return "DEFAULT";
  } catch {
    return "DEFAULT";
  }
};

const SolicitudAdminEspDep = () => {
  const basePath = '/solicitud-admin-esp-dep';

  const [role, setRole] = useState(() => getEffectiveRole());
  const permissions = permissionsConfig[role] || permissionsConfig.DEFAULT;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estado, setEstado] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  const [current, setCurrent] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [approveComment, setApproveComment] = useState('');

  const fetchSolicitudes = async (params = {}) => {
    if (!permissions.canView) {
      setError('No tienes permisos');
      return;
    }
    setLoading(true);
    setError(null);

    const offset = (page - 1) * limit;
    const full = { ...params, limit, offset };

    try {
      let res;

      if (full.q)
        res = await api.get(`${basePath}/buscar`, { params: full });
      else if (full.estado)
        res = await api.get(`${basePath}/filtro`, { params: full });
      else
        res = await api.get(`${basePath}/datos-especificos`, { params: full });

      if (res.data?.exito) {
        const d = res.data.datos;
        setItems(d.solicitudes || []);
        setTotal(d.paginacion?.total || 0);
      } else {
        setError(res.data?.mensaje || 'Error al cargar');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  const params = {};
  if (appliedSearch.trim()) {
    params.q = appliedSearch.trim();
  } else if (estado) {
    params.estado = estado;
  }
  fetchSolicitudes(params);
}, [page, role, estado, appliedSearch]);


  const handleSearch = (e) => {
  e.preventDefault();
  setPage(1);
  setAppliedSearch(searchTerm.trim());
};


  const handleEstadoChange = (e) => {
  const v = e.target.value;
  setEstado(v);
  setPage(1);
  setAppliedSearch('');
  setSearchTerm('');
};


  const openView = async (id) => {
    try {
      const r = await api.get(`${basePath}/dato-individual/${id}`);
      if (r.data?.exito) {
        setCurrent(r.data.datos?.solicitud || null);
        setViewOpen(true);
      } else {
        setError('No se pudo obtener');
      }
    } catch {
      setError('Error de conexión');
    }
  };

  const closeView = () => {
    setViewOpen(false);
    setCurrent(null);
  };

  const canAct = (row) => row?.estado === 'pendiente';

  const openApprove = (row) => {
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
      const r = await api.post(`${basePath}/${current.id_solicitud}/aprobar`, {
        comentario_decision: approveComment || null
      });

      if (r.data?.exito) {
        closeApprove();
        fetchSolicitudes(estado ? { estado } : {});
      } else setError('No se pudo aprobar');
    } catch {
      setError('Error de conexión');
    }
  };

  const openReject = (row) => {
    setCurrent(row);
    setRejectComment('');
    setRejectOpen(true);
  };

  const closeReject = () => {
    setRejectOpen(false);
    setCurrent(null);
    setRejectComment('');
  };

  const reject = async () => {
    if (!current) return;
    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/rechazar`, {
        comentario_decision: rejectComment || null
      });

      if (r.data?.exito) {
        closeReject();
        fetchSolicitudes(estado ? { estado } : {});
      } else setError('No se pudo rechazar');
    } catch {
      setError('Error de conexión');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!permissions.canView) return <p>No tienes permisos</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Gestión de Solicitudes de Administración de Espacios
      </h2>

      {/* BUSCADOR + FILTRO */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="border rounded-l px-4 py-2 w-full"
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-r">
              Buscar
            </button>
          </form>
        </div>

        <div>
          <select
            value={estado}
            onChange={handleEstadoChange}
            className="border rounded px-3 py-2"
          >
            <option value="">Sin filtro</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      {/* TABLA */}
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
                    <td className="px-4 py-2">
                      {r.fecha_solicitud ? new Date(r.fecha_solicitud).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openView(r.id_solicitud)}
                        className="text-green-600"
                      >
                        Ver Datos
                      </button>

                      <button
                        onClick={() => openApprove(r)}
                        disabled={!canAct(r)}
                        className={`text-blue-600 ${!canAct(r) ? 'opacity-40' : ''}`}
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() => openReject(r)}
                        disabled={!canAct(r)}
                        className={`text-red-600 ${!canAct(r) ? 'opacity-40' : ''}`}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          <div className="flex justify-center mt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="bg-gray-300 px-4 py-2 rounded-l disabled:opacity-50"
            >
              Anterior
            </button>

            <span className="px-4 py-2 bg-gray-100">
              Página {page} de {Math.ceil(total / limit) || 1}
            </span>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="bg-gray-300 px-4 py-2 rounded-r disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {viewOpen && current && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100 transform transition-all duration-200">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Detalle de solicitud</h3>
          <p className="text-xs text-gray-500">
            Revisa la informacion completa de la solicitud seleccionada
          </p>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
            ${
              current.estado === 'aprobada'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : current.estado === 'rechazada'
                ? 'bg-red-50 text-red-700 border border-red-100'
                : current.estado === 'pendiente'
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'bg-gray-50 text-gray-700 border border-gray-100'
            }
          `}
        >
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
          {current.estado || 'Sin estado'}
        </span>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Id solicitud
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {current.id_solicitud}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Usuario
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {current.usuario_nombre || '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Correo
            </div>
            <div className="text-sm text-gray-800">
              {current.correo || '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Estado
            </div>
            <div className="text-sm text-gray-800 capitalize">
              {current.estado || '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Fecha solicitud
            </div>
            <div className="text-sm text-gray-800">
              {current.fecha_solicitud
                ? new Date(current.fecha_solicitud).toLocaleString()
                : '-'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Fecha decision
            </div>
            <div className="text-sm text-gray-800">
              {current.fecha_decision
                ? new Date(current.fecha_decision).toLocaleString()
                : '-'}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Motivo
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
              {current.motivo || '-'}
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Comentario decision
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
              {current.comentario_decision || '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        <button
          onClick={closeView}
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}

{approveOpen && current && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 transform transition-all duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Aprobar solicitud</h3>
          <p className="text-xs text-gray-500">
            Confirma la aprobacion y agrega un comentario si lo ves necesario
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 text-emerald-600 px-3 py-1 text-xs font-medium flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Aprobar
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600 flex flex-col gap-1">
          <span className="font-semibold text-gray-800 text-sm">
            {current.usuario_nombre || "Usuario sin nombre"}
          </span>
          <span>Solicitud #{current.id_solicitud}</span>
          <span>{current.espacio_nombre || "Sin espacio asignado"}</span>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
            Comentario decision (opcional)
          </div>
          <textarea
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition"
            placeholder="Escribe un breve comentario de aprobacion"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        <button
          onClick={closeApprove}
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={confirmApprove}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Confirmar aprobacion
        </button>
      </div>
    </div>
  </div>
)}

{rejectOpen && current && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 transform transition-all duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Rechazar solicitud</h3>
          <p className="text-xs text-gray-500">
            Explica brevemente el motivo del rechazo para dejar registro claro
          </p>
        </div>
        <div className="rounded-full bg-red-50 text-red-600 px-3 py-1 text-xs font-medium flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Rechazar
        </div>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600 flex flex-col gap-1">
          <span className="font-semibold text-gray-800 text-sm">
            {current.usuario_nombre || "Usuario sin nombre"}
          </span>
          <span>Solicitud #{current.id_solicitud}</span>
          <span>{current.espacio_nombre || "Sin espacio asignado"}</span>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
            Comentario decision (opcional)
          </div>
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition"
            placeholder="Describe de forma breve el motivo del rechazo"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        <button
          onClick={closeReject}
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={reject}
          className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Confirmar rechazo
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default SolicitudAdminEspDep;