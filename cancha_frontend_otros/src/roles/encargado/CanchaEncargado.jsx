import React, { useState, useEffect } from "react";
import api from "../../services/api";

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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Mis Canchas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, ubicacion o estado"
              className="border rounded-l px-4 py-2 w-full"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
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
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Ubicacion</th>
                  <th className="px-4 py-2 text-left">Capacidad</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Monto/hora</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {canchas.map((c, index) => (
                  <tr key={c.id_cancha} className="border-t">
                    <td className="px-4 py-2">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2">{c.ubicacion || "-"}</td>
                    <td className="px-4 py-2">{c.capacidad || "-"}</td>
                    <td className="px-4 py-2">{c.estado || "-"}</td>
                    <td className="px-4 py-2">
                      {c.monto_por_hora ? `${c.monto_por_hora} Bs` : "-"}
                    </td>
                    <td className="px-4 py-2">
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

          <div className="flex justify-center mt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-l hover:bg-gray-400 disabled:opacity-50"
            >
              Anterior
            </button>

            <span className="px-4 py-2 bg-gray-100">
              Pagina {page} de {Math.ceil(total / limit)}
            </span>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-r hover:bg-gray-400 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {modalOpen && currentCancha && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                  Cancha
                </p>
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
                      "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium " +
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
                {currentCancha.monto_por_hora && (
                  <p className="text-xs text-gray-700">
                    Monto por hora:{" "}
                    <span className="font-semibold">
                      Bs {currentCancha.monto_por_hora}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="mb-6">
              {currentCancha.imagen_cancha ? (
                <div className="relative overflow-hidden rounded-2xl border border-gray-200">
                  <img
                    src={
                      currentCancha.imagen_cancha.startsWith("http")
                        ? currentCancha.imagen_cancha
                        : `https://proyecto-cancha.onrender.com/${currentCancha.imagen_cancha.replace(
                            /^\/+/,
                            ""
                          )}`
                    }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
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
                    ? `Bs ${currentCancha.monto_por_hora}`
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-4">
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
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {d.nombre}
                        </span>
                        {d.frecuencia_practica && (
                          <span className="text-[11px] text-gray-500">
                            Frecuencia: {d.frecuencia_practica}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-900 text-white text-[10px] font-medium">
                        Activa
                      </span>
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
                className="px-5 py-2.5 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
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

export default CanchaEncargado;
