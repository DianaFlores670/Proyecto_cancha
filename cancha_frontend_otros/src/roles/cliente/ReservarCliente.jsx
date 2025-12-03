/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import api from "../../services/api";
import Header from "../../Header";

const BASE_SLOTS = [
  { id: "06-07", start: "06:00:00", end: "07:00:00", label: "06:00 - 07:00" },
  { id: "07-08", start: "07:00:00", end: "08:00:00", label: "07:00 - 08:00" },
  { id: "08-09", start: "08:00:00", end: "09:00:00", label: "08:00 - 09:00" },
  { id: "09-10", start: "09:00:00", end: "10:00:00", label: "09:00 - 10:00" },
  { id: "10-11", start: "10:00:00", end: "11:00:00", label: "10:00 - 11:00" },
  { id: "11-12", start: "11:00:00", end: "12:00:00", label: "11:00 - 12:00" },
  { id: "12-13", start: "12:00:00", end: "13:00:00", label: "12:00 - 13:00" },
  { id: "13-14", start: "13:00:00", end: "14:00:00", label: "13:00 - 14:00" },
  { id: "14-15", start: "14:00:00", end: "15:00:00", label: "14:00 - 15:00" },
  { id: "15-16", start: "15:00:00", end: "16:00:00", label: "15:00 - 16:00" },
  { id: "16-17", start: "16:00:00", end: "17:00:00", label: "16:00 - 17:00" },
  { id: "17-18", start: "17:00:00", end: "18:00:00", label: "17:00 - 18:00" },
  { id: "18-19", start: "18:00:00", end: "19:00:00", label: "18:00 - 19:00" },
  { id: "19-20", start: "19:00:00", end: "20:00:00", label: "19:00 - 20:00" },
  { id: "20-21", start: "20:00:00", end: "21:00:00", label: "20:00 - 21:00" },
  { id: "21-22", start: "21:00:00", end: "22:00:00", label: "21:00 - 22:00" },
  { id: "22-23", start: "22:00:00", end: "23:00:00", label: "22:00 - 23:00" }
];

const getUserRoles = (u) => {
  if (Array.isArray(u?.roles)) return u.roles.map((r) => String(r?.rol ?? r).toUpperCase());
  if (u?.role) return [String(u.role).toUpperCase()];
  return [];
};

const pickRoleForThisPage = (u) => {
  const roles = getUserRoles(u);
  if (roles.includes("CLIENTE")) return "CLIENTE";
  return "DEFAULT";
};

