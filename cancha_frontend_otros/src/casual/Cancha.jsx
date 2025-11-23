/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from "../Header";
import { getImageUrl } from "../utils";

const FALLBACK_IMAGE =
  "https://via.placeholder.com/300x200?text=Imagen+No+Disponible";

const Cancha = () => {
  const [canchas, setCanchas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12);
  const [selectedCancha, setSelectedCancha] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  const navigate = useNavigate();
  const observerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShowPlaceholders(true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [isLoggedIn]);

  const getImageUrl = (path) => {
    if (!path) return FALLBACK_IMAGE;
    try {
      const base = api.defaults.baseURL?.replace(/\/$/, "") || "";
      if (!base) {
        console.warn("Base URL no definida en api.defaults.baseURL");
        return FALLBACK_IMAGE;
      }
      const cleanPath = path.replace(/^\//, "");
      return `${base}/${cleanPath}`;
    } catch (err) {
      console.error("Error al construir URL de imagen:", err);
      return FALLBACK_IMAGE;
    }
  };

  const handleImageError = (e) => {
    console.error("Error cargando imagen:", e.target.src);
    e.target.src = FALLBACK_IMAGE;
    e.target.alt = "Imagen no disponible";
  };

  const fetchCanchas = async (search = "", filtro = "default", page = 1) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      const fetchLimit = isLoggedIn ? limit : 6;
      const offset = isLoggedIn ? (page - 1) * limit : 0;

      if (search) {
        response = await api.get(`/cancha-casual/buscar`, {
          params: { q: search, limit: fetchLimit, offset },
        });
      } else if (filtro !== "default") {
        response = await api.get(`/cancha-casual/filtro`, {
          params: { tipo: filtro, limit: fetchLimit, offset },
        });
      } else {
        response = await api.get(`/cancha-casual/datos-especificos`, {
          params: { limit: fetchLimit, offset },
        });
      }

      setCanchas(response.data.datos.canchas || []);
      setTotal(response.data.datos.paginacion?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar canchas:", err);
      setError("Error al cargar las canchas");
      setLoading(false);
    }
  };

  const fetchCanchaDetails = async (idCancha) => {
    setLoading(true);
    setError(null);
    setSelectedCancha(null);
    setReviews([]);
    setReviewsError(null);
    setReviewsLoading(true);

    try {
      const canchaResp = await api.get(
        `/cancha-casual/dato-individual/${idCancha}`
      );
      setSelectedCancha(canchaResp.data.datos.cancha);

      try {
        const reviewsResp = await api.get(
          `/resena-casual/por-cancha/${idCancha}`
        );
        setReviews(reviewsResp.data.datos.resenas || []);
      } catch (errRev) {
        console.error("Error al cargar reseñas de la cancha:", errRev);
        setReviewsError("Error al cargar reseñas de la cancha");
      }

      setModalOpen(true);
    } catch (err) {
      console.error("Error al cargar detalles de la cancha:", err);
      setError("Error al cargar los detalles de la cancha");
    } finally {
      setLoading(false);
      setReviewsLoading(false);
    }
  };

  const handleOpenAccessModal = () => {
    setShowAccessModal(true);
  };

  const handleCloseAccessModal = () => {
    setShowAccessModal(false);
  };

  useEffect(() => {
    if (!authChecked) return;
    fetchCanchas(searchTerm, filter, currentPage);
  }, [authChecked, filter, currentPage, isLoggedIn]);

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
    if (isLoggedIn) {
      setCurrentPage(page);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCancha(null);
    setReviews([]);
    setReviewsError(null);
  };

  const totalPages = Math.ceil(total / (isLoggedIn ? limit : 6));

  return (
    <div className="min-h-screen bg-[#F6F8FA] p-4 font-sans">
      <Header />

      <div className="max-w-7xl mx-auto mt-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2634] mb-10">
          Canchas Disponibles
        </h1>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
          <form onSubmit={handleSearch} className="w-full md:w-3/4">
            <div className="relative group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar canchas por nombre, ubicacion o espacio..."
                className="w-full px-5 py-3 pl-12 bg-white/80 backdrop-blur-md border border-[#23475F]/30 
                       rounded-full shadow-sm text-[#23475F] focus:outline-none focus:ring-4 
                       focus:ring-[#01CD6C]/30 transition-all"
              />

              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#23475F]/60"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>

              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#01CD6C] text-white px-4 py-1.5 
                       rounded-full shadow hover:bg-[#00b359] active:scale-95 transition-all"
              >
                Buscar
              </button>
            </div>
          </form>
          <div className="w-full md:w-1/4">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="w-full px-4 py-3 bg-white border border-[#23475F]/30 rounded-full shadow-sm 
                     text-[#23475F] focus:outline-none focus:ring-4 focus:ring-[#01CD6C]/30 transition-all"
            >
              <option value="default">Sin filtro</option>
              <option value="nombre">Nombre</option>
              <option value="monto">Precio</option>
              <option value="disciplina">Disciplina</option>
              <option value="espacio">Espacio Deportivo</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-72">
            <div className="animate-spin h-14 w-14 border-4 border-[#01CD6C] border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="bg-[#A31621] text-white p-4 rounded-xl shadow-md">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* CARDS DE CANCHAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">
              {canchas.map((cancha) => (
                <div
                  key={cancha.id_cancha}
                  className="bg-white rounded-3xl shadow-md border border-[#23475F]/10 p-6 
                            hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {cancha.imagen_cancha ? (
                    <img
                      src={getImageUrl(cancha.imagen_cancha)}
                      alt={cancha.nombre}
                      className="w-full h-56 object-cover rounded-2xl shadow-sm mb-5"
                      onError={handleImageError}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-56 bg-gray-200 rounded-2xl mb-5 flex items-center justify-center">
                      <span className="text-gray-500">Sin imagen</span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-[#0F2634] mb-2">
                    {cancha.nombre}
                  </h3>

                  <p className="text-[#23475F] text-sm mb-1">
                    <span className="font-semibold">Espacio:</span>{" "}
                    {cancha.espacio_nombre}
                  </p>

                  <p className="text-[#23475F] text-sm mb-1">
                    <span className="font-semibold">Ubicacion:</span>{" "}
                    {cancha.ubicacion}
                  </p>

                  <p className="text-[#01CD6C] font-bold text-lg mb-2">
                    Bs. {cancha.monto_por_hora} / hora
                  </p>

                  {cancha.disciplinas?.length > 0 && (
                    <p className="text-[#23475F] text-sm mb-4">
                      <span className="font-semibold">Disciplinas:</span>{" "}
                      {cancha.disciplinas.map((d) => d.nombre).join(", ")}
                    </p>
                  )}

                  <button
                    onClick={() =>
                      isLoggedIn
                        ? fetchCanchaDetails(cancha.id_cancha)
                        : handleOpenAccessModal()
                    }
                    className="w-full bg-[#23475F] text-white py-2.5 rounded-full shadow 
                           hover:bg-[#01CD6C] active:scale-95 transition-all"
                  >
                    Mas informacion
                  </button>
                </div>
              ))}
            </div>

            {!isLoggedIn && (
              <div className="mt-14">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F2634] via-[#12384A] to-[#01CD6C] p-[1px] shadow-xl">
                  <div className="bg-white rounded-[22px] px-6 py-6 md:px-10 md:py-9 flex flex-col items-center gap-4 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#01CD6C]/10 text-[#01CD6C]">
                      <span className="text-3xl">🏟️</span>
                    </div>

                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-[#0F2634] tracking-tight mb-2">
                        Inicia sesion para ver mas espacios
                      </h2>
                      <p className="text-[#23475F] text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                        Accede a la lista completa de espacios deportivos,
                        revisa horarios disponibles y realiza reservas de forma
                        rapida y sencilla.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isLoggedIn && totalPages > 1 && (
              <div className="flex justify-center mt-10">
                <div className="flex items-center gap-2 bg-white shadow-md rounded-2xl p-4 border border-[#23475F]/10">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-xl text-sm ${
                      currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                    }`}
                  >
                    ←
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(
                      1,
                      Math.min(totalPages, currentPage - 2 + i)
                    );
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-xl text-sm ${
                          currentPage === pageNum
                            ? "bg-[#01CD6C] text-white"
                            : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-xl text-sm ${
                      currentPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                    }`}
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            {canchas.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-[#23475F] text-lg mb-4">
                  No se encontraron canchas
                </p>
                <p className="text-[#23475F] text-sm">
                  Intenta con diferentes criterios de busqueda o filtros
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {showAccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <button
              onClick={handleCloseAccessModal}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full
                   bg-black/70 text-white text-xl shadow-sm
                   hover:bg-[#01CD6C] hover:text-white transition-all duration-200"
            >
              &times;
            </button>

            <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#01CD6C]/10 flex items-center justify-center text-3xl text-[#01CD6C]">
                🎯
              </div>

              <h2 className="text-2xl font-extrabold text-[#0F2634] tracking-tight">
                Accede a mas detalles
              </h2>

              <p className="text-sm text-[#23475F] max-w-xs leading-relaxed">
                Descubre las canchas disponibles, revisa horarios y accede a
                <span className="font-semibold text-[#0F2634]">
                  {" "}
                  precios promocionales exclusivos{" "}
                </span>
                para miembros registrados.
              </p>
            </div>
          </div>
        </div>
      )}

      {modalOpen && selectedCancha && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* BOTON CERRAR */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full 
                   bg-black/70 text-white text-xl shadow-sm
                   hover:bg-[#01CD6C] transition-all duration-200"
            >
              &times;
            </button>

            <div className="p-6 md:p-10 space-y-8">
              {/* TITULO */}
              <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#0F2634]">
                {selectedCancha.nombre}
              </h2>

              {/* IMAGEN PRINCIPAL */}
              {selectedCancha.imagen_cancha ? (
                <div className="flex justify-center">
                  <img
                    src={getImageUrl(selectedCancha.imagen_cancha)}
                    alt={selectedCancha.nombre}
                    className="w-full max-w-xl h-64 md:h-72 object-cover rounded-2xl shadow-md"
                    onError={handleImageError}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full max-w-xl h-64 bg-gray-200 rounded-2xl mx-auto flex items-center justify-center">
                  <span className="text-gray-500">Sin imagen</span>
                </div>
              )}

              {/* INFORMACION PRINCIPAL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-3 text-sm">
                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">
                      Espacio Deportivo:
                    </span>{" "}
                    <span className="text-[#01CD6C] font-semibold">
                      {selectedCancha.espacio_nombre}
                    </span>
                  </p>

                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">
                      Direccion:
                    </span>{" "}
                    {selectedCancha.espacio_direccion}
                  </p>

                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">
                      Ubicacion Exacta:
                    </span>{" "}
                    {selectedCancha.ubicacion}
                  </p>

                  <p className="text-[#23475F]">
                    <span className="font-semibold text-[#0F2634]">
                      ID Cancha:
                    </span>{" "}
                    <span className="text-[#01CD6C] font-mono font-semibold">
                      {selectedCancha.id_cancha}
                    </span>
                  </p>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="space-y-3 text-center">
                  <p className="text-3xl font-bold text-[#01CD6C]">
                    Bs. {selectedCancha.monto_por_hora}
                    <span className="text-sm text-[#23475F] font-medium">
                      {" "}
                      / hora
                    </span>
                  </p>

                  {selectedCancha.capacidad && (
                    <p className="p-3 rounded-xl bg-[#01CD6C]/10 font-semibold text-[#0F2634]">
                      Capacidad:{" "}
                      <span className="text-[#01CD6C]">
                        {selectedCancha.capacidad} personas
                      </span>
                    </p>
                  )}

                  {selectedCancha.estado && (
                    <p
                      className={`p-3 rounded-xl font-semibold ${
                        selectedCancha.estado === "disponible"
                          ? "bg-[#01CD6C]/10 text-[#01CD6C]"
                          : "bg-[#A31621]/10 text-[#A31621]"
                      }`}
                    >
                      Estado: {selectedCancha.estado}
                    </p>
                  )}
                </div>
              </div>

              {/* DISCIPLINAS */}
              {selectedCancha.disciplinas &&
                selectedCancha.disciplinas.length > 0 && (
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-bold text-[#0F2634] mb-4">
                      Disciplinas Disponibles
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCancha.disciplinas.map((disc) => (
                        <div
                          key={disc.id_disciplina}
                          className="bg-white border border-[#23475F]/10 rounded-xl p-4 shadow-sm"
                        >
                          <h4 className="font-semibold text-[#0F2634] mb-1">
                            {disc.nombre}
                          </h4>
                          <p className="text-sm text-[#23475F] mb-2">
                            {disc.descripcion || "Sin descripcion disponible"}
                          </p>

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

              {/* RESENAS */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-bold text-[#0F2634] mb-4">
                  Reseñas de la cancha
                </h3>

                {reviewsLoading && (
                  <p className="text-[#23475F] text-sm">Cargando reseñas...</p>
                )}

                {reviewsError && (
                  <p className="text-[#A31621] text-sm mb-3">{reviewsError}</p>
                )}

                {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                  <p className="text-sm text-[#23475F]">Aun sin reseñas.</p>
                )}

                {!reviewsLoading && !reviewsError && reviews.length > 0 && (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id_resena}
                        className="bg-white border border-[#23475F]/10 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#0F2634] text-sm">
                            👤 {rev.cliente_nombre} {rev.cliente_apellido}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            {rev.fecha_creacion?.substring(0, 10)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[#01CD6C] mb-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i}>{i < rev.estrellas ? "★" : "☆"}</span>
                          ))}
                          <span className="ml-1 text-xs font-semibold">
                            {rev.estrellas}/5
                          </span>
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

              {/* BOTONES */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-[#23475F]/20">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-[#23475F] text-white py-3 rounded-full font-semibold shadow
                       hover:bg-[#01CD6C] transition-all active:scale-95"
                >
                  Cerrar
                </button>

                <Link
                  to={`/reservar/${selectedCancha.id_cancha}`}
                  className="flex-1 bg-[#01CD6C] text-white py-3 rounded-full font-semibold shadow-lg
                       hover:bg-[#00b359] hover:shadow-xl transition-all active:scale-95 text-center"
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
