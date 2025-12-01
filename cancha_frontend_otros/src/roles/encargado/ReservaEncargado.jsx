/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */

import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

const readUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

const readTokenPayload = () => {
  try {
    const t = localStorage.getItem("token");
    if (!t || t.split(".").length !== 3) return {};
    const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (p.length % 4)) % 4);
    return JSON.parse(atob(p + pad));
  } catch { return {}; }
};

const ReservaEncargado = () => {
  const [reservas, setReservas] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const fetchReservas = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;

    try {
      let resp;

      if (params.q)
        resp = await api.get("/reserva-encargado/buscar", {
          params: { q: params.q, limit, offset },
        });
      else if (params.tipo)
        resp = await api.get("/reserva-encargado/filtro", {
          params: { tipo: params.tipo, limit, offset },
        });
      else
        resp = await api.get("/reserva-encargado/datos-especificos", {
          params: { limit, offset },
        });

      if (resp.data?.exito) {
        setReservas(resp.data.reservas || resp.data.datos?.reservas || []);
        setTotal(resp.data.total || resp.data.datos?.total || 0);
      } else {
        setError(resp.data?.mensaje || "Error al cargar reservas");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchReservas({ q: searchTerm });
    else fetchReservas();
  };

  const handleFiltro = (e) => {
    const v = e.target.value;
    setFiltro(v);
    setPage(1);
    if (v) fetchReservas({ tipo: v });
    else fetchReservas();
  };

  const openModal = async (id) => {
    setLoading(true);
    try {
      const r = await api.get(`/reserva-encargado/dato-individual/${id}`);
      if (r.data?.exito) {
        setDetalle(r.data.datos);

        setModalOpen(true);
      } else setError("No se pudo cargar detalle");
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setDetalle(null);
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(total / limit);
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Reservas de mis espacios</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              placeholder="Buscar por cancha, cliente o estado"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
            />
            <button className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full">
              Buscar
            </button>
          </form>
          <select
            value={filtro}
            onChange={handleFiltro}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
          >
            <option value="">Todos - sin filtro</option>
            <option value="fecha">Por fecha</option>
            <option value="monto">Por monto</option>
            <option value="estado">Por estado</option>
            <option value="cancha">Por cancha</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="text-red-500 mt-3">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Monto</th>
                  <th className="px-4 py-2 text-left">Saldo</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {reservas.map((r, i) => (
                  <tr key={r.id_reserva} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">
                      {r.cliente_nombre} {r.cliente_apellido}
                    </td>
                    <td className="px-4 py-3">{r.nombre_cancha}</td>
                    <td className="px-4 py-3">{new Date(r.fecha_reserva).toLocaleDateString()}</td>
                    <td className="px-4 py-3">Bs. {r.monto_total}</td>
                    <td className="px-4 py-3">Bs. {r.saldo_pendiente}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          r.estado === 'pagada'
                            ? 'px-2 py-1 rounded-full text-xs border bg-green-100 text-green-800 border-green-300'
                            : r.estado === 'cancelada'
                              ? 'px-2 py-1 rounded-full text-xs border bg-red-100 text-red-800 border-red-300'
                              : 'px-2 py-1 rounded-full text-xs border bg-yellow-100 text-yellow-800 border-yellow-300'
                        }
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openModal(r.id_reserva)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Ver datos
                      </button>
                    </td>
                  </tr>
                ))}

                {reservas.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-gray-500">
                      No hay reservas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {reservas.map((reserva, index) => (
              <div
                key={reserva.id_reserva}
                className="border bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    {/* CLIENTE */}
                    <div className="font-bold text-[#23475F]">
                      {reserva.cliente_nombre} {reserva.cliente_apellido}
                    </div>

                    {/* NUMERO DE RESERVA */}
                    <div className="text-xs text-gray-500">
                      Reserva #{(page - 1) * limit + index + 1}
                    </div>

                    <div className="mt-3 text-sm space-y-1">
                      {/* CANCHA */}
                      <div>
                        <span className="font-semibold">Cancha: </span>
                        {reserva.nombre_cancha}
                      </div>

                      {/* FECHA */}
                      <div>
                        <span className="font-semibold">Fecha: </span>
                        {new Date(reserva.fecha_reserva).toLocaleDateString()}
                      </div>

                      {/* Monto */}
                      <div>
                        <span className="font-semibold">Monto Total: </span>
                        {reserva.monto_total ? `Bs. ${reserva.monto_total}` : '-'}
                      </div>

                      {/* Saldo */}
                      <div>
                        <span className="font-semibold">Saldo: </span>
                        {reserva.saldo_pendiente ? `Bs. ${reserva.saldo_pendiente}` : '-'}
                      </div>

                      {/* Estado */}
                      <div>
                        <span className="font-semibold">Estado: </span>
                        <span
                          className={
                            reserva.estado === 'pagada'
                              ? 'px-2 py-1 rounded-full text-xs border bg-green-100 text-green-800 border-green-300'
                              : reserva.estado === 'cancelada'
                                ? 'px-2 py-1 rounded-full text-xs border bg-red-100 text-red-800 border-red-300'
                                : 'px-2 py-1 rounded-full text-xs border bg-yellow-100 text-yellow-800 border-yellow-300'
                          }
                        >
                          {reserva.estado}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BOTON MORE */}
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(reserva)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* PAGINACION SOLO MOVIL */}
            <div className="md:hidden w-full flex justify-center items-center gap-3 py-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Anterior
              </button>

              <div className="px-4 py-2 bg-gray-100 rounded-full text-sm">
                Pag {page} de {Math.ceil(total / limit) || 1}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === Math.ceil(total / limit) || total === 0}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
          {/* PAGINACION STICKY */}
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-50 mt-6">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} de {Math.ceil(total / limit) || 1}
            </span>
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

      {/* MODAL DETALLE */}
      {modalOpen && detalle && detalle.info && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 md:p-8 max-h-[80vh] overflow-y-auto transition-all">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Detalle de reserva
                </h3>
              </div>

              <span
                className={
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold " +
                  (detalle.info.estado === "pagada"
                    ? "bg-green-100 text-green-700"
                    : detalle.info.estado === "cancelada"
                      ? "bg-red-100 text-red-700"
                      : detalle.info.estado === "en_cuotas"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700")
                }
              >
                {detalle.info.estado}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">
                  {detalle.info.cliente_nombre} {detalle.info.cliente_apellido}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Cancha</p>
                <p className="font-medium text-gray-900">
                  {detalle.info.nombre_cancha}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="font-medium text-gray-900">
                  {detalle.info.fecha_reserva
                    ? String(detalle.info.fecha_reserva).split("T")[0]
                    : "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Cupo</p>
                <p className="font-medium text-gray-900">
                  {detalle.info.cupo ?? "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Monto total</p>
                <p className="font-semibold text-emerald-600">
                  {detalle.info.monto_total != null ? `Bs ${detalle.info.monto_total}` : "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Saldo pendiente</p>
                <p className="font-semibold text-gray-900">
                  {detalle.info.saldo_pendiente != null ? `Bs ${detalle.info.saldo_pendiente}` : "-"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Horarios reservados
              </h4>

              {detalle.horarios && detalle.horarios.length > 0 ? (
                <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto divide-y">
                  {detalle.horarios.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50/60"
                    >
                      <div>
                        <p className="text-[11px] text-gray-500">Inicio</p>
                        <p className="text-sm font-medium text-gray-900">
                          {h.hora_inicio}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-500">Fin</p>
                        <p className="text-sm font-medium text-gray-900">
                          {h.hora_fin}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  No hay horarios registrados para esta reserva.
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-full bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
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
                  openModal(mobileModal.id_reserva);
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>
              <button
                onClick={() => setMobileModal(null)}
                className="px-3 py-2 text-left text-gray-700 hover:bg-gray-100 mt-1 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservaEncargado;