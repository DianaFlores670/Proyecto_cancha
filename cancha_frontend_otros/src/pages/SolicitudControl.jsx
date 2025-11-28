/* eslint-disable no-unused-vars */
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

    if (norm.includes("ADMINISTRADOR") || norm.includes("ADMIN"))
      return "ADMINISTRADOR";

    return "DEFAULT";
  } catch {
    return "DEFAULT";
  }
};

const SolicitudControl = () => {
  const basePath = "/solicitud-control";

  const [role] = useState(() => getEffectiveRole());
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
  const [mobileModal, setMobileModal] = useState(null);

  const [current, setCurrent] = useState(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const estadoBadge = (e) =>
    e === "pendiente"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : e === "aprobada"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : e === "rechazada"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-gray-100 text-gray-700 border-gray-300";

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
        setError(res.data?.mensaje || "Error al cargar datos");
      }
    } catch {
      setError("Error de conexion");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSolicitudes(estado ? { estado } : {});
  }, [page, estado, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setError("");
    setSuccess("");

    if (searchTerm.trim()) fetchSolicitudes({ q: searchTerm });
    else fetchSolicitudes(estado ? { estado } : {});
  };

  const openView = async (id) => {
    try {
      const r = await api.get(`${basePath}/dato-individual/${id}`);
      if (r.data?.exito) {
        setCurrent(r.data.datos.solicitud);
        setViewOpen(true);
      }
    } catch {
      setError("No se pudo abrir detalle");
    }
  };

  const openApprove = (row) => {
    setCurrent(row);
    setApproveComment("");
    setApproveOpen(true);
  };

  const openReject = (row) => {
    setCurrent(row);
    setRejectComment("");
    setRejectOpen(true);
  };

  const confirmApprove = async () => {
    if (!current) return;
    setLoadingAction(true);

    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/aprobar`, {
        comentario_decision: approveComment || null
      });

      if (r.data?.exito) {
        setSuccess("Solicitud aprobada");

        setItems(prev =>
          prev.map(row =>
            row.id_solicitud === current.id_solicitud
              ? { ...row, estado: "aprobada" }
              : row
          )
        );

        setTimeout(() => setApproveOpen(false), 200);
        fetchSolicitudes(estado ? { estado } : {});
      } else {
        setError(r.data?.mensaje || "Error al aprobar");
      }
    } catch {
      setError("Error de conexion");
    }

    setLoadingAction(false);
  };

  const confirmReject = async () => {
    if (!current) return;
    setLoadingAction(true);

    try {
      const r = await api.post(`${basePath}/${current.id_solicitud}/rechazar`, {
        comentario_decision: rejectComment || null
      });

      if (r.data?.exito) {
        setSuccess("Solicitud rechazada");

        setItems(prev =>
          prev.map(row =>
            row.id_solicitud === current.id_solicitud
              ? { ...row, estado: "rechazada" }
              : row
          )
        );

        setTimeout(() => setRejectOpen(false), 200);
        fetchSolicitudes(estado ? { estado } : {});
      } else {
        setError(r.data?.mensaje || "Error al rechazar");
      }
    } catch {
      setError("Error de conexion");
    }

    setLoadingAction(false);
  };

  const canAct = (row) => row?.estado === "pendiente";

  if (!permissions.canView)
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        No tienes permisos para ver solicitudes
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">

      {/* TITULO */}
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Solicitudes de usuarios de Control
      </h2>

      {/* BUSCADOR + FILTRO */}
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">

          {/* BUSCADOR */}
          <form
            onSubmit={handleSearch}
            className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar solicitud..."
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
            />
            <button
              type="submit"
              className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full"
            >
              Buscar
            </button>
          </form>

          {/* SELECT ESTADO */}
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
          >
            <option value="">Sin filtro</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobada">Aprobada</option>
            <option value="rechazada">Rechazada</option>
          </select>
        </div>
      </div>

      {/* LOADING / ERROR */}
      {loading && <p className="text-center py-6">Cargando...</p>}
      {error && <p className="text-red-500 text-md">{error}</p>}

      {!loading && !error && (
        <>
          {/* TABLA DESKTOP */}
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
                  <tr
                    key={r.id_solicitud}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">{r.id_solicitud}</td>
                    <td className="px-4 py-3">{r.usuario_nombre}</td>
                    <td className="px-4 py-3">{r.correo}</td>
                    <td className="px-4 py-3">{r.espacio_nombre}</td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs border ${estadoBadge(
                          r.estado
                        )}`}
                      >
                        {r.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {r.fecha_solicitud
                        ? new Date(r.fecha_solicitud).toLocaleString()
                        : "-"}
                    </td>

                    <td className="px-4 py-3 flex gap-3">
                      <button
                        onClick={() => openView(r.id_solicitud)}
                        className="text-green-600 font-medium"
                      >
                        Ver
                      </button>

                      <button
                        onClick={() => openApprove(r)}
                        disabled={!canAct(r)}
                        className={`text-blue-600 font-medium ${!canAct(r) ? "opacity-40" : ""
                          }`}
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() => openReject(r)}
                        disabled={!canAct(r)}
                        className={`text-red-600 font-medium ${!canAct(r) ? "opacity-40" : ""
                          }`}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}

                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-6 text-gray-500 text-md"
                    >
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {items.map((r) => (
              <div
                key={r.id_solicitud}
                className="border bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-[#23475F]">
                    Solicitud #{r.id_solicitud}
                  </span>

                  <button onClick={() => setMobileModal(r)}>
                    <FiMoreVertical size={22} />
                  </button>
                </div>

                <div className="mt-2 text-sm space-y-1">
                  <div>
                    <span className="font-semibold">Usuario: </span>
                    {r.usuario_nombre}
                  </div>
                  <div>
                    <span className="font-semibold">Correo: </span>
                    {r.correo}
                  </div>
                  <div>
                    <span className="font-semibold">Espacio: </span>
                    {r.espacio_nombre}
                  </div>

                  <div className="mt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs border ${estadoBadge(
                        r.estado
                      )}`}
                    >
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

          {/* PAGINACION STICKY */}
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-50">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <div className="px-4 py-2 bg-gray-100 rounded-full">
              Pag {page} de {Math.ceil(total / limit)}
            </div>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {/* MINI MODAL ACCIONES MOBILE */}
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
                className={`px-3 py-2 text-left hover:bg-gray-100 ${!canAct(mobileModal) ? "opacity-40" : ""
                  }`}
              >
                Aprobar
              </button>

              <button
                onClick={() => {
                  if (!canAct(mobileModal)) return;
                  setMobileModal(null);
                  openReject(mobileModal);
                }}
                className={`px-3 py-2 text-left hover:bg-gray-100 ${!canAct(mobileModal) ? "opacity-40" : ""
                  }`}
              >
                Rechazar
              </button>

              <button
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
                onClick={() => setMobileModal(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER */}
      {viewOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200 p-5">

            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Detalle</h3>
                <p className="text-xs text-gray-500">Informacion completa</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs border font-medium ${estadoBadge(
                  current.estado
                )}`}
              >
                {current.estado}
              </span>
            </div>

            <div className="space-y-4 text-md">

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">ID</div>
                <div className="font-semibold">{current.id_solicitud}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Usuario</div>
                <div>{current.usuario_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Correo</div>
                <div>{current.correo}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Espacio</div>
                <div>{current.espacio_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Fecha solicitud</div>
                <div>
                  {current.fecha_solicitud
                    ? new Date(current.fecha_solicitud).toLocaleString()
                    : "-"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Motivo</div>
                <div className="rounded-xl bg-gray-50 border px-3 py-2 whitespace-pre-wrap">
                  {current.motivo || "-"}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">
                  Comentario decision
                </div>
                <div className="rounded-xl bg-gray-50 border px-3 py-2 whitespace-pre-wrap">
                  {current.comentario_decision || "-"}
                </div>
              </div>

            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setViewOpen(false)}
                className="px-5 py-2 bg-gray-200 rounded-full text-md hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APROBAR */}
      {approveOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200 p-5">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Aprobar solicitud</h3>
              <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">
                Aprobar
              </span>
            </div>

            <div className="space-y-4 text-md">
              <div className="bg-gray-50 border rounded-xl px-3 py-2">
                <div className="font-semibold">{current.usuario_nombre}</div>
                <div>Solicitud #{current.id_solicitud}</div>
                <div>{current.espacio_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">
                  Comentario (opcional)
                </div>
                <textarea
                  rows={4}
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  className="w-full rounded-xl border bg-gray-50 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setApproveOpen(false)}
                className="px-5 py-2 bg-gray-200 rounded-full text-md"
              >
                Cancelar
              </button>
              <button
                onClick={confirmApprove}
                disabled={loadingAction}
                className="px-5 py-2 bg-emerald-600 text-white rounded-full text-md"
              >
                {loadingAction ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECHAZAR */}
      {rejectOpen && current && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200 p-5">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-600">Rechazar solicitud</h3>
              <span className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full">
                Rechazar
              </span>
            </div>

            <div className="space-y-4 text-md">
              <div className="bg-gray-50 border rounded-xl px-3 py-2">
                <div className="font-semibold">{current.usuario_nombre}</div>
                <div>Solicitud #{current.id_solicitud}</div>
                <div>{current.espacio_nombre}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-semibold text-gray-500">
                  Comentario
                </div>
                <textarea
                  rows={4}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full rounded-xl border bg-gray-50 px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setRejectOpen(false)}
                className="px-5 py-2 bg-gray-200 rounded-full text-md"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                disabled={loadingAction}
                className="px-5 py-2 bg-red-600 text-white rounded-full text-md"
              >
                {loadingAction ? "Procesando..." : "Rechazar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXITO */}
      {success && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-64 p-5 rounded-2xl shadow-xl text-center animate-scaleIn">
            <h3 className="font-bold text-[#23475F] text-lg mb-2">Exito</h3>
            <p className="text-md text-gray-700">{success}</p>
            <button
              onClick={() => setSuccess("")}
              className="mt-4 bg-[#23475F] text-white px-4 py-2 rounded-full text-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SolicitudControl;