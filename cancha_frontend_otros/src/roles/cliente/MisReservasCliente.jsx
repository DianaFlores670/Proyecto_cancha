/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import api from "../../services/api";
import Header from "../../Header";
import { AiOutlineClose } from "react-icons/ai";

const getReservaDateTimeLocal = (reserva) => {
  if (!reserva || !reserva.fecha_reserva) return null;
  const raw = String(reserva.fecha_reserva);
  let d;
  if (raw.length >= 10 && raw[4] === "-" && raw[7] === "-") {
    const y = Number(raw.slice(0, 4));
    const m = Number(raw.slice(5, 7));
    const day = Number(raw.slice(8, 10));
    if (!y || !m || !day) return null;
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return null;
  const timeStrRaw = reserva.hora_inicio || reserva.hora_fin || null;
  if (timeStrRaw) {
    const timeStr = String(timeStrRaw);
    const hh = Number(timeStr.slice(0, 2)) || 0;
    const mm = Number(timeStr.slice(3, 5)) || 0;
    const ss = Number(timeStr.slice(6, 8)) || 0;
    d.setHours(hh, mm, ss, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d;
};

const isReservaExpired = (reserva) => {
  const fecha = getReservaDateTimeLocal(reserva);
  if (!fecha) return false;
  const now = new Date();
  return fecha.getTime() <= now.getTime();
};

const isExpiredAndNotPaid = (reserva) => {
  return isReservaExpired(reserva) && reserva.estado !== "pagada";
};

const canLeaveReview = (reserva) => {
  if (!reserva) return false;
  if (reserva.estado !== "pagada") return false;
  return isReservaExpired(reserva);
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
  const [qrLink, setQrLink] = useState("");
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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionReserva, setActionReserva] = useState(null);


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
      if (search) params.q = search;
      if (filtro && filtro !== "default") params.tipo = filtro;
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
    const cargarReservas = async () => {
      try {
        await api.post("/reserva/cancelar-vencidas");
      } catch (err) { }
      if (viewMode === "RESPONSABLE" && idCliente) {
        fetchReservasResponsable(searchTerm, filter, currentPage);
      } else if (viewMode === "DEPORTISTA" && idPersona) {
        fetchReservasDeportista(searchTerm, filter, currentPage);
      }
    };
    cargarReservas();
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

  const handleCancel = async (reserva) => {
    if (viewMode === "DEPORTISTA") return;
    if (!reserva) return;
    if (reserva.estado === "cancelada" || reserva.estado === "pagada") return;
    if (isExpiredAndNotPaid(reserva)) return;
    const ok = window.confirm("Desea cancelar esta reserva");
    if (!ok) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const resp = await api.delete(`/reserva-cliente/${reserva.id_reserva}`, {
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
    setQrLink("");
    try {
      const resp = await api.get(`/qr-reserva/por-reserva/${idReserva}`);
      if (!resp.data?.exito || !resp.data?.datos?.qr) {
        const msg = resp.data?.mensaje || "No se encontro qr para esta reserva";
        setQrError(msg);
      } else {
        const qr = resp.data.datos.qr;
        setQrData(qr);
        const origin =
          typeof window !== "undefined" &&
            window.location &&
            window.location.origin
            ? window.location.origin
            : "";
        if (origin && qr.codigo_qr) {
          const link = `${origin}/unirse-reserva?code=${encodeURIComponent(
            qr.codigo_qr
          )}`;
          setQrLink(link);
        }
        setQrModalOpen(true);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al obtener el qr de la reserva";
      setQrError(msg);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrData?.codigo_qr) return;
    const canvas = document.getElementById("qr-reserva-canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr_reserva_${qrData.id_reserva || qrData.id_qr || "reserva"
      }.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyQrLink = async () => {
    if (!qrLink) return;
    try {
      const text = String(qrLink);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setSuccess("Enlace copiado");
    } catch (e) {
      setError("No se pudo copiar el enlace");
    }
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
      } catch (errQr) { }
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
          ? "Resena actualizada"
          : "Resena enviada"
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

  const totalPages = Math.ceil(total / limit) || 1;
  const isResponsableView = viewMode === "RESPONSABLE";

  if (loading && reservas.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
          <p className="text-[#23475F] text-sm">Cargando reservas...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F5F7FA] pt-28 sm:pt-32 px-3 sm:px-4 pb-24">
        <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0F2634]">
                Mis reservas
              </h1>
              <div className="mt-3 bg-[#FEF3C7] border border-[#FACC15] text-[#92400E] text-xs md:text-sm rounded-xl px-3 py-2 max-w-xl">
                <span className="font-semibold">Importante:</span> si no se registra el pago del monto total antes del inicio del horario reservado, esta se cancelara automaticamente.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode("RESPONSABLE");
                  setCurrentPage(1);
                }}
                className={
                  "px-3 py-2 rounded-full text-xs md:text-sm font-semibold " +
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
                  "px-3 py-2 rounded-full text-xs md:text-sm font-semibold " +
                  (!isResponsableView
                    ? "bg-[#01CD6C] text-white"
                    : "bg-[#E2E8F0] text-[#0F2634] hover:bg-[#CBD5E1]")
                }
              >
                Como invitado
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="w-full flex flex-col sm:flex-row gap-2 mb-6"
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
              className="flex-1 border border-[#CBD5E1] rounded-full px-3 py-2 text-sm focus:ring-2 focus:ring-[#01CD6C]"
            />
            <select
              value={filter}
              onChange={handleFilterChange}
              className="border border-[#CBD5E1] rounded-full px-3 py-2 text-sm focus:ring-2 focus:ring-[#01CD6C]"
            >
              <option value="default">Sin filtro</option>
              <option value="fecha">Ordenar por fecha</option>
              <option value="monto">Ordenar por monto</option>
              <option value="estado">Ordenar por estado</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#01CD6C] text-white text-sm font-semibold hover:bg-[#00b359]"
            >
              Buscar
            </button>
          </form>

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
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F1F5F9] text-[#0F2634]">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Horario</th>
                    <th className="px-3 py-2 text-left">Cancha</th>
                    <th className="px-3 py-2 text-left">Monto</th>
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
                    const expiredNotPaid = isExpiredAndNotPaid(r);
                    const estadoReal = r.estado;
                    const isCanceled = estadoReal === "cancelada";

                    return (
                      <tr
                        key={
                          r.id_reserva_deportista
                            ? "dep_" + r.id_reserva_deportista
                            : "cli_" + r.id_reserva
                        }
                        className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      >
                        <td className="px-3 py-2">
                          {r.fecha_reserva
                            ? String(r.fecha_reserva).substring(0, 10)
                            : "-"}
                        </td>

                        <td className="px-3 py-2">
                          {r.hora_inicio && r.hora_fin
                            ? String(r.hora_inicio).substring(0, 5) +
                            " - " +
                            String(r.hora_fin).substring(0, 5)
                            : "-"}
                        </td>

                        <td className="px-3 py-2">{r.cancha_nombre || "-"}</td>

                        <td className="px-3 py-2">Bs. {r.monto_total || 0}</td>

                        <td className="px-3 py-2">
                          <span
                            className={
                              "inline-block px-2 py-1 rounded-full text-xs font-semibold " +
                              (estadoReal === "pagada"
                                ? "bg-green-100 text-green-700"
                                : estadoReal === "cancelada"
                                  ? "bg-red-100 text-red-700"
                                  : estadoReal === "en_cuotas" ||
                                    estadoReal === "pendiente"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : expiredNotPaid
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-700")
                            }
                          >
                            {estadoReal}
                          </span>
                        </td>

                        <td className="px-3 py-2">

                          {/* Desktop */}
                          <div className="hidden sm:flex flex-wrap gap-2">
                            {!isCanceled && (
                              <>
                                {isResponsableView ? (
                                  <>
                                    <Link
                                      to={"/reserva-detalle/" + r.id_reserva}
                                      className="px-3 py-1 rounded-full bg-[#0F2634] text-white text-xs font-semibold hover:bg-[#01CD6C]"
                                    >
                                      Ver detalle
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenQr(r.id_reserva)}
                                      className="px-3 py-1 rounded-full bg-[#38BDF8] text-white text-xs font-semibold hover:bg-[#0EA5E9]"
                                    >
                                      Ver QR
                                    </button>

                                    {canLeaveReview(r) && !hasReview && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview("create", r)}
                                        className="px-3 py-1 rounded-full bg-[#4ADE80] text-white text-xs font-semibold hover:bg-[#22C55E]"
                                      >
                                        Dejar resena
                                      </button>
                                    )}

                                    {canLeaveReview(r) && hasReview && !reviewVerified && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenReview("edit", r)}
                                        className="px-3 py-1 rounded-full bg-[#22C55E] text-white text-xs font-semibold hover:bg-[#16A34A]"
                                      >
                                        Editar resena
                                      </button>
                                    )}

                                    {!expiredNotPaid &&
                                      r.estado !== "cancelada" &&
                                      r.estado !== "pagada" && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEdit(r)}
                                            className="px-3 py-1 rounded-full bg-[#FACC15] text-[#0F2634] text-xs font-semibold hover:bg-[#EAB308]"
                                          >
                                            Editar
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => handleCancel(r)}
                                            className="px-3 py-1 rounded-full bg-[#F97373] text-white text-xs font-semibold hover:bg-[#EF4444]"
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
                                      className="px-3 py-1 rounded-full bg-[#0F2634] text-white text-xs font-semibold hover:bg-[#01CD6C]"
                                    >
                                      Ver detalle
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenQr(r.id_reserva)}
                                      className="px-3 py-1 rounded-full bg-[#38BDF8] text-white text-xs font-semibold hover:bg-[#0EA5E9]"
                                    >
                                      Ver QR
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>

                          {/* Movil - boton de 3 puntos */}
                          <div className="sm:hidden flex justify-center">
                            <button
                              className="px-2 py-1 text-2xl text-[#0F2634]"
                              onClick={() => {
                                setActionReserva(r);
                                setActionMenuOpen(true);
                              }}
                            >
                              ⋮
                            </button>
                          </div>

                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap justify-center mt-6 gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={
                  "px-3 py-1 rounded-md text-sm " +
                  (currentPage === 1
                    ? "bg-gray-200 text-gray-500"
                    : "bg-[#23475F] text-white hover:bg-[#01CD6C]")
                }
              >
                Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
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
                )
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={
                  "px-3 py-1 rounded-md text-sm " +
                  (currentPage === totalPages
                    ? "bg-gray-200 text-gray-500"
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
          <div className="bg-white rounded-2xl shadow-xl w-[95%] sm:max-w-md mx-auto p-4 sm:p-6 relative">
            <button
              onClick={() => {
                setQrModalOpen(false);
                setQrData(null);
                setQrError(null);
                setQrLink("");
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl"
            >
              <AiOutlineClose slassName="bg-gray-200 hover:bg-gray-300 rounded-full p-1" size={22} />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-[#0F2634] mb-3 text-center">
              Codigo QR de la reserva
            </h2>

            {qrLoading && (
              <p className="text-sm text-[#64748B] text-center mb-4">
                Cargando QR...
              </p>
            )}

            {qrError && (
              <p className="text-sm text-red-600 text-center mb-4">
                {qrError}
              </p>
            )}

            {!qrLoading && !qrError && qrData && qrData.codigo_qr && (
              <>
                <div className="flex justify-center mb-4">
                  <QRCodeCanvas
                    id="qr-reserva-canvas"
                    value={qrData.codigo_qr}
                    size={192}
                    includeMargin
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full mb-3 px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold hover:bg-[#00b359]"
                >
                  Descargar QR
                </button>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-[#23475F] mb-1">
                    Enlace para compartir
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={qrLink || ""}
                      className="flex-1 border border-[#CBD5E1] rounded-md px-3 py-2 text-sm bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={handleCopyQrLink}
                      className="px-4 py-2 rounded-md bg-[#23475F] text-white text-sm font-semibold hover:bg-[#01CD6C]"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#64748B] text-center">
                  Use este codigo para ingreso al espacio deportivo.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {editModalOpen && editReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[95%] sm:max-w-md mx-auto p-4 sm:p-6 relative">
            <button
              onClick={() => {
                setEditModalOpen(false);
                setEditReserva(null);
                setEditError(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl"
            >
              <AiOutlineClose slassName="bg-gray-200 hover:bg-gray-300 rounded-full p-1" size={22} />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-[#0F2634] mb-4 text-center">
              Editar reserva
            </h2>

            <form onSubmit={handleUpdateReserva} className="space-y-4">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Codigo</p>
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
                  className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-sm"
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
                    "flex-1 px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold " +
                    (editSaving ? "opacity-70" : "hover:bg-[#00b359]")
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
                  className="flex-1 px-4 py-2 rounded-md bg-[#E2E8F0] text-[#0F2634] text-sm font-semibold hover:bg-[#CBD5E1]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewModalOpen && reviewReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[95%] sm:max-w-md mx-auto p-4 sm:p-6 relative">
            <button
              onClick={() => {
                setReviewModalOpen(false);
                setReviewReserva(null);
                setReviewError(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl"
            >
              <AiOutlineClose slassName="bg-gray-200 hover:bg-gray-300 rounded-full p-1" size={22} />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-[#0F2634] mb-4 text-center">
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
                  Estrellas
                </label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="w-full border border-[#CBD5E1] rounded-full px-3 py-2 text-sm"
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
                  className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-sm resize-none"
                  placeholder="Escribe tu experiencia"
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
                    "flex-1 px-4 py-2 rounded-full bg-[#01CD6C] text-white text-sm font-semibold " +
                    (reviewSaving ? "opacity-70" : "hover:bg-[#00b359]")
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
                  className="flex-1 px-4 py-2 rounded-full bg-[#E2E8F0] text-[#0F2634] text-sm font-semibold hover:bg-[#CBD5E1]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalleDepModalOpen && detalleDepReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[95%] sm:max-w-md mx-auto p-4 sm:p-6 relative">
            <button
              onClick={() => {
                setDetalleDepModalOpen(false);
                setDetalleDepReserva(null);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl"
            >
              <AiOutlineClose slassName="bg-gray-200 hover:bg-gray-300 rounded-full p-1" size={22} />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-[#0F2634] mb-4 text-center">
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
                    ? String(detalleDepReserva.hora_inicio).substring(0, 5) +
                    " - " +
                    String(detalleDepReserva.hora_fin).substring(0, 5)
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
                  {detalleDepReserva.cliente_nombre} {detalleDepReserva.cliente_apellido}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDetalleDepModalOpen(false);
                setDetalleDepReserva(null);
              }}
              className="w-full mt-5 px-4 py-2 rounded-full bg-[#E2E8F0] text-[#0F2634] text-sm font-semibold hover:bg-[#CBD5E1]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {actionMenuOpen && actionReserva && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-2xl shadow-xl p-4 relative">

            <button
              onClick={() => {
                setActionMenuOpen(false);
                setActionReserva(null);
              }}
              className="absolute top-2 right-2 text-xl"
            >
              <AiOutlineClose slassName="bg-gray-200 hover:bg-gray-300 rounded-full p-1" size={22} />
            </button>

            <h2 className="text-lg font-bold text-[#0F2634] mb-3 text-center">
              Acciones
            </h2>

            <div className="flex flex-col gap-2">

              <button
                onClick={() => {
                  setActionMenuOpen(false);
                  handleOpenQr(actionReserva.id_reserva);
                }}
                className="w-full py-2 bg-[#38BDF8] text-white rounded-lg"
              >
                Ver QR
              </button>

              <Link
                to={"/reserva-detalle/" + actionReserva.id_reserva}
                onClick={() => setActionMenuOpen(false)}
                className="w-full py-2 bg-[#0F2634] text-white rounded-lg text-center"
              >
                Ver detalle
              </Link>

              {canLeaveReview(actionReserva) && !actionReserva.id_resena && (
                <button
                  onClick={() => {
                    setActionMenuOpen(false);
                    handleOpenReview("create", actionReserva);
                  }}
                  className="w-full py-2 bg-[#4ADE80] text-white rounded-lg"
                >
                  Dejar resena
                </button>
              )}

              {!isExpiredAndNotPaid(actionReserva) &&
                actionReserva.estado !== "cancelada" &&
                actionReserva.estado !== "pagada" && (
                  <>
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleOpenEdit(actionReserva);
                      }}
                      className="w-full py-2 bg-[#FACC15] text-black rounded-lg"
                    >
                      Editar reserva
                    </button>

                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleCancel(actionReserva);
                      }}
                      className="w-full py-2 bg-[#F97373] text-white rounded-lg"
                    >
                      Cancelar
                    </button>
                  </>
                )}

            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default MisReservasCliente;