const parseDateInput = (value) => {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const ReservarCliente = () => {
  const { idCancha } = useParams();
  const navigate = useNavigate();

  const [cancha, setCancha] = useState(null);
  const [idCliente, setIdCliente] = useState(null);
  const [role, setRole] = useState("DEFAULT");

  const [fechaReserva, setFechaReserva] = useState("");
  const [cupo, setCupo] = useState("1");

  const [selectedSlots, setSelectedSlots] = useState([]);
  const [busySlots, setBusySlots] = useState([]);

  const [loadingCancha, setLoadingCancha] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [qrInfo, setQrInfo] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [linkUnirse, setLinkUnirse] = useState("");

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
        const cl = u.roles.find((rr) => String(rr?.rol ?? rr).toUpperCase() === "CLIENTE");
        idFromRoles = cl?.datos?.id_cliente ?? null;
      }
      const finalId = r === "CLIENTE" ? idFromRoles ?? u.id_persona ?? null : null;
      setIdCliente(finalId);
    } catch (e) {
      setError("Error al leer datos de usuario");
    }
  }, []);

  useEffect(() => {
    if (!idCancha) return;
    const fetchCancha = async () => {
      try {
        setLoadingCancha(true);
        setError(null);
        const resp = await api.get(`/cancha-casual/dato-individual/${idCancha}`);
        if (resp.data?.exito) {
          setCancha(resp.data.datos?.cancha || null);
        } else {
          setError(resp.data?.mensaje || "No se pudo cargar la cancha");
        }
      } catch (err) {
        const m = err.response?.data?.mensaje || "Error de conexion al cargar cancha";
        setError(m);
      } finally {
        setLoadingCancha(false);
      }
    };
    fetchCancha();
  }, [idCancha]);

  const toggleSlot = (id) => {
    setSelectedSlots((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const computeMontoTotal = () => {
    if (!cancha) return 0;
    const precio = Number(cancha.monto_por_hora || 0);
    return selectedSlots.length * precio;
  };

  const getAllowedSlots = () => {
    if (!cancha || !cancha.horario_apertura || !cancha.horario_cierre) {
      return BASE_SLOTS;
    }
    const open = String(cancha.horario_apertura);
    const close = String(cancha.horario_cierre);
    return BASE_SLOTS.filter((s) => s.start >= open && s.end <= close);
  };

  const loadBusySlots = async (fecha) => {
    if (!cancha) return;
    try {
      setLoadingSlots(true);
      setError(null);
      const resp = await api.get("/reserva-horario/disponibles", {
        params: { id_cancha: cancha.id_cancha, fecha }
      });

      if (!resp.data?.exito) {
        setBusySlots([]);
        return;
      }

      const ocupados = resp.data?.datos?.ocupados || [];
      const idsSet = new Set();

      ocupados.forEach((h) => {
        const start = String(h.hora_inicio);
        const end = String(h.hora_fin);
        BASE_SLOTS.forEach((s) => {
          if (s.start >= start && s.start < end) {
            idsSet.add(s.id);
          }
        });
      });

      const ids = Array.from(idsSet);
      setBusySlots(ids);
      setSelectedSlots((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err) {
      const m = err.response?.data?.mensaje || "No se pudo cargar disponibilidad";
      setError(m);
      setBusySlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (fechaReserva && cancha) {
      loadBusySlots(fechaReserva);
    } else {
      setBusySlots([]);
    }
  }, [fechaReserva, cancha]);

  const handleSlotClick = (id, disabled) => {
    if (disabled) return;
    toggleSlot(id);
  };

  const handleCopyLink = async () => {
    if (!linkUnirse) return;
    try {
      const text = String(linkUnirse);
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
      setSuccess("Enlace copiado al portapapeles");
    } catch (e) {
      setError("No se pudo copiar el enlace");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setQrInfo(null);
    setShowQrModal(false);
    setLinkUnirse("");

    if (!cancha) {
      setError("No se cargo la cancha");
      return;
    }
    if (!idCliente) {
      setError("No se encontro el cliente");
      return;
    }
    if (!fechaReserva) {
      setError("La fecha es obligatoria");
      return;
    }

    const selectedDate = parseDateInput(fechaReserva);
    if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
      setError("La fecha no es valida");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError("No puede reservar en fechas pasadas");
      return;
    }

    const cupoNum = cupo ? Number(cupo) : 0;
    if (!cupoNum || Number.isNaN(cupoNum) || cupoNum <= 0) {
      setError("El cupo debe ser un numero positivo");
      return;
    }
    const capacidadCanchaRaw = cancha.capacidad;
    const capacidadCancha = capacidadCanchaRaw == null
      ? null
      : Number(String(capacidadCanchaRaw).trim());
    console.log("capacidad raw:", cancha.capacidad, "capacidad num:", capacidadCancha, "cupo:", cupoNum);

    if (capacidadCancha !== null && !Number.isNaN(capacidadCancha) && cupoNum > capacidadCancha) {
      setError("El cupo no puede ser mayor a la capacidad de la cancha (" + capacidadCancha + ")");
      return;
    }

    if (selectedSlots.length === 0) {
      setError("Debe seleccionar al menos un horario");
      return;
    }

    const isSameDate = selectedDate.getTime() === today.getTime();
    if (isSameDate) {
      const nowTime = new Date().toTimeString().slice(0, 8);
      const invalidSlots = selectedSlots.filter((idSlot) => {
        const slot = BASE_SLOTS.find((s) => s.id === idSlot);
        if (!slot) return false;
        return slot.end <= nowTime;
      });
      if (invalidSlots.length > 0) {
        setError("No puede reservar horarios en el pasado para la fecha seleccionada");
        return;
      }
    }

    const montoTotal = computeMontoTotal();

    const bodyReserva = {
      fecha_reserva: fechaReserva,
      cupo: cupoNum,
      monto_total: montoTotal,
      saldo_pendiente: montoTotal,
      estado: "pendiente",
      id_cliente: idCliente,
      id_cancha: cancha.id_cancha
    };

    try {
      setSaving(true);

      const resReserva = await api.post("/reserva-cliente", bodyReserva);
      if (!resReserva.data?.exito || !resReserva.data?.datos?.reserva) {
        const msg = resReserva.data?.mensaje || "No se pudo crear la reserva";
        setError(msg);
        setSaving(false);
        return;
      }

      const reservaCreada = resReserva.data.datos.reserva;
      const idReserva = reservaCreada.id_reserva;

      const precio = Number(cancha.monto_por_hora || 0);

      const solicitudes = selectedSlots
        .map((idSlot) => {
          const slot = BASE_SLOTS.find((s) => s.id === idSlot);
          if (!slot) return null;
          const bodyHorario = {
            id_reserva: idReserva,
            fecha: fechaReserva,
            hora_inicio: slot.start,
            hora_fin: slot.end,
            monto: precio
          };
          return api.post("/reserva-horario", bodyHorario);
        })
        .filter((x) => x !== null);

      await Promise.all(solicitudes);

      setSuccess("Reserva creada correctamente");

      try {
        const reservaDate = parseDateInput(fechaReserva);
        const baseDate =
          reservaDate && !Number.isNaN(reservaDate.getTime())
            ? reservaDate
            : new Date();
        const expira = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
        const bodyQr = {
          id_reserva: idReserva,
          fecha_generado: new Date().toISOString(),
          fecha_expira: expira.toISOString(),
          estado: "activo"
        };
        const resQr = await api.post("/qr-reserva", bodyQr);
        if (resQr.data?.exito && resQr.data?.datos?.qr) {
          const qr = resQr.data.datos.qr;
          setQrInfo(qr);
          const origin =
            typeof window !== "undefined" &&
              window.location &&
              window.location.origin
              ? window.location.origin
              : "";
          if (origin && qr.codigo_qr) {
            const link = origin + "/unirse-reserva?code=" + encodeURIComponent(qr.codigo_qr);
            setLinkUnirse(link);
          }
          setShowQrModal(true);
        } else {
          const msgQr = resQr.data?.mensaje || "No se pudo generar el codigo QR";
          setError(msgQr);
        }
      } catch (errQr) {
        const msgQr = errQr.response?.data?.mensaje || "No se pudo generar el codigo QR";
        setError(msgQr);
      }

      setSelectedSlots([]);
      setCupo("1");
    } catch (err) {
      const m = err.response?.data?.mensaje || err.message || "Error al crear la reserva";
      setError(m);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowQrModal(false);
    navigate("/mis-reservas");
  };

  const todayString = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  })();

  if (role !== "CLIENTE") {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F1F5F9] pt-28 px-3 sm:px-4 pb-10">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg px-6 py-8 text-center">
            <p className="text-red-600 font-semibold text-sm sm:text-base">
              No tiene acceso como cliente para crear reservas
            </p>
          </div>
        </div>
      </>
    );
  }

  const allowedSlots = getAllowedSlots();
  const isTodaySelected = fechaReserva === todayString;
  const nowTimeForUi = new Date().toTimeString().slice(0, 8);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F5F7FA] pt-28 sm:pt-32 px-3 sm:px-4 pb-24">
        <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2634]">
              Generar reserva
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#64748B] max-w-2xl">
              Seleccione la fecha y los horarios disponibles para crear su reserva.
              El monto se calcula automaticamente segun el precio por hora.
            </p>
          </div>

          <div className="">
            {loadingCancha && (
              <div className="mb-2 text-xs sm:text-sm text-[#23475F]">
                Cargando datos de cancha...
              </div>
            )}

            {loadingSlots && fechaReserva && (
              <div className="mb-2 text-xs sm:text-sm text-[#23475F]">
                Cargando horarios disponibles...
              </div>
            )}

            {cancha && (
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <section className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 bg-[#F8FAFC]">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-[#0F2634]">
                        Datos de la cancha
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                        Revise la información principal antes de confirmar su reserva.
                      </p>
                    </div>
                    {cancha.monto_por_hora && (
                      <div className="px-4 py-2 bg-[#ECFDF5] border border-[#BBF7D0] rounded-full text-xs sm:text-sm text-[#166534] font-semibold flex items-center justify-center">
                        Precio por hora: Bs. {cancha.monto_por_hora}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                        Nombre
                      </span>
                      <div className="border border-[#CBD5E1] bg-white rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F2634] font-semibold">
                        {cancha.nombre || "-"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                        Espacio deportivo
                      </span>
                      <div className="border border-[#CBD5E1] bg-white rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F2634]">
                        {cancha.espacio_nombre || "-"}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                        Ubicación
                      </span>
                      <div className="border border-[#CBD5E1] bg-white rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F2634]">
                        {cancha.ubicacion || "-"}
                      </div>
                    </div>

                    {cancha.horario_apertura && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                          Horario apertura
                        </span>
                        <div className="border border-[#CBD5E1] bg-white rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F2634]">
                          {cancha.horario_apertura}
                        </div>
                      </div>
                    )}

                    {cancha.horario_cierre && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                          Horario cierre
                        </span>
                        <div className="border border-[#CBD5E1] bg-white rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F2634]">
                          {cancha.horario_cierre}
                        </div>
                      </div>
                    )}

                    {cancha.capacidad != null && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                          Capacidad máxima
                        </span>
                        <div className="border border-[#CBD5E1] bg-white rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F2634]">
                          {cancha.capacidad} personas
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5">
                  <h2 className="text-base sm:text-lg font-semibold text-[#0F2634] mb-4">
                    Datos de la reserva
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={fechaReserva}
                        onChange={(e) => setFechaReserva(e.target.value)}
                        className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#23475F] focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] outline-none bg-white"
                        required
                        min={todayString}
                      />
                      <span className="text-[11px] text-[#94A3B8]">
                        Solo se permiten fechas desde hoy en adelante.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                        Cupo
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={cupo}
                        onChange={(e) => setCupo(e.target.value)}
                        className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#23475F] focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] outline-none bg-white"
                      />
                      <span className="text-[11px] text-[#94A3B8]">
                        Cantidad de personas que participarán en la actividad.
                      </span>
                    </div>
                  </div>
                </section>

                <section className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-[#0F2634]">
                        Seleccionar horarios
                      </h2>
                      <p className="text-[11px] sm:text-xs text-[#64748B] mt-1">
                        Solo se muestran horarios dentro del rango de apertura y cierre.
                        Los horarios ocupados se deshabilitan automáticamente.
                      </p>
                    </div>
                    {isTodaySelected && (
                      <div className="px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] sm:text-xs text-[#1D4ED8]">
                        Algunos horarios pueden estar bloqueados por ser anteriores a la hora actual.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {allowedSlots.map((slot) => {
                      const active = selectedSlots.includes(slot.id);
                      const busy = busySlots.includes(slot.id);
                      let disabledSlot = busy;

                      if (isTodaySelected) {
                        if (slot.end <= nowTimeForUi) {
                          disabledSlot = true;
                        }
                      }

                      const classes =
                        "px-2 sm:px-3 py-2 rounded-xl text-[11px] sm:text-sm border text-center whitespace-nowrap transition-all " +
                        (disabledSlot
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                          : active
                            ? "bg-[#01CD6C] border-[#01CD6C] text-white shadow-md scale-[1.02]"
                            : "bg-white border-[#CBD5E1] text-[#23475F] hover:border-[#01CD6C] hover:bg-[#F0FDF4]");

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSlotClick(slot.id, disabledSlot)}
                          disabled={disabledSlot}
                          className={classes}
                        >
                          {slot.label}
                        </button>
                      );
                    })}

                    {allowedSlots.length === 0 && (
                      <p className="col-span-full text-xs sm:text-sm text-[#64748B]">
                        No hay horarios configurados para este espacio.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="text-xs sm:text-sm text-[#23475F]">
                        Horas seleccionadas:{" "}
                        <span className="font-semibold">
                          {selectedSlots.length}
                        </span>
                      </p>
                      {busySlots.length > 0 && (
                        <p className="text-[11px] text-[#94A3B8]">
                          Horarios ocupados: {busySlots.length}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-3">
                      <p className="text-xs sm:text-sm text-[#64748B]">
                        Monto estimado total
                      </p>
                      <p className="text-lg sm:text-xl text-[#0F2634] font-bold">
                        <span className="text-[#01CD6C]">
                          Bs. {computeMontoTotal()}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>
                {error && (
                  <div className="mt-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mt-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-xs sm:text-sm">
                    {success}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#CBD5E1] bg-white text-xs sm:text-sm font-semibold text-[#0F2634] hover:bg-[#F1F5F9] transition-all"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={
                      "w-full sm:w-auto px-6 py-2.5 rounded-full font-semibold text-white text-xs sm:text-sm " +
                      (saving
                        ? "bg-[#94A3B8] cursor-not-allowed"
                        : "bg-[#01CD6C] hover:bg-[#00b359] shadow-md hover:shadow-lg transition-all")
                    }
                  >
                    {saving ? "Guardando..." : "Confirmar reserva"}
                  </button>
                </div>
              </form>
            )}

            {!loadingCancha && !cancha && !error && (
              <div className="text-center text-[#23475F] text-sm sm:text-base">
                No se encontro la cancha
              </div>
            )}
          </div>
        </div>
      </div>

      {showQrModal && qrInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-5 sm:p-6 md:p-7 relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl leading-none hover:bg-black/80"
            >
              ×
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F2634] mb-2 text-center">
              Reserva creada con exito
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] mb-4 text-center max-w-sm mx-auto">
              Comparta este codigo con los deportistas para que puedan unirse a la reserva
              e ingresar al espacio deportivo.
            </p>

            <div className="flex justify-center mb-4">
              {qrInfo?.codigo_qr ? (
                <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-inner">
                  <QRCode
                    value={qrInfo.codigo_qr}
                    size={192}
                    style={{ height: "auto", maxWidth: "100%", width: "192px" }}
                  />
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">
                  No se encontro el codigo QR
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                Enlace para compartir
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={linkUnirse || ""}
                  className="flex-1 border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#23475F] bg-gray-50"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#23475F] text-white text-xs sm:text-sm font-semibold hover:bg-[#01CD6C] transition-all"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="mt-2 bg-[#FEF3C7] text-[#92400E] text-[11px] sm:text-xs px-4 py-3 rounded-xl leading-relaxed">
              Recuerde que debe realizar el pago de la reserva antes del inicio del horario reservado.
              Si no se registra el pago, la reserva puede ser cancelada automaticamente.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReservarCliente;