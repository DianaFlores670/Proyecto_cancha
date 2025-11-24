/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */

import React, { useState, useEffect } from "react";
import api from "../../services/api";

const Reporte_IncidenciaEncargado = () => {
  const [reportes, setReportes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [detalle, setDetalle] = useState(null);

  const [formDetalle, setFormDetalle] = useState("");
  const [formSugerencia, setFormSugerencia] = useState("");
  const [formReserva, setFormReserva] = useState("");
  const [reservasDisponibles, setReservasDisponibles] = useState([]);


  /* ========================= FETCH LIST ========================= */

  const fetchReportes = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;

    try {
      let resp;

      if (params.q) {
        resp = await api.get("/reporte-incidencia-encargado/buscar", {
          params: { q: params.q, limit, offset },
        });
      } else if (params.tipo) {
        resp = await api.get("/reporte-incidencia-encargado/filtro", {
          params: { tipo: params.tipo, limit, offset },
        });
      } else {
        resp = await api.get("/reporte-incidencia-encargado/datos-especificos", {
          params: { limit, offset },
        });
      }

      if (resp.data?.exito) {
        setReportes(resp.data.datos?.reportes || resp.data.reportes || []);
        setTotal(resp.data.datos?.total || resp.data.total || 0);
      } else {
        setError(resp.data?.mensaje || "Error al cargar reportes");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, [page]);

  /* ========================= BUSCAR / FILTRO ========================= */

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchReportes({ q: searchTerm });
    else fetchReportes();
  };

  const handleFiltro = (e) => {
    setFiltro(e.target.value);
    setPage(1);
    if (e.target.value) fetchReportes({ tipo: e.target.value });
    else fetchReportes();
  };

  /* ========================= DETALLE ========================= */

  const openModal = async (id) => {
    setLoading(true);
    try {
      const r = await api.get(`/reporte-incidencia-encargado/dato-individual/${id}`);

      if (r.data?.exito) {
        setDetalle(r.data.datos?.reporte);
        setFormDetalle(r.data.datos.reporte.detalle);
        setFormSugerencia(r.data.datos.reporte.sugerencia);
        setFormReserva(r.data.datos.reporte.id_reserva);

        setEditMode("ver");
        setModalOpen(true);
      } else {
        setError("No se pudo cargar detalle");
      }
    } catch (e) {
      setError("Error al cargar detalle");
    } finally {
      setLoading(false);
    }
  };

  const openEditar = async (id) => {
    setLoading(true);
    try {
      await loadReservas();

      const r = await api.get(`/reporte-incidencia-encargado/dato-individual/${id}`);
      if (r.data?.exito) {
        const rep = r.data.datos.reporte;

        if (rep.verificado) {
          setError("No puedes editar un reporte verificado");
          setLoading(false);
          return;
        }

        setDetalle(rep);
        setFormDetalle(rep.detalle);
        setFormSugerencia(rep.sugerencia);
        setFormReserva(rep.id_reserva);

        setEditMode("editar");
        setModalOpen(true);
      }
    } catch (e) {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setDetalle(null);
    setEditMode(false);
  };

  /* ========================= CREAR ========================= */

  const openCreate = async () => {
    await loadReservas("pasadas");
    setDetalle(null);
    setEditMode("crear");
    setModalOpen(true);
    setFormDetalle("");
    setFormSugerencia("");
    setFormReserva("");
  };


  const enviarNuevo = async (e) => {
    e.preventDefault();
    try {
      const resp = await api.post("/reporte-incidencia-encargado", {
        detalle: formDetalle,
        sugerencia: formSugerencia,
        id_reserva: formReserva,
      });

      if (resp.data?.exito) {
        closeModal();
        fetchReportes();
      } else {
        setError(resp.data?.mensaje || "No se pudo crear reporte");
      }
    } catch (e) {
      setError("Error al crear");
    }
  };

  /* ========================= EDITAR ========================= */

  const enviarEdicion = async (e) => {
    e.preventDefault();
    try {
      const resp = await api.put(`/reporte-incidencia-encargado/${detalle.id_reporte}`, {
        detalle: formDetalle,
        sugerencia: formSugerencia,
        id_reserva: formReserva,
      });

      if (detalle.verificado) {
        setError("No puedes editar un reporte verificado");
        return;
      }

      if (resp.data?.exito) {
        closeModal();
        fetchReportes();
      } else {
        setError(resp.data?.mensaje || "No se pudo editar reporte");
      }
    } catch (e) {
      setError("Error al editar");
    }
  };

const loadReservas = async (modo = "todas") => {
  try {
    const url =
      modo === "pasadas"
        ? "/reporte-incidencia-encargado/reservas-pasadas"
        : "/reporte-incidencia-encargado/reservas-disponibles";

    const r = await api.get(url);
    if (r.data?.exito) {
      setReservasDisponibles(r.data.datos.reservas);
    }
  } catch (e) {
    console.error("Error al cargar reservas");
  }
};



  /* ========================= RENDER ========================= */

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Reportes de Incidencias</h2>

      {/* BUSQUEDA Y FILTRO */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        {/* BUSCAR */}
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              placeholder="Buscar por detalle, sugerencia o cancha"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-l px-4 py-2 w-full"
            />
            <button className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap">
              Buscar
            </button>
          </form>
        </div>

        {/* FILTRO */}
        <div>
          <select
            value={filtro}
            onChange={handleFiltro}
            className="border rounded px-3 py-2 sm:min-w-[200px]"
          >
            <option value="">Todos - sin filtro</option>
            <option value="fecha">Por fecha</option>
            <option value="verificado">Por verificado</option>
            <option value="cancha">Por cancha</option>
          </select>
        </div>

        {/* CREAR */}
        <button
          onClick={openCreate}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap"
        >
          Crear Reporte
        </button>
      </div>

      {/* TABLA */}
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Cancha</th>
                <th className="px-4 py-2 text-left">Reserva cliente</th>
                <th className="px-4 py-2 text-left">Fecha Reserva</th>
                <th className="px-4 py-2 text-left">Detalle</th>
                <th className="px-4 py-2 text-left">Verificado</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {reportes.map((r, i) => (
                <tr key={r.id_reporte} className="border-t">
                  <td className="px-4 py-2">{(page - 1) * limit + i + 1}</td>
                  <td className="px-4 py-2">{r.nombre_cancha}</td>
                  <td className="px-4 py-2">
                    #{r.id_reserva} {r.cliente_completo}
                  </td>
                  <td className="px-4 py-2">
                    {r.fecha_reserva?.split("T")[0]}
                  </td>
                  <td className="px-4 py-2">
                    {r.detalle.length > 30
                      ? r.detalle.slice(0, 30) + "..."
                      : r.detalle}
                  </td>
                  <td className="px-4 py-2">
                    {r.verificado ? "✔" : "❌"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openModal(r.id_reporte)}
                      className="text-blue-500 hover:text-blue-700 mr-3"
                    >
                      Ver
                    </button>

                    <button
                      onClick={() => r.verificado ? null : openEditar(r.id_reporte)}
                      disabled={r.verificado}
                      className={
                        r.verificado
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-green-600 hover:text-green-800"
                      }
                    >
                      Editar
                    </button>


                  </td>
                </tr>
              ))}

              {reportes.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-gray-500">
                    No hay reportes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINACION */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-l disabled:opacity-50"
        >
          Anterior
        </button>

        <span className="px-4 py-2 bg-gray-100">
          Página {page} de {Math.ceil(total / limit)}
        </span>

        <button
          onClick={() => setPage(page + 1)}
          disabled={page === Math.ceil(total / limit)}
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded-r disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#020617]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <div>
                <h3 className="text-lg md:text-xl font-semibold text-[#0F172A]">
                  {editMode === "ver" && "Detalle del reporte"}
                  {editMode === "crear" && "Crear reporte"}
                  {editMode === "editar" && "Editar reporte"}
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Informacion general de la reserva y el reporte registrado
                </p>
              </div>

              {detalle && typeof detalle.verificado === "boolean" && (
                <span
                  className={
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                    (detalle.verificado
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : "bg-[#FEF9C3] text-[#92400E]")
                  }
                >
                  {detalle.verificado ? "Verificado" : "Pendiente"}
                </span>
              )}
            </div>

            {editMode === "editar" && detalle?.verificado && (
              <div className="px-6 pt-3">
                <p className="text-[13px] text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg px-3 py-2">
                  Este reporte ya esta verificado. No puedes editarlo.
                </p>
              </div>
            )}

            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh] text-sm">
              {editMode === "ver" && detalle && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Cancha
                      </p>
                      <p className="text-[#0F172A]">{detalle.nombre_cancha}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Fecha reserva
                      </p>
                      <p className="text-[#0F172A]">
                        {detalle.fecha_reserva?.split("T")[0] || "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Cliente
                      </p>
                      <p className="text-[#0F172A]">
                        {detalle.cliente_nombre} {detalle.cliente_apellido}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Reserva
                      </p>
                      <p className="text-[#0F172A]">
                        {detalle.id_reserva ? `#${detalle.id_reserva}` : "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Estado reserva
                      </p>
                      <p className="text-[#0F172A]">
                        {detalle.estado_reserva || "-"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                        Verificado
                      </p>
                      <p className="text-[#0F172A]">
                        {detalle.verificado ? "Si" : "No"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                        Detalle del reporte
                      </p>
                      <p className="text-[#0F172A] text-sm leading-relaxed bg-[#F8FAFC] rounded-lg px-3 py-2">
                        {detalle.detalle || "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                        Sugerencia
                      </p>
                      <p className="text-[#0F172A] text-sm leading-relaxed bg-[#F8FAFC] rounded-lg px-3 py-2">
                        {detalle.sugerencia || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(editMode === "crear" || (editMode === "editar" && !detalle?.verificado)) && (
                <form
                  onSubmit={editMode === "editar" ? enviarEdicion : enviarNuevo}
                  className="space-y-4 mt-1"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      Detalle
                    </label>
                    <textarea
                      className="border border-[#CBD5E1] w-full rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/70 focus:border-[#0F172A]"
                      value={formDetalle}
                      onChange={(e) => setFormDetalle(e.target.value)}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      Sugerencia
                    </label>
                    <textarea
                      className="border border-[#CBD5E1] w-full rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/70 focus:border-[#0F172A]"
                      value={formSugerencia}
                      onChange={(e) => setFormSugerencia(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      Reserva relacionada
                    </label>
                    <select
                      className="border border-[#CBD5E1] w-full rounded-lg px-3 py-2 text-sm bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/70 focus:border-[#0F172A]"
                      value={formReserva}
                      onChange={(e) => setFormReserva(e.target.value)}
                      required
                    >
                      <option value="">Seleccione una reserva</option>
                      {reservasDisponibles.map((r) => (
                        <option key={r.id_reserva} value={r.id_reserva}>
                          #{r.id_reserva} {r.cliente_completo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#CBD5E1] text-[#0F172A] bg-white hover:bg-[#F1F5F9] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0F172A] text-white hover:bg-[#020617] transition-colors"
                    >
                      {detalle && editMode === "editar" ? "Actualizar" : "Crear"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {editMode === "ver" && (
              <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F9FAFB] flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0F172A] text-white hover:bg-[#020617] transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Reporte_IncidenciaEncargado;