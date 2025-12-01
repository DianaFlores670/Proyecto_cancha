/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import Header from "../../Header";

const UnirseReserva = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code") || "";

  const [user, setUser] = useState(null);
  const [idPersona, setIdPersona] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingJoin, setLoadingJoin] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [reserva, setReserva] = useState(null);
  const [puedeUnirse, setPuedeUnirse] = useState(false);
  const [yaUnido, setYaUnido] = useState(false);
  const [cupoLleno, setCupoLleno] = useState(false);
  const [esResponsable, setEsResponsable] = useState(false);

  const [mustLogin, setMustLogin] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("user");
    if (!data) {
      setMustLogin(true);
      setLoading(false);
      return;
    }
    try {
      const u = JSON.parse(data);
      setUser(u);

      let personaId = null;
      if (u.id_persona) {
        personaId = u.id_persona;
      } else if (Array.isArray(u.roles)) {
        const r = u.roles.find(
          item => item && item.datos && item.datos.id_persona
        );
        if (r) {
          personaId = r.datos.id_persona;
        }
      }

      if (personaId) {
        setIdPersona(personaId);
        setMustLogin(false);
      } else {
        setMustLogin(true);
      }
    } catch (e) {
      setMustLogin(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInfo = async () => {
    if (!code) {
      setError("Código no valido");
      setLoading(false);
      return;
    }
    if (!idPersona) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const params = { code, id_persona: idPersona };

      const resp = await api.get("/unirse-reserva/info", { params });
      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudo obtener la información";
        setError(msg);
        setReserva(null);
      } else {
        const datos = resp.data.datos || {};
        setReserva(datos.reserva || null);
        setPuedeUnirse(Boolean(datos.puede_unirse));
        setYaUnido(Boolean(datos.ya_unido));
        setCupoLleno(Boolean(datos.cupo_lleno));
        setEsResponsable(Boolean(datos.es_cliente_responsable));
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al consultar la reserva";
      setError(msg);
      setReserva(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    if (mustLogin) return;
    if (!idPersona) return;
    fetchInfo();
  }, [code, idPersona, mustLogin]);

  const handleJoin = async () => {
    if (!user || !idPersona) {
      setError("Debe iniciar sesión para unirse a la reserva");
      return;
    }
    if (!code) {
      setError("Código no valido");
      return;
    }

    try {
      setLoadingJoin(true);
      setError(null);
      setSuccess(null);

      const resp = await api.post("/unirse-reserva", {
        code,
        id_persona: idPersona
      });

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudo unir a la reserva";
        setError(msg);
      } else {
        const datos = resp.data.datos || {};
        if (datos.reserva) {
          setReserva(datos.reserva);
        }
        setSuccess("Inscripción a la reserva completada");
        setYaUnido(true);
        setPuedeUnirse(false);
        setCupoLleno(false);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al unirse a la reserva";
      setError(msg);
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleGoLogin = () => {
    const current = window.location.pathname + window.location.search;
    navigate(`/?redirect=${encodeURIComponent(current)}`);
  };

  const renderEstadoReserva = (estado) => {
    if (!estado) return "-";
    const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ";
    if (estado === "pagada") {
      return (
        <span className={base + "bg-green-100 text-green-700"}>
          {estado}
        </span>
      );
    }
    if (estado === "cancelada") {
      return (
        <span className={base + "bg-red-100 text-red-700"}>
          {estado}
        </span>
      );
    }
    return (
      <span className={base + "bg-yellow-100 text-yellow-700"}>
        {estado}
      </span>
    );
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F5F7FA] pt-28 sm:pt-32 px-3 sm:px-4 pb-24">
        <div className="w-full max-w-7xl mx-auto bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2634]">
                Unirse a reserva
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#64748B] max-w-2xl">
                Revise los datos de la reserva y confirme si desea unirse como deportista.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full bg-[#23475F] text-white font-semibold hover:bg-[#01CD6C] transition-all"
            >
              Volver al inicio
            </Link>
          </div>

          {mustLogin && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-2xl text-xs sm:text-sm">
              <p>
                Debe iniciar sesión para ver la información de la reserva y unirse.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleGoLogin}
                  className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#23475F] text-white text-xs sm:text-sm font-semibold hover:bg-[#01CD6C] transition-all"
                >
                  Ir a iniciar sesión
                </button>
              </div>
            </div>
          )}

          {!mustLogin && loading && (
            <p className="text-[#23475F] text-xs sm:text-sm">
              Cargando información de la reserva...
            </p>
          )}

          {!mustLogin && !loading && error && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs sm:text-sm mb-4">
              {error}
            </div>
          )}

          {!mustLogin && !loading && success && (
            <div className="bg-green-100 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-xs sm:text-sm mb-4">
              {success}
            </div>
          )}

          {!mustLogin && !loading && reserva && (
            <div className="space-y-6 sm:space-y-8 mt-2">
              <section className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 bg-[#F8FAFC]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-[#0F2634]">
                      Resumen de la reserva
                    </h2>
                    <p className="text-[11px] sm:text-xs text-[#64748B] mt-1">
                      Revise el identificador, la cancha, la fecha y el cupo de esta reserva.
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <div className="flex sm:hidden items-center gap-2">
                      <p className="text-xs sm:text-sm text-[#64748B]">
                        Estado:
                      </p>
                      <span>
                        {renderEstadoReserva(reserva.estado)}
                      </span>
                    </div>

                    <div className="hidden sm:block text-right">
                      <p className="text-xs sm:text-sm text-[#64748B] mb-1 mx-4">
                        Estado
                      </p>
                      <span>
                        {renderEstadoReserva(reserva.estado)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex flex-col gap-1 rounded-xl bg-white border border-[#E2E8F0] px-3 py-2">
                    <p className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                      Código de reserva
                    </p>
                    <p className="font-semibold text-sm sm:text-base text-[#0F2634] tracking-wide">
                      #{reserva.id_reserva}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-white border border-[#E2E8F0] px-3 py-2">
                    <p className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                      Cancha
                    </p>
                    <p className="font-medium text-sm sm:text-base text-[#0F2634]">
                      {reserva.cancha_nombre || "-"}
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8]">
                      Espacio donde se realizará la actividad.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-white border border-[#E2E8F0] px-3 py-2">
                    <p className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                      Fecha de reserva
                    </p>
                    <p className="font-medium text-sm sm:text-base text-[#0F2634]">
                      {reserva.fecha_reserva
                        ? String(reserva.fecha_reserva).substring(0, 10)
                        : "-"}
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8]">
                      Día en el que se realizará la reserva.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-white border border-[#E2E8F0] px-3 py-2">
                    <p className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                      Cupo máximo
                    </p>
                    <p className="font-medium text-sm sm:text-base text-[#0F2634]">
                      {reserva.cupo || "-"} personas
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8]">
                      Número total de lugares disponibles.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-white border border-[#E2E8F0] px-3 py-2">
                    <p className="text-[11px] sm:text-xs text-[#64748B] font-medium">
                      Participantes inscritos
                    </p>
                    <p className="font-medium text-sm sm:text-base text-[#0F2634]">
                      {reserva.cupo_ocupado || 0}
                    </p>
                    <p className="text-[11px] sm:text-xs text-[#94A3B8]">
                      Personas ya registradas en la reserva.
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5">
                <h2 className="text-base sm:text-lg font-semibold text-[#0F2634] mb-3">
                  Cliente responsable
                </h2>
                <div className="space-y-1">
                  <p className="text-[11px] sm:text-xs text-[#64748B]">
                    Nombre
                  </p>
                  <p className="font-medium text-sm sm:text-base text-[#0F2634]">
                    {reserva.cliente_nombre} {reserva.cliente_apellido}
                  </p>
                </div>
              </section>

              <section className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 bg-[#F8FAFC]">
                <h2 className="text-base sm:text-lg font-semibold text-[#0F2634] mb-3">
                  Estado de unión
                </h2>

                <div className="space-y-2 mb-3">
                  {yaUnido && (
                    <p className="text-xs sm:text-sm text-green-700">
                      Ya está unido a esta reserva como deportista.
                    </p>
                  )}
                  {cupoLleno && (
                    <p className="text-xs sm:text-sm text-red-600">
                      El cupo de la reserva está lleno.
                    </p>
                  )}
                  {!yaUnido && reserva.estado === "cancelada" && (
                    <p className="text-xs sm:text-sm text-red-600">
                      La reserva está cancelada, no es posible unirse.
                    </p>
                  )}
                  {!yaUnido &&
                    !cupoLleno &&
                    reserva.estado !== "cancelada" &&
                    esResponsable && (
                      <p className="text-xs sm:text-sm text-red-600">
                        Usted es el cliente responsable de esta reserva, por lo que no puede unirse como deportista invitado.
                      </p>
                    )}
                  {!yaUnido &&
                    !cupoLleno &&
                    reserva.estado !== "cancelada" &&
                    !esResponsable && (
                      <p className="text-[11px] sm:text-sm text-[#64748B]">
                        Si se une, sus datos quedarán registrados como deportista de esta reserva.
                      </p>
                    )}
                </div>

                <div className="mt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    disabled={
                      !user ||
                      !idPersona ||
                      !puedeUnirse ||
                      loadingJoin ||
                      esResponsable
                    }
                    onClick={handleJoin}
                    className={
                      "w-full sm:flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all " +
                      (user && idPersona && puedeUnirse && !esResponsable
                        ? "bg-[#01CD6C] text-white hover:bg-[#00b359]"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed")
                    }
                  >
                    {loadingJoin ? "Procesando..." : "Unirse a la reserva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/mis-reservas")}
                    className="w-full sm:flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#E2E8F0] text-[#0F2634] hover:bg-[#CBD5E1] transition-all"
                  >
                    Ir a mis reservas
                  </button>
                </div>
              </section>
            </div>
          )}

          {!mustLogin && !loading && !error && !reserva && (
            <p className="text-xs sm:text-sm text-[#64748B] mt-4">
              No se encontró información para este código.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default UnirseReserva;