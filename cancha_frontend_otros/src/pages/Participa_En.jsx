/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import api from "../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

const ParticipaEn = () => {
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalCreateOpen, setModalCreateOpen] = useState(false);

  const [viewMode, setViewMode] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);

  const [currentReserva, setCurrentReserva] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedReservaForCreation, setSelectedReservaForCreation] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");

  const limit = 10;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const parseError = (e, text = "Error de conexion") => {
    if (!e) return text;
    if (e.response?.data?.mensaje) return e.response.data.mensaje;
    if (e.response?.data?.message) return e.response.data.message;
    if (typeof e.response?.data === "string") return e.response.data;
    if (e.message === "Network Error") return "No se pudo conectar al servidor";
    return text;
  };

  const fetchReservasBase = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const r = await api.get("/participa_en/por-reserva", {
        params: { limit, offset }
      });
      if (r.data?.exito) {
        setReservas(r.data.datos?.reservas || []);
        setTotal(r.data.datos?.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || "Error al obtener reservas");
      }
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchBuscar = async () => {
    if (!searchTerm.trim()) {
      fetchReservasBase();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const r = await api.get("/participa_en/buscar", {
        params: { q: searchTerm, limit, offset }
      });
      if (r.data?.exito) {
        setReservas(r.data.datos?.reservas || []);
        setTotal(r.data.datos?.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || "Error al buscar");
      }
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltro = async () => {
    if (!filtro) {
      fetchReservasBase();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      let tipo = filtro;
      if (filtro === "fecha") tipo = "fecha_desc";
      if (filtro === "cliente") tipo = "cliente";
      if (filtro === "cancha") tipo = "cancha";
      const r = await api.get("/participa_en/filtro", {
        params: { tipo, limit, offset }
      });
      if (r.data?.exito) {
        setReservas(r.data.datos?.reservas || []);
        setTotal(r.data.datos?.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || "Error al filtrar");
      }
    } catch (e) {
      setError(parseError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) fetchBuscar();
    else if (filtro) fetchFiltro();
    else fetchReservasBase();
  }, [page, searchTerm, filtro]);

  const fetchClientes = async () => {
    try {
      const r = await api.get("/cliente/datos-especificos", {
        params: { limit: 2000 }
      });
      if (r.data?.exito) setClientes(r.data.datos?.clientes || []);
    } catch { }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const normalizeParticipantes = (arr) => {
    return (arr || []).map((p) => ({
      id_deportista: Number(p.id_deportista),
      nombre: p.nombre,
      apellido: p.apellido
    }));
  };

  const openViewModal = (reserva) => {
    setCurrentReserva(reserva);
    setParticipantes(normalizeParticipantes(reserva.participantes));
    setViewMode(true);
    setEditMode(false);
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (reserva) => {
    setCurrentReserva(reserva);
    setParticipantes(normalizeParticipantes(reserva.participantes));
    setSelectedCliente("");
    setViewMode(false);
    setEditMode(true);
    setModalError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setViewMode(false);
    setCurrentReserva(null);
    setModalError(null);
    setParticipantes([]);
  };

  const openCreateModal = () => {
    setModalCreateOpen(true);
    setSelectedReservaForCreation("");
    setSelectedCliente("");
    setModalError(null);
  };

  const closeCreateModal = () => {
    setModalCreateOpen(false);
    setSelectedReservaForCreation("");
    setSelectedCliente("");
    setModalError(null);
  };

  const handleAddParticipante = async () => {
    if (!selectedCliente) {
      setModalError("Debe seleccionar un cliente");
      return;
    }
    try {
      const r = await api.post(
        `/participa_en/reserva/${currentReserva.id_reserva}/agregar`,
        { id_cliente: Number(selectedCliente) }
      );
      if (r.data?.exito) {
        fetchReservasBase();

        const cli = clientes.find((c) => c.id_cliente == selectedCliente);
        const nuevo = {
          id_deportista: Number(selectedCliente),
          nombre: cli?.nombre,
          apellido: cli?.apellido
        };
        setParticipantes((prev) => [...prev, nuevo]);
        setSelectedCliente("");
      } else {
        setModalError(r.data?.mensaje || "No se pudo agregar");
      }
    } catch (e) {
      setModalError(parseError(e, "Error al agregar participante"));
    }
  };

  const handleDeleteParticipante = async (id_deportista) => {
    const idReserva = Number(currentReserva?.id_reserva);
    const idDep = Number(id_deportista);

    try {
      const r = await api.delete(
        `/participa_en/reserva/${idReserva}/deportista/${idDep}`
      );
      if (r.data?.exito) {
        setParticipantes((prev) =>
          prev.filter((p) => p.id_deportista !== idDep)
        );
        fetchReservasBase();
      } else {
        setModalError(r.data?.mensaje || "No se pudo eliminar");
      }
    } catch (e) {
      setModalError(parseError(e, "Error al eliminar"));
    }
  };

  const handleDeleteAll = async (id_reserva) => {
    setMobileModal(null);
    setDeleteOpen(true);
    setDeleteUser({ id_reserva });
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;

    try {
      const r = await api.delete(`/participa_en/reserva/${deleteUser.id_reserva}`);
      if (r.data?.exito) {
        setDeleteOpen(false);
        setDeleteUser(null);
        fetchReservasBase();
      } else {
        setError(r.data?.mensaje || "Error al eliminar");
      }
    } catch (e) {
      setError(parseError(e));
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteUser(null);
  };

  const handleCreateRelation = async () => {
    if (!selectedReservaForCreation || !selectedCliente) {
      setModalError("Debe seleccionar reserva y cliente");
      return;
    }

    try {
      const r = await api.post(
        `/participa_en/reserva/${selectedReservaForCreation}/agregar`,
        { id_cliente: Number(selectedCliente) }
      );
      if (r.data?.exito) {
        closeCreateModal();
        fetchReservasBase();
      } else {
        setModalError(r.data?.mensaje || "No se pudo crear la relacion");
      }
    } catch (e) {
      setModalError(parseError(e, "Error al crear relacion"));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestion de Participantes por Reserva</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            type="text"
            className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden px-4 py-2 focus:outline-none text-md"
            placeholder="Buscar por cliente, cancha o participante"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />

          <select
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value);
              setPage(1);
            }}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
          >
            <option value="">Sin filtro</option>
            <option value="fecha">Fecha</option>
            <option value="cliente">Cliente responsable</option>
            <option value="cancha">Cancha</option>
          </select>

          <button
            onClick={openCreateModal}
            className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
          >
            Crear relacion
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando controles...</p>
      ) : error ? (
        <p className="text-red-500 mt-1">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Cancha</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Participantes</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {reservas.map((r, idx) => {
                  const totalParticipantes =
                    (r.participantes ? r.participantes.length : 0) + 1;

                  return (
                    <tr key={r.id_reserva} className="border-t hover:bg-gray-50 transition">
                      <td className="px-4 py-3">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-4 py-3">
                        {r.cliente_nombre} {r.cliente_apellido}
                      </td>
                      <td className="px-4 py-3">{r.cancha_nombre}</td>
                      <td className="px-4 py-3">
                        {new Date(r.fecha_reserva).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {totalParticipantes}/{r.cupo}
                      </td>
                      <td className="px-4 py-3 flex gap-3">
                        <button
                          onClick={() => openViewModal(r)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
                        </button>

                        <button
                          onClick={() => openEditModal(r)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleDeleteAll(r.id_reserva)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {reservas.map((r, index) => (
              <div
                key={r.id_reserva}
                className="border bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {r.cliente_nombre} {r.cliente_apellido}
                    </div>

                    <div className="text-xs text-gray-500">
                      Reserva #{(page - 1) * limit + index + 1}
                    </div>

                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Cancha: </span>
                        {r.cancha_nombre}
                      </div>

                      <div>
                        <span className="font-semibold">Fecha: </span>
                        {new Date(r.fecha_reserva).toLocaleDateString()}
                      </div>

                      <div>
                        <span className="font-semibold">Participantes: </span>
                        {(r.participantes ? r.participantes.length : 0) + 1}/{r.cupo}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(r)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* PAGINACIÓN SOLO MOVIL */}
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
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-50 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} / {Math.ceil(total / limit)}
            </span>
            <button
              disabled={page === Math.ceil(total / limit)}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
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
                  openViewModal(mobileModal);
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal);
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);
                  setDeleteUser(mobileModal);
                }}
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
              >
                Eliminar
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
      {deleteOpen && deleteUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Eliminar reserva
            </h3>

            <p className="text-gray-700 text-md">
              ¿Seguro que deseas eliminar todos los participantes de la reserva{" "}
              <span className="font-bold">#{deleteUser.id_reserva}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-full text-md font-medium hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              {viewMode ? "Ver Reserva" : editMode ? "Editar Reserva" : "Crear Reserva"}
            </h3>
            {currentReserva && (
              <>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">

                  {/* CLIENTE */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1">Cliente</label>
                    <input
                      disabled
                      value={`${currentReserva.cliente_nombre} ${currentReserva.cliente_apellido}`}
                      className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    />
                  </div>

                  {/* CANCHA */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1">Cancha</label>
                    <input
                      disabled
                      value={currentReserva.cancha_nombre}
                      className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    />
                  </div>

                  {/* FECHA */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Fecha</label>
                    <input
                      disabled
                      value={new Date(currentReserva.fecha_reserva).toLocaleDateString()}
                      className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    />
                  </div>

                  {/* CUPO */}
                  <div>
                    <label className="block text-sm font-semibold mb-1">Cupo</label>
                    <input
                      disabled
                      value={currentReserva.cupo}
                      className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    />
                  </div>

                  {/* PARTICIPANTES */}
                  <div className="md:col-span-2 mt-2">
                    <label className="block text-sm font-semibold mb-2 text-gray-800">
                      Participantes
                    </label>

                    {/* SIN PARTICIPANTES */}
                    {participantes.length === 0 && (
                      <div className="text-gray-500 text-sm italic bg-gray-50 border border-gray-200 rounded-xl p-4">
                        No hay participantes.
                      </div>
                    )}

                    {/* LISTA SIMPLE Y MODERNA */}
                    <div className="space-y-2">
                      {participantes.map((p, idx) => (
                        <div
                          key={p.id_deportista || idx}
                          className="flex items-center justify-between border border-gray-200 bg-white rounded-xl px-4 py-3 shadow-sm hover:shadow transition-all cursor-default"
                        >
                          {/* Datos del participante */}
                          <div>
                            <span className="block text-gray-800 font-medium text-sm">
                              {p.nombre} {p.apellido}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {p.id_deportista}
                            </span>
                          </div>

                          {/* Botón delete minimal */}
                          {editMode && (
                            <button
                              type="button"
                              onClick={() => handleDeleteParticipante(p.id_deportista)}
                              className="text-red-500 text-sm bg-red-50 px-3 py-1 rounded-full hover:bg-red-100 hover:text-red-600 transition"
                            >
                              delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AGREGAR PARTICIPANTE */}
                  {editMode && (
                    <div className="md:col-span-2 mt-3">
                      <label className="block text-sm font-semibold mb-1">Agregar participante</label>
                      <select
                        value={selectedCliente}
                        onChange={(e) => setSelectedCliente(e.target.value)}
                        className="border px-3 py-2 rounded w-full mb-3"
                      >
                        <option value="">Seleccione un cliente</option>
                        {clientes.map((c) => (
                          <option key={c.id_cliente} value={c.id_cliente}>
                            {c.nombre} {c.apellido}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleAddParticipante}
                        type="button"
                        className="bg-[#23475F] text-white px-4 py-2 rounded-full hover:bg-[#1d3a4e] w-full"
                      >
                        Agregar participante
                      </button>
                    </div>
                  )}
                  {modalError && (
                    <div className="bg-red-100 text-red-600 p-3 mb-2 rounded-md text-sm">
                      {modalError}
                    </div>
                  )}
                  <div className="md:col-span-2 flex justify-end mt-3 gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
                    >
                      Cerrar
                    </button>

                    {editMode && (
                      <button
                        type="button"
                        onClick={() => handleAddParticipante()}
                        className="px-5 py-2 bg-[#23475F] text-white rounded-full text-md font-medium hover:bg-[#1d3a4e]"
                      >
                        Guardar cambios
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {modalCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full border border-gray-200 shadow-2xl">

            <h3 className="text-xl font-semibold mb-4 text-[#23475F]">
              Crear Relacion
            </h3>

            {/* ERROR MODAL */}
            {modalError && (
              <div className="bg-red-100 text-red-600 p-3 mb-4 rounded-md text-sm">
                {modalError}
              </div>
            )}

            {/* RESERVA */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1 text-gray-800">
                Reserva
              </label>

              <select
                value={selectedReservaForCreation}
                onChange={(e) => setSelectedReservaForCreation(e.target.value)}
                className="w-full border rounded-xl bg-gray-50 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-[#23475F] transition"
              >
                <option value="">Seleccione una reserva</option>
                {reservas.map((r) => (
                  <option key={r.id_reserva} value={r.id_reserva}>
                    Reserva #{r.id_reserva} - {r.cliente_nombre} {r.cliente_apellido} ({r.cancha_nombre})
                  </option>
                ))}
              </select>
            </div>

            {/* CLIENTE */}
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-1 text-gray-800">
                Cliente
              </label>

              <select
                value={selectedCliente}
                onChange={(e) => setSelectedCliente(e.target.value)}
                className="w-full border rounded-xl bg-gray-50 px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-[#23475F] transition"
              >
                <option value="">Seleccione un cliente</option>
                {clientes.map((c) => (
                  <option key={c.id_cliente} value={c.id_cliente}>
                    {c.nombre} {c.apellido}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN CREAR */}
            <button
              onClick={handleCreateRelation}
              className="w-full bg-[#23475F] text-white px-4 py-2 rounded-full text-md font-medium hover:bg-[#1d3a4e] shadow-sm transition"
            >
              Crear relación
            </button>

            {/* FOOTER */}
            <div className="flex justify-end mt-4">
              <button
                onClick={closeCreateModal}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300 transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipaEn;