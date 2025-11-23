import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { getImageUrl } from "../../utils";

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

      {/* BUSCADOR Y FILTRO */}
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

      {/* TABLA */}
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

          {/* PAGINACION */}
          <div className="flex justify-center mt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-l hover:bg-gray-400 disabled:opacity-50"
            >
              Anterior
            </button>

            <span className="px-4 py-2 bg-gray-100">
              Página {page} de {Math.ceil(total / limit)}
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

      {/* MODAL */}
      {modalOpen && currentCancha && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Datos de la Cancha</h3>

            {/* Imagen */}
            {currentCancha.imagen_cancha ? (
              <img
                src={
                  currentCancha.imagen_cancha.startsWith("http")
                    ? currentCancha.imagen_cancha
                    : `${api.defaults.baseURL}/${currentCancha.imagen_cancha}`
                }
                alt="Foto de cancha"
                className="w-full h-64 object-cover rounded mb-4"
              />
            ) : (
              <p className="text-gray-500 mb-4">Sin imagen</p>
            )}

            {/* Tabla de valores */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <p>
                <strong>Nombre:</strong> {currentCancha.nombre}
              </p>
              <p>
                <strong>Ubicacion:</strong> {currentCancha.ubicacion || "-"}
              </p>
              <p>
                <strong>Capacidad:</strong> {currentCancha.capacidad || "-"}
              </p>
              <p>
                <strong>Estado:</strong> {currentCancha.estado || "-"}
              </p>
              <p>
                <strong>Monto/hora:</strong>{" "}
                {currentCancha.monto_por_hora || "-"}
              </p>
              <p>
                <strong>Espacio:</strong> {currentCancha.espacio_nombre}
              </p>
            </div>

            {/* Disciplinas */}
            <h4 className="text-lg font-semibold mb-2">Disciplinas</h4>

            {currentCancha.disciplinas &&
            currentCancha.disciplinas.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {currentCancha.disciplinas.map((d) => (
                  <li
                    key={d.id_disciplina}
                    className="p-2 border rounded flex justify-between"
                  >
                    <span>{d.nombre}</span>
                    <span className="text-sm text-gray-600">
                      {d.frecuencia_practica}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Sin disciplinas asignadas</p>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={closeModal}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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
