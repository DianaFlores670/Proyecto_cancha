/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  ENCARGADO: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  DEFAULT: { canView: false, canCreate: false, canEdit: false, canDelete: false },
};

const getEffectiveRole = () => {
  const keys = Object.keys(permissionsConfig);
  const bag = new Set();
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const arr = Array.isArray(u?.roles) ? u.roles : [];
    for (const r of arr) {
      if (typeof r === 'string') bag.add(r);
      else if (r && typeof r === 'object') ['rol','role','nombre','name'].forEach(k => { if (r[k]) bag.add(r[k]); });
    }
    if (bag.size === 0 && u?.role) bag.add(u.role);
  } catch {}
  const tok = localStorage.getItem('token');
  if (bag.size === 0 && tok && tok.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      const t = Array.isArray(payload?.roles) ? payload.roles : (payload?.rol ? [payload.rol] : []);
      t.forEach(v => bag.add(v));
    } catch {}
  }
  const norm = Array.from(bag).map(v => String(v || '').trim().toUpperCase().replace(/\s+/g,'_'));
  const map = v => v === 'ADMIN' ? 'ADMINISTRADOR' : v;
  const norm2 = norm.map(map);
  const prio = ['ADMINISTRADOR','CONTROL','ADMIN_ESP_DEP'];
  return prio.find(r => norm2.includes(r) && keys.includes(r)) || norm2.find(r => keys.includes(r)) || 'DEFAULT';
};

