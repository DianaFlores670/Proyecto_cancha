import React, { useState, useEffect } from 'react';
import api from '../services/api';

const EspacioDeportivo = () => {
  const [espacios, setEspacios] = useState([]);
  const [administradores, setAdministradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentEspacio, setCurrentEspacio] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    descripcion: '',
    latitud: '',
    longitud: '',
    horario_apertura: '',
    horario_cierre: '',
    imagen_principal: '',
    imagen_sec_1: '',
    imagen_sec_2: '',
    imagen_sec_3: '',
    imagen_sec_4: '',
    id_admin_esp_dep: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // States for image handling
  const [selectedFiles, setSelectedFiles] = useState({
    imagen_principal: null,
    imagen_sec_1: null,
    imagen_sec_2: null,
    imagen_sec_3: null,
    imagen_sec_4: null
  });
  const [imagePreviews, setImagePreviews] = useState({
    imagen_principal: null,
    imagen_sec_1: null,
    imagen_sec_2: null,
    imagen_sec_3: null,
    imagen_sec_4: null
  });

  // Fetch administradores válidos al cargar el componente
  useEffect(() => {
    const fetchAdministradores = async () => {
      try {
        const response = await api.get('/admin_esp_dep/datos-especificos');
        if (response.data.exito) {
          setAdministradores(response.data.datos.administradores || []);
        }
      } catch (err) {
        console.error('Error al obtener administradores:', err);
      }
    };
    fetchAdministradores();
  }, []);

  // Function to generate image URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  const fetchEspacios = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/espacio_deportivo/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/espacio_deportivo/filtro', { params: fullParams });
      } else {
        response = await api.get('/espacio_deportivo/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setEspacios(response.data.datos.espacios);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
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
    if (searchTerm.trim()) {
      fetchEspacios({ q: searchTerm });
    } else {
      fetchEspacios();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchEspacios({ tipo });
    } else {
      fetchEspacios();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este espacio deportivo?')) return;
    try {
      const response = await api.delete(`/espacio_deportivo/${id}`);
      if (response.data.exito) {
        fetchEspacios();
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: '',
      direccion: '',
      descripcion: '',
      latitud: '',
      longitud: '',
      horario_apertura: '',
      horario_cierre: '',
      imagen_principal: '',
      imagen_sec_1: '',
      imagen_sec_2: '',
      imagen_sec_3: '',
      imagen_sec_4: '',
      id_admin_esp_dep: ''
    });
    setSelectedFiles({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null
    });
    setImagePreviews({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null
    });
    setCurrentEspacio(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    try {
      const response = await api.get(`/espacio_deportivo/dato-individual/${id}`);
      if (response.data.exito) {
        const espacio = response.data.datos.espacio;
        setFormData({
          nombre: espacio.nombre || '',
          direccion: espacio.direccion || '',
          descripcion: espacio.descripcion || '',
          latitud: espacio.latitud || '',
          longitud: espacio.longitud || '',
          horario_apertura: espacio.horario_apertura || '',
          horario_cierre: espacio.horario_cierre || '',
          imagen_principal: espacio.imagen_principal || '',
          imagen_sec_1: espacio.imagen_sec_1 || '',
          imagen_sec_2: espacio.imagen_sec_2 || '',
          imagen_sec_3: espacio.imagen_sec_3 || '',
          imagen_sec_4: espacio.imagen_sec_4 || '',
          id_admin_esp_dep: espacio.id_admin_esp_dep || ''
        });
        setImagePreviews({
          imagen_principal: espacio.imagen_principal ? getImageUrl(espacio.imagen_principal) : null,
          imagen_sec_1: espacio.imagen_sec_1 ? getImageUrl(espacio.imagen_sec_1) : null,
          imagen_sec_2: espacio.imagen_sec_2 ? getImageUrl(espacio.imagen_sec_2) : null,
          imagen_sec_3: espacio.imagen_sec_3 ? getImageUrl(espacio.imagen_sec_3) : null,
          imagen_sec_4: espacio.imagen_sec_4 ? getImageUrl(espacio.imagen_sec_4) : null
        });
        setSelectedFiles({
          imagen_principal: null,
          imagen_sec_1: null,
          imagen_sec_2: null,
          imagen_sec_3: null,
          imagen_sec_4: null
        });
        setCurrentEspacio(espacio);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const openViewModal = async (id) => {
    try {
      const response = await api.get(`/espacio_deportivo/dato-individual/${id}`);
      if (response.data.exito) {
        const espacio = response.data.datos.espacio;
        setFormData({
          nombre: espacio.nombre || '',
          direccion: espacio.direccion || '',
          descripcion: espacio.descripcion || '',
          latitud: espacio.latitud || '',
          longitud: espacio.longitud || '',
          horario_apertura: espacio.horario_apertura || '',
          horario_cierre: espacio.horario_cierre || '',
          imagen_principal: espacio.imagen_principal || '',
          imagen_sec_1: espacio.imagen_sec_1 || '',
          imagen_sec_2: espacio.imagen_sec_2 || '',
          imagen_sec_3: espacio.imagen_sec_3 || '',
          imagen_sec_4: espacio.imagen_sec_4 || '',
          id_admin_esp_dep: espacio.id_admin_esp_dep || ''
        });
        setImagePreviews({
          imagen_principal: espacio.imagen_principal ? getImageUrl(espacio.imagen_pricipal) : null,
          imagen_sec_1: espacio.imagen_sec_1 ? getImageUrl(espacio.imagen_sec_1) : null,
          imagen_sec_2: espacio.imagen_sec_2 ? getImageUrl(espacio.imagen_sec_2) : null,
          imagen_sec_3: espacio.imagen_sec_3 ? getImageUrl(espacio.imagen_sec_3) : null,
          imagen_sec_4: espacio.imagen_sec_4 ? getImageUrl(espacio.imagen_sec_4) : null
        });
        setSelectedFiles({
          imagen_principal: null,
          imagen_sec_1: null,
          imagen_sec_2: null,
          imagen_sec_3: null,
          imagen_sec_4: null
        });
        setCurrentEspacio(espacio);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEspacio(null);
    setError(null);
    setViewMode(false);
    setSelectedFiles({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null
    });
    setImagePreviews({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [fieldName]: file }));
      setImagePreviews(prev => ({ ...prev, [fieldName]: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode) return;

    try {
      let response;
      const data = new FormData();

      // Add text fields
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['nombre', 'id_admin_esp_dep'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      Object.entries(filteredData).forEach(([key, value]) => {
        if (!['imagen_principal', 'imagen_sec_1', 'imagen_sec_2', 'imagen_sec_3', 'imagen_sec_4'].includes(key)) {
          data.append(key, value);
        }
      });

      // Add image files
      ['imagen_principal', 'imagen_sec_1', 'imagen_sec_2', 'imagen_sec_3', 'imagen_sec_4'].forEach(field => {
        if (selectedFiles[field]) {
          data.append(field, selectedFiles[field]);
          console.log(`📸 ${field} seleccionado:`, selectedFiles[field].name);
        }
      });

      // Validations
      if (filteredData.nombre && filteredData.nombre.length > 100) {
        setError('El nombre no debe exceder los 100 caracteres');
        return;
      }
      if (filteredData.direccion && filteredData.direccion.length > 255) {
        setError('La dirección no debe exceder los 255 caracteres');
        return;
      }
      if (filteredData.latitud && (filteredData.latitud < -90 || filteredData.latitud > 90)) {
        setError('La latitud debe estar entre -90 y 90');
        return;
      }
      if (filteredData.longitud && (filteredData.longitud < -180 || filteredData.longitud > 180)) {
        setError('La longitud debe estar entre -180 y 180');
        return;
      }
      const validarHora = (hora) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(hora);
      if (filteredData.horario_apertura && !validarHora(filteredData.horario_apertura)) {
        setError('La hora de apertura no es válida (formato HH:MM:SS)');
        return;
      }
      if (filteredData.horario_cierre && !validarHora(filteredData.horario_cierre)) {
        setError('La hora de cierre no es válida (formato HH:MM:SS)');
        return;
      }
      if (filteredData.id_admin_esp_dep && !administradores.some(admin => admin.id_admin_esp_dep === parseInt(filteredData.id_admin_esp_dep))) {
        setError('El administrador seleccionado no es válido');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar espacio ID:', currentEspacio.id_espacio);
        console.log('📦 Datos enviados:');
        for (let [key, value] of data.entries()) {
          console.log(`   ${key}:`, key.includes('imagen') ? `[File: ${value.name}]` : value);
        }
        response = await api.patch(`/espacio_deportivo/${currentEspacio.id_espacio}`, data, config);
      } else {
        console.log('📤 Enviando POST para crear espacio...');
        response = await api.post('/espacio_deportivo/', data, config);
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchEspacios();
      } else {
        alert('Error: ' + response.data.mensaje);
      }
    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
      console.error('❌ Detalles del error:', err.response?.data);
      const errorMessage = err.response?.data?.mensaje || err.message || 'Error de conexión al servidor';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Espacios Deportivos</h2>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, dirección, descripción o administrador..."
              className="border rounded-l px-4 py-2 w-full"
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
            >
              🔎 Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="border rounded px-3 py-2 flex-1 sm:min-w-[160px]"
          >
            <option value="">📋 Todos - Sin filtro</option>
            <option value="nombre">🏟️ Ordenar por nombre</option>
            <option value="direccion">📍 Ordenar por dirección</option>
            <option value="admin_nombre">👤 Ordenar por nombre del administrador</option>
          </select>

          <button
            onClick={openCreateModal}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
          >
            <span>🏟️</span>
            <span>Crear Espacio</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando espacios deportivos...</p>
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
                  <th className="px-4 py-2 text-left">Dirección</th>
                  <th className="px-4 py-2 text-left">Horario</th>
                  <th className="px-4 py-2 text-left">Admin Esp Dep</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {espacios.map((espacio, index) => (
                  <tr key={espacio.id_espacio} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{espacio.nombre}</td>
                    <td className="px-4 py-2">{espacio.direccion || '-'}</td>
                    <td className="px-4 py-2">
                      {espacio.horario_apertura && espacio.horario_cierre
                        ? `${espacio.horario_apertura} - ${espacio.horario_cierre}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2">{`${espacio.admin_nombre} ${espacio.admin_apellido}`}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openViewModal(espacio.id_espacio)}
                        className="text-green-500 hover:text-green-700 mr-2"
                      >
                        Ver Datos
                      </button>
                      <button
                        onClick={() => openEditModal(espacio.id_espacio)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(espacio.id_espacio)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode ? 'Ver Datos de Espacio Deportivo' : editMode ? 'Editar Espacio Deportivo' : 'Crear Espacio Deportivo'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dirección</label>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Latitud</label>
                <input
                  name="latitud"
                  value={formData.latitud}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.000001"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Longitud</label>
                <input
                  name="longitud"
                  value={formData.longitud}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.000001"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horario de Apertura</label>
                <input
                  name="horario_apertura"
                  value={formData.horario_apertura}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horario de Cierre</label>
                <input
                  name="horario_cierre"
                  value={formData.horario_cierre}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen Principal</label>
                {imagePreviews.imagen_principal ? (
                  <img 
                    src={imagePreviews.imagen_principal} 
                    alt="Imagen Principal" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_principal:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen principal</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_principal')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Imagen Secundaria 1</label>
                {imagePreviews.imagen_sec_1 ? (
                  <img 
                    src={imagePreviews.imagen_sec_1} 
                    alt="Imagen Secundaria 1" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_sec_1:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen secundaria 1</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_sec_1')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Imagen Secundaria 2</label>
                {imagePreviews.imagen_sec_2 ? (
                  <img 
                    src={imagePreviews.imagen_sec_2} 
                    alt="Imagen Secundaria 2" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_sec_2:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen secundaria 2</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_sec_2')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Imagen Secundaria 3</label>
                {imagePreviews.imagen_sec_3 ? (
                  <img 
                    src={imagePreviews.imagen_sec_3} 
                    alt="Imagen Secundaria 3" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_sec_3:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen secundaria 3</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_sec_3')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Imagen Secundaria 4</label>
                {imagePreviews.imagen_sec_4 ? (
                  <img 
                    src={imagePreviews.imagen_sec_4} 
                    alt="Imagen Secundaria 4" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_sec_4:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen secundaria 4</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_sec_4')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Admin Esp Dep</label>
                <select
                  name="id_admin_esp_dep"
                  value={formData.id_admin_esp_dep}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un administrador</option>
                  {administradores.map(admin => (
                    <option key={admin.id_admin_esp_dep} value={admin.id_admin_esp_dep}>
                      {`${admin.nombre} ${admin.apellido}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex justify-end mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
                >
                  Cerrar
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {editMode ? 'Actualizar' : 'Crear'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EspacioDeportivo;