import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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

  // Función para construir URLs completas de imágenes
  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  // Función para manejar errores de carga de imágenes
  const handleImageError = (e) => {
    console.error('Error cargando imagen:', e.target.src);
    e.target.style.display = 'none';
  };

  // Función para obtener datos de espacios deportivos
  const fetchEspacios = async (search = '', filtro = 'default', page = 1) => {
    setLoading(true);
    setError(null);
    try {
      let response;
      const offset = (page - 1) * limit;

      if (search) {
        response = await api.get('/espacio-deportivo-casual/buscar', {
          params: { q: search, limit, offset },
        });
      } else if (filtro !== 'default') {
        response = await api.get('/espacio-deportivo-casual/filtro', {
          params: { tipo: filtro, limit, offset },
        });
      } else {
        response = await api.get('/espacio-deportivo-casual/datos-especificos', {
          params: { limit, offset },
        });
      }

      setEspacios(response.data.datos.espacios);
      setTotal(response.data.datos.paginacion.total);
      setLoading(false);
    } catch (err) {
      setError('Error al cargar los datos de los espacios deportivos');
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
      setError('Error al cargar los detalles del espacio deportivo');
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchEspacios(searchTerm, filter, currentPage);
  }, [filter, currentPage]);

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
    setCurrentPage(page);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEspacio(null);
  };

  // Calcular número total de páginas
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FFFFFF] p-6 font-sans">
      {/* Header con Buscador y Filtro */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <form onSubmit={handleSearch} className="w-full md:w-1/2">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, dirección o descripción..."
                className="w-full px-4 py-2 border border-[#23475F] rounded-md text-[#23475F] focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#01CD6C] text-[#FFFFFF] px-3 py-1 rounded-md hover:bg-[#00b359]"
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
            >
              <option value="default">Sin filtro</option>
              <option value="nombre">Ordenar por Nombre</option>
              <option value="direccion">Ordenar por Dirección</option>
              <option value="latitud">Ordenar por Latitud</option>
            </select>
          </div>
          <Link
            to="/"
            className="bg-[#23475F] hover:bg-[#01CD6C] text-[#FFFFFF] font-semibold py-2 px-6 rounded-md transition-all duration-300"
          >
            ← Volver al Inicio
          </Link>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto">
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
                  {espacio.imagen_principal && (
                    <img
                      src={getImageUrl(espacio.imagen_principal)}
                      alt={espacio.nombre}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      onError={handleImageError}
                    />
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
                    onClick={() => fetchEspacioDetails(espacio.id_espacio)}
                    className="w-full bg-[#23475F] hover:bg-[#01CD6C] text-[#FFFFFF] py-2 px-4 rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F]"
                  >
                    Obtener Más Información
                  </button>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
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

      {/* Modal para Detalles del Espacio */}
      {modalOpen && selectedEspacio && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-8 rounded-lg shadow-lg w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-[#23475F] hover:text-[#01CD6C] text-2xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-[#0F2634] mb-6">{selectedEspacio.nombre}</h2>
            <div className="space-y-4">
              {selectedEspacio.imagen_principal && (
                <img
                  src={getImageUrl(selectedEspacio.imagen_principal)}
                  alt={selectedEspacio.nombre}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                  onError={handleImageError}
                />
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
              {(selectedEspacio.imagen_sec_1 || selectedEspacio.imagen_2 || selectedEspacio.imagen_3 || selectedEspacio.imagen_4) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {selectedEspacio.imagen_sec_1 && (
                    <img
                      src={getImageUrl(selectedEspacio.imagen_sec_1)}
                      alt="Imagen secundaria 1"
                      className="w-full h-36 object-cover rounded-lg"
                      onError={handleImageError}
                    />
                  )}
                  {selectedEspacio.imagen_sec_2 && (
                    <img
                      src={getImageUrl(selectedEspacio.imagen_sec_2)}
                      alt="Imagen secundaria 2"
                      className="w-full h-36 object-cover rounded-lg"
                      onError={handleImageError}
                    />
                  )}
                  {selectedEspacio.imagen_sec_3 && (
                    <img
                      src={getImageUrl(selectedEspacio.imagen_sec_3)}
                      alt="Imagen secundaria 3"
                      className="w-full h-36 object-cover rounded-lg"
                      onError={handleImageError}
                    />
                  )}
                  {selectedEspacio.imagen_sec_4 && (
                    <img
                      src={getImageUrl(selectedEspacio.imagen_sec_4)}
                      alt="Imagen secundaria 4"
                      className="w-full h-36 object-cover rounded-lg"
                      onError={handleImageError}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Link
                  to={`/canchas-espacio/${selectedEspacio.id_espacio}`}
                  className="w-full bg-[#01CD6C] text-[#FFFFFF] py-2 px-4 rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F] text-center"
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