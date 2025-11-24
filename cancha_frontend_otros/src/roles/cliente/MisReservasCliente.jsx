/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import Header from "../../Header";

const canLeaveReview = (reserva) => {
  if (!reserva) return false;
  if (reserva.estado !== "pagada") return false;
  if (!reserva.fecha_reserva) return false;
  const now = new Date();
  const fecha = new Date(reserva.fecha_reserva);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha.getTime() <= now.getTime();
};

const getUserRoles = (u) => {
  if (Array.isArray(u?.roles))
    return u.roles.map((r) => String(r?.rol ?? r).toUpperCase());
  if (u?.role) return [String(u.role).toUpperCase()];
  return [];
};

const pickRoleForThisPage = (u) => {
  const roles = getUserRoles(u);
  if (roles.includes("CLIENTE")) return "CLIENTE";
  return "DEFAULT";
};

const getImageUrl = (path) => {
  if (!path) return "";

  // Asegurarse de que la ruta comience con /
  const clean = path.startsWith("/") ? path : `/${path}`;

  // Dominio público donde está tu backend
  const base = "https://proyecto-cancha.onrender.com";

  return `${base}${clean}`;
};

const MisReservasCliente = () => {
  const [role, setRole] = useState("DEFAULT");
  const [idCliente, setIdCliente] = useState(null);
  const [idPersona, setIdPersona] = useState(null);

  const [viewMode, setViewMode] = useState("RESPONSABLE");

  const [reservas, setReservas] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [qrData, setQrData] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editReserva, setEditReserva] = useState(null);
  const [editCupo, setEditCupo] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewReserva, setReviewReserva] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewMode, setReviewMode] = useState("create");

  const [detalleDepModalOpen, setDetalleDepModalOpen] = useState(false);
  const [detalleDepReserva, setDetalleDepReserva] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      setError("Usuario no autenticado");
      return;
    }
    try {
      const u = JSON.parse(userData);
      const r = pickRoleForThisPage(u);
      setRole(r);

      let idFromRoles = null;
      if (Array.isArray(u?.roles)) {
        const cl = u.roles.find(
          (rr) => String(rr?.rol ?? rr).toUpperCase() === "CLIENTE"
        );
        idFromRoles = cl?.datos?.id_cliente ?? null;
      }
      const finalIdCliente =
        r === "CLIENTE" ? idFromRoles ?? u.id_persona ?? null : null;
      setIdCliente(finalIdCliente);
      setIdPersona(u.id_persona ?? null);
    } catch (e) {
      setError("Error al leer datos de usuario");
    }
  }, []);

  const fetchReservasResponsable = async (
    search = "",
    filtro = "default",
    page = 1
  ) => {
    if (!idCliente) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let resp;
      const offset = (page - 1) * limit;

      if (search) {
        resp = await api.get("/reserva-cliente/buscar", {
          params: {
            q: search,
            id_cliente: idCliente,
            limit,
            offset,
          },
        });
      } else if (filtro !== "default") {
        resp = await api.get("/reserva-cliente/filtro", {
          params: {
            tipo: filtro,
            id_cliente: idCliente,
            limit,
            offset,
          },
        });
      } else {
        resp = await api.get("/reserva-cliente/datos-especificos", {
          params: {
            id_cliente: idCliente,
            limit,
            offset,
          },
        });
      }

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudieron cargar las reservas";
        setError(msg);
        setReservas([]);
        setTotal(0);
      } else {
        const datos = resp.data?.datos || {};
        setReservas(datos.reservas || []);
        setTotal(datos.paginacion?.total || 0);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error de conexion al cargar reservas";
      setError(msg);
      setReservas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchReservasDeportista = async (
    search = "",
    filtro = "default",
    page = 1
  ) => {
    if (!idPersona) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const offset = (page - 1) * limit;
      const params = {
        id_persona: idPersona,
        limit,
        offset,
      };
      if (search) {
        params.q = search;
      }
      if (filtro && filtro !== "default") {
        params.tipo = filtro;
      }

      const resp = await api.get("/reserva-deportista/mis-reservas", {
        params,
      });

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudieron cargar las reservas";
        setError(msg);
        setReservas([]);
        setTotal(0);
      } else {
        const datos = resp.data?.datos || {};
        setReservas(datos.reservas || []);
        setTotal(datos.paginacion?.total || 0);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error de conexion al cargar reservas";
      setError(msg);
      setReservas([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== "CLIENTE") return;
    if (viewMode === "RESPONSABLE" && idCliente) {
      fetchReservasResponsable(searchTerm, filter, currentPage);
    } else if (viewMode === "DEPORTISTA" && idPersona) {
      fetchReservasDeportista(searchTerm, filter, currentPage);
    }
  }, [role, idCliente, idPersona, viewMode, currentPage, filter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    if (viewMode === "RESPONSABLE") {
      fetchReservasResponsable(searchTerm, filter, 1);
    } else {
      fetchReservasDeportista(searchTerm, filter, 1);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleCancel = async (idReserva, estado) => {
    if (viewMode === "DEPORTISTA") return;
    if (estado === "cancelada" || estado === "pagada") return;
    const ok = window.confirm("Desea cancelar esta reserva?");
    if (!ok) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const resp = await api.delete(`/reserva-cliente/${idReserva}`, {
        params: { id_cliente: idCliente },
      });

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudo cancelar la reserva";
        setError(msg);
      } else {
        setSuccess("Reserva cancelada correctamente");
        fetchReservasResponsable(searchTerm, filter, currentPage);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al cancelar la reserva";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQr = async (idReserva) => {
    setQrLoading(true);
    setQrError(null);
    setQrData(null);
    try {
      const resp = await api.get("/qr-reserva/buscar", {
        params: { q: String(idReserva), limit: 1, offset: 0 },
      });

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se encontro QR para esta reserva";
        setQrError(msg);
      } else {
        const datos = resp.data?.datos || {};
        const lista = datos.qrs || [];
        if (lista.length === 0) {
          setQrError("No se encontro QR para esta reserva");
        } else {
          setQrData(lista[0]);
          setQrModalOpen(true);
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al obtener el QR de la reserva";
      setQrError(msg);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrData?.qr_url_imagen) return;
    const url = getImageUrl(qrData.qr_url_imagen);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr_reserva_${
      qrData.id_reserva || qrData.id_qr || "reserva"
    }.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenEdit = (reserva) => {
    if (viewMode === "DEPORTISTA") return;
    setEditReserva(reserva);
    setEditCupo(reserva.cupo ? String(reserva.cupo) : "");
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleEditCupoChange = (e) => {
    const value = e.target.value;
    if (value === "") {
      setEditCupo("");
      return;
    }
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) {
      return;
    }
    setEditCupo(value);
  };

  const handleUpdateReserva = async (e) => {
    e.preventDefault();
    if (!editReserva) return;

    setEditError(null);
    setSuccess(null);

    const n = Number(editCupo);
    if (!n || Number.isNaN(n) || n <= 0) {
      setEditError("El cupo debe ser un numero positivo");
      return;
    }

    try {
      setEditSaving(true);

      const resp = await api.patch(
        `/reserva-cliente/${editReserva.id_reserva}`,
        {
          cupo: n,
          id_cliente: idCliente,
        }
      );

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudo actualizar la reserva";
        setEditError(msg);
        setEditSaving(false);
        return;
      }

      try {
        await api.post(
          `/qr-reserva/regenerar-por-reserva/${editReserva.id_reserva}`
        );
      } catch (errQr) {}

      setEditModalOpen(false);
      setEditReserva(null);
      setSuccess("Reserva actualizada");
      fetchReservasResponsable(searchTerm, filter, currentPage);
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al actualizar la reserva";
      setEditError(msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenReview = (mode, reserva) => {
    if (viewMode === "DEPORTISTA") return;
    if (!canLeaveReview(reserva)) return;
    setReviewMode(mode);
    setReviewReserva(reserva);
    if (mode === "edit") {
      setReviewRating(reserva.resena_estrellas || 5);
      setReviewComment(reserva.resena_comentario || "");
    } else {
      setReviewRating(5);
      setReviewComment("");
    }
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewReserva || !idCliente) return;

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError("La calificacion debe estar entre 1 y 5");
      return;
    }

    try {
      setReviewSaving(true);
      setReviewError(null);

      const payload = {
        id_cliente: idCliente,
        id_reserva: reviewReserva.id_reserva,
        estrellas: reviewRating,
        comentario: reviewComment,
      };

      let resp;
      if (reviewMode === "edit" && reviewReserva.id_resena) {
        resp = await api.patch(
          `/resena-cliente/${reviewReserva.id_resena}`,
          payload
        );
      } else {
        resp = await api.post("/resena-cliente", payload);
      }

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudo guardar la resena";
        setReviewError(msg);
        setReviewSaving(false);
        return;
      }

      setReviewModalOpen(false);
      setReviewReserva(null);
      setSuccess(
        reviewMode === "edit"
          ? "Resena actualizada y pendiente de revision"
          : "Resena enviada y pendiente de revision"
      );
      fetchReservasResponsable(searchTerm, filter, currentPage);
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al enviar la resena";
      setReviewError(msg);
    } finally {
      setReviewSaving(false);
    }
  };

  const handleOpenDetalleDeportista = (reserva) => {
    setDetalleDepReserva(reserva);
    setDetalleDepModalOpen(true);
  };

  if (role !== "CLIENTE") {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F5F7FA] pt-32 px-4">
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6">
            <p className="text-center text-red-600">
              No tiene acceso como cliente para ver esta pagina
            </p>
          </div>
        </div>
      </>
    );
  }

  const totalPages = Math.ceil(total / limit) || 1;
  const qrImageUrl =
    qrData && qrData.qr_url_imagen ? getImageUrl(qrData.qr_url_imagen) : "";

  const isResponsableView = viewMode === "RESPONSABLE";

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F5F7FA] pt-32 px-4 pb-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0F2634]">
                Mis reservas
              </h1>
              <p className="text-xs md:text-sm text-[#64748B] mt-1">
                Modo:{" "}
                {isResponsableView
                  ? "reservas donde soy cliente responsable"
                  : "reservas donde soy deportista"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode("RESPONSABLE");
                  setCurrentPage(1);
                }}
                className={
                  "px-3 py-2 rounded-md text-xs md:text-sm font-semibold " +
                  (isResponsableView
                    ? "bg-[#01CD6C] text-white"
                    : "bg-[#E2E8F0] text-[#0F2634] hover:bg-[#CBD5E1]")
                }
              >
                Como responsable
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("DEPORTISTA");
                  setCurrentPage(1);
                }}
                className={
                  "px-3 py-2 rounded-md text-xs md:text-sm font-semibold " +
                  (!isResponsableView
                    ? "bg-[#01CD6C] text-white"
                    : "bg-[#E2E8F0] text-[#0F2634] hover:bg-[#CBD5E1]")
                }
              >
                Como invitado
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <form
              onSubmit={handleSearchSubmit}
              className="w-full md:w-2/3 flex gap-2"
            >
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isResponsableView
                    ? "Buscar por cancha, espacio o estado"
                    : "Buscar por cancha o estado"
                }
                className="flex-1 border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#23475F]"
              />
              <select
                value={filter}
                onChange={handleFilterChange}
                className="border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#23475F]"
              >
                <option value="default">Sin filtro</option>
                <option value="fecha">Ordenar por fecha</option>
                <option value="monto">Ordenar por monto</option>
                <option value="estado">Ordenar por estado</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold hover:bg-[#00b359] transition-all"
              >
                Buscar
              </button>
            </form>
          </div>

          {loading && (
            <div className="mb-4 text-sm text-[#23475F]">
              Cargando reservas...
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-100 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-100 text-green-700 px-4 py-2 rounded">
              {success}
            </div>
          )}

          {reservas.length === 0 && !loading && !error && (
            <div className="text-center text-[#64748B] py-10">
              No se encontraron reservas
            </div>
          )}

          {reservas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#F1F5F9] text-[#0F2634]">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Cancha</th>
                    <th className="px-3 py-2 text-left">Monto total</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-left">
                      {isResponsableView ? "Acciones" : "Detalle"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((r) => {
                    const hasReview = Boolean(r.id_resena);
                    const reviewVerified = Boolean(r.resena_verificado);

                    return (
                      <tr
                        key={
                          r.id_reserva_deportista
                            ? `dep_${r.id_reserva_deportista}`
                            : `cli_${r.id_reserva}`
                        }
                        className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      >
                        <td className="px-3 py-2">
                          {r.fecha_reserva
                            ? String(r.fecha_reserva).substring(0, 10)
                            : "-"}
                        </td>
                        <td className="px-3 py-2">{r.cancha_nombre || "-"}</td>
                        <td className="px-3 py-2">Bs. {r.monto_total || 0}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              "inline-block px-2 py-1 rounded-full text-xs font-semibold " +
                              (r.estado === "pagada"
                                ? "bg-green-100 text-green-700"
                                : r.estado === "cancelada"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700")
                            }
                          >
                            {r.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          {isResponsableView ? (
                            <>
                              <Link
                                to={`/reserva-detalle/${r.id_reserva}`}
                                className="inline-block px-3 py-1 rounded-md bg-[#0F2634] text-white text-xs font-semibold hover:bg-[#01CD6C] transition-all"
                              >
                                Ver detalle
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleOpenQr(r.id_reserva)}
                                className="inline-block px-3 py-1 rounded-md bg-[#38BDF8] text-white text-xs font-semibold hover:bg-[#0EA5E9] transition-all"
                              >
                                Ver QR
                              </button>

                              {canLeaveReview(r) && !hasReview && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReview("create", r)}
                                  className="inline-block px-3 py-1 rounded-md bg-[#4ADE80] text-white text-xs font-semibold hover:bg-[#22C55E] transition-all"
                                >
                                  Dejar resena
                                </button>
                              )}

                              {canLeaveReview(r) &&
                                hasReview &&
                                !reviewVerified && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReview("edit", r)}
                                    className="inline-block px-3 py-1 rounded-md bg-[#22C55E] text-white text-xs font-semibold hover:bg-[#16A34A] transition-all"
                                  >
                                    Editar resena
                                  </button>
                                )}

                              {canLeaveReview(r) &&
                                hasReview &&
                                reviewVerified && (
                                  <button
                                    type="button"
                                    disabled
                                    className="inline-block px-3 py-1 rounded-md bg-gray-200 text-gray-500 text-xs font-semibold cursor-not-allowed"
                                  >
                                    Resena enviada
                                  </button>
                                )}

                              {r.estado !== "cancelada" &&
                                r.estado !== "pagada" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(r)}
                                      className="inline-block px-3 py-1 rounded-md bg-[#FACC15] text-[#0F2634] text-xs font-semibold hover:bg-[#EAB308] transition-all"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCancel(r.id_reserva, r.estado)
                                      }
                                      className="inline-block px-3 py-1 rounded-md bg-[#F97373] text-white text-xs font-semibold hover:bg-[#EF4444] transition-all"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDetalleDeportista(r)}
                                className="inline-block px-3 py-1 rounded-md bg-[#0F2634] text-white text-xs font-semibold hover:bg-[#01CD6C] transition-all"
                              >
                                Ver detalle
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenQr(r.id_reserva)}
                                className="inline-block px-3 py-1 rounded-md bg-[#38BDF8] text-white text-xs font-semibold hover:bg-[#0EA5E9] transition-all"
                              >
                                Ver QR deportista
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={
                  "px-3 py-1 rounded-md text-sm " +
                  (currentPage === 1
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[#23475F] text-white hover:bg-[#01CD6C]")
                }
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={
                    "px-3 py-1 rounded-md text-sm " +
                    (p === currentPage
                      ? "bg-[#01CD6C] text-white"
                      : "bg-[#E2E8F0] text-[#0F2634] hover:bg-[#CBD5E1]")
                  }
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={
                  "px-3 py-1 rounded-md text-sm " +
                  (currentPage === totalPages
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[#23475F] text-white hover:bg-[#01CD6C]")
                }
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>

      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              onClick={() => setQrModalOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl leading-none"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-[#0F2634] mb-3 text-center">
              Codigo QR de la reserva
            </h2>
            {qrLoading && (
              <p className="text-sm text-[#64748B] text-center mb-4">
                Cargando QR...
              </p>
            )}
            {qrError && (
              <p className="text-sm text-red-600 text-center mb-4">{qrError}</p>
            )}
            {!qrLoading && !qrError && qrData && (
              <>
                <div className="flex justify-center mb-4">
                  {qrImageUrl && (
                    <img
                      src={qrImageUrl} // aquí ya no se llama a getImageUrl
                      alt="Codigo QR de la reserva"
                      className="w-48 h-48 object-contain"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full mb-3 px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold hover:bg-[#00b359] transition-all"
                >
                  Descargar QR
                </button>
                <p className="text-xs text-[#64748B] text-center">
                  Puede usar este codigo para el ingreso al espacio deportivo.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {editModalOpen && editReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              onClick={() => {
                setEditModalOpen(false);
                setEditReserva(null);
                setEditError(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl leading-none"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-[#0F2634] mb-4 text-center">
              Editar reserva
            </h2>
            <form onSubmit={handleUpdateReserva} className="space-y-4">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Codigo de reserva</p>
                <p className="font-semibold text-[#0F2634]">
                  #{editReserva.id_reserva}
                </p>
              </div>
              <div>
                <label className="block text-sm text-[#64748B] mb-1">
                  Cupo
                </label>
                <input
                  type="number"
                  min="1"
                  value={editCupo}
                  onChange={handleEditCupoChange}
                  className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#0F2634]"
                  required
                />
              </div>
              {editError && (
                <div className="bg-red-100 text-red-700 px-3 py-2 rounded text-sm">
                  {editError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button
                  type="submit"
                  disabled={editSaving}
                  className={
                    "flex-1 px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold transition-all " +
                    (editSaving
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-[#00b359]")
                  }
                >
                  {editSaving ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditReserva(null);
                    setEditError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-md bg-[#E2E8F0] text-[#0F2634] text-sm font-semibold hover:bg-[#CBD5E1] transition-all"
                >
                  Cancelar
                </button>
              </div>
              <p className="mt-2 text-xs text-[#64748B] text-center">
                Al actualizar el cupo, el codigo QR asociado a la reserva se
                regenera en el sistema.
              </p>
            </form>
          </div>
        </div>
      )}

      {reviewModalOpen && reviewReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              onClick={() => {
                setReviewModalOpen(false);
                setReviewReserva(null);
                setReviewError(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl leading-none"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-[#0F2634] mb-4 text-center">
              {reviewMode === "edit" ? "Editar resena" : "Dejar resena"}
            </h2>
            <div className="mb-3 text-sm text-[#64748B]">
              <p>
                Reserva #{reviewReserva.id_reserva} -{" "}
                {reviewReserva.cancha_nombre || "-"}
              </p>
              <p>
                Fecha:{" "}
                {reviewReserva.fecha_reserva
                  ? String(reviewReserva.fecha_reserva).substring(0, 16)
                  : "-"}
              </p>
            </div>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm text-[#64748B] mb-1">
                  Estrellas (1 a 5)
                </label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#0F2634]"
                >
                  <option value={5}>5</option>
                  <option value={4}>4</option>
                  <option value={3}>3</option>
                  <option value={2}>2</option>
                  <option value={1}>1</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#64748B] mb-1">
                  Comentario
                </label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#0F2634] resize-none"
                  placeholder="Escribe tu experiencia en la cancha"
                />
              </div>
              {reviewError && (
                <div className="bg-red-100 text-red-700 px-3 py-2 rounded text-sm">
                  {reviewError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button
                  type="submit"
                  disabled={reviewSaving}
                  className={
                    "flex-1 px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold transition-all " +
                    (reviewSaving
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-[#00b359]")
                  }
                >
                  {reviewSaving ? "Enviando..." : "Enviar resena"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalOpen(false);
                    setReviewReserva(null);
                    setReviewError(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-md bg-[#E2E8F0] text-[#0F2634] text-sm font-semibold hover:bg-[#CBD5E1] transition-all"
                >
                  Cancelar
                </button>
              </div>
              <p className="mt-2 text-xs text-[#64748B] text-center">
                Tu resena quedara pendiente de revision por el administrador del
                espacio deportivo.
              </p>
            </form>
          </div>
        </div>
      )}

      {detalleDepModalOpen && detalleDepReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 relative">
            <button
              onClick={() => {
                setDetalleDepModalOpen(false);
                setDetalleDepReserva(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl leading-none"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-[#0F2634] mb-4 text-center">
              Detalle de reserva
            </h2>
            <div className="space-y-3 text-sm text-[#23475F]">
              <div>
                <p className="text-[#64748B]">Codigo de reserva</p>
                <p className="font-semibold">#{detalleDepReserva.id_reserva}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Fecha</p>
                <p className="font-medium">
                  {detalleDepReserva.fecha_reserva
                    ? String(detalleDepReserva.fecha_reserva).substring(0, 10)
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Horario reservado</p>
                <p className="font-medium">
                  {detalleDepReserva.hora_inicio && detalleDepReserva.hora_fin
                    ? `${String(detalleDepReserva.hora_inicio).substring(
                        0,
                        5
                      )} - ${String(detalleDepReserva.hora_fin).substring(
                        0,
                        5
                      )}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Cancha</p>
                <p className="font-medium">
                  {detalleDepReserva.cancha_nombre || "-"}
                </p>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0]">
                <p className="text-xs font-semibold text-[#64748B] mb-1">
                  Cliente responsable
                </p>
                <p className="font-medium">
                  {detalleDepReserva.cliente_nombre}{" "}
                  {detalleDepReserva.cliente_apellido}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDetalleDepModalOpen(false);
                setDetalleDepReserva(null);
              }}
              className="w-full mt-5 px-4 py-2 rounded-md bg-[#E2E8F0] text-[#0F2634] text-sm font-semibold hover:bg-[#CBD5E1] transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MisReservasCliente;
