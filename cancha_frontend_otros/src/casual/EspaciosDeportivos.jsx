/* eslint-disable no-undef */
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Header from '../Header'; // Asegúrate de ajustar la ruta según la ubicación del archivo Header.jsx

// Imagen de respaldo (puedes usar una URL pública o local)
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

  // Check login status
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    setAuthChecked(true); // Marcar que la autenticación fue verificada
  }, []);

  // IntersectionObserver for scroll detection
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

  // Función para construir URLs completas de imágenes
  const getImageUrl = (path) => {
    if (!path) return FALLBACK_IMAGE;
    try {
      const base = api.defaults.baseURL?.replace(/\/$/, '') || '';
      if (!base) {
        console.warn('Base URL no definida en api.defaults.baseURL');
        return FALLBACK_IMAGE;
      }
      const cleanPath = path.replace(/^\//, '');
      return `${base}/${cleanPath}`;
    } catch (err) {
      console.error('Error al construir URL de imagen:', err);
      return FALLBACK_IMAGE;
    }
  };

  // Función para manejar errores de carga de imágenes
  const handleImageError = (e) => {
    console.error('Error cargando imagen:', e.target.src);
    e.target.src = FALLBACK_IMAGE; // Usar imagen de respaldo
    e.target.alt = 'Imagen no disponible';
  };

  // Función para obtener datos de espacios deportivos
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
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar espacios:', err);
      setError('Error al cargar los datos de los espacios deportivos. Intenta de nuevo más tarde.');
      setLoading(false);
    }
  };

  // Función para obtener detalles de un espacio por ID
  const fetchEspacioDetails = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/espacio-deportivo-casual/dato-individual/${id}`);
      setSelectedEspacio(response.data.datos.espacio);
      setModalOpen(true);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar detalles del espacio:', err);
      setError('Error al cargar los detalles del espacio deportivo');
      setLoading(false);
    }
  };

  // Open access modal
  const handleOpenAccessModal = () => {
    setShowAccessModal(true);
  };

  // Close access modal
  const handleCloseAccessModal = () => {
    setShowAccessModal(false);
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (!authChecked) return; // Esperar hasta que se verifique la autenticación
    fetchEspacios(searchTerm, filter, currentPage);
  }, [authChecked, filter, currentPage, isLoggedIn]);

  // Manejar búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchEspacios(searchTerm, filter, 1);
  };

  // Manejar cambio de filtro
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setCurrentPage(1);
  };

  // Manejar cambio de página
  const handlePageChange = (page) => {
    if (isLoggedIn) {
      setCurrentPage(page);
    }
  };

  // Cerrar modal de detalles
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEspacio(null);
  };

  // Calcular número total de páginas
  const totalPages = Math.ceil(total / (isLoggedIn ? limit : 6));

  return (
    <div className="min-h-screen bg-[#F6F8FA] p-4 font-sans">
      {/* Header */}
      <Header />

      {/* Contenedor principal con margen superior para evitar superposición */}
      <div className="max-w-7xl mx-auto mt-32">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2634] mb-10">
          Espacios Deportivos
        </h1>

        {/* Buscador y Filtro */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10">
          <form onSubmit={handleSearch} className="w-full md:w-3/4">
            <div className="relative group">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar espacios..."
                className="w-full px-5 py-3 pl-12 bg-white/70 backdrop-blur-md border border-[#23475F]/30 rounded-full shadow-sm 
                       text-[#23475F] focus:outline-none focus:ring-4 focus:ring-[#01CD6C]/30 transition-all"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#23475F]/60"
                fill="none" stroke="currentColor" strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
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
              <option value="direccion">Direccion</option>
              <option value="latitud">Latitud</option>
            </select>
          </div>
        </div>

        {/* Contenido Principal */}
        {loading ? (
          <div className="flex justify-center items-center h-72">
            <div className="animate-spin h-14 w-14 border-4 border-[#01CD6C] border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="bg-[#A31621] text-white p-4 rounded-lg shadow">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Lista de Espacios Deportivos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {espacios.map((espacio) => (
                <div
                  key={espacio.id_espacio}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-[#23475F]/10 
                         hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {espacio.imagen_principal ? (
                    <img
                      src={getImageUrl(espacio.imagen_principal)}
                      alt={espacio.nombre}
                      onError={handleImageError}
                      loading="lazy"
                      className="w-full h-52 object-cover rounded-xl mb-5"
                    />
                  ) : (
                    <div className="w-full h-52 bg-gray-200 rounded-xl mb-5 flex justify-center items-center">
                      <span className="text-gray-500">Sin imagen</span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-[#0F2634] mb-2">{espacio.nombre}</h3>

                  <p className="text-[#23475F]">
                    <span className="font-semibold">Direccion:</span> {espacio.direccion}
                  </p>

                  <p className="text-[#23475F] mb-4">
                    <span className="font-semibold">Horario:</span> {espacio.horario_apertura} - {espacio.horario_cierre}
                  </p>

                  <button
                    onClick={() =>
                      isLoggedIn
                        ? fetchEspacioDetails(espacio.id_espacio)
                        : handleOpenAccessModal()
                    }
                    className="w-full bg-[#23475F] text-white py-2 rounded-full shadow hover:bg-[#01CD6C] 
                           transition-all active:scale-95"
                  >
                    Mas informacion
                  </button>
                </div>
              ))}
            </div>

            {/* Mensaje para usuarios no logueados */}
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
                        Accede a la lista completa de espacios deportivos, revisa horarios disponibles
                        y realiza reservas de forma rapida y sencilla.
                      </p>
                    </div>

                  </div>
                </div>
              </div>


            )}

            {/* Paginación (solo para usuarios logueados) */}
            {isLoggedIn && totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-md ${currentPage === page
                          ? 'bg-[#01CD6C] text-[#FFFFFF]'
                          : 'bg-[#23475F] text-[#FFFFFF] hover:bg-[#01CD6C]'
                        }`}
                      aria-label={`Ir a la página ${page}`}
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

      {/* Modal de Acceso */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

            <button
              onClick={handleCloseAccessModal}
              className="absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-full 
                   bg-black/80 text-white text-xl
                   hover:bg-[#01CD6C] hover:text-white 
                   transition-all duration-200 shadow-md"
            >
              &times;
            </button>

            <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#01CD6C]/10 flex items-center justify-center text-3xl text-[#01CD6C]">
                🏟️
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-[#0F2634] tracking-tight">
                Explora espacios deportivos
              </h2>

              <p className="text-xs md:text-sm text-[#23475F] leading-relaxed">
                Encuentra y reserva tus canchas deportivas favoritas. Revisa horarios disponibles
                y accede a beneficios para usuarios registrados.
              </p>
            </div>

          </div>
        </div>
      )}


      {/* Modal para Detalles del Espacio */}
      {modalOpen && selectedEspacio && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full
                   bg-[#0F2634]/80 text-white text-xl shadow-md
                   hover:bg-[#01CD6C] transition-all duration-200"
            >
              &times;
            </button>

            <div className="p-6 md:p-8 flex flex-col gap-6">

              <h2 className="text-center text-2xl md:text-3xl font-extrabold text-[#0F2634] tracking-tight">
                {selectedEspacio.nombre}
              </h2>

              {/* Imagen principal */}
              {selectedEspacio.imagen_principal ? (
                <img
                  src={getImageUrl(selectedEspacio.imagen_principal)}
                  alt={selectedEspacio.nombre}
                  className="w-full h-56 md:h-64 object-cover rounded-2xl shadow-md"
                  onError={handleImageError}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-xl flex items-center justify-center text-gray-500">
                  Sin imagen
                </div>
              )}

              {/* Card de detalles */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#0F2634] mb-4 text-center">
                  Detalles del espacio
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm text-[#23475F]">

                  <div>
                    <span className="font-semibold text-[#0F2634]">Descripcion:</span>
                    <p>{selectedEspacio.descripcion || 'No proporcionada'}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Direccion:</span>
                    <p>{selectedEspacio.direccion}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Horario:</span>
                    <p>{selectedEspacio.horario_apertura} - {selectedEspacio.horario_cierre}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Capacidad:</span>
                    <p>{selectedEspacio.capacidad || 'No proporcionada'}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Telefono:</span>
                    <p>{selectedEspacio.telefono || 'No proporcionado'}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Ubicacion:</span>
                    <p>Lat: {selectedEspacio.latitud || '—'} | Lng: {selectedEspacio.longitud || '—'}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Estado:</span>
                    <p>{selectedEspacio.estado || 'No proporcionado'}</p>
                  </div>

                  <div>
                    <span className="font-semibold text-[#0F2634]">Administrador:</span>
                    <p>{selectedEspacio.admin_nombre} {selectedEspacio.admin_apellido}</p>
                    <p className="text-[#01CD6C]">{selectedEspacio.admin_correo || 'No disponible'}</p>
                  </div>
                </div>
              </div>

              {/* Imagenes secundarias */}
              {(selectedEspacio.imagen_sec_1 || selectedEspacio.imagen_sec_2 || selectedEspacio.imagen_sec_3 || selectedEspacio.imagen_sec_4) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[selectedEspacio.imagen_sec_1, selectedEspacio.imagen_sec_2, selectedEspacio.imagen_sec_3, selectedEspacio.imagen_sec_4]
                    .filter(Boolean)
                    .map((img, index) => (
                      <img
                        key={index}
                        src={getImageUrl(img)}
                        alt={`Imagen secundaria ${index + 1}`}
                        className="w-full h-28 md:h-32 object-cover rounded-xl shadow-sm"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    ))}
                </div>
              )}

              <div className="mt-2">
                <Link
                  to={`/canchas-espacio/${selectedEspacio.id_espacio}`}
                  className="w-full block text-center bg-[#01CD6C] text-white py-3 rounded-full 
                       font-bold shadow-md hover:bg-[#00b359] active:scale-95 
                       transition-all duration-200"
                >
                  Canchas para reservar
                </Link>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default EspaciosDeportivos;