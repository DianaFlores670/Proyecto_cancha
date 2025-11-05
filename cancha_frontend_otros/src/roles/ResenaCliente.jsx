import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Configuración de permisos por rol
const permissionsConfig = {
  CLIENTE: {
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

const ResenaCliente = () => {
  const [resenas, setResenas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentResena, setCurrentResena] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: '',
    estrellas: '',
    comentario: '',
    estado: false,
    verificado: false,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(null);
  const [idCliente, setIdCliente] = useState(null);

  // Obtener el rol e id_cliente desde localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setRole(parsedUser.role);
        setIdCliente(parsedUser.id_persona);
      } catch (error) {
        console.error('Error al parsear datos del usuario:', error);
        setError('Error al cargar datos del usuario');
      }
    } else {
      setError('No se encontraron datos de usuario');
    }
  }, []);

  // Obtener permisos según el rol
  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  // Fetch reservas válidas del cliente
  useEffect(() => {
    const fetchReservas = async () => {
      if (!idCliente) return;
      try {
        const response = await api.get('/resena-cliente/datos-especificos', {
          params: { id_cliente: idCliente },
        });
        if (response.data.exito) {
          setReservas(response.data.datos.reservas || []);
        }
      } catch (err) {
        console.error('Error al obtener reservas:', err);
        setError('Error al cargar reservas');
      }
    };
    fetchReservas();
  }, [idCliente]);

  // Fetch reseñas con paginación y filtros
  const fetchResenas = async (params = {}) => {
    if (!idCliente) return;
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset, id_cliente: idCliente };
    try {
      let response;
      if (params.q) {
        response = await api.get('/resena-cliente/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/resena-cliente/filtro', { params: fullParams });
      } else {
        response = await api.get('/resena-cliente/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setResenas(response.data.datos.resenas);
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
    fetchResenas();
  }, [page, idCliente]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchResenas({ q: searchTerm });
    } else {
      fetchResenas();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchResenas({ tipo });
    } else {
      fetchResenas();
    }
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('¿Estás seguro de eliminar esta reseña?')) return;
    try {
      const response = await api.delete(`/resena-cliente/${id}`, {
        params: { id_cliente: idCliente },
      });
      if (response.data.exito) {
        fetchResenas();
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
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      id_reserva: '',
      estrellas: '',
      comentario: '',
      estado: false,
      verificado: false,
    });
    setCurrentResena(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/resena-cliente/dato-individual/${id}`, {
        params: { id_cliente: idCliente },
      });
      if (response.data.exito) {
        const resena = response.data.datos.resena;
        setFormData({
          id_reserva: resena.id_reserva || '',
          estrellas: resena.estrellas || '',
          comentario: resena.comentario || '',
          estado: resena.estado || false,
          verificado: resena.verificado || false,
        });
        setCurrentResena(resena);
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
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/resena-cliente/dato-individual/${id}`, {
        params: { id_cliente: idCliente },
      });
      if (response.data.exito) {
        const resena = response.data.datos.resena;
        setFormData({
          id_reserva: resena.id_reserva || '',
          estrellas: resena.estrellas || '',
          comentario: resena.comentario || '',
          estado: resena.estado || false,
          verificado: resena.verificado || false,
        });
        setCurrentResena(resena);
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
    setCurrentResena(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;

    try {
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['id_reserva', 'estrellas'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones
      if (!filteredData.id_reserva || isNaN(filteredData.id_reserva)) {
        setError('La reserva es obligatoria');
        return;
      }
      if (!filteredData.estrellas || isNaN(filteredData.estrellas) || filteredData.estrellas < 1 || filteredData.estrellas > 5) {
        setError('Las estrellas deben estar entre 1 y 5');
        return;
      }
      if (filteredData.comentario && filteredData.comentario.length > 500) {
        setError('El comentario no debe exceder los 500 caracteres');
        return;
      }

      filteredData.id_cliente = idCliente;

      let response;
      if (editMode) {
        console.log('📤 Enviando PATCH para actualizar reseña ID:', currentResena.id_resena);
        response = await api.patch(`/resena-cliente/${currentResena.id_resena}`, filteredData);
      } else {
        console.log('📤 Enviando POST para crear reseña...');
        response = await api.post('/resena-cliente/', filteredData);
      }

      if (response.data.exito) {
        console.log('✅ Operación exitosa:', response.data.mensaje);
        closeModal();
        fetchResenas();
      } else {
        alert('Error: ' + response.data.mensaje);
      }
    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  if (!role || !idCliente) {
    return <p>Cargando permisos...</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Reseñas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por nombre, comentario o cancha..."
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
            <option value="verificado_si">✅ Reseñas verificadas</option>
            <option value="verificado_no">⛔ Reseñas no verificadas</option>
            <option value="cliente_nombre">👤 Ordenar por nombre</option>
            <option value="cancha_nombre">🏟️ Ordenar por cancha</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>⭐</span>
              <span>Crear Reseña</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando reseñas...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Estrellas</th>
                  <th className="px-4 py-2 text-left">Comentario</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resenas.map((resena, index) => (
                  <tr key={resena.id_resena} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{resena.cancha_nombre}</td>
                    <td className="px-4 py-2">{resena.estrellas} ⭐</td>
                    <td className="px-4 py-2">{resena.comentario?.substring(0, 50) || '-'}</td>
                    <td className="px-4 py-2">{resena.estado ? 'Activo' : 'Inactivo'}</td>
                    <td className="px-4 py-2">{resena.verificado ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(resena.id_resena)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(resena.id_resena)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(resena.id_resena)}
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
              {viewMode ? 'Ver Datos de Reseña' : editMode ? 'Editar Reseña' : 'Crear Reseña'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode || editMode}
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map((reserva) => (
                    <option key={reserva.id_reserva} value={reserva.id_reserva}>
                      {reserva.cancha_nombre || `Reserva #${reserva.id_reserva}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estrellas</label>
                <input
                  name="estrellas"
                  value={formData.estrellas}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  min="1"
                  max="5"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <input
                  name="estado"
                  type="checkbox"
                  checked={formData.estado}
                  onChange={handleInputChange}
                  className="w-5 h-5 border rounded bg-gray-100"
                  disabled={viewMode}
                />
                <span className="ml-2">{formData.estado ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Comentario</label>
                <textarea
                  name="comentario"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="4"
                  maxLength="500"
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

export default ResenaCliente;