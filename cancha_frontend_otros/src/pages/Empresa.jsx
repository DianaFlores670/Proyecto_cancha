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
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
};

const Empresa = () => {
  const [empresas, setEmpresas] = useState([]);
  const [administradores, setAdministradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentEmpresa, setCurrentEmpresa] = useState(null);
  const [formData, setFormData] = useState({
    nombre_sistema: '',
    logo_imagen: '',
    imagen_hero: '',
    titulo_h1: '',
    descripcion_h1: '',
    te_ofrecemos: '',
    imagen_1: '',
    imagen_2: '',
    imagen_3: '',
    titulo_1: '',
    titulo_2: '',
    titulo_3: '',
    descripcion_1: '',
    descripcion_2: '',
    descripcion_3: '',
    mision: '',
    vision: '',
    nuestro_objetivo: '',
    objetivo_1: '',
    objetivo_2: '',
    objetivo_3: '',
    quienes_somos: '',
    correo_empresa: '',
    telefono: '',
    direccion: '',
    id_administrador: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState('DEFAULT');

  // States for image handling
  const [selectedFiles, setSelectedFiles] = useState({
    logo_imagen: null,
    imagen_hero: null,
    imagen_1: null,
    imagen_2: null,
    imagen_3: null
  });
  const [imagePreviews, setImagePreviews] = useState({
    logo_imagen: null,
    imagen_hero: null,
    imagen_1: null,
    imagen_2: null,
    imagen_3: null
  });

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

  // Fetch administradores válidos al cargar el componente
  useEffect(() => {
    const fetchAdministradores = async () => {
      try {
        const response = await api.get('/administrador/datos-especificos');
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

  const fetchEmpresas = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/empresa/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/empresa/filtro', { params: fullParams });
      } else {
        response = await api.get('/empresa/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setEmpresas(response.data.datos.empresas);
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
    fetchEmpresas();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchEmpresas({ q: searchTerm });
    } else {
      fetchEmpresas();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchEmpresas({ tipo });
    } else {
      fetchEmpresas();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return; // Verificar permiso
    if (!window.confirm('¿Estás seguro de eliminar esta empresa?')) return;
    try {
      const response = await api.delete(`/empresa/${id}`);
      if (response.data.exito) {
        fetchEmpresas();
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
      nombre_sistema: '',
      logo_imagen: '',
      imagen_hero: '',
      titulo_h1: '',
      descripcion_h1: '',
      te_ofrecemos: '',
      imagen_1: '',
      imagen_2: '',
      imagen_3: '',
      titulo_1: '',
      titulo_2: '',
      titulo_3: '',
      descripcion_1: '',
      descripcion_2: '',
      descripcion_3: '',
      mision: '',
      vision: '',
      nuestro_objetivo: '',
      objetivo_1: '',
      objetivo_2: '',
      objetivo_3: '',
      quienes_somos: '',
      correo_empresa: '',
      telefono: '',
      direccion: '',
      id_administrador: ''
    });
    setSelectedFiles({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null
    });
    setImagePreviews({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null
    });
    setCurrentEmpresa(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return; // Verificar permiso
    try {
      const response = await api.get(`/empresa/dato-individual/${id}`);
      if (response.data.exito) {
        const empresa = response.data.datos.empresa;
        setFormData({
          nombre_sistema: empresa.nombre_sistema || '',
          logo_imagen: empresa.logo_imagen || '',
          imagen_hero: empresa.imagen_hero || '',
          titulo_h1: empresa.titulo_h1 || '',
          descripcion_h1: empresa.descripcion_h1 || '',
          te_ofrecemos: empresa.te_ofrecemos || '',
          imagen_1: empresa.imagen_1 || '',
          imagen_2: empresa.imagen_2 || '',
          imagen_3: empresa.imagen_3 || '',
          titulo_1: empresa.titulo_1 || '',
          titulo_2: empresa.titulo_2 || '',
          titulo_3: empresa.titulo_3 || '',
          descripcion_1: empresa.descripcion_1 || '',
          descripcion_2: empresa.descripcion_2 || '',
          descripcion_3: empresa.descripcion_3 || '',
          mision: empresa.mision || '',
          vision: empresa.vision || '',
          nuestro_objetivo: empresa.nuestro_objetivo || '',
          objetivo_1: empresa.objetivo_1 || '',
          objetivo_2: empresa.objetivo_2 || '',
          objetivo_3: empresa.objetivo_3 || '',
          quienes_somos: empresa.quienes_somos || '',
          correo_empresa: empresa.correo_empresa || '',
          telefono: empresa.telefono || '',
          direccion: empresa.direccion || '',
          id_administrador: empresa.id_administrador || ''
        });
        setImagePreviews({
          logo_imagen: empresa.logo_imagen ? getImageUrl(empresa.logo_imagen) : null,
          imagen_hero: empresa.imagen_hero ? getImageUrl(empresa.imagen_hero) : null,
          imagen_1: empresa.imagen_1 ? getImageUrl(empresa.imagen_1) : null,
          imagen_2: empresa.imagen_2 ? getImageUrl(empresa.imagen_2) : null,
          imagen_3: empresa.imagen_3 ? getImageUrl(empresa.imagen_3) : null
        });
        setSelectedFiles({
          logo_imagen: null,
          imagen_hero: null,
          imagen_1: null,
          imagen_2: null,
          imagen_3: null
        });
        setCurrentEmpresa(empresa);
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
      const response = await api.get(`/empresa/dato-individual/${id}`);
      if (response.data.exito) {
        const empresa = response.data.datos.empresa;
        setFormData({
          nombre_sistema: empresa.nombre_sistema || '',
          logo_imagen: empresa.logo_imagen || '',
          imagen_hero: empresa.imagen_hero || '',
          titulo_h1: empresa.titulo_h1 || '',
          descripcion_h1: empresa.descripcion_h1 || '',
          te_ofrecemos: empresa.te_ofrecemos || '',
          imagen_1: empresa.imagen_1 || '',
          imagen_2: empresa.imagen_2 || '',
          imagen_3: empresa.imagen_3 || '',
          titulo_1: empresa.titulo_1 || '',
          titulo_2: empresa.titulo_2 || '',
          titulo_3: empresa.titulo_3 || '',
          descripcion_1: empresa.descripcion_1 || '',
          descripcion_2: empresa.descripcion_2 || '',
          descripcion_3: empresa.descripcion_3 || '',
          mision: empresa.mision || '',
          vision: empresa.vision || '',
          nuestro_objetivo: empresa.nuestro_objetivo || '',
          objetivo_1: empresa.objetivo_1 || '',
          objetivo_2: empresa.objetivo_2 || '',
          objetivo_3: empresa.objetivo_3 || '',
          quienes_somos: empresa.quienes_somos || '',
          correo_empresa: empresa.correo_empresa || '',
          telefono: empresa.telefono || '',
          direccion: empresa.direccion || '',
          id_administrador: empresa.id_administrador || ''
        });
        setImagePreviews({
          logo_imagen: empresa.logo_imagen ? getImageUrl(empresa.logo_imagen) : null,
          imagen_hero: empresa.imagen_hero ? getImageUrl(empresa.imagen_hero) : null,
          imagen_1: empresa.imagen_1 ? getImageUrl(empresa.imagen_1) : null,
          imagen_2: empresa.imagen_2 ? getImageUrl(empresa.imagen_2) : null,
          imagen_3: empresa.imagen_3 ? getImageUrl(empresa.imagen_3) : null
        });
        setSelectedFiles({
          logo_imagen: null,
          imagen_hero: null,
          imagen_1: null,
          imagen_2: null,
          imagen_3: null
        });
        setCurrentEmpresa(empresa);
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
    setCurrentEmpresa(null);
    setError(null);
    setViewMode(false);
    setSelectedFiles({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null
    });
    setImagePreviews({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null
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
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;

    try {
      let response;
      const data = new FormData();

      // Add text fields
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['nombre_sistema', 'id_administrador'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      Object.entries(filteredData).forEach(([key, value]) => {
        if (!['logo_imagen', 'imagen_hero', 'imagen_1', 'imagen_2', 'imagen_3'].includes(key)) {
          data.append(key, value);
        }
      });

      // Add image files
      ['logo_imagen', 'imagen_hero', 'imagen_1', 'imagen_2', 'imagen_3'].forEach(field => {
        if (selectedFiles[field]) {
          data.append(field, selectedFiles[field]);
          console.log(`📸 ${field} seleccionado:`, selectedFiles[field].name);
        }
      });

      // Validations
      if (filteredData.nombre_sistema && filteredData.nombre_sistema.length > 100) {
        setError('El nombre del sistema no debe exceder los 100 caracteres');
        return;
      }
      if (filteredData.titulo_h1 && filteredData.titulo_h1.length > 150) {
        setError('El título H1 no debe exceder los 150 caracteres');
        return;
      }
      if (filteredData.correo_empresa && filteredData.correo_empresa.length > 150) {
        setError('El correo de la empresa no debe exceder los 150 caracteres');
        return;
      }
      if (filteredData.telefono && filteredData.telefono.length > 50) {
        setError('El teléfono no debe exceder los 50 caracteres');
        return;
      }
      if (filteredData.correo_empresa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(filteredData.correo_empresa)) {
        setError('El correo de la empresa no es válido');
        return;
      }
      if (filteredData.id_administrador && !administradores.some(admin => admin.id_administrador === parseInt(filteredData.id_administrador))) {
        setError('El administrador seleccionado no es válido');
        return;
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar empresa ID:', currentEmpresa.id_empresa);
        console.log('📦 Datos enviados:');
        for (let [key, value] of data.entries()) {
          console.log(`   ${key}:`, key.includes('imagen') ? `[File: ${value.name}]` : value);
        }
        response = await api.patch(`/empresa/${currentEmpresa.id_empresa}`, data, config);
      } else {
        console.log('📤 Enviando POST para crear empresa...');
        response = await api.post('/empresa/', data, config);
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchEmpresas();
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

  if (!role) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Empresas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, correo, dirección o administrador..."
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
            <option value="fecha">📅 Ordenar por fecha</option>
            <option value="correo">📧 Ordenar por correo</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>🏢</span>
              <span>Crear Empresa</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando empresas...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre Sistema</th>
                  <th className="px-4 py-2 text-left">Correo</th>
                  <th className="px-4 py-2 text-left">Teléfono</th>
                  <th className="px-4 py-2 text-left">Administrador</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa, index) => (
                  <tr key={empresa.id_empresa} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{empresa.nombre_sistema}</td>
                    <td className="px-4 py-2">{empresa.correo_empresa || '-'}</td>
                    <td className="px-4 py-2">{empresa.telefono || '-'}</td>
                    <td className="px-4 py-2">{`${empresa.admin_nombre} ${empresa.admin_apellido}`}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(empresa.id_empresa)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(empresa.id_empresa)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(empresa.id_empresa)}
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
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode ? 'Ver Datos de Empresa' : editMode ? 'Editar Empresa' : 'Crear Empresa'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del Sistema</label>
                <input
                  name="nombre_sistema"
                  value={formData.nombre_sistema}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Correo Empresa</label>
                <input
                  name="correo_empresa"
                  value={formData.correo_empresa}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="email"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
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
              <div>
                <label className="block text-sm font-medium mb-1">Administrador</label>
                <select
                  name="id_administrador"
                  value={formData.id_administrador}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un administrador</option>
                  {administradores.map(admin => (
                    <option key={admin.id_administrador} value={admin.id_administrador}>
                      {`${admin.nombre} ${admin.apellido}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Logo</label>
                {imagePreviews.logo_imagen ? (
                  <img
                    src={imagePreviews.logo_imagen}
                    alt="Logo"
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading logo:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay logo</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo_imagen')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen Hero</label>
                {imagePreviews.imagen_hero ? (
                  <img
                    src={imagePreviews.imagen_hero}
                    alt="Hero"
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_hero:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen hero</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_hero')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Título H1</label>
                <input
                  name="titulo_h1"
                  value={formData.titulo_h1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción H1</label>
                <textarea
                  name="descripcion_h1"
                  value={formData.descripcion_h1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Te Ofrecemos</label>
                <textarea
                  name="te_ofrecemos"
                  value={formData.te_ofrecemos}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen 1</label>
                {imagePreviews.imagen_1 ? (
                  <img
                    src={imagePreviews.imagen_1}
                    alt="Imagen 1"
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_1:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen 1</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_1')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Título 1</label>
                <input
                  name="titulo_1"
                  value={formData.titulo_1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción 1</label>
                <textarea
                  name="descripcion_1"
                  value={formData.descripcion_1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen 2</label>
                {imagePreviews.imagen_2 ? (
                  <img
                    src={imagePreviews.imagen_2}
                    alt="Imagen 2"
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_2:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen 2</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_2')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Título 2</label>
                <input
                  name="titulo_2"
                  value={formData.titulo_2}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción 2</label>
                <textarea
                  name="descripcion_2"
                  value={formData.descripcion_2}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen 3</label>
                {imagePreviews.imagen_3 ? (
                  <img
                    src={imagePreviews.imagen_3}
                    alt="Imagen 3"
                    className="w-32 h-32 object-cover rounded mb-2"
                    onError={(e) => console.error('Error loading imagen_3:', e.target.src)}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen 3</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'imagen_3')}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Título 3</label>
                <input
                  name="titulo_3"
                  value={formData.titulo_3}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción 3</label>
                <textarea
                  name="descripcion_3"
                  value={formData.descripcion_3}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Misión</label>
                <textarea
                  name="mision"
                  value={formData.mision}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Visión</label>
                <textarea
                  name="vision"
                  value={formData.vision}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nuestro Objetivo</label>
                <textarea
                  name="nuestro_objetivo"
                  value={formData.nuestro_objetivo}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Objetivo 1</label>
                <textarea
                  name="objetivo_1"
                  value={formData.objetivo_1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Objetivo 2</label>
                <textarea
                  name="objetivo_2"
                  value={formData.objetivo_2}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Objetivo 3</label>
                <textarea
                  name="objetivo_3"
                  value={formData.objetivo_3}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Quiénes Somos</label>
                <textarea
                  name="quienes_somos"
                  value={formData.quienes_somos}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
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

export default Empresa;