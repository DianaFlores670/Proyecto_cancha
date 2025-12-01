/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Header from '../Header';

const Cancha = () => {
  const { id } = useParams();
  const [canchas, setCanchas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [selectedCancha, setSelectedCancha] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  const fetchCanchas = async (search = '', filtro = 'default', page = 1) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      const offset = (page - 1) * limit;

      if (search) {
        response = await api.get(`/cancha-espacio-casual/buscar/${id}`, {
          params: { q: search, limit, offset },
        });
      } else if (filtro !== 'default') {
        response = await api.get(`/cancha-espacio-casual/filtro/${id}`, {
          params: { tipo: filtro, limit, offset },
        });
      } else {
        response = await api.get(`/cancha-espacio-casual/datos-especificos/${id}`, {
          params: { limit, offset },
        });
      }

      setCanchas(response.data.datos.canchas);
      setTotal(response.data.datos.paginacion.total);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar las canchas');
      setLoading(false);
    }
  };

  const fetchResenas = async (idCancha) => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const resp = await api.get(`/resena-casual/por-cancha/${idCancha}`, {
        params: { limit: 10, offset: 0 },
      });

      if (!resp.data?.exito) {
        setReviews([]);
        setReviewsError(resp.data?.mensaje || 'No se pudieron cargar las reseñas');
      } else {
        const datos = resp.data.datos || {};
        setReviews(datos.resenas || []);
      }
    } catch (e) {
      setReviews([]);
      setReviewsError('Error al cargar las reseñas');
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchCanchaDetails = async (idCancha) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/cancha-espacio-casual/dato-individual/${idCancha}`);
      setSelectedCancha(response.data.datos.cancha);
      setModalOpen(true);
      setLoading(false);
      fetchResenas(idCancha);
    } catch (err) {
      setError('Error al cargar los detalles de la cancha');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanchas(searchTerm, filter, currentPage);
  }, [id, filter, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCanchas(searchTerm, filter, 1);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCancha(null);
    setReviews([]);
    setReviewsError(null);
  };

  const totalPages = Math.ceil(total / limit);

  const getStarsDisplay = (value) => {
    const n = Math.max(1, Math.min(5, Number(value) || 0));
    const full = '⭐'.repeat(n);
    const empty = '☆'.repeat(5 - n);
    return full + empty;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      <Header />

      <div className="max-w-7xl mx-auto px-4 mt-28 lg:mt-32">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0F2634] mb-6 md:mb-8">
          Canchas Disponibles
        </h1>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-14 py-2 bg-white border border-[#23475F]/20 
                rounded-full shadow-sm focus:ring-4 focus:ring-[#01CD6C]/30 outline-none
                text-[#23475F] text-base md:text-medium placeholder-[#23475F]/40"
              />
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#23475F]/60"
                fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
              </svg>

              <button
                type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 px-8 py-2.5 md:py-2 
                rounded-full bg-[#01CD6C] hover:bg-[#00b359] text-white text-sm md:text-base 
                shadow transition-all"
              >
                Buscar
              </button>
            </div>
          </form>
          <select
            value={filter}
            onChange={handleFilterChange}
            className="w-full md:w-60 px-4 py-2 bg-white border border-[#23475F]/30
            rounded-full shadow text-[#23475F] focus:ring-4 focus:ring-[#01CD6C]/30"
          >
            <option value="default">Sin filtro</option>
            <option value="nombre">Nombre</option>
            <option value="monto">Precio</option>
            <option value="disciplina">Disciplina</option>
          </select>

          <Link
            to="/espacios-deportivos"
            className="inline-flex items-center gap-2 bg-[#23475F] text-white font-semibold 
            py-2 px-6 md:px-8 rounded-full shadow hover:bg-[#01CD6C] active:scale-95 transition"
          >
            <span className="text-lg">←</span>
            <span>Volver a Espacios</span>
          </Link>
        </div>
        {loading && (
          <div className="flex justify-center items-center h-72">
            <div className="animate-spin h-16 w-16 border-4 border-[#01CD6C] border-t-transparent rounded-full" />
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-500/90 text-white p-4 rounded-xl shadow-md mb-10">
            {error}
          </div>
        )}

        {/* LISTA */}
        {!loading && !error && (
          <>
            <div className="
              grid gap-6
              grid-cols-1
              sm:grid-cols-2
              md:grid-cols-2
              lg:grid-cols-3
              xl:grid-cols-3
            ">

              {canchas.map((cancha) => (
                <div key={cancha.id_cancha}
                  className="bg-white rounded-3xl p-5 shadow-lg border border-[#23475F]/10 
                  hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  {cancha.imagen_cancha ? (
                    <img
                      src={getImageUrl(cancha.imagen_cancha)}
                      alt={cancha.nombre}
                      className="w-full h-40 md:h-56 object-cover rounded-2xl mb-2 md:mb-5"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gray-200 rounded-2xl mb-5 flex items-center justify-center">
                      <span className="text-gray-500">Sin imagen</span>
                    </div>
                  )}

                  <h3 className="text-medium md:text-xl font-semibold text-[#0F2634] mb-1 md:mb-2">{cancha.nombre}</h3>

                  <p className="text-[#23475F] text-sm md:text-sm">
                    <span className="font-semibold">Ubicacion:</span> {cancha.ubicacion}
                  </p>

                  <p className="text-[#01CD6C] font-semibold text-lg mb-1 md:mb-2 mb-1 md:mt-2 text-base md:text-lg">
                    Bs. {cancha.monto_por_hora} / hora
                  </p>

                  {cancha.disciplinas?.length > 0 && (
                    <p className="text-[#23475F] text-sm md:text-sm mb-3">
                      <span className="font-semibold">Disciplinas:</span>{" "}
                      {cancha.disciplinas.map((d) => d.nombre).join(", ")}
                    </p>
                  )}

                  <button
                    onClick={() => fetchCanchaDetails(cancha.id_cancha)}
                    className="w-full py-1 md:py-2 rounded-full bg-[#23475F] hover:bg-[#01CD6C] 
                    text-white font-semibold text-medium shadow transition-all"
                  >
                    Mas información
                  </button>
                </div>
              ))}
            </div>

            {totalPages > 0 && (
              <div className="flex justify-center mt-10">
                <div className="flex items-center gap-2 bg-white shadow-md rounded-2xl p-3 border border-[#23475F]/10">

                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-xl text-sm ${currentPage === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                      }`}
                  >
                    Anterior
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-xl text-sm ${currentPage === page
                        ? "bg-[#01CD6C] text-white"
                        : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-xl text-sm ${currentPage === totalPages
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                      }`}
                  >
                    Anterior
                  </button>

                </div>
              </div>
            )}
            {canchas.length === 0 && !loading && (
              <div className="text-center py-20">
                <p className="text-lg text-[#23475F]">No se encontraron canchas</p>
                <p className="text-sm text-[#23475F]">Prueba otros filtros</p>
              </div>
            )}

          </>
        )}
      </div>
      {modalOpen && selectedCancha && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full 
                bg-black/60 text-white text-xl shadow hover:bg-[#01CD6C] transition"
            >
              ×
            </button>

            <div className="p-6 md:p-10 space-y-4">

              <h2 className="text-center text-xl md:text-2xl font-bold text-[#0F2634]">
                {selectedCancha.nombre}
              </h2>

              {selectedCancha.imagen_cancha ? (
                <div className="flex justify-center">
                  <img
                    src={getImageUrl(selectedCancha.imagen_cancha)}
                    alt={selectedCancha.nombre}
                    className="w-full max-w-xl h-56 md:h-72 object-cover rounded-2xl shadow"
                  />
                </div>
              ) : (
                <div className="w-full max-w-xl h-64 bg-gray-200 rounded-2xl mx-auto flex items-center justify-center">
                  <span className="text-gray-500">Sin imagen</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-0 md:py-4">

                {/* BLOQUE IZQUIERDO — CENTRADO EN EJE Y */}
                <div className="flex flex-col justify-center space-y-2 text-sm md:text-base">
                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">Espacio Deportivo:</span>{" "}
                    <span className="text-[#01CD6C]">{selectedCancha.espacio_nombre}</span>
                  </p>

                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">Dirección:</span>{" "}
                    {selectedCancha.espacio_direccion}
                  </p>

                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">Ubicación:</span>{" "}
                    {selectedCancha.ubicacion}
                  </p>
                </div>

                {/* BLOQUE DERECHO */}
                <div className="flex flex-col items-center justify-center space-y-2 text-center">
                  <p className="text-xl md:text-2xl font-bold text-[#01CD6C]">
                    Bs. {selectedCancha.monto_por_hora}
                    <span className="text-sm text-[#23475F] font-medium"> / hora</span>
                  </p>
                  <div className="flex flex-row gap-2">
                    {selectedCancha.capacidad && (
                      <p className="p-1 md:p-2 rounded-full bg-[#01CD6C]/10 font-semibold">
                        Capacidad:{" "}
                        <span className="text-[#01CD6C] text-xs md:text-sm">{selectedCancha.capacidad} personas</span>
                      </p>
                    )}

                    {selectedCancha.estado && (
                      <p
                        className={`p-1 md:p-2 rounded-full font-semibold ${selectedCancha.estado === "disponible"
                          ? "bg-[#01CD6C]/10 text-[#01CD6C]"
                          : "bg-[#A31621]/10 text-[#A31621]"
                          }`}
                      >
                        Estado: {selectedCancha.estado}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedCancha.disciplinas?.length > 0 && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-6 rounded-2xl shadow">
                  <h3 className="text-lg font-bold text-[#0F2634] mb-4">Disciplinas</h3>

                  <div className="space-y-2">
                    {selectedCancha.disciplinas.map((disc) => (
                      <div
                        key={disc.id_disciplina}
                        className="bg-white border border-[#23475F]/10 rounded-xl p-1 px-4 shadow-sm"
                      >
                        <h4 className="font-semibold text-[#0F2634] mb-1">{disc.nombre}</h4>

                        {disc.frecuencia_practica && (
                          <p className="text-xs text-[#01CD6C] font-semibold">
                            Frecuencia: {disc.frecuencia_practica}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-6 rounded-2xl shadow">
                <h3 className="text-lg font-bold text-[#0F2634]">Reseñas</h3>
                <p className="text-xs text-[#0F2634]/50 mb-4">Puede dejar su reseña en Mis Reservas</p>

                {reviewsLoading && <p className="text-sm text-[#23475F]">Cargando...</p>}
                {reviewsError && <p className="text-sm text-red-600">{reviewsError}</p>}

                {!reviewsLoading &&
                  !reviewsError &&
                  reviews.length === 0 && (
                    <p className="text-sm text-[#64748B]">Aun no hay reseñas.</p>
                  )}

                {!reviewsLoading &&
                  !reviewsError &&
                  reviews.length > 0 && (
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-1">

                      {reviews.map((rev) => (
                        <div
                          key={rev.id_resena}
                          className="bg-white border border-[#23475F]/10 rounded-xl p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-[#0F2634]">
                              👤 {rev.cliente_nombre} {rev.cliente_apellido}
                            </span>
                            <span className="text-xs text-gray-500">
                              {rev.fecha_creacion?.substring(0, 10)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[#01CD6C] mb-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i}>{i < rev.estrellas ? "★" : "☆"}</span>
                            ))}
                            <span className="ml-1 text-xs font-semibold">{rev.estrellas}/5</span>
                          </div>

                          {rev.comentario && (
                            <p className="text-sm text-[#23475F] whitespace-pre-line">
                              {rev.comentario}
                            </p>
                          )}
                        </div>
                      ))}

                    </div>
                  )}

              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-[#23475F] text-white py-3 rounded-full font-semibold shadow 
                    hover:bg-[#01CD6C] active:scale-95 transition text-center"
                >
                  Cerrar
                </button>

                <Link
                  to={`/reservar/${selectedCancha.id_cancha}`}
                  className="flex-1 bg-[#01CD6C] text-white py-3 rounded-full font-semibold shadow 
                    hover:bg-[#00b359] active:scale-95 transition text-center"
                >
                  Reservar Ahora
                </Link>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cancha;