const ReporteIncidencia = () => {
  const [reportes, setReportes] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [encargados, setEncargados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentReporte, setCurrentReporte] = useState(null);
  const [formData, setFormData] = useState({
    detalle: '',
    sugerencia: '',
    id_encargado: '',
    id_reserva: '',
    verificado: false
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(() => getEffectiveRole());

  useEffect(() => {
    const sync = () => setRole(getEffectiveRole());
    window.addEventListener('storage', sync);
    window.addEventListener('auth-changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('auth-changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const r = await api.get('/reserva/datos-especificos');
        if (r.data?.exito) setReservas(r.data.datos?.reservas || []);
        else setError(r.data?.mensaje || 'Error al obtener reservas');
      } catch (e) {
        setError(e.response?.data?.mensaje || 'Error de conexion al obtener reservas');
      }
    };
    const fetchEncargados = async () => {
      try {
        const r = await api.get('/encargado/datos-especificos');
        if (r.data?.exito) setEncargados(r.data.datos?.encargados || []);
        else setError(r.data?.mensaje || 'Error al obtener encargados');
      } catch (e) {
        setError(e.response?.data?.mensaje || 'Error de conexion al obtener encargados');
      }
    };
    if (permissions.canView) {
      fetchReservas();
      fetchEncargados();
    } else {
      setError('No tienes permisos para ver los datos');
    }
  }, [role]);

  const fetchReportes = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver los datos'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let r;
      if (params.q) r = await api.get('/reporte_incidencia/buscar', { params: fullParams });
      else if (params.tipo) r = await api.get('/reporte_incidencia/filtro', { params: fullParams });
      else r = await api.get('/reporte_incidencia/datos-especificos', { params: fullParams });
      if (r.data?.exito) {
        setReportes(r.data.datos?.reportes || []);
        setTotal(r.data.datos?.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || 'Error al cargar datos');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReportes(); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
    if (searchTerm.trim()) fetchReportes({ q: searchTerm });
    else fetchReportes();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm('');
    if (tipo) fetchReportes({ tipo });
    else fetchReportes();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar este reporte de incidencia?')) return;
    try {
      const r = await api.delete(`/reporte_incidencia/${id}`);
      if (r.data?.exito) fetchReportes();
      else setError(r.data?.mensaje || 'No se pudo eliminar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      detalle: '',
      sugerencia: '',
      id_encargado: '',
      id_reserva: '',
      verificado: false
    });
    setCurrentReporte(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/reporte_incidencia/dato-individual/${id}`);
      if (r.data?.exito) {
        const rep = r.data.datos?.reporte || {};
        setFormData({
          detalle: rep.detalle || '',
          sugerencia: rep.sugerencia || '',
          id_encargado: rep.id_encargado || '',
          id_reserva: rep.id_reserva || '',
          verificado: !!rep.verificado
        });
        setCurrentReporte(rep);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(r.data?.mensaje || 'No se pudo cargar el registro');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const r = await api.get(`/reporte_incidencia/dato-individual/${id}`);
      if (r.data?.exito) {
        const rep = r.data.datos?.reporte || {};
        setFormData({
          detalle: rep.detalle || '',
          sugerencia: rep.sugerencia || '',
          id_encargado: rep.id_encargado || '',
          id_reserva: rep.id_reserva || '',
          verificado: !!rep.verificado
        });
        setCurrentReporte(rep);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(r.data?.mensaje || 'No se pudo cargar el registro');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentReporte(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode) return;
    if ((editMode && !permissions.canEdit) || (!editMode && !permissions.canCreate)) return;
    try {
      const base = { ...formData };
      const rid = parseInt(base.id_reserva);
      const eid = parseInt(base.id_encargado);
      if (!reservas.some(r => r.id_reserva === rid)) { setError('La reserva seleccionada no es valida'); return; }
      if (!encargados.some(x => x.id_encargado === eid)) { setError('El encargado seleccionado no es valido'); return; }
      const payload = {
        detalle: base.detalle || undefined,
        sugerencia: base.sugerencia || undefined,
        id_encargado: eid,
        id_reserva: rid,
        verificado: !!base.verificado
      };
      let r;
      if (editMode) r = await api.patch(`/reporte_incidencia/${currentReporte.id_reporte}`, payload);
      else r = await api.post('/reporte_incidencia/', payload);
      if (r.data?.exito) {
        closeModal();
        fetchReportes();
      } else {
        setError(r.data?.mensaje || 'No se pudo guardar');
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Reportes de Incidencia</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por encargado, cliente, cancha o descripcion"
              className="border rounded-l px-4 py-2 w-full"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
          >
            <option value="">Todos - sin filtro</option>
            <option value="fecha">Ordenar por fecha</option>
            <option value="prioridad">Ordenar por prioridad</option>
            <option value="estado">Ordenar por estado</option>
            <option value="verificado_si">Solo verificados</option>
            <option value="verificado_no">Solo no verificados</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear incidencia
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando datos...</p>
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
                  <th className="px-4 py-2 text-left">Encargado</th>
                  <th className="px-4 py-2 text-left">Detalle</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((reporte, index) => (
                  <tr key={reporte.id_reporte} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${reporte.cliente_nombre} ${reporte.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{reporte.cancha_nombre}</td>
                    <td className="px-4 py-2">{`${reporte.encargado_nombre} ${reporte.encargado_apellido}`}</td>
                    <td className="px-4 py-2">{reporte.detalle ? reporte.detalle.substring(0, 80) + (reporte.detalle.length > 80 ? '...' : '') : '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${reporte.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {reporte.verificado ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(reporte.id_reporte)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(reporte.id_reporte)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(reporte.id_reporte)}
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
              Pagina {page} de {Math.ceil(total / limit)}
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
              {viewMode ? 'Ver datos de reporte de incidencia' : editMode ? 'Editar reporte de incidencia' : 'Crear reporte de incidencia'}
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
                <label className="block text-sm font-medium mb-1">Encargado</label>
                <select
                  name="id_encargado"
                  value={formData.id_encargado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un encargado</option>
                  {encargados.map(encargado => (
                    <option key={encargado.id_encargado} value={encargado.id_encargado}>
                      #{encargado.id_encargado} - {encargado.nombre} {encargado.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Detalle</label>
                <textarea
                  name="detalle"
                  value={formData.detalle}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="4"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Sugerencia</label>
                <textarea
                  name="sugerencia"
                  value={formData.sugerencia}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="4"
                  disabled={viewMode}
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Verificado</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="verificado"
                    checked={formData.verificado}
                    onChange={handleInputChange}
                    className="sr-only"
                    disabled={viewMode}
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${formData.verificado ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${formData.verificado ? 'translate-x-5' : ''}`} />
                  <span className="ml-3 text-sm text-gray-600">{formData.verificado ? 'Verificado' : 'No verificado'}</span>
                </label>
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
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteIncidencia;
