/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  { id: "22-23", start: "22:00:00", end: "23:00:00", label: "22:00 - 23:00" },
];

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
  try {
    const base = api.defaults.baseURL?.replace(/\/$/, "") || "";
    const cleanPath = String(path).replace(/^\//, "");
    return `${base}/${cleanPath}`;
  } catch (e) {
    return String(path);
  }
};

const ReservarCliente = () => {
  const { idCancha } = useParams();

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
      const finalId =
        r === "CLIENTE" ? idFromRoles ?? u.id_persona ?? null : null;
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
        const resp = await api.get(
          `/cancha-casual/dato-individual/${idCancha}`
        );
        if (resp.data?.exito) {
          setCancha(resp.data.datos?.cancha || null);
        } else {
          setError(resp.data?.mensaje || "No se pudo cargar la cancha");
        }
      } catch (err) {
        const m =
          err.response?.data?.mensaje || "Error de conexion al cargar cancha";
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
      const resp = await api.get("/reserva-horario/disponibles", {
        params: { id_cancha: cancha.id_cancha, fecha },
      });

      if (!resp.data?.exito) {
        setBusySlots([]);
        return;
      }

      const ocupados = resp.data?.datos?.ocupados || [];
      const ids = [];

      ocupados.forEach((h) => {
        const slot = BASE_SLOTS.find(
          (s) =>
            s.start === String(h.hora_inicio) && s.end === String(h.hora_fin)
        );
        if (slot) ids.push(slot.id);
      });

      setBusySlots(ids);
      setSelectedSlots((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (err) {
      const m =
        err.response?.data?.mensaje || "No se pudo cargar disponibilidad";
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
    if (!qrInfo?.codigo_qr) return;
    try {
      const text = String(qrInfo.codigo_qr);
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
    const d = new Date(fechaReserva);
    if (d.toString() === "Invalid Date") {
      setError("La fecha no es valida");
      return;
    }
    const cupoNum = cupo ? Number(cupo) : 0;
    if (!cupoNum || Number.isNaN(cupoNum) || cupoNum <= 0) {
      setError("El cupo debe ser un numero positivo");
      return;
    }
    if (selectedSlots.length === 0) {
      setError("Debe seleccionar al menos un horario");
      return;
    }

    const montoTotal = computeMontoTotal();

    const bodyReserva = {
      fecha_reserva: fechaReserva,
      cupo: cupoNum,
      monto_total: montoTotal,
      saldo_pendiente: montoTotal,
      estado: "pendiente",
      id_cliente: idCliente,
      id_cancha: cancha.id_cancha,
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
            monto: precio,
          };
          return api.post("/reserva-horario", bodyHorario);
        })
        .filter((x) => x !== null);

      await Promise.all(solicitudes);

      setSuccess("Reserva creada correctamente");

      try {
        const reservaDate = new Date(fechaReserva); // Fecha de la reserva
        const expira = new Date(reservaDate.getTime() + 24 * 60 * 60 * 1000); // Expira 24 horas después de la fecha de reserva
        const bodyQr = {
          id_reserva: idReserva,
          fecha_generado: new Date().toISOString(),
          fecha_expira: expira.toISOString(),
          estado: "activo",
        };
        const resQr = await api.post("/qr-reserva", bodyQr);
        if (resQr.data?.exito && resQr.data?.datos?.qr) {
          setQrInfo(resQr.data.datos.qr);
          setShowQrModal(true);
        } else {
          const msgQr =
            resQr.data?.mensaje || "No se pudo generar el codigo QR";
          setError(msgQr);
        }
      } catch (errQr) {
        const msgQr =
          errQr.response?.data?.mensaje || "No se pudo generar el codigo QR";
        setError(msgQr);
      }

      setSelectedSlots([]);
      setCupo("1");
    } catch (err) {
      const m =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al crear la reserva";
      setError(m);
    } finally {
      setSaving(false);
    }
  };

  if (role !== "CLIENTE") {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-white pt-32 px-4">
          <div className="max-w-xl mx-auto bg-white rounded-lg shadow p-6">
            <p className="text-red-600 text-center">
              No tiene acceso como cliente para crear reservas
            </p>
          </div>
        </div>
      </>
    );
  }

  const allowedSlots = getAllowedSlots();

  const baseUrl = api.defaults.baseURL
    ? api.defaults.baseURL.replace(/\/$/, "")
    : "";

  const qrImageUrl = qrInfo ? `${baseUrl}${qrInfo.qr_url_imagen}` : "";

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F5F7FA] pt-32 px-4 pb-10">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F2634] mb-6">
            Generar reserva
          </h1>

          {loadingCancha && (
            <div className="mb-4 text-sm text-[#23475F]">
              Cargando datos de cancha...
            </div>
          )}

          {loadingSlots && fechaReserva && (
            <div className="mb-4 text-sm text-[#23475F]">
              Cargando horarios disponibles...
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

          {cancha && (
            <form onSubmit={handleSubmit} className="space-y-8">
              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5 bg-[#F8FAFC]">
                <h2 className="text-lg font-semibold text-[#0F2634] mb-4">
                  Datos de la cancha
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#23475F] mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={cancha.nombre || ""}
                      disabled
                      className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 bg-gray-100 text-[#23475F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#23475F] mb-1">
                      Espacio deportivo
                    </label>
                    <input
                      type="text"
                      value={cancha.espacio_nombre || ""}
                      disabled
                      className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 bg-gray-100 text-[#23475F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#23475F] mb-1">
                      Ubicacion
                    </label>
                    <input
                      type="text"
                      value={cancha.ubicacion || ""}
                      disabled
                      className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 bg-gray-100 text-[#23475F]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#23475F] mb-1">
                      Precio por hora
                    </label>
                    <input
                      type="text"
                      value={
                        cancha.monto_por_hora
                          ? `Bs. ${cancha.monto_por_hora}`
                          : ""
                      }
                      disabled
                      className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 bg-gray-100 text-[#23475F] font-semibold"
                    />
                  </div>
                  {cancha.horario_apertura && (
                    <div>
                      <label className="block text-sm font-medium text-[#23475F] mb-1">
                        Horario apertura
                      </label>
                      <input
                        type="text"
                        value={cancha.horario_apertura}
                        disabled
                        className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 bg-gray-100 text-[#23475F]"
                      />
                    </div>
                  )}
                  {cancha.horario_cierre && (
                    <div>
                      <label className="block text-sm font-medium text-[#23475F] mb-1">
                        Horario cierre
                      </label>
                      <input
                        type="text"
                        value={cancha.horario_cierre}
                        disabled
                        className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 bg-gray-100 text-[#23475F]"
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5">
                <h2 className="text-lg font-semibold text-[#0F2634] mb-4">
                  Datos de la reserva
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#23475F] mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={fechaReserva}
                      onChange={(e) => setFechaReserva(e.target.value)}
                      className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-[#23475F]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#23475F] mb-1">
                      Cupo aproximado
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cupo}
                      onChange={(e) => setCupo(e.target.value)}
                      className="w-full border border-[#CBD5E1] rounded-md px-3 py-2 text-[#23475F]"
                    />
                  </div>
                </div>
              </section>

              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-[#0F2634]">
                    Seleccionar horarios
                  </h2>
                  <span className="text-sm text-[#64748B]">
                    Solo se muestran horarios dentro del rango de apertura y
                    cierre
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {allowedSlots.map((slot) => {
                    const active = selectedSlots.includes(slot.id);
                    const busy = busySlots.includes(slot.id);
                    const classes =
                      "px-3 py-2 rounded-md text-sm border transition-all " +
                      (busy
                        ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed"
                        : active
                        ? "bg-[#01CD6C] border-[#01CD6C] text-white shadow"
                        : "bg-white border-[#CBD5E1] text-[#23475F] hover:border-[#01CD6C]");
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => handleSlotClick(slot.id, busy)}
                        disabled={busy}
                        className={classes}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                  {allowedSlots.length === 0 && (
                    <p className="col-span-full text-sm text-[#64748B]">
                      No hay horarios configurados para este espacio
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <p className="text-sm text-[#23475F]">
                    Horas seleccionadas:{" "}
                    <span className="font-semibold">
                      {selectedSlots.length}
                    </span>
                  </p>
                  <p className="text-base md:text-lg text-[#0F2634] font-semibold">
                    Monto estimado:{" "}
                    <span className="text-[#01CD6C]">
                      Bs. {computeMontoTotal()}
                    </span>
                  </p>
                </div>
              </section>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className={
                    "px-6 py-2 rounded-md font-semibold text-white " +
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
            <div className="text-center text-[#23475F]">
              No se encontro la cancha
            </div>
          )}
        </div>
      </div>

      {showQrModal && qrInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-black text-white text-xl leading-none"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-[#0F2634] mb-2 text-center">
              Reserva creada con exito
            </h2>
            <p className="text-sm text-[#475569] mb-4 text-center">
              Comparte este codigo con los deportistas para que puedan ingresar
              al espacio deportivo
            </p>

            <div className="flex justify-center mb-4">
              {qrInfo && (
                <img
                  src={getImageUrl(qrImageUrl)}
                  alt="Codigo QR de la reserva"
                  className="mx-auto mb-6 w-48 h-48 object-contain"
                />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#23475F] mb-1">
                Enlace para compartir
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={qrInfo.codigo_qr || ""}
                  className="flex-1 border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#23475F] bg-gray-50"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-md bg-[#23475F] text-white text-sm font-semibold hover:bg-[#01CD6C] transition-all"
                >
                  Copiar
                </button>
              </div>
            </div>

            <div className="mt-2 bg-[#FEF3C7] text-[#92400E] text-sm px-4 py-3 rounded-lg">
              Recuerde que debe realizar el pago de la reserva al menos 24 horas
              antes del inicio del horario reservado. Si no se registra el pago,
              la reserva puede ser cancelada.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReservarCliente;
