import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../Header'; // Asegúrate de ajustar la ruta según la ubicación del archivo Header.jsx

// Imagen de respaldo
const FALLBACK_IMAGE = 'https://via.placeholder.com/300x200?text=Imagen+No+Disponible';

const Cancha = () => {
  const [canchas, setCanchas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(12); // Base limit for logged-in users
  const [selectedCancha, setSelectedCancha] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const navigate = useNavigate();
  const observerRef = useRef(null);

  // Check login status
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    setAuthChecked(true);
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
    e.target.src = FALLBACK_IMAGE;
    e.target.alt = 'Imagen no disponible';
  };

  // Función para obtener todas las canchas
  const fetchCanchas = async (search = '', filtro = 'default', page = 1) => {
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
      } else if (filtro !== 'default') {
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
      console.error('Error al cargar canchas:', err);
      setError('Error al cargar las canchas');
      setLoading(false);
    }
  };

  // Función para obtener detalles de una cancha por ID
  const fetchCanchaDetails = async (idCancha) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/cancha-casual/dato-individual/${idCancha}`);
      setSelectedCancha(response.data.datos.cancha);
      setModalOpen(true);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar detalles de la cancha:', err);
      setError('Error al cargar los detalles de la cancha');
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
    if (!authChecked) return;
    fetchCanchas(searchTerm, filter, currentPage);
  }, [authChecked, filter, currentPage, isLoggedIn]);

  // Manejar búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCanchas(searchTerm, filter, 1);
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

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCancha(null);
  };

  // Calcular número total de páginas
  const totalPages = Math.ceil(total / (isLoggedIn ? limit : 6));

  return (
    <div className="min-h-screen bg-[#FFFFFF] p-4 font-sans">
      {/* Header */}
      <Header />

      {/* Contenedor principal con margen superior para evitar superposición */}
      <div className="max-w-7xl mx-auto mt-32">
        <h1 className="text-3xl font-bold text-[#0F2634] mb-6">Canchas Disponibles</h1>

        {/* Buscador y Filtro */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <form onSubmit={handleSearch} className="w-full md:w-3/4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar canchas por nombre, ubicación o espacio..."
                className="w-full px-4 py-2 border border-[#23475F] rounded-md text-[#23475F] focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                aria-label="Buscar canchas"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#01CD6C] text-[#FFFFFF] px-3 py-1 rounded-md hover:bg-[#00b359]"
                aria-label="Enviar búsqueda"
              >
                Buscar
              </button>
            </div>
          </form>
          <div className="w-full md:w-1/4">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-[#23475F] rounded-md text-[#23475F] focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
              aria-label="Seleccionar filtro de ordenación"
            >
              <option value="default">Sin filtro</option>
              <option value="nombre">Ordenar por Nombre</option>
              <option value="monto">Ordenar por Precio</option>
              <option value="disciplina">Ordenar por Disciplina</option>
              <option value="espacio">Ordenar por Espacio Deportivo</option>
            </select>
          </div>
        </div>

        {/* Contenido Principal */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#01CD6C]"></div>
          </div>
        ) : error ? (
          <div className="bg-[#A31621] text-[#FFFFFF] p-4 rounded-lg shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        ) : (
          <>
            {/* Lista de Canchas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {canchas.map((cancha) => (
                <div
                  key={cancha.id_cancha}
                  className="bg-[#FFFFFF] rounded-2xl shadow-sm p-6 border border-[#23475F]/20 hover:shadow-md transition-shadow duration-300"
                >
                  {cancha.imagen_cancha ? (
                    <img
                      src={getImageUrl(cancha.imagen_cancha)}
                      alt={`Imagen de ${cancha.nombre}`}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      onError={handleImageError}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-gray-500">Sin imagen</span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-[#0F2634] mb-2">{cancha.nombre}</h3>
                  <p className="text-[#23475F] mb-2">
                    <span className="font-medium">Espacio:</span> {cancha.espacio_nombre}
                  </p>
                  <p className="text-[#23475F] mb-2">
                    <span className="font-medium">Ubicación:</span> {cancha.ubicacion}
                  </p>
                  <p className="text-[#01CD6C] font-semibold text-lg mb-2">
                    Bs. {cancha.monto_por_hora} / hora
                  </p>
                  {cancha.disciplinas && cancha.disciplinas.length > 0 && (
                    <p className="text-[#23475F] mb-4">
                      <span className="font-medium">Disciplinas:</span>{' '}
                      {cancha.disciplinas.map(d => d.nombre).join(', ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() =>
                        isLoggedIn
                          ? fetchCanchaDetails(cancha.id_cancha)
                          : handleOpenAccessModal()
                      }
                      className="w-full bg-[#23475F] hover:bg-[#01CD6C] text-[#FFFFFF] py-2 px-4 rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F]"
                      aria-label={
                        isLoggedIn
                          ? `Obtener más información sobre ${cancha.nombre}`
                          : 'Iniciar sesión para ver más detalles'
                      }
                    >
                      Obtener Más Información
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mensaje para usuarios no logueados */}
            {!isLoggedIn && (
              <div className="flex justify-center items-center mt-12 py-8 px-6 bg-[#F8FAFC] rounded-2xl shadow-sm max-w-3xl mx-auto">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0F2634] mb-6">
                    ¡Inicia sesión para descubrir todas las canchas disponibles!
                  </p>
                  <button
                    onClick={() => setShowAccessModal(true)}
                    className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-bold text-lg py-3 px-8 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                    aria-label="Iniciar sesión para ver más canchas"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </div>
            )}

            {/* Placeholders for non-logged-in users */}
            {!isLoggedIn && (
              <div>
                <div ref={observerRef} className="h-1"></div>
                {showPlaceholders && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 relative">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={`placeholder-${index}`}
                        className="bg-[#E5E7EB] rounded-2xl shadow-sm p-6 border border-[#23475F]/20 opacity-50 animate-pulse"
                      >
                        <div className="w-full h-48 bg-gray-300 rounded-lg mb-4"></div>
                        <div className="h-6 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded mb-4"></div>
                        <div className="h-10 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center bg-[#000000]/20 rounded-2xl">
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#FFFFFF] mb-4">
                          Inicia sesión para ver más canchas
                        </p>
                        <button
                          onClick={() => setShowAccessModal(true)}
                          className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-bold text-lg py-2 px-6 rounded-lg shadow-md transition-all duration-300"
                        >
                          Iniciar Sesión
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paginación (solo para usuarios logueados) */}
            {isLoggedIn && totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex gap-2 bg-[#FFFFFF] p-4 rounded-lg shadow-sm">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#23475F] text-[#FFFFFF] hover:bg-[#01CD6C]'
                    }`}
                    aria-label="Página anterior"
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-md ${
                          currentPage === pageNum
                            ? 'bg-[#01CD6C] text-[#FFFFFF]'
                            : 'bg-[#23475F] text-[#FFFFFF] hover:bg-[#01CD6C]'
                        }`}
                        aria-label={`Ir a la página ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#23475F] text-[#FFFFFF] hover:bg-[#01CD6C]'
                    }`}
                    aria-label="Página siguiente"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {canchas.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-[#23475F] text-lg mb-4">No se encontraron canchas</p>
                <p className="text-[#23475F] text-sm">Intenta con diferentes criterios de búsqueda o filtros</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Acceso */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-8 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={handleCloseAccessModal}
              className="absolute top-3 right-3 flex items-center justify-center w-10 h-10 rounded-full 
                         bg-[#000000] text-[#ffffff] 
                         hover:bg-[#01CD6C] hover:text-white 
                         transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Cerrar modal de acceso"
            >
              <span className="text-2xl leading-none">&times;</span>
            </button>
            <div className="text-center my-10">
              <h2 className="text-3xl font-extrabold text-[#23475F] mb-4 drop-shadow-sm">
                🎯 ¡Accede a más detalles!
              </h2>
              <p className="text-lg text-[#2F5F78] mb-6 max-w-2xl mx-auto leading-relaxed">
                Descubre las canchas disponibles, revisa horarios y aprovecha 
                <span className="font-semibold text-[#1B3A4B]"> precios promocionales exclusivos </span>
                para miembros registrados.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-bold text-lg py-2 px-6 rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#23475F]"
              aria-label="Iniciar sesión para acceder a detalles y precios"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Modal para Detalles de la Cancha */}
      {modalOpen && selectedCancha && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-6 rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-[#23475F] hover:text-[#01CD6C] text-2xl"
              aria-label="Cerrar modal de detalles"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-[#0F2634] mb-4">{selectedCancha.nombre}</h2>
            
            <div className="space-y-6">
              {/* Imagen principal */}
              {selectedCancha.imagen_cancha ? (
                <div className="text-center">
                  <img
                    src={getImageUrl(selectedCancha.imagen_cancha)}
                    alt={`Imagen de ${selectedCancha.nombre}`}
                    className="w-full max-w-md h-64 object-cover rounded-lg mx-auto"
                    onError={handleImageError}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full max-w-md h-64 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-gray-500">Sin imagen</span>
                </div>
              )}

              {/* Información principal en grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-[#23475F]">
                    <span className="font-medium text-[#0F2634]">Espacio Deportivo:</span>{' '}
                    <span className="text-[#01CD6C]">{selectedCancha.espacio_nombre}</span>
                  </p>
                  <p className="text-[#23475F]">
                    <span className="font-medium text-[#0F2634]">Dirección del Espacio:</span>{' '}
                    {selectedCancha.espacio_direccion}
                  </p>
                  <p className="text-[#23475F]">
                    <span className="font-medium text-[#0F2634]">Ubicación en el Espacio:</span>{' '}
                    {selectedCancha.ubicacion}
                  </p>
                  <p className="text-[#23475F]">
                    <span className="font-medium text-[#0F2634]">ID de Cancha:</span>{' '}
                    <span className="text-[#01CD6C] font-mono">{selectedCancha.id_cancha}</span>
                  </p>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[#23475F] text-2xl font-bold text-center">
                    <span className="text-[#01CD6C]">Bs. {selectedCancha.monto_por_hora}</span>{' '}
                    <span className="text-sm text-[#23475F]">por hora</span>
                  </p>
                  {selectedCancha.capacidad && (
                    <p className="text-center p-2 rounded-lg bg-[#01CD6C]/10">
                      <span className="font-medium text-[#0F2634]">Capacidad:</span>{' '}
                      <span className="text-[#01CD6C] font-semibold">{selectedCancha.capacidad} personas</span>
                    </p>
                  )}
                  {selectedCancha.estado && (
                    <p className={`text-center p-2 rounded-lg ${
                      selectedCancha.estado === 'disponible' 
                        ? 'bg-[#01CD6C]/10 text-[#01CD6C]' 
                        : 'bg-[#A31621]/10 text-[#A31621]'
                    }`}>
                      <span className="font-medium text-[#0F2634]">Estado:</span>{' '}
                      <span className="font-semibold">{selectedCancha.estado}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Disciplinas disponibles */}
              {selectedCancha.disciplinas && selectedCancha.disciplinas.length > 0 && (
                <div className="bg-[#F8F9FA] p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-[#0F2634] mb-3">Disciplinas Disponibles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCancha.disciplinas.map((disciplina, index) => (
                      <div key={disciplina.id_disciplina} className="bg-[#FFFFFF] p-3 rounded-md border border-[#23475F]/20">
                        <h4 className="font-medium text-[#0F2634] mb-1">{disciplina.nombre}</h4>
                        <p className="text-[#23475F] text-sm mb-2">
                          {disciplina.descripcion || 'Sin descripción disponible'}
                        </p>
                        {disciplina.frecuencia_practica && (
                          <p className="text-[#01CD6C] text-sm font-medium">
                            Frecuencia: {disciplina.frecuencia_practica}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-4 border-t border-[#23475F]/20">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 bg-[#23475F] hover:bg-[#01CD6C] text-[#FFFFFF] py-3 px-6 rounded-md transition-all duration-300 text-center font-semibold"
                  aria-label="Cerrar modal"
                >
                  Cerrar
                </button>
                <Link
                  to={`/reserva/nueva/${selectedCancha.id_cancha}`}
                  className="flex-1 bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] py-3 px-6 rounded-md transition-all duration-300 text-center font-semibold shadow-lg hover:shadow-xl"
                  aria-label={`Reservar ${selectedCancha.nombre}`}
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