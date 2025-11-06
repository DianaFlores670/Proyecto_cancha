import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Configuración de permisos por rol
const permissionsConfig = {
  ADMINISTRADOR: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  ADMIN_ESP_DEP: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

const Cancha = () => {
  const [canchas, setCanchas] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentCancha, setCurrentCancha] = useState(null);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinasSeleccionadas, setDisciplinasSeleccionadas] = useState([]);
  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: '',
    capacidad: '',
    estado: '',
    monto_por_hora: '',
    imagen_cancha: '',
    id_espacio: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [role, setRole] = useState('DEFAULT');

  // Obtener el rol del usuario desde localStorage
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (!userData) return;

  try {
    const u = JSON.parse(userData);

    // 1) Normaliza a array en MAYÚSCULAS
    const rolesArr = Array.isArray(u?.roles)
      ? u.roles.map(r => String(r).toUpperCase())
      : (u?.role ? [String(u.role).toUpperCase()] : []);

    // 2) Elige un rol que exista en permissionsConfig, con prioridad
    const keys = Object.keys(permissionsConfig);
    const PRIORIDAD = ['ADMINISTRADOR']; // ajusta tu prioridad
    const efectivo =
      PRIORIDAD.find(r => rolesArr.includes(r) && keys.includes(r)) ||
      rolesArr.find(r => keys.includes(r)) ||
      'DEFAULT';

    setRole(efectivo);
  } catch (err) {
    console.error('Error al parsear datos del usuario:', err);
    setRole('DEFAULT');
  }
}, []);

  // Obtener permisos según el rol (o DEFAULT si no hay rol o no está definido)
  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  // Fetch espacios deportivos válidos al cargar el componente
  useEffect(() => {
    const fetchEspacios = async () => {
      try {
        const response = await api.get('/espacio_deportivo/datos-especificos');
        if (response.data.exito) {
          setEspacios(response.data.datos.espacios || []);
        }
      } catch (err) {
        console.error('Error al obtener espacios deportivos:', err);
      }
    };
    fetchEspacios();
  }, []);

  // Fetch disciplinas al cargar el componente
  useEffect(() => {
    const fetchDisciplinas = async () => {
      try {
        const response = await api.get('/cancha/disciplinas');
        if (response.data.exito) {
          setDisciplinas(response.data.datos.disciplinas || []);
        }
      } catch (err) {
        console.error('Error al obtener disciplinas:', err);
      }
    };
    fetchDisciplinas();
  }, []);

  // Function to generate image URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  const fetchCanchas = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/cancha/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/cancha/filtro', { params: fullParams });
      } else {
        response = await api.get('/cancha/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setCanchas(response.data.datos.canchas);
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
    fetchCanchas();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchCanchas({ q: searchTerm });
    } else {
      fetchCanchas();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchCanchas({ tipo });
    } else {
      fetchCanchas();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return; // Verificar permiso
    if (!window.confirm('¿Estás seguro de eliminar esta cancha?')) return;
    try {
      const response = await api.delete(`/cancha/${id}`);
      if (response.data.exito) {
        fetchCanchas();
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
    if (!permissions.canCreate) return; // Verificar permiso
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: '',
      ubicacion: '',
      capacidad: '',
      estado: '',
      monto_por_hora: '',
      imagen_cancha: '',
      id_espacio: ''
    });
    setDisciplinasSeleccionadas([]);
    setSelectedFile(null);
    setImagePreview(null);
    setCurrentCancha(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return; // Verificar permiso
    try {
      const response = await api.get(`/cancha/dato-individual/${id}`);
      if (response.data.exito) {
        const cancha = response.data.datos.cancha;
        setFormData({
          nombre: cancha.nombre || '',
          ubicacion: cancha.ubicacion || '',
          capacidad: cancha.capacidad || '',
          estado: cancha.estado || '',
          monto_por_hora: cancha.monto_por_hora || '',
          imagen_cancha: cancha.imagen_cancha || '',
          id_espacio: cancha.id_espacio || ''
        });
        setImagePreview(cancha.imagen_cancha ? getImageUrl(cancha.imagen_cancha) : null);
        setSelectedFile(null);
        if (cancha.disciplinas) {
          setDisciplinasSeleccionadas(cancha.disciplinas.map(d => ({
            id_disciplina: d.id_disciplina,
            nombre: d.nombre,
            frecuencia_practica: d.frecuencia_practica || 'Regular'
          })));
        } else {
          setDisciplinasSeleccionadas([]);
        }
        setCurrentCancha(cancha);
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
    if (!permissions.canView) return; // Verificar permiso
    try {
      const response = await api.get(`/cancha/dato-individual/${id}`);
      if (response.data.exito) {
        const cancha = response.data.datos.cancha;
        setFormData({
          nombre: cancha.nombre || '',
          ubicacion: cancha.ubicacion || '',
          capacidad: cancha.capacidad || '',
          estado: cancha.estado || '',
          monto_por_hora: cancha.monto_por_hora || '',
          imagen_cancha: cancha.imagen_cancha || '',
          id_espacio: cancha.id_espacio || ''
        });
        setImagePreview(cancha.imagen_cancha ? getImageUrl(cancha.imagen_cancha) : null);
        setSelectedFile(null);
        if (cancha.disciplinas) {
          setDisciplinasSeleccionadas(cancha.disciplinas.map(d => ({
            id_disciplina: d.id_disciplina,
            nombre: d.nombre,
            frecuencia_practica: d.frecuencia_practica || 'Regular'
          })));
        } else {
          setDisciplinasSeleccionadas([]);
        }
        setCurrentCancha(cancha);
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
    setCurrentCancha(null);
    setDisciplinasSeleccionadas([]);
    setError(null);
    setViewMode(false);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;

    try {
      let response;
      const data = new FormData();

      // Add text fields
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['nombre', 'id_espacio'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      Object.entries(filteredData).forEach(([key, value]) => {
        if (key !== 'imagen_cancha') {
          data.append(key, value);
        }
      });

      // Add image file
      if (selectedFile) {
        data.append('imagen_cancha', selectedFile);
        console.log(`📸 imagen_cancha seleccionado:`, selectedFile.name);
      }

      // Validations
      if (filteredData.nombre && filteredData.nombre.length > 100) {
        setError('El nombre no debe exceder los 100 caracteres');
        return;
      }
      if (filteredData.ubicacion && filteredData.ubicacion.length > 255) {
        setError('La ubicación no debe exceder los 255 caracteres');
        return;
      }
      if (filteredData.capacidad && (isNaN(filteredData.capacidad) || filteredData.capacidad < 0)) {
        setError('La capacidad debe ser un número positivo');
        return;
      }
      const estadosValidos = ['disponible', 'ocupada', 'mantenimiento'];
      if (filteredData.estado && !estadosValidos.includes(filteredData.estado)) {
        setError(`El estado debe ser uno de: ${estadosValidos.join(', ')}`);
        return;
      }
      if (filteredData.monto_por_hora && (isNaN(filteredData.monto_por_hora) || filteredData.monto_por_hora < 0)) {
        setError('El monto por hora debe ser un número positivo');
        return;
      }
      if (filteredData.id_espacio && !espacios.some(espacio => espacio.id_espacio === parseInt(filteredData.id_espacio))) {
        setError('El espacio deportivo seleccionado no es válido');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar cancha ID:', currentCancha.id_cancha);
        console.log('📦 Datos enviados:');
        for (let [key, value] of data.entries()) {
          console.log(`   ${key}:`, key === 'imagen_cancha' ? `[File: ${value.name}]` : value);
        }
        response = await api.patch(`/cancha/${currentCancha.id_cancha}`, data, config);
        if (response.data.exito && disciplinasSeleccionadas.length > 0) {
          await api.post(`/cancha/${currentCancha.id_cancha}/disciplinas`, {
            disciplinas: disciplinasSeleccionadas
          });
        }
      } else {
        console.log('📤 Enviando POST para crear cancha...');
        response = await api.post('/cancha/', data, config);
        if (response.data.exito && disciplinasSeleccionadas.length > 0) {
          const nuevaCanchaId = response.data.datos.cancha.id_cancha;
          await api.post(`/cancha/${nuevaCanchaId}/disciplinas`, {
            disciplinas: disciplinasSeleccionadas
          });
        }
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchCanchas();
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

  const handleDisciplinaChange = (e) => {
    const selectedId = parseInt(e.target.value);
    if (selectedId && !disciplinasSeleccionadas.some(d => d.id_disciplina === selectedId)) {
      const disciplina = disciplinas.find(d => d.id_disciplina === selectedId);
      if (disciplina) {
        setDisciplinasSeleccionadas(prev => [...prev, {
          id_disciplina: disciplina.id_disciplina,
          nombre: disciplina.nombre,
          frecuencia_practica: 'Regular'
        }]);
      }
    }
  };

  const handleFrecuenciaChange = (id_disciplina, frecuencia) => {
    setDisciplinasSeleccionadas(prev => 
      prev.map(d => d.id_disciplina === id_disciplina 
        ? { ...d, frecuencia_practica: frecuencia } 
        : d
      )
    );
  };

  const handleRemoveDisciplina = (id_disciplina) => {
    setDisciplinasSeleccionadas(prev => 
      prev.filter(d => d.id_disciplina !== id_disciplina)
    );
  };

  if (!role) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Canchas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, ubicación o espacio deportivo..."
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
            className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
          >
            <option value="">📋 Todos - Sin filtro</option>
            <option value="nombre">👤 Ordenar por nombre</option>
            <option value="estado">🟢 Ordenar por estado</option>
            <option value="monto">💰 Ordenar por monto por hora</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>⚽</span>
              <span>Crear Cancha</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando canchas...</p>
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
                  <th className="px-4 py-2 text-left">Ubicación</th>
                  <th className="px-4 py-2 text-left">Capacidad</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Monto por Hora</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {canchas.map((cancha, index) => (
                  <tr key={cancha.id_cancha} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{cancha.nombre}</td>
                    <td className="px-4 py-2">{cancha.ubicacion || '-'}</td>
                    <td className="px-4 py-2">{cancha.capacidad || '-'}</td>
                    <td className="px-4 py-2">{cancha.estado || '-'}</td>
                    <td className="px-4 py-2">{cancha.monto_por_hora ? `$${cancha.monto_por_hora}` : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(cancha.id_cancha)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(cancha.id_cancha)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(cancha.id_cancha)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      )}
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
              {viewMode ? 'Ver Datos de Cancha' : editMode ? 'Editar Cancha' : 'Crear Cancha'}
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
                <label className="block text-sm font-medium mb-1">Ubicación</label>
                <input
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacidad</label>
                <input
                  name="capacidad"
                  value={formData.capacidad}
                  onChange={handleInputChange}
                  className生命周期="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                >
                  <option value="">Seleccione un estado</option>
                  <option value="disponible">Disponible</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto por Hora</label>
                <input
                  name="monto_por_hora"
                  value={formData.monto_por_hora}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Imagen Cancha</label>
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Imagen Cancha" 
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_cancha:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Espacio Deportivo</label>
                <select
                  name="id_espacio"
                  value={formData.id_espacio}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un espacio deportivo</option>
                  {espacios.map(espacio => (
                    <option key={espacio.id_espacio} value={espacio.id_espacio}>
                      {espacio.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Disciplinas</label>
                {viewMode ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {disciplinasSeleccionadas.map(disciplina => (
                      <div key={disciplina.id_disciplina} className="flex items-center justify-between p-2 border rounded">
                        <span className="flex-1">{disciplina.nombre}</span>
                        <span>{disciplina.frecuencia_practica}</span>
                      </div>
                    ))}
                    {disciplinasSeleccionadas.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-2">
                        No hay disciplinas seleccionadas
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <select
                      onChange={handleDisciplinaChange}
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                      value=""
                      disabled={viewMode}
                    >
                      <option value="">Seleccione una disciplina para agregar</option>
                      {disciplinas
                        .filter(d => !disciplinasSeleccionadas.some(selected => selected.id_disciplina === d.id_disciplina))
                        .map(disciplina => (
                          <option key={disciplina.id_disciplina} value={disciplina.id_disciplina}>
                            {disciplina.nombre}
                          </option>
                        ))
                      }
                    </select>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {disciplinasSeleccionadas.map(disciplina => (
                        <div key={disciplina.id_disciplina} className="flex items-center justify-between p-2 border rounded">
                          <span className="flex-1">{disciplina.nombre}</span>
                          <select
                            value={disciplina.frecuencia_practica}
                            onChange={(e) => handleFrecuenciaChange(disciplina.id_disciplina, e.target.value)}
                            className="border rounded px-2 py-1 mx-2"
                            disabled={viewMode}
                          >
                            <option value="Regular">Regular</option>
                            <option value="Ocasional">Ocasional</option>
                            <option value="Frecuente">Frecuente</option>
                            <option value="Intensivo">Intensivo</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveDisciplina(disciplina.id_disciplina)}
                            className="text-red-500 hover:text-red-700 ml-2"
                            disabled={viewMode}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {disciplinasSeleccionadas.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-2">
                          No hay disciplinas seleccionadas
                        </p>
                      )}
                    </div>
                  </div>
                )}
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

export default Cancha;