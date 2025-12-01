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
  const [mobileModal, setMobileModal] = useState(null);
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
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Mis Espacios Deportivos</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, direccion, descripcion o admin"
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
            <option value="direccion">Por direccion</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando espacios...</p>
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
                  <th className="px-4 py-2 text-left">Direccion</th>
                  <th className="px-4 py-2 text-left">Horario apertura</th>
                  <th className="px-4 py-2 text-left">Horario cierre</th>
                  <th className="px-4 py-2 text-left">Administrador</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {espacios.map((e, index) => (
                  <tr key={e.id_espacio} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3">{e.nombre}</td>
                    <td className="px-4 py-3">{e.direccion || "-"}</td>
                    <td className="px-4 py-3">{e.horario_apertura || "-"}</td>
                    <td className="px-4 py-3">{e.horario_cierre || "-"}</td>
                    <td className="px-4 py-3">
                      {e.admin_nombre || e.admin_apellido
                        ? `${e.admin_nombre || ""} ${e.admin_apellido || ""}`
                        : "Sin admin"}
                    </td>

                    <td className="px-4 py-3">
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
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {espacios.map((espacio, index) => (
              <div key={espacio.id_espacio} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {espacio.nombre}
                    </div>
                    <div className="text-xs text-gray-500">
                      Espacio #{(page - 1) * limit + index + 1}
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Direccion: </span>
                        {espacio.direccion || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Horario: </span>
                        {espacio.horario_apertura && espacio.horario_cierre
                          ? `${espacio.horario_apertura} - ${espacio.horario_cierre}`
                          : '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Administrador: </span>
                        {espacio.admin_nombre && espacio.admin_apellido
                          ? `${espacio.admin_nombre} ${espacio.admin_apellido}`
                          : 'Sin administrador'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(espacio)}>
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

      {modalOpen && currentEspacio && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 md:p-8 max-h-[80vh] overflow-y-auto transition-all">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
              <div>

                <h3 className="text-2xl font-bold text-gray-900">
                  Datos del espacio
                </h3>
              </div>

              <div className="text-left">
                <p className="text-[11px] uppercase tracking-widest text-gray-500">Horario de atención</p>
                <p className="text-sm font-semibold text-gray-800">
                  {currentEspacio.horario_apertura || "--:--"} h – {currentEspacio.horario_cierre || "--:--"} h
                </p>
              </div>
            </div>

            {/* GRID DE DATOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm mb-8">

              <div>
                <p className="text-[12px] text-gray-500 uppercase">Nombre</p>
                <p className="text-base font-semibold text-gray-900">{currentEspacio.nombre}</p>
              </div>

              <div>
                <p className="text-[12px] text-gray-500 uppercase">Dirección</p>
                <p className="text-base font-semibold text-gray-900">{currentEspacio.direccion || "-"}</p>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-[12px] text-gray-500 uppercase">Descripción</p>
                <p className="text-sm text-gray-800 mt-1">
                  {currentEspacio.descripcion || "Sin descripcion registrada."}
                </p>
              </div>

            </div>

            {/* TARJETA ADMIN */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4 mb-8 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-[12px] text-gray-500 uppercase">Administrado por: </p>
                <p className="text-base font-semibold text-gray-900">
                  {currentEspacio.admin_nombre} {currentEspacio.admin_apellido}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[12px] text-gray-500 uppercase">Correo</p>
                <p className="text-sm text-gray-800">{currentEspacio.admin_correo || "-"}</p>
              </div>
            </div>

            {/* IMAGENES */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  Imagenes del espacio
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Imagen principal */}
                {currentEspacio.imagen_principal && (
                  <div className="rounded-xl border overflow-hidden relative group">
                    <img
                      src={getImageUrl(currentEspacio.imagen_principal)}
                      className="w-full h-48 object-cover group-hover:brightness-90 transition"
                    />
                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                      Principal
                    </span>
                  </div>
                )}

                {/* Imagenes secundarias */}
                {[1, 2, 3, 4].map((i) => {
                  const key = `imagen_sec_${i}`;
                  if (!currentEspacio[key]) return null;

                  return (
                    <div
                      key={key}
                      className="rounded-xl border overflow-hidden relative group"
                    >
                      <img
                        src={getImageUrl(currentEspacio[key])}
                        className="w-full h-40 object-cover group-hover:brightness-90 transition"
                      />
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full">
                        Extra {i}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!currentEspacio.imagen_principal &&
                ![1, 2, 3, 4].some((i) => currentEspacio[`imagen_sec_${i}`]) && (
                  <p className="text-xs text-gray-500 mt-3">
                    Este espacio no tiene imagenes registradas.
                  </p>
                )}
            </div>

            {/* BOTON CERRAR */}
            <div className="flex justify-end mt-8">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 rounded-full bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 transition"
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
                  openViewModal(mobileModal.id_espacio); // Abre el modal para ver datos del control
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

export default Espacio_DeportivoEncargado;
