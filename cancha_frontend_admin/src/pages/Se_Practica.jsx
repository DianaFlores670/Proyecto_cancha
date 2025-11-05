import React, { useState, useEffect } from 'react';
import api from '../services/api';

const SePractica = () => {
  const [sePractica, setSePractica] = useState([]);
  const [canchas, setCanchas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false); // Nuevo estado para modo visualización
  const [currentSePractica, setCurrentSePractica] = useState(null);
  const [formData, setFormData] = useState({
    id_cancha: '',
    id_disciplina: '',
    frecuencia_practica: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Fetch canchas y disciplinas válidas al cargar el componente
  useEffect(() => {
    const fetchCanchas = async () => {
      try {
        const response = await api.get('/cancha/datos-especificos');
        if (response.data.exito) {
          setCanchas(response.data.datos.canchas || []);
        }
      } catch (err) {
        console.error('Error al obtener canchas:', err);
      }
    };

    const fetchDisciplinas = async () => {
      try {
        const response = await api.get('/disciplina/datos-especificos');
        if (response.data.exito) {
          setDisciplinas(response.data.datos.disciplinas || []);
        }
      } catch (err) {
        console.error('Error al obtener disciplinas:', err);
      }
    };

    fetchCanchas();
    fetchDisciplinas();
  }, []);

  const fetchSePractica = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/se_practica/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/se_practica/filtro', { params: fullParams });
      } else {
        response = await api.get('/se_practica/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setSePractica(response.data.datos.se_practica);
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
    fetchSePractica();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchSePractica({ q: searchTerm });
    } else {
      fetchSePractica();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchSePractica({ tipo });
    } else {
      fetchSePractica();
    }
  };

  const handleDelete = async (id_cancha, id_disciplina) => {
    if (!window.confirm('¿Estás seguro de eliminar esta relación se_practica?')) return;
    try {
      const response = await api.delete(`/se_practica/${id_cancha}/${id_disciplina}`);
      if (response.data.exito) {
        fetchSePractica();
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
      id_cancha: '',
      id_disciplina: '',
      frecuencia_practica: ''
    });
    setCurrentSePractica(null);
    setModalOpen(true);
  };

  const openEditModal = async (id_cancha, id_disciplina) => {
    try {
      const response = await api.get(`/se_practica/dato-individual/${id_cancha}/${id_disciplina}`);
      if (response.data.exito) {
        const sePractica = response.data.datos.se_practica;
        setFormData({
          id_cancha: sePractica.id_cancha || '',
          id_disciplina: sePractica.id_disciplina || '',
          frecuencia_practica: sePractica.frecuencia_practica || ''
        });
        setCurrentSePractica(sePractica);
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

  const openViewModal = async (id_cancha, id_disciplina) => {
    try {
      const response = await api.get(`/se_practica/dato-individual/${id_cancha}/${id_disciplina}`);
      if (response.data.exito) {
        const sePractica = response.data.datos.se_practica;
        setFormData({
          id_cancha: sePractica.id_cancha || '',
          id_disciplina: sePractica.id_disciplina || '',
          frecuencia_practica: sePractica.frecuencia_practica || ''
        });
        setCurrentSePractica(sePractica);
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
    setCurrentSePractica(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode) return; // No enviar formulario en modo visualización
    try {
      let response;
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['id_cancha', 'id_disciplina'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones frontend
      if (!filteredData.id_cancha || !canchas.some(cancha => cancha.id_cancha === parseInt(filteredData.id_cancha))) {
        setError('La cancha seleccionada no es válida');
        return;
      }
      if (!filteredData.id_disciplina || !disciplinas.some(disciplina => disciplina.id_disciplina === parseInt(filteredData.id_disciplina))) {
        setError('La disciplina seleccionada no es válida');
        return;
      }
      if (filteredData.frecuencia_practica && filteredData.frecuencia_practica.length > 50) {
        setError('La frecuencia de práctica no debe exceder los 50 caracteres');
        return;
      }

      if (editMode) {
        response = await api.patch(`/se_practica/${currentSePractica.id_cancha}/${currentSePractica.id_disciplina}`, filteredData);
      } else {
        response = await api.post('/se_practica/', filteredData);
      }
      if (response.data.exito) {
        closeModal();
        fetchSePractica();
      } else {
        alert(response.data.mensaje);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
      console.error(err);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestión de Relaciones Se Practica</h2>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por cancha, disciplina o frecuencia..."
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
            <option value="cancha">🏟️ Ordenar por cancha</option>
            <option value="disciplina">🎯 Ordenar por disciplina</option>
            <option value="frecuencia">🔄 Ordenar por frecuencia</option>
          </select>

          <button
            onClick={openCreateModal}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
          >
            <span>🔗</span>
            <span>Crear Relación</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando relaciones se_practica...</p>
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
                  <th className="px-4 py-2 text-left">Disciplina</th>
                  <th className="px-4 py-2 text-left">Frecuencia de Práctica</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sePractica.map((relacion, index) => (
                  <tr key={`${relacion.id_cancha}-${relacion.id_disciplina}`} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{relacion.cancha_nombre}</td>
                    <td className="px-4 py-2">{relacion.disciplina_nombre}</td>
                    <td className="px-4 py-2">{relacion.frecuencia_practica || '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openViewModal(relacion.id_cancha, relacion.id_disciplina)}
                        className="text-green-500 hover:text-green-700 mr-2"
                      >
                        Ver Datos
                      </button>
                      <button
                        onClick={() => openEditModal(relacion.id_cancha, relacion.id_disciplina)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(relacion.id_cancha, relacion.id_disciplina)}
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
              {viewMode ? 'Ver Datos de Relación Se Practica' : editMode ? 'Editar Relación Se Practica' : 'Crear Relación Se Practica'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cancha</label>
                <select
                  name="id_cancha"
                  value={formData.id_cancha}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode || editMode}
                >
                  <option value="">Seleccione una cancha</option>
                  {canchas.map(cancha => (
                    <option key={cancha.id_cancha} value={cancha.id_cancha}>
                      {cancha.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Disciplina</label>
                <select
                  name="id_disciplina"
                  value={formData.id_disciplina}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode || editMode}
                >
                  <option value="">Seleccione una disciplina</option>
                  {disciplinas.map(disciplina => (
                    <option key={disciplina.id_disciplina} value={disciplina.id_disciplina}>
                      {disciplina.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Frecuencia de Práctica</label>
                <input
                  name="frecuencia_practica"
                  value={formData.frecuencia_practica}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
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

export default SePractica;