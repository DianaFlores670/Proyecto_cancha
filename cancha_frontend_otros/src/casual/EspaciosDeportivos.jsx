import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#FFFFFF] p-4 font-sans">
      {/* Header */}
      <Header />

      {/* Contenedor principal con margen superior para evitar superposición */}
      <div className="max-w-7xl mx-auto mt-32">
              <h1 className="text-3xl font-bold text-[#0F2634] mb-6">Espacios Deportivos Disponibles</h1>

        {/* Buscador y Filtro */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <form onSubmit={handleSearch} className="w-full md:w-3/4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, dirección o descripción..."
                className="w-full px-4 py-2 border border-[#23475F] rounded-md text-[#23475F] focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                aria-label="Buscar espacios deportivos"
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
              <option value="direccion">Ordenar por Dirección</option>
              <option value="latitud">Ordenar por Latitud</option>
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
            {/* Lista de Espacios Deportivos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {espacios.map((espacio) => (
                <div
                  key={espacio.id_espacio}
                  className="bg-[#FFFFFF] rounded-2xl shadow-sm p-6 border border-[#23475F]/20"
                >
                  {espacio.imagen_principal ? (
                    <img
                      src={getImageUrl(espacio.imagen_principal)}
                      alt={`Imagen de ${espacio.nombre}`}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      onError={handleImageError}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                      <span className="text-gray-500">Sin imagen</span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-[#0F2634] mb-2">{espacio.nombre}</h3>
                  <p className="text-[#23475F] mb-2">
                    <span className="font-medium">Dirección:</span> {espacio.direccion}
                  </p>
                  <p className="text-[#23475F] mb-4">
                    <span className="font-medium">Horario:</span>{' '}
                    {espacio.horario_apertura} - {espacio.horario_cierre}
                  </p>

                  <button
                    onClick={() =>
                      isLoggedIn
                        ? fetchEspacioDetails(espacio.id_espacio)
                        : handleOpenAccessModal()
                    }
                    className="w-full bg-[#23475F] hover:bg-[#01CD6C] text-[#FFFFFF] py-2 px-4 rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F]"
                    aria-label={
                      isLoggedIn
                        ? `Obtener más información sobre ${espacio.nombre}`
                        : 'Iniciar sesión para ver más detalles'
                    }
                  >
                    Obtener Más Información
                  </button>

                </div>
              ))}
            </div>

            {/* Mensaje para usuarios no logueados */}
            {!isLoggedIn && (
              <div className="flex justify-center items-center mt-12 py-8 px-6 bg-[#F8FAFC] rounded-2xl shadow-sm max-w-3xl mx-auto">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#0F2634] mb-6">
                    ¡Inicia sesión para descubrir todos los espacios deportivos disponibles!
                  </p>
                  <button
                    onClick={() => setShowAccessModal(true)}
                    className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-bold text-lg py-3 px-8 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                    aria-label="Iniciar sesión para ver más espacios deportivos"
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
                          Inicia sesión para ver más espacios deportivos
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
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-md ${
                        currentPage === page
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

            <div className="text-center my-10 bg-[#23475F] text-white py-12 rounded-2xl shadow-lg">
              <h2 className="text-4xl font-extrabold mb-4 drop-shadow-md">
                🏟️ ¡Explora Espacios Deportivos!
              </h2>
              <p className="text-lg mb-6 max-w-2xl mx-auto leading-relaxed text-blue-100">
                Encuentra y reserva tus <span className="font-semibold text-white">canchas deportivas favoritas</span>.  
                Consulta horarios, disponibilidad y accede a <span className="font-semibold text-white"> ofertas exclusivas </span> 
                para miembros registrados.
              </p>
            </div>

            <button
              onClick={() => navigate('/')} // Redirige a la página principal para iniciar sesión
              className="w-full bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-bold text-lg py-2 px-6 rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#23475F]"
              aria-label="Iniciar sesión para acceder a detalles y precios"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Modal para Detalles del Espacio */}
      {modalOpen && selectedEspacio && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-8 rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-[#23475F] hover:text-[#01CD6C] text-2xl"
              aria-label="Cerrar modal de detalles"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-[#0F2634] mb-6">{selectedEspacio.nombre}</h2>
            <div className="space-y-4">
              {selectedEspacio.imagen_principal ? (
                <img
                  src={getImageUrl(selectedEspacio.imagen_principal)}
                  alt={`Imagen principal de ${selectedEspacio.nombre}`}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                  onError={handleImageError}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-gray-500">Sin imagen</span>
                </div>
              )}

              <div className="bg-white shadow-md rounded-2xl p-6 border border-[#E0E6EB]">
                <h3 className="text-[#0F2634] text-lg font-semibold mb-4">Detalles del Espacio Deportivo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm text-[#23475F]">
                  <div>
                    <span className="font-semibold text-[#0F2634]">Descripción:</span>
                    <p>{selectedEspacio.descripcion || 'No proporcionada'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#0F2634]">Dirección:</span>
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
                    <span className="font-semibold text-[#0F2634]">Teléfono:</span>
                    <p>{selectedEspacio.telefono || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#0F2634]">Ubicación:</span>
                    <p>Lat: {selectedEspacio.latitud || '—'} | Lng: {selectedEspacio.longitud || '—'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#0F2634]">Estado:</span>
                    <p>{selectedEspacio.estado || 'No proporcionado'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#0F2634]">Administrador:</span>
                    <p>{selectedEspacio.admin_nombre} {selectedEspacio.admin_apellido}</p>
                    <p className="text-sm text-[#01CD6C]">{selectedEspacio.admin_correo || 'No disponible'}</p>
                  </div>
                </div>
              </div>

              {/* Grid de imágenes secundarias */}
              {(selectedEspacio.imagen_sec_1 || selectedEspacio.imagen_sec_2 || selectedEspacio.imagen_sec_3 || selectedEspacio.imagen_sec_4) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    selectedEspacio.imagen_sec_1,
                    selectedEspacio.imagen_sec_2,
                    selectedEspacio.imagen_sec_3,
                    selectedEspacio.imagen_sec_4,
                  ].map((img, index) =>
                    img ? (
                      <img
                        key={`sec-img-${index}`}
                        src={getImageUrl(img)}
                        alt={`Imagen secundaria ${index + 1} de ${selectedEspacio.nombre}`}
                        className="w-full h-36 object-cover rounded-lg"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    ) : null
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Link
                  to={`/canchas-espacio/${selectedEspacio.id_espacio}`}
                  className="w-full bg-[#01CD6C] text-[#FFFFFF] py-2 px-4 rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F] text-center"
                  aria-label={`Ver canchas disponibles para ${selectedEspacio.nombre}`}
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