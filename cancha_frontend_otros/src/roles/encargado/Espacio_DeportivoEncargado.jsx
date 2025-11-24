import React, { useState, useEffect } from "react";
import api from "../../services/api";

// const getImageUrl = (path) => {
//   if (!path) return "";
//   const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
//   const clean = String(path).replace(/^\//, "");
//   return `${base}/${clean}`;
// };

const getImageUrl = (path) => {
  if (!path) return "";

  // Si ya es URL completa, devolver tal cual
  if (path.startsWith("http")) return path;

  const base =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000" // tu backend local
      : "https://proyecto-cancha.onrender.com"; // tu backend en Render

  const clean = String(path).replace(/^\/+/, ""); // quitar / inicial
  return `${base}/${clean}`;
};

const Espacio_DeportivoEncargado = () => {
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [currentEspacio, setCurrentEspacio] = useState(null);

  const fetchEspacios = async (params = {}) => {
    setLoading(true);
    setError(null);

    const offset = (page - 1) * limit;

    try {
      let resp;

      if (params.q) {
        resp = await api.get("/espacio-encargado/buscar", {
          params: { limit, offset, q: params.q },
        });
      } else if (params.tipo) {
        resp = await api.get("/espacio-encargado/filtro", {
          params: { limit, offset, tipo: params.tipo },
        });
      } else {
        resp = await api.get("/espacio-encargado/datos-especificos", {
          params: { limit, offset },
        });
      }

      if (resp.data?.exito) {
        const rows = resp.data.datos?.espacios || [];
        const t = resp.data.datos?.paginacion?.total;
        setEspacios(rows);
        setTotal(typeof t === "number" ? t : 0);
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
    fetchEspacios();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchEspacios({ q: searchTerm });
    else fetchEspacios();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchEspacios({ tipo });
    else fetchEspacios();
  };

  const openViewModal = async (id) => {
    try {
      const r = await api.get(`/espacio-encargado/dato-individual/${id}`);
      if (!r.data?.exito) {
        setError(r.data?.mensaje || "No se pudo cargar");
        return;
      }
      setCurrentEspacio(r.data.datos?.espacio || null);
      setModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEspacio(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Mis Espacios Deportivos</h2>

      {/* Busqueda + Filtro */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, direccion, descripcion o admin"
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
            <option value="direccion">Por direccion</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <p>Cargando espacios...</p>
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
                  <th className="px-4 py-2 text-left">Direccion</th>
                  <th className="px-4 py-2 text-left">Horario apertura</th>
                  <th className="px-4 py-2 text-left">Horario cierre</th>
                  <th className="px-4 py-2 text-left">Administrador</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {espacios.map((e, index) => (
                  <tr key={e.id_espacio} className="border-t">
                    <td className="px-4 py-2">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-2">{e.nombre}</td>
                    <td className="px-4 py-2">{e.direccion || "-"}</td>
                    <td className="px-4 py-2">{e.horario_apertura || "-"}</td>
                    <td className="px-4 py-2">{e.horario_cierre || "-"}</td>
                    <td className="px-4 py-2">
                      {e.admin_nombre || e.admin_apellido
                        ? `${e.admin_nombre || ""} ${e.admin_apellido || ""}`
                        : "Sin admin"}
                    </td>

                    <td className="px-4 py-2">
                      <button
                        onClick={() => openViewModal(e.id_espacio)}
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

          {/* Paginacion */}
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

      {/* Modal de Vista */}
      {modalOpen && currentEspacio && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 p-6 md:p-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-400">
                  Espacio deportivo
                </p>
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Datos del espacio
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Administrado por {currentEspacio.admin_nombre || ""}{" "}
                  {currentEspacio.admin_apellido || ""}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-gray-400">Horario</p>
                <p className="text-xs font-medium text-gray-700">
                  {currentEspacio.horario_apertura || "--:--"} h -{" "}
                  {currentEspacio.horario_cierre || "--:--"} h
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Nombre</p>
                <p className="font-medium text-gray-900">
                  {currentEspacio.nombre}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Direccion</p>
                <p className="font-medium text-gray-900">
                  {currentEspacio.direccion || "-"}
                </p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <p className="text-[11px] text-gray-500">Descripcion</p>
                <p className="text-sm text-gray-800 leading-snug">
                  {currentEspacio.descripcion || "Sin descripcion registrada."}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Latitud</p>
                <p className="font-mono text-gray-900">
                  {currentEspacio.latitud || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-gray-500">Longitud</p>
                <p className="font-mono text-gray-900">
                  {currentEspacio.longitud || "-"}
                </p>
              </div>

              <div className="space-y-1 md:col-span-2 mt-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-[11px] text-gray-500">Administrador</p>
                  <p className="font-medium text-gray-900">
                    {(currentEspacio.admin_nombre || "") +
                      " " +
                      (currentEspacio.admin_apellido || "")}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] text-gray-500">Correo admin</p>
                  <p className="text-sm text-gray-800">
                    {currentEspacio.admin_correo || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Imagenes del espacio
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentEspacio.imagen_principal && (
                  <div className="relative overflow-hidden rounded-xl border border-gray-200">
                    <img
                      src={getImageUrl(currentEspacio.imagen_principal)}
                      alt="espacio_principal"
                      className="w-full h-48 object-cover"
                    />

                    <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 text-[10px] text-white font-medium">
                      Principal
                    </span>
                  </div>
                )}

                {[1, 2, 3, 4].map((i) => {
                  const key = `imagen_sec_${i}`;
                  const imgPath = currentEspacio[key];
                  if (!imgPath) return null;

                  return (
                    <div
                      key={key}
                      className="relative overflow-hidden rounded-xl border border-gray-200"
                    >
                      <img
                        src={getImageUrl(imgPath)}
                        alt={key}
                        className="w-full h-40 object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/55 text-[10px] text-white font-medium">
                        Extra {i}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!currentEspacio.imagen_principal &&
                ![1, 2, 3, 4].some(
                  (i) => currentEspacio[`imagen_sec_${i}`]
                ) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Este espacio no tiene imagenes registradas.
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

export default Espacio_DeportivoEncargado;
