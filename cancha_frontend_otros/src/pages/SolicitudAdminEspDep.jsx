/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-empty */

import React, { useEffect, useState } from "react";
import api from "../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canApprove: true, canReject: true },
  DEFAULT: { canView: false, canApprove: false, canReject: false }
};

const getEffectiveRole = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");

    const direct = (u.role || u.rol || "").toUpperCase();
    if (direct === "ADMINISTRADOR") return "ADMINISTRADOR";

    if (Array.isArray(u.roles)) {
      const rolesList = u.roles.map((x) => String(x).toUpperCase());
      if (rolesList.includes("ADMINISTRADOR")) return "ADMINISTRADOR";
    }

    const token = localStorage.getItem("token");
    if (token && token.split(".").length === 3) {
      try {
        const payload = JSON.parse(
          atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );

        if (Array.isArray(payload.roles)) {
          const r = payload.roles.map((x) => String(x).toUpperCase());
          if (r.includes("ADMINISTRADOR")) return "ADMINISTRADOR";
        }

        if (payload.rol && String(payload.rol).toUpperCase() === "ADMINISTRADOR") {
          return "ADMINISTRADOR";
        }
      } catch { }
    }

    return "DEFAULT";
  } catch {
    return "DEFAULT";
  }
};

const SolicitudAdminEspDep = () => {
  const basePath = "/solicitud-admin-esp-dep";

  const [role] = useState(getEffectiveRole());
  const permissions = permissionsConfig[role] || permissionsConfig.DEFAULT;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [estado, setEstado] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [mobileModal, setMobileModal] = useState(null);

  const [current, setCurrent] = useState(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  const fetchSolicitudes = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos");
      return;
    }

    setLoading(true);
    setError("");

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
        const data = res.data.datos;
        setItems(data.solicitudes || []);
        setTotal(data.paginacion?.total || 0);
      } else {
        setError(res.data?.mensaje || "Error al cargar");
      }
    } catch {
      setError("Error de conexion");
    }

    setLoading(false);
  };

  useEffect(() => {
    const params = {};
    if (appliedSearch.trim()) params.q = appliedSearch.trim();
    else if (estado) params.estado = estado;

    fetchSolicitudes(params);
  }, [page, estado, appliedSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchTerm.trim());
  };

  const handleEstadoChange = (e) => {
    const v = e.target.value;
    setEstado(v);
    setPage(1);
    setAppliedSearch("");
    setSearchTerm("");
  };

  const openView = async (id) => {
    try {
      const r = await api.get(`${basePath}/dato-individual/${id}`);
      if (r.data?.exito) {
        setCurrent(r.data.datos?.solicitud || null);
        setViewOpen(true);
      }
    } catch {
      setError("Error al obtener datos");
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
    if (!current) return;
    try {
      await api.post(`${basePath}/${current.id_solicitud}/aprobar`, {
        comentario_decision: approveComment || null
      });

      closeApprove();
      setSuccessMsg("Solicitud aprobada correctamente.");
      fetchSolicitudes(estado ? { estado } : {});
    } catch {
      setError("Error al aprobar");
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
    if (!current) return;
    try {
      await api.post(`${basePath}/${current.id_solicitud}/rechazar`, {
        comentario_decision: rejectComment || null
      });

      closeReject();
      setSuccessMsg("Solicitud rechazada correctamente.");
      fetchSolicitudes(estado ? { estado } : {});
    } catch {
      setError("Error al rechazar");
    }
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= Math.ceil(total / limit)) setPage(p);
  };

  const canAct = (row) => row?.estado === "pendiente";

  const estadoBadge = (e) =>
    e === "pendiente"
      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
      : e === "aprobada"
        ? "bg-green-100 text-green-700 border-green-300"
        : e === "rechazada"
          ? "bg-red-100 text-red-700 border-red-300"
          : "bg-gray-100 text-gray-700 border-gray-300";

  if (!permissions.canView) return <p>No tienes permisos</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">

      {/* TITULO */}
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Solicitudes de Administradores
      </h2>

      {/* BUSCADOR / FILTRO */}
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">

          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm px-0">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent flex-1 px-3 py-2 focus:outline-none text-md"
              placeholder="Buscar solicitud..."
            />
            <button className="bg-[#23475F] text-white rounded-full px-5 text-md">Buscar</button>
          </form>

          <select
            value={estado}
            onChange={handleEstadoChange}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
          >
            <option value="">Sin filtro</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      {/* LOADING / ERROR */}
      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Correo</th>
                  <th className="px-4 py-3 text-left">Espacio</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>

              <tbody className="text-md">
                {items.map((r, i) => (
                  <tr key={r.id_solicitud} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">{r.id_solicitud}</td>
                    <td className="px-4 py-3">{r.usuario_nombre}</td>
                    <td className="px-4 py-3">{r.correo}</td>
                    <td className="px-4 py-3">{r.espacio_nombre}</td>

                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs border ${estadoBadge(r.estado)}`}>
                        {r.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {r.fecha_solicitud ? new Date(r.fecha_solicitud).toLocaleString() : "-"}
                    </td>

                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openView(r.id_solicitud)} className="text-green-600 font-medium">
                        Ver
                      </button>
                      <button
                        onClick={() => openApprove(r)}
                        disabled={!canAct(r)}
                        className={`text-blue-600 font-medium ${!canAct(r) ? "opacity-40" : ""}`}
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => openReject(r)}
                        disabled={!canAct(r)}
                        className={`text-red-600 font-medium ${!canAct(r) ? "opacity-40" : ""}`}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {items.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-md">Sin datos</div>
            )}
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {items.map((r) => (
              <div key={r.id_solicitud} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-[#23475F]">Solicitud #{r.id_solicitud}</span>
                  <button onClick={() => setMobileModal(r)}>
                    <FiMoreVertical size={22} />
                  </button>
                </div>

                <div className="mt-2 text-sm space-y-1">
                  <div><span className="font-semibold">Usuario: </span>{r.usuario_nombre}</div>
                  <div><span className="font-semibold">Correo: </span>{r.correo}</div>
                  <div><span className="font-semibold">Espacio: </span>{r.espacio_nombre}</div>

                  <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs border ${estadoBadge(r.estado)}`}>
                      {r.estado}
                    </span>
                  </div>
                </div>
              </div>
            ))}
                        {/* PAGINACION SOLO MOVIL */}
            <div className="md:hidden w-full flex justify-center items-center gap-3 py-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Anterior
              </button>

              <div className="px-4 py-2 bg-gray-100 rounded-full text-sm">
                Pag {page} de {Math.ceil(total / limit) || 1}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === Math.ceil(total / limit)}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          {/* PAGINATION */}
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-50">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <div className="px-4 py-2 bg-gray-100 rounded-full">
              Pag {page} de {Math.ceil(total / limit)}
            </div>
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

      {/* MOBILE MINI MODAL */}
      {mobileModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-72 p-5 shadow-xl animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#23475F] text-lg">Opciones</h3>
              <button onClick={() => setMobileModal(null)}><FiX size={20} /></button>
            </div>

            <div className="flex flex-col text-sm">

              <button
                onClick={() => {
                  setMobileModal(null);
                  openView(mobileModal.id_solicitud);
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              <button
                onClick={() => {
                  if (!canAct(mobileModal)) return;
                  setMobileModal(null);
                  openApprove(mobileModal);
                }}
                className={`px-3 py-2 text-left hover:bg-gray-100 ${!canAct(mobileModal) ? "opacity-40" : ""}`}
              >
                Aprobar
              </button>

              <button
                onClick={() => {
                  if (!canAct(mobileModal)) return;
                  setMobileModal(null);
                  openReject(mobileModal);
                }}
                className={`px-3 py-2 text-left hover:bg-gray-100 ${!canAct(mobileModal) ? "opacity-40" : ""}`}
              >
                Rechazar
              </button>

              <button
                onClick={() => setMobileModal(null)}
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER DATOS */}
      {viewOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div
            className="
        bg-white rounded-2xl shadow-2xl border border-gray-200
        w-full max-w-lg
        max-h-[80vh]
        overflow-y-auto
        p-5
      "
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Detalle de solicitud</h3>
                <p className="text-xs text-gray-500">Informacion detallada</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${estadoBadge(
                  current.estado
                )}`}
              >
                {current.estado}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-4 text-md">
              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">ID Solicitud</div>
                <div className="font-semibold">{current.id_solicitud}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">Usuario</div>
                <div className="font-semibold">{current.usuario_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">Correo</div>
                <div>{current.correo}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">Espacio</div>
                <div>{current.espacio_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">Fecha solicitud</div>
                <div>{current.fecha_solicitud ? new Date(current.fecha_solicitud).toLocaleString() : "-"}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">Motivo</div>
                <div className="rounded-xl bg-gray-50 border px-3 py-2 whitespace-pre-wrap">
                  {current.motivo || "-"}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase text-gray-500">
                  Comentario decision
                </div>
                <div className="rounded-xl bg-gray-50 border px-3 py-2 whitespace-pre-wrap">
                  {current.comentario_decision || "-"}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex justify-end">
              <button
                onClick={closeView}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      )}

      {/* APROBAR */}
      {approveOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div
            className="
        bg-white rounded-2xl shadow-2xl border border-gray-200
        w-full max-w-lg
        max-h-[80vh]
        overflow-y-auto
        p-5
      "
          >

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Aprobar solicitud</h3>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                Aprobar
              </span>
            </div>

            {/* Content */}
            <div className="space-y-4 text-md">

              <div className="border bg-gray-50 px-3 py-2 rounded-xl">
                <div className="font-semibold">{current.usuario_nombre}</div>
                <div>Solicitud #{current.id_solicitud}</div>
                <div>{current.espacio_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Comentario</div>
                <textarea
                  rows={4}
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  className="w-full rounded-xl border bg-gray-50 px-3 py-2"
                  placeholder="Comentario (opcional)"
                />
              </div>

            </div>

            {/* Footer sin sticky */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={closeApprove}
                className="px-5 py-2 bg-gray-200 rounded-full text-md text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

              <button
                onClick={confirmApprove}
                className="px-5 py-2 bg-emerald-600 rounded-full text-md font-medium text-white hover:bg-emerald-700"
              >
                Confirmar
              </button>
            </div>

          </div>

        </div>
      )}

      {/* RECHAZAR */}
      {rejectOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">

          <div
            className="
        bg-white rounded-2xl shadow-2xl border border-gray-200
        w-full max-w-lg
        max-h-[80vh]
        overflow-y-auto
        p-5
      "
          >

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-red-600">Rechazar solicitud</h3>

              <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">
                Rechazar
              </span>
            </div>

            {/* Content */}
            <div className="space-y-4 text-md">

              <div className="border bg-gray-50 px-3 py-2 rounded-xl">
                <div className="font-semibold">{current.usuario_nombre}</div>
                <div>Solicitud #{current.id_solicitud}</div>
                <div>{current.espacio_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Comentario</div>
                <textarea
                  rows={4}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full rounded-xl border bg-gray-50 px-3 py-2"
                  placeholder="Motivo del rechazo"
                />
              </div>

            </div>

            {/* Footer sin sticky */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={closeReject}
                className="px-5 py-2 bg-gray-200 rounded-full text-md text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

              <button
                onClick={confirmReject}
                className="px-5 py-2 bg-red-600 rounded-full text-md font-medium text-white hover:bg-red-700"
              >
                Rechazar
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAL DE EXITO */}
      {successMsg && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white shadow-xl rounded-2xl w-64 p-5 text-center animate-scaleIn">

            <h3 className="font-bold text-[#23475F] text-lg mb-2">Exito</h3>
            <p className="text-md text-gray-700">{successMsg}</p>

            <button
              onClick={() => setSuccessMsg("")}
              className="mt-4 bg-[#23475F] text-white px-4 py-2 rounded-full text-md hover:bg-[#1d3a4e]"
            >
              Cerrar
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default SolicitudAdminEspDep;