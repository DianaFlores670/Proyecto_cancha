import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReservaHorario = () => {
  const [horarios, setHorarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false); // Nuevo estado para modo visualización
  const [currentHorario, setCurrentHorario] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    monto: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Fetch reservas válidas al cargar el componente
  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const response = await api.get('/reserva/datos-especificos');
        if (response.data.exito) {
          setReservas(response.data.datos.reservas || []);
        }
      } catch (err) {
        console.error('Error al obtener reservas:', err);
      }
    };

    fetchReservas();
  }, []);

  const fetchHorarios = async (params = {}) => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/reserva_horario/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/reserva_horario/filtro', { params: fullParams });
      } else {
        response = await api.get('/reserva_horario/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setHorarios(response.data.datos.horarios);
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
    fetchHorarios();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) {
      fetchHorarios({ q: searchTerm });
    } else {
      fetchHorarios();
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) {
      fetchHorarios({ tipo });
    } else {
      fetchHorarios();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este horario de reserva?')) return;
    try {
      const response = await api.delete(`/reserva_horario/${id}`);
      if (response.data.exito) {
        fetchHorarios();
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
      id_reserva: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
      monto: ''
    });
    setCurrentHorario(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    try {
      const response = await api.get(`/reserva_horario/dato-individual/${id}`);
      if (response.data.exito) {
        const horario = response.data.datos.horario;
        setFormData({
          id_reserva: horario.id_reserva || '',
          fecha: horario.fecha ? new Date(horario.fecha).toISOString().split('T')[0] : '',
          hora_inicio: horario.hora_inicio || '',
          hora_fin: horario.hora_fin || '',
          monto: horario.monto || ''
        });
        setCurrentHorario(horario);
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
      const response = await api.get(`/reserva_horario/dato-individual/${id}`);
      if (response.data.exito) {
        const horario = response.data.datos.horario;
        setFormData({
          id_reserva: horario.id_reserva || '',
          fecha: horario.fecha ? new Date(horario.fecha).toISOString().split('T')[0] : '',
          hora_inicio: horario.hora_inicio || '',
          hora_fin: horario.hora_fin || '',
          monto: horario.monto || ''
        });
        setCurrentHorario(horario);
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
    setCurrentHorario(null);
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
          const requiredFields = ['id_reserva', 'fecha', 'hora_inicio', 'hora_fin'];
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );

      // Validaciones frontend
      if (!filteredData.id_reserva || !reservas.some(reserva => reserva.id_reserva === parseInt(filteredData.id_reserva))) {
        setError('La reserva seleccionada no es válida');
        return;
      }
      if (!filteredData.fecha) {
        setError('La fecha es obligatoria');
        return;
      }
      const fecha = new Date(filteredData.fecha);
      if (isNaN(fecha.getTime())) {
        setError('La fecha no es válida');
        return;
      }
      const validarHora = (hora) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(hora);
      if (!filteredData.hora_inicio || !validarHora(filteredData.hora_inicio)) {
        setError('La hora de inicio no es válida (formato HH:MM:SS)');
        return;
      }
      if (!filteredData.hora_fin || !validarHora(filteredData.hora_fin)) {
        setError('La hora de fin no es válida (formato HH:MM:SS)');
        return;
      }
      const horaInicio = new Date(`1970-01-01T${filteredData.hora_inicio}Z`);
      const horaFin = new Date(`1970-01-01T${filteredData.hora_fin}Z`);
      if (horaInicio >= horaFin) {
        setError('La hora de inicio debe ser anterior a la hora de fin');
        return;
      }
      if (filteredData.monto && (isNaN(filteredData.monto) || filteredData.monto < 0)) {
        setError('El monto debe ser un número positivo');
        return;
      }

      if (editMode) {
        response = await api.patch(`/reserva_horario/${currentHorario.id_horario}`, filteredData);
      } else {
        response = await api.post('/reserva_horario/', filteredData);
      }
      if (response.data.exito) {
        closeModal();
        fetchHorarios();
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
      <h2 className="text-xl font-semibold mb-4">Gestión de Horarios de Reserva</h2>
      
      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Buscar por cliente o cancha..."
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
            <option value="fecha">📅 Ordenar por fecha</option>
            <option value="hora">⏰ Ordenar por hora</option>
            <option value="monto">💰 Ordenar por monto</option>
          </select>

          <button
            onClick={openCreateModal}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
          >
            <span>⏰</span>
            <span>Crear Horario</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando horarios de reserva...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Hora Inicio</th>
                  <th className="px-4 py-2 text-left">Hora Fin</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario, index) => (
                  <tr key={horario.id_horario} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${horario.cliente_nombre} ${horario.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{horario.cancha_nombre}</td>
                    <td className="px-4 py-2">{new Date(horario.fecha).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{horario.hora_inicio}</td>
                    <td className="px-4 py-2">{horario.hora_fin}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button
                        onClick={() => openViewModal(horario.id_horario)}
                        className="text-green-500 hover:text-green-700 mr-2"
                      >
                        Ver Datos
                      </button>
                      <button
                        onClick={() => openEditModal(horario.id_horario)}
                        className="text-blue-500 hover:text-blue-700 mr-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(horario.id_horario)}
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
              {viewMode ? 'Ver Datos de Horario de Reserva' : editMode ? 'Editar Horario de Reserva' : 'Crear Horario de Reserva'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map(reserva => (
                    <option key={reserva.id_reserva} value={reserva.id_reserva}>
                      #{reserva.id_reserva} - {reserva.cliente_nombre} {reserva.cliente_apellido} ({reserva.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="date"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora Inicio</label>
                <input
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora Fin</label>
                <input
                  name="hora_fin"
                  value={formData.hora_fin}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  required
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Monto</label>
                <input
                  name="monto"
                  value={formData.monto}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.01"
                  min="0"
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

export default ReservaHorario;