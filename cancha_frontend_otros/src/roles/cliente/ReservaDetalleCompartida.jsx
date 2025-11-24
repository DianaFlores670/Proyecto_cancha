/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import Header from "../../Header";
import PagosCliente from "./PagosCliente";

const ReservaDetalleCompartida = () => {
  const { idReserva } = useParams();

  const [reserva, setReserva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [linkPago, setLinkPago] = useState("");

  const [horarios, setHorarios] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState(null);

  const [linkUnirse, setLinkUnirse] = useState("");

  const [deportistas, setDeportistas] = useState([]);
  const [loadingDeportistas, setLoadingDeportistas] = useState(false);
  const [errorDeportistas, setErrorDeportistas] = useState(null);
  const [cupoInfo, setCupoInfo] = useState(null);
  const [depLimit, setDepLimit] = useState(10);
  const [depOffset, setDepOffset] = useState(0);
  const [depTotal, setDepTotal] = useState(0);

  useEffect(() => {
    const fetchReserva = async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await api.get(`/reserva/dato-individual/${idReserva}`);
        const ok = resp.data?.exito;
        const datos = resp.data?.datos || {};
        const r = datos.reserva || datos || null;

        if (!ok || !r) {
          const msg = resp.data?.mensaje || "No se encontro la reserva";
          setError(msg);
          setLoading(false);
          return;
        }

        setReserva(r);

        const urlBase = api.defaults.baseURL
          ? api.defaults.baseURL.replace(/\/$/, "")
          : "";
        setLinkPago(`${urlBase}/pago/reserva/${r.id_reserva}`);
      } catch (err) {
        const msg =
          err.response?.data?.mensaje ||
          err.message ||
          "Error al cargar la reserva";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (idReserva) {
      fetchReserva();
    } else {
      setLoading(false);
      setError("Identificador de reserva no valido");
    }
  }, [idReserva]);

  useEffect(() => {
    const fetchHorarios = async () => {
      if (!idReserva) return;
      try {
        setLoadingHorarios(true);
        setErrorHorarios(null);

        const resp = await api.get(`/reserva-horario/por-reserva/${idReserva}`);
        const ok = resp.data?.exito;
        const datos = resp.data?.datos || {};
        const lista = datos.horarios || datos || [];

        if (!ok) {
          const msg = resp.data?.mensaje || "No se pudieron cargar los horarios";
          setErrorHorarios(msg);
          setHorarios([]);
        } else {
          setHorarios(Array.isArray(lista) ? lista : []);
        }
      } catch (err) {
        const msg =
          err.response?.data?.mensaje ||
          err.message ||
          "Error al cargar los horarios";
        setErrorHorarios(msg);
        setHorarios([]);
      } finally {
        setLoadingHorarios(false);
      }
    };

    fetchHorarios();
  }, [idReserva]);

  useEffect(() => {
    const fetchLinkUnirse = async () => {
      if (!idReserva) return;
      try {
        const resp = await api.get("/qr-reserva/buscar", {
          params: { q: String(idReserva), limit: 1, offset: 0 }
        });

        if (!resp.data?.exito) return;

        const datos = resp.data?.datos || {};
        const lista = datos.qrs || [];
        if (!Array.isArray(lista) || lista.length === 0) return;

        const codigo = lista[0].codigo_qr;
        if (!codigo) return;

        const origin =
          typeof window !== "undefined" &&
          window.location &&
          window.location.origin
            ? window.location.origin
            : "";

        if (!origin) return;

        const link = `${origin}/unirse-reserva?code=${encodeURIComponent(
          codigo
        )}`;
        setLinkUnirse(link);
      } catch (e) {}
    };

    fetchLinkUnirse();
  }, [idReserva]);

  useEffect(() => {
    const fetchDeportistas = async () => {
      if (!idReserva) return;
      try {
        setLoadingDeportistas(true);
        setErrorDeportistas(null);

        const resp = await api.get("/unirse-reserva/deportistas", {
          params: {
            id_reserva: idReserva,
            limit: depLimit,
            offset: depOffset
          }
        });

        if (!resp.data?.exito) {
          const msg =
            resp.data?.mensaje ||
            "No se pudieron cargar los deportistas de la reserva";
          setErrorDeportistas(msg);
          setDeportistas([]);
          setCupoInfo(null);
          setDepTotal(0);
          return;
        }

        const datos = resp.data?.datos || {};
        const lista = datos.deportistas || [];
        const pag = datos.paginacion || {};
        const cupoTotal = datos.cupo_total;
        const cupoOcupado = datos.cupo_ocupado;
        const indiceCupo = datos.indice_cupo;

        setDeportistas(Array.isArray(lista) ? lista : []);
        setDepTotal(pag.total || 0);
        setCupoInfo({
          cupo_total: cupoTotal,
          cupo_ocupado: cupoOcupado,
          indice_cupo: indiceCupo
        });
      } catch (err) {
        const msg =
          err.response?.data?.mensaje ||
          err.message ||
          "Error al cargar los deportistas de la reserva";
        setErrorDeportistas(msg);
        setDeportistas([]);
        setCupoInfo(null);
        setDepTotal(0);
      } finally {
        setLoadingDeportistas(false);
      }
    };

    fetchDeportistas();
  }, [idReserva, depLimit, depOffset]);

  const handleCopyLinkUnirse = () => {
    if (!linkUnirse) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(linkUnirse).catch(() => {});
    }
  };

  const handleDepPrev = () => {
    if (depOffset === 0) return;
    setDepOffset((prev) => (prev - depLimit < 0 ? 0 : prev - depLimit));
  };

  const handleDepNext = () => {
    const nextOffset = depOffset + depLimit;
    if (nextOffset >= depTotal) return;
    setDepOffset(nextOffset);
  };

  const depDesde = depOffset + 1;
  const depHasta = depOffset + deportistas.length;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F5F7FA] pt-32 px-4 pb-10">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F2634] mb-4 text-center">
            Detalle de la reserva
          </h1>

          {loading && (
            <div className="text-center text-[#23475F]">
              Cargando informacion de la reserva...
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-100 text-red-700 px-4 py-3 rounded text-center">
              {error}
            </div>
          )}

          {!loading && !error && reserva && (
            <div className="space-y-6">
              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5 bg-[#F8FAFC]">
                <h2 className="text-lg font-semibold text-[#0F2634] mb-3">
                  Datos generales
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#64748B]">Codigo de reserva</p>
                    <p className="font-semibold text-[#0F2634]">
                      #{reserva.id_reserva}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Estado</p>
                    <p
                      className={
                        "inline-block px-3 py-1 rounded-full text-xs font-semibold " +
                        (reserva.estado === "pagada"
                          ? "bg-green-100 text-green-700"
                          : reserva.estado === "cancelada"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700")
                      }
                    >
                      {reserva.estado || "pendiente"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Fecha de reserva</p>
                    <p className="font-medium text-[#0F2634]">
                      {reserva.fecha_reserva
                        ? String(reserva.fecha_reserva).substring(0, 10)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Cupo</p>
                    <p className="font-medium text-[#0F2634]">
                      {reserva.cupo || "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5">
                <h2 className="text-lg font-semibold text-[#0F2634] mb-3">
                  Cancha y espacio deportivo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[#64748B]">Cancha</p>
                    <p className="font-semibold text-[#0F2634]">
                      {reserva.cancha_nombre || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Precio total</p>
                    <p className="font-semibold text-[#01CD6C]">
                      Bs. {reserva.monto_total || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Saldo pendiente</p>
                    <p className="font-semibold text-[#0F2634]">
                      Bs. {reserva.saldo_pendiente || 0}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5 bg-[#F8FAFC]">
                <h2 className="text-lg font-semibold text-[#0F2634] mb-3">
                  Horario reservado
                </h2>
                {loadingHorarios && (
                  <p className="text-sm text-[#23475F]">
                    Cargando horarios...
                  </p>
                )}
                {!loadingHorarios && errorHorarios && (
                  <p className="text-sm text-red-600">
                    {errorHorarios}
                  </p>
                )}
                {!loadingHorarios && !errorHorarios && horarios.length === 0 && (
                  <p className="text-sm text-[#64748B]">
                    No se encontraron horarios para esta reserva
                  </p>
                )}
                {!loadingHorarios && horarios.length > 0 && (
                  <div className="space-y-2">
                    {horarios.map((h) => (
                      <div
                        key={
                          h.id_reserva_horario ||
                          `${h.fecha}-${h.hora_inicio}-${h.hora_fin}`
                        }
                        className="flex flex-col md:flex-row md:items-center md:justify-between border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                      >
                        <div>
                          <p className="text-sm text-[#64748B]">
                            Hora inicio
                          </p>
                          <p className="text-sm font-medium text-[#0F2634]">
                            {h.hora_inicio || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#64748B]">
                            Hora fin
                          </p>
                          <p className="text-sm font-medium text-[#0F2634]">
                            {h.hora_fin || "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {linkUnirse && (
                <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5 bg-[#F8FAFC]">
                  <h2 className="text-lg font-semibold text-[#0F2634] mb-3">
                    Link para que los deportistas se unan
                  </h2>
                  <p className="text-sm text-[#64748B] mb-2">
                    Comparte este link con los deportistas para que se agreguen a la reserva.
                  </p>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={linkUnirse}
                      className="flex-1 border border-[#CBD5E1] rounded-md px-3 py-2 text-sm text-[#0F2634] bg-[#F8FAFC]"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLinkUnirse}
                      className="px-4 py-2 rounded-md bg-[#01CD6C] text-white text-sm font-semibold hover:bg-[#00b359] transition-all"
                    >
                      Copiar link
                    </button>
                  </div>
                </section>
              )}

              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5 bg-[#F8FAFC]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-[#0F2634]">
                    Deportistas inscritos
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-[#64748B]">
                      Cupo usado
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0F2634] text-sm font-semibold">
                      {cupoInfo && cupoInfo.indice_cupo
                        ? cupoInfo.indice_cupo
                        : "0/0"}
                    </div>
                  </div>
                </div>

                {loadingDeportistas && (
                  <p className="text-sm text-[#23475F]">
                    Cargando lista de deportistas...
                  </p>
                )}

                {!loadingDeportistas && errorDeportistas && (
                  <p className="text-sm text-red-600">
                    {errorDeportistas}
                  </p>
                )}

                {!loadingDeportistas &&
                  !errorDeportistas &&
                  deportistas.length === 0 && (
                    <p className="text-sm text-[#64748B]">
                      No hay deportistas inscritos en esta reserva aun
                    </p>
                  )}

                {!loadingDeportistas &&
                  !errorDeportistas &&
                  deportistas.length > 0 && (
                    <>
                      <div className="space-y-2 mb-3">
                        {deportistas.map((d, index) => (
                          <div
                            key={d.id_reserva_deportista}
                            className="flex items-center justify-between border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#0F2634] text-white flex items-center justify-center text-sm font-semibold">
                                {depOffset + index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#0F2634]">
                                  {d.nombre} {d.apellido}
                                </p>
                                <p className="text-xs text-[#64748B]">
                                  Fecha union:{" "}
                                  {d.fecha_union
                                    ? String(d.fecha_union).substring(0, 10)
                                    : "-"}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#ECFEF3] text-[#16A34A]">
                              Activo
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-[#64748B]">
                        <div>
                          Mostrando{" "}
                          <span className="font-semibold text-[#0F2634]">
                            {depDesde}-{depHasta}
                          </span>{" "}
                          de{" "}
                          <span className="font-semibold text-[#0F2634]">
                            {depTotal}
                          </span>{" "}
                          deportistas
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={handleDepPrev}
                            disabled={depOffset === 0}
                            className={
                              "px-3 py-1 rounded-md border text-sm " +
                              (depOffset === 0
                                ? "border-[#CBD5E1] text-[#94A3B8] cursor-not-allowed"
                                : "border-[#CBD5E1] text-[#0F2634] hover:border-[#0F2634]")
                            }
                          >
                            Anterior
                          </button>
                          <button
                            type="button"
                            onClick={handleDepNext}
                            disabled={depOffset + depLimit >= depTotal}
                            className={
                              "px-3 py-1 rounded-md border text-sm " +
                              (depOffset + depLimit >= depTotal
                                ? "border-[#CBD5E1] text-[#94A3B8] cursor-not-allowed"
                                : "border-[#CBD5E1] text-[#0F2634] hover:border-[#0F2634]")
                            }
                          >
                            Siguiente
                          </button>
                        </div>
                      </div>
                    </>
                  )}
              </section>

              <section className="border border-[#E2E8F0] rounded-xl p-4 md:p-5 bg-[#F8FAFC]">
                <h2 className="text-lg font-semibold text-[#0F2634] mb-3">
                  Datos del cliente responsable
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[#64748B]">Nombre</p>
                    <p className="font-medium text-[#0F2634]">
                      {reserva.cliente_nombre} {reserva.cliente_apellido}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B]">Correo</p>
                    <p className="font-medium text-[#0F2634]">
                      {reserva.cliente_correo || "-"}
                    </p>
                  </div>
                </div>
              </section>

              {reserva && (
                <PagosCliente
                  idReserva={reserva.id_reserva}
                  saldoPendienteInicial={reserva.saldo_pendiente}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ReservaDetalleCompartida;
