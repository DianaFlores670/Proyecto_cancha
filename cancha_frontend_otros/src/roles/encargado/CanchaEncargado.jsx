/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

const getImageUrl = (path) => {
  if (!path) return "";

  path = path.trim();

  // Si ya es URL completa, devolver tal cual
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://proyecto-cancha.onrender.com";

  // Quitar cualquier barra inicial sobrante
  path = path.replace(/^\/+/, "");

  return `${base}/${path}`;
};

const CanchaEncargado = () => {
  const [canchas, setCanchas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [mobileModal, setMobileModal] = useState(null);
  const [currentCancha, setCurrentCancha] = useState(null);

  const fetchCanchas = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;

    try {
      let resp;

      if (params.q) {
        resp = await api.get("/cancha-encargado/buscar", {
          params: { limit, offset, q: params.q },
        });
      } else if (params.tipo) {
        resp = await api.get("/cancha-encargado/filtro", {
          params: { limit, offset, tipo: params.tipo },
        });
      } else {
        resp = await api.get("/cancha-encargado/datos-especificos", {
          params: { limit, offset },
        });
      }

      if (resp.data?.exito) {
        setCanchas(resp.data.datos?.canchas || []);
        setTotal(resp.data.datos?.paginacion?.total || 0);
      } else {
        setError(resp.data?.mensaje || "Error al cargar");
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanchas();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchCanchas({ q: searchTerm });
    else fetchCanchas();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchCanchas({ tipo });
    else fetchCanchas();
  };

  const openViewModal = async (id) => {
    try {
      const r = await api.get(`/cancha-encargado/dato-individual/${id}`);
      if (!r.data?.exito) {
        setError(r.data?.mensaje || "No se pudo cargar");
        return;
      }
      setCurrentCancha(r.data.datos?.cancha || null);
      setModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentCancha(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Mis Canchas</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, ubicacion o estado"
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
            />
            <button
              type="submit"
              className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full"
            >
              Buscar
            </button>
          </form>
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
          >
            <option value="">Todos - sin filtro</option>
            <option value="nombre">Por nombre</option>
            <option value="capacidad">Por capacidad</option>
            <option value="estado">Por estado</option>
            <option value="monto">Por monto por hora</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando canchas...</p>
      ) : error ? (
        <p className="text-red-500 mt-3">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Ubicacion</th>
                  <th className="px-4 py-2 text-left">Capacidad</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Monto/hora</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {canchas.map((c, index) => (
                  <tr key={c.id_cancha} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3">{c.nombre}</td>
                    <td className="px-4 py-3">{c.ubicacion || "-"}</td>
                    <td className="px-4 py-3">{c.capacidad || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`
      px-3 py-1 rounded-full text-xs border
      ${c.estado?.toLowerCase() === "disponible" ? "bg-green-100 text-green-800 border-green-300" : ""}
      ${c.estado?.toLowerCase() === "ocupada" ? "bg-red-100 text-red-800 border-red-300" : ""}
      ${c.estado?.toLowerCase() === "mantenimiento" ? "bg-yellow-100 text-yellow-800 border-yellow-300" : ""}
    `}
                      >
                        {c.estado ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1) : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.monto_por_hora ? `Bs. ${c.monto_por_hora}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openViewModal(c.id_cancha)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Ver datos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {canchas.map((cancha, index) => (
              <div key={cancha.id_cancha} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {cancha.nombre}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cancha #{(page - 1) * limit + index + 1}
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Ubicación: </span>
                        {cancha.ubicacion || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Capacidad: </span>
                        {cancha.capacidad || '-'}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold">Estado:</span>

                        <span
                          className={`
      px-3 py-1 rounded-full text-xs border
      ${cancha.estado?.toLowerCase() === "disponible" ?
                              "bg-green-100 text-green-700 border-green-300" : ""}
      ${cancha.estado?.toLowerCase() === "ocupada" ?
                              "bg-red-100 text-red-700 border-red-300" : ""}
      ${cancha.estado?.toLowerCase() === "mantenimiento" ?
                              "bg-yellow-100 text-yellow-700 border-yellow-300" : ""}
    `}
                        >
                          {cancha.estado?.toLowerCase() === "disponible"}
                          {cancha.estado?.toLowerCase() === "ocupada"}
                          {cancha.estado?.toLowerCase() === "mantenimiento"}

                          {cancha.estado
                            ? cancha.estado.charAt(0).toUpperCase() + cancha.estado.slice(1)
                            : "-"
                          }
                        </span>
                      </div>

                      <div>
                        <span className="font-semibold">Monto por hora: </span>
                        {cancha.monto_por_hora ? `${cancha.monto_por_hora} Bs.` : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(cancha)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* PAGINACIÓN SOLO MOVIL */}
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
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} de {Math.ceil(total / limit)}
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

      {modalOpen && currentCancha && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Datos de la cancha
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Espacio: {currentCancha.espacio_nombre || "-"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {currentCancha.estado && (
                  <span
                    className={
                      "px-3 py-1 rounded-full text-xs border " +
                      (currentCancha.estado === "disponible"
                        ? "bg-green-100 text-green-700"
                        : currentCancha.estado === "ocupada"
                          ? "bg-blue-100 text-blue-700"
                          : currentCancha.estado === "mantenimiento"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700")
                    }
                  >
                    {currentCancha.estado}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-6">
              {currentCancha.imagen_cancha ? (
                <div className="relative overflow-hidden rounded-2xl border border-gray-200">
                  <img
                    src={getImageUrl(currentCancha.imagen_cancha)}
                    alt="foto_cancha"
                    className="w-full h-64 object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 text-[10px] text-white font-medium">
                    Imagen principal
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
                  <p className="text-xs text-gray-500">Sin imagen registrada</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6 px-1">
              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Nombre</p>
                <p className="font-medium text-gray-900">
                  {currentCancha.nombre || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Ubicacion</p>
                <p className="font-medium text-gray-900">
                  {currentCancha.ubicacion || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Capacidad</p>
                <p className="font-medium text-gray-900">
                  {currentCancha.capacidad || "-"} personas
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Monto por hora</p>
                <p className="font-medium text-gray-900">
                  {currentCancha.monto_por_hora
                    ? `Bs. ${currentCancha.monto_por_hora}`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 px-1">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Disciplinas asociadas
                </h4>
                {currentCancha.disciplinas &&
                  currentCancha.disciplinas.length > 0 && (
                    <span className="text-[11px] text-gray-500">
                      {currentCancha.disciplinas.length} disciplina
                      {currentCancha.disciplinas.length > 1 ? "s" : ""}
                    </span>
                  )}
              </div>

              {currentCancha.disciplinas &&
                currentCancha.disciplinas.length > 0 ? (
                <ul className="space-y-2 mb-2">
                  {currentCancha.disciplinas.map((d) => (
                    <li
                      key={d.id_disciplina}
                      className="flex items-center justify-between px-3 py-2 rounded-full border border-gray-200 bg-gray-50"
                    >
                      <div className="flex flex-col px-2">
                        <span className="text-sm font-medium text-gray-900">
                          {d.nombre}
                        </span>
                        {d.frecuencia_practica && (
                          <span className="text-[11px] text-gray-500">
                            Frecuencia: {d.frecuencia_practica}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">
                  Sin disciplinas asignadas a esta cancha.
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
              {/* Ver datos del control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_cancha);
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

export default CanchaEncargado;
