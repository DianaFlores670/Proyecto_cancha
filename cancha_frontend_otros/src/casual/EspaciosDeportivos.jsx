/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Header from '../Header';

const FALLBACK_IMAGE = 'https://via.placeholder.com/300x200?text=Imagen+No+Disponible';

const EspaciosDeportivos = () => {
  const [espacios, setEspacios] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12);
  const [selectedEspacio, setSelectedEspacio] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
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

    if (observerRef.current) observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [isLoggedIn]);

  const getImageUrl = (path) => {
    if (!path) return FALLBACK_IMAGE;
    try {
      const base = api.defaults.baseURL?.replace(/\/$/, '') || '';
      const cleanPath = path.replace(/^\//, '');
      return `${base}/${cleanPath}`;
    } catch {
      return FALLBACK_IMAGE;
    }
  };

  const handleImageError = (e) => {
    e.target.src = FALLBACK_IMAGE;
    e.target.alt = 'Imagen no disponible';
  };

  const fetchEspacios = async (search = '', filtro = 'default', page = 1) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      const offset = isLoggedIn ? (page - 1) * limit : 0;
      const fetchLimit = isLoggedIn ? limit : 6;

      if (search) {
        response = await api.get('/espacio-deportivo-casual/buscar', {
          params: { q: search, limit: fetchLimit, offset },
        });
      } else if (filtro !== 'default') {
        response = await api.get('/espacio-deportivo-casual/filtro', {
          params: { tipo: filtro, limit: fetchLimit, offset },
        });
      } else {
        response = await api.get('/espacio-deportivo-casual/datos-especificos', {
          params: { limit: fetchLimit, offset },
        });
      }

      setEspacios(response.data.datos.espacios || []);
      setTotal(response.data.datos.paginacion?.total || 0);
    } catch {
      setError('Error al cargar los datos. Intenta nuevamente.');
    }

    setLoading(false);
  };

  const fetchEspacioDetails = async (id) => {
    setLoading(true);
    try {
      const response = await api.get(`/espacio-deportivo-casual/dato-individual/${id}`);
      setSelectedEspacio(response.data.datos.espacio);
      setModalOpen(true);
    } catch {
      setError('Error al cargar los detalles del espacio.');
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEspacios(searchTerm, filter, 1);
  };

  useEffect(() => {
    if (!authChecked) return;
    fetchEspacios(searchTerm, filter, currentPage);
  }, [authChecked, filter, currentPage, isLoggedIn]);

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEspacio(null);
  };

  const totalPages = Math.ceil(total / (isLoggedIn ? limit : 6));

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-20">
      <Header />

      <div className="max-w-7xl mx-auto px-4 mt-28 lg:mt-32">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#0F2634] mb-6 md:mb-8">
          Espacios Deportivos
        </h1>

        <div className="flex flex-col md:flex-row gap-6 mb-10">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative group">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar espacios..."
                className="w-full px-14 py-2 bg-white border border-[#23475F]/20 
                rounded-full shadow-sm focus:ring-4 focus:ring-[#01CD6C]/30 outline-none
                text-[#23475F] text-base md:text-medium placeholder-[#23475F]/40"
              />
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#23475F]/60"
                fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
              </svg>

              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 px-8 py-2.5 md:py-2 
                rounded-full bg-[#01CD6C] hover:bg-[#00b359] text-white text-sm md:text-base 
                shadow transition-all"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* FILTER */}
          <select
            value={filter}
            onChange={handleFilterChange}
            className="w-full md:w-60 px-4 py-2 bg-white border border-[#23475F]/30
            rounded-full shadow text-[#23475F] focus:ring-4 focus:ring-[#01CD6C]/30"
          >
            <option value="default">Sin filtro</option>
            <option value="nombre">Nombre</option>
            <option value="direccion">Direccion</option>
            <option value="latitud">Latitud</option>
          </select>

        </div>

        {/* LOADING */}
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

              {espacios.map((espacio) => (
                <div
                  key={espacio.id_espacio}
                  className="bg-white rounded-3xl p-5 shadow-lg border border-[#23475F]/10 
                  hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <img
                    src={getImageUrl(espacio.imagen_principal)}
                    onError={handleImageError}
                    className="w-full h-40 md:h-56 object-cover rounded-2xl mb-2 md:mb-5"
                    alt={espacio.nombre}
                  />

                  <h3 className="text-medium md:text-xl font-semibold text-[#0F2634] mb-1 md:mb-2">{espacio.nombre}</h3>

                  <p className="text-[#23475F] text-sm md:text-base">
                    <b>Dirección:</b> {espacio.direccion}
                  </p>

                  <p className="text-[#23475F] mb-4 text-sm md:text-base">
                    <b>Horario:</b> {espacio.horario_apertura} - {espacio.horario_cierre}
                  </p>

                  <button
                    onClick={() =>
                      isLoggedIn
                        ? fetchEspacioDetails(espacio.id_espacio)
                        : setShowAccessModal(true)
                    }
                    className="w-full py-1 md:py-2 rounded-full bg-[#23475F] hover:bg-[#01CD6C] 
                    text-white font-semibold text-medium shadow transition-all"
                  >
                    Más información
                  </button>
                </div>
              ))}
            </div>

            {/* NO LOGIN BANNER */}
            {!isLoggedIn && (
              <div className="mt-16">
                <div className="bg-gradient-to-r from-[#0F2634] to-[#01CD6C]/80 p-[2px] rounded-3xl shadow-xl">
                  <div className="bg-white rounded-3xl p-5 text-center space-y-4">
                    <span className="text-3xl">🏟️</span>
                    <h2 className="text-xl md:text-2xl font-extrabold text-[#0F2634]">
                      Inicia sesión para ver más espacios
                    </h2>
                    <p className="text-[#23475F] text-sm max-w-xl mx-auto">
                      Accede a la lista completa de espacios deportivos, horarios disponibles
                      y beneficios exclusivos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGINACIÓN */}
            {isLoggedIn && totalPages > 1 && (
              <div className="flex justify-center mt-12 mb-16">
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`
                        px-5 py-3 rounded-xl text-sm font-semibold
                        ${currentPage === page
                          ? "bg-[#01CD6C] text-white"
                          : "bg-[#23475F] text-white hover:bg-[#01CD6C]"
                        }
                      `}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL LOGIN */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full relative">

            <button
              onClick={() => setShowAccessModal(false)}
              className="absolute top-4 right-4 text-3xl text-[#23475F] hover:text-[#01CD6C]"
            >
              &times;
            </button>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#01CD6C]/10 rounded-2xl flex items-center justify-center text-3xl text-[#01CD6C]">
                🏟️
              </div>

              <h2 className="text-2xl font-extrabold text-[#0F2634]">Explora más espacios</h2>

              <p className="text-[#23475F] text-sm">
                Inicia sesión para ver toda la información, horarios y disponibilidad completa.
              </p>
            </div>

          </div>
        </div>
      )}
      {/* MODAL DETALLES */}
      {modalOpen && selectedEspacio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div
            className="
        relative bg-white rounded-3xl shadow-2xl 
        w-full max-w-4xl 
        max-h-[92vh] overflow-y-auto 
        p-6 sm:p-8 md:p-10
      "
          >
            {/* BOTÓN CERRAR */}
            <button
              onClick={handleCloseModal}
              className="
          absolute top-4 right-4 w-8 md:w-10 h-8 md:h-10 
          flex items-center justify-center 
          rounded-full bg-black/70 text-white text-base md:text-lg 
          hover:bg-[#01CD6C] transition-all shadow-md
        "
            >
              &times;
            </button>

            {/* TITULO */}
            <h2 className="text-center text-xl md:text-2xl font-bold text-[#0F2634] mb-2">
              {selectedEspacio.nombre}
            </h2>

            {/* IMAGEN PRINCIPAL */}
            <img
              src={getImageUrl(selectedEspacio.imagen_principal)}
              className="
          w-full h-48 sm:h-64 md:h-72 
          object-cover rounded-2xl shadow-md mb-8
        "
              onError={handleImageError}
              alt="espacio"
            />

            {/* CARD DETALLES */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 sm:p-4 md:p-5 mb-10 shadow-lg">

              <h3 className="text-lg md:text-xl font-bold text-[#0F2634] mb-4 text-center">
                Detalles del Espacio
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-[#23475F] text-sm md:text-base">

                {/* DESCRIPCIÓN */}
                <div className="flex items-start gap-3 bg-[#eaedf1]/60 p-2 rounded-xl shadow-sm">
                  <span className="text-xl">📝</span>
                  <div>
                    <p className="font-semibold text-[#0F2634] mb-1">Descripción</p>
                    <p>{selectedEspacio.descripcion || "No proporcionada"}</p>
                  </div>
                </div>

                {/* DIRECCIÓN */}
                <div className="flex items-start gap-3 bg-[#eaedf1]/60 p-2 rounded-xl shadow-sm">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="font-semibold text-[#0F2634] mb-1">Dirección</p>
                    <p>{selectedEspacio.direccion}</p>
                  </div>
                </div>

                {/* HORARIO */}
                <div className="flex items-start gap-3 bg-[#eaedf1]/60 p-2 rounded-xl shadow-sm">
                  <span className="text-xl">⏰</span>
                  <div>
                    <p className="font-semibold text-[#0F2634] mb-1">Horario</p>
                    <p>
                      {selectedEspacio.horario_apertura} – {selectedEspacio.horario_cierre}
                    </p>
                  </div>
                </div>

                {/* UBICACIÓN */}
                <div className="flex items-start gap-3 bg-[#eaedf1]/60 p-2 rounded-xl shadow-sm">
                  <span className="text-xl">🧭</span>
                  <div>
                    <p className="font-semibold text-[#0F2634] mb-1">Ubicación</p>
                    <p>
                      Lat: {selectedEspacio.latitud} | Lng: {selectedEspacio.longitud}
                    </p>
                  </div>
                </div>

                {/* ADMINISTRADOR */}
                <div className="flex items-start gap-3 bg-[#eaedf1]/60 p-2 rounded-xl shadow-sm md:col-span-2">
                  <span className="text-xl">👨‍💼</span>
                  <div>
                    <p className="font-semibold text-[#0F2634] mb-1">Administrador</p>
                    <p>{selectedEspacio.admin_nombre} {selectedEspacio.admin_apellido}</p>
                    <p className="text-[#01CD6C] font-medium">{selectedEspacio.admin_correo}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* IMÁGENES SECUNDARIAS */}
            {(selectedEspacio.imagen_sec_1 ||
              selectedEspacio.imagen_sec_2 ||
              selectedEspacio.imagen_sec_3 ||
              selectedEspacio.imagen_sec_4) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                  {[
                    selectedEspacio.imagen_sec_1,
                    selectedEspacio.imagen_sec_2,
                    selectedEspacio.imagen_sec_3,
                    selectedEspacio.imagen_sec_4
                  ]
                    .filter(Boolean)
                    .map((img, index) => (
                      <img
                        key={index}
                        src={getImageUrl(img)}
                        className="
                  w-full 
                  h-24 sm:h-28 md:h-32 
                  object-cover rounded-xl shadow-md
                "
                        onError={handleImageError}
                        alt={`secundaria-${index}`}
                      />
                    ))}
                </div>
              )}

            {/* BOTON FINAL */}
            <Link
              to={`/canchas-espacio/${selectedEspacio.id_espacio}`}
              className="
          w-full block text-center bg-[#01CD6C] text-white py-1 md:py-2 
          rounded-full text-sm md:text-base font-bold shadow-lg
          hover:bg-[#00b359] active:scale-95 transition-all
        "
            >
              Canchas para reservar
            </Link>

          </div>
        </div>
      )}

    </div>
  );
};

export default EspaciosDeportivos;