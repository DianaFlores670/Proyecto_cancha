/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useEffect, useState } from "react";
import api from "../services/api";

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canApprove: true, canReject: true },
  DEFAULT: { canView: false, canApprove: false, canReject: false }
};

const getEffectiveRole = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const bag = new Set();

    if (Array.isArray(u.roles)) {
      for (const r of u.roles) {
        if (typeof r === "string") bag.add(r);
        else if (r && typeof r === "object") {
          ["rol", "role", "nombre", "name"].forEach((k) => {
            if (r[k]) bag.add(r[k]);
          });
        }
      }
    }

    if (u.role) bag.add(u.role);
    if (u.rol) bag.add(u.rol);

    const norm = Array.from(bag).map((v) =>
      String(v || "").trim().toUpperCase().replace(/\s+/g, "_")
    );

    if (norm.includes("ADMINISTRADOR") || norm.includes("ADMIN")) {
      return "ADMINISTRADOR";
    }

    return "DEFAULT";
  } catch {
    return "DEFAULT";
  }
};

const SolicitudControl = () => {
  const basePath = "/solicitud-control";

  const [role, setRole] = useState(() => getEffectiveRole());
  const permissions = permissionsConfig[role] || permissionsConfig.DEFAULT;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [estado, setEstado] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [current, setCurrent] = useState(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  const fetchSolicitudes = async (params = {}) => {
    if (!permissions.canView) return;

    setLoading(true);
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
        setItems(res.data.datos.solicitudes || []);
        setTotal(res.data.datos.paginacion.total || 0);
      } else {
        setError(res.data?.mensaje || "Error al cargar solicitudes");
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes(estado ? { estado } : {});
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);

    if (searchTerm.trim()) fetchSolicitudes({ q: searchTerm });
    else fetchSolicitudes(estado ? { estado } : {});
  };

  const handleEstadoChange = (e) => {
    const value = e.target.value;
    setEstado(value);
    setPage(1);
    fetchSolicitudes(value ? { estado: value } : {});
  };

  const openView = async (id) => {
    try {
      const r = await api.get(`${basePath}/dato-individual/${id}`);
      if (r.data?.exito) {
        setCurrent(r.data.datos.solicitud);
        setViewOpen(true);
      }
    } catch {
      setError("No se pudo obtener el detalle");
    }
  };

  const closeView = () => {
    setViewOpen(false);
    setCurrent(null);
  };

  const openApprove = (row) => {
    setCurrent(row);
    setApproveComment("");
    setApproveOpen(true);
  };

  const closeApprove = () => {
    setApproveOpen(false);
    setApproveComment("");
    setCurrent(null);
  };

  const confirmApprove = async () => {
    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/aprobar`, {
        comentario_decision: approveComment || null
      });

      if (r.data?.exito) {
        setSuccess("Solicitud aprobada correctamente.");
        closeApprove();
        fetchSolicitudes(estado ? { estado } : {});
      } else {
        setError("No se pudo aprobar.");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  const openReject = (row) => {
    setCurrent(row);
    setRejectComment("");
    setRejectOpen(true);
  };

  const closeReject = () => {
    setRejectOpen(false);
    setRejectComment("");
    setCurrent(null);
  };

  const confirmReject = async () => {
    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/rechazar`, {
        comentario_decision: rejectComment || null
      });

      if (r.data?.exito) {
        setSuccess("Solicitud rechazada correctamente.");
        closeReject();
        fetchSolicitudes(estado ? { estado } : {});
      } else {
        setError("No se pudo rechazar");
      }
    } catch {
      setError("Error de conexión");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  const canAct = (row) => row?.estado === "pendiente";

  if (!permissions.canView)
    return <p>No tienes permisos para ver solicitudes.</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">
        Solicitudes de Control
      </h2>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 mb-4 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 text-green-700 px-4 py-2 mb-4 rounded">
          {success}
        </div>
      )}

      {/* BUSCADOR */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario, correo o espacio"
              className="border rounded-l px-4 py-2 w-full"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r"
            >
              Buscar
            </button>
          </form>
        </div>

        <select
          value={estado}
          onChange={handleEstadoChange}
          className="border rounded px-3 py-2"
        >
          <option value="">Sin filtro</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
      </div>

      {/* TABLA */}
      {loading ? (
        <p>Cargando...</p>
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
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {items.map((row, i) => (
                  <tr key={row.id_solicitud} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-2">{row.id_solicitud}</td>
                    <td className="px-4 py-2">{row.usuario_nombre || "-"}</td>
                    <td className="px-4 py-2">{row.correo || "-"}</td>
                    <td className="px-4 py-2">{row.espacio_nombre || "-"}</td>
                    <td className="px-4 py-2 capitalize">{row.estado}</td>
                    <td className="px-4 py-2">
                      {row.fecha_solicitud
                        ? new Date(row.fecha_solicitud).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openView(row.id_solicitud)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Ver
                      </button>

                      <button
                        onClick={() => openApprove(row)}
                        disabled={!canAct(row)}
                        className={`text-blue-600 hover:text-blue-800 ${
                          !canAct(row) ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() => openReject(row)}
                        disabled={!canAct(row)}
                        className={`text-red-600 hover:text-red-800 ${
                          !canAct(row) ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
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
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-l disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100">
              Página {page} de {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-r disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* MODAL VER */}
      {viewOpen && current && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100 transform transition-all duration-200">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Detalle de solicitud</h3>
          <p className="text-xs text-gray-500">
            Revisa la informacion de la solicitud seleccionada
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
            ${
              current.estado === "aprobada"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : current.estado === "rechazada"
                ? "bg-red-50 text-red-700 border border-red-100"
                : current.estado === "pendiente"
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-gray-50 text-gray-700 border border-gray-100"
            }
          `}
        >
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
          {current.estado || "Sin estado"}
        </span>
      </div>

      <div className="px-6 py-5">
        <div className="space-y-3 text-sm text-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Id solicitud
              </div>
              <div className="font-semibold text-gray-900">
                {current.id_solicitud}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Usuario
              </div>
              <div className="font-semibold text-gray-900">
                {current.usuario_nombre || "-"}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Correo
              </div>
              <div>{current.correo || "-"}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Espacio
              </div>
              <div>{current.espacio_nombre || "-"}</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Fecha solicitud
              </div>
              <div>
                {current.fecha_solicitud
                  ? new Date(current.fecha_solicitud).toLocaleString()
                  : "-"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Motivo
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm whitespace-pre-wrap">
              {current.motivo || "-"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Comentario decision
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm whitespace-pre-wrap">
              {current.comentario_decision || "-"}
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
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
            Comentario decision (opcional)
          </div>
          <textarea
            rows={4}
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
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
          Confirmar
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
            Explica de forma breve el motivo del rechazo
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
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
            Comentario decision (opcional)
          </div>
          <textarea
            rows={4}
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500 transition"
            placeholder="Motivo del rechazo"
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
          onClick={confirmReject}
          className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Rechazar
        </button>
      </div>
    </div>
  </div>
)}


    </div>
  );
};

export default SolicitudControl;
