/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  CONTROL: { canView: true, canCreate: false, canEdit: true, canDelete: false },
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

const Resena = () => {
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
    fecha_creacion: new Date().toISOString().split('T')[0],
    estado: false,
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
        const r = await api.get('/reserva/datos-especificos', { params: { limit: 1000 } });
        if (r.data?.exito) setReservas(r.data.datos?.reservas || []);
        else setError(r.data?.mensaje || 'Error al obtener reservas');
      } catch (e) {
        setError(e.response?.data?.mensaje || 'Error de conexion al obtener reservas');
      }
    };
    if (permissions.canView) fetchReservas();
    else setError('No tienes permisos para ver los datos');
  }, [role]);

  const fetchResenas = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver los datos'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let r;
      if (params.q) r = await api.get('/resena/buscar', { params: fullParams });
      else if (params.tipo) r = await api.get('/resena/filtro', { params: fullParams });
      else r = await api.get('/resena/datos-especificos', { params: fullParams });
      if (r.data?.exito) {
        setResenas(r.data.datos?.resenas || []);
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

  useEffect(() => { fetchResenas(); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
    if (searchTerm.trim()) fetchResenas({ q: searchTerm });
    else fetchResenas();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm('');
    if (tipo) fetchResenas({ tipo });
    else fetchResenas();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar esta resena?')) return;
    try {
      const r = await api.delete(`/resena/${id}`);
      if (r.data?.exito) fetchResenas();
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
      id_reserva: '',
      estrellas: '',
      comentario: '',
      fecha_creacion: new Date().toISOString().split('T')[0],
      estado: false,
      verificado: false
    });
    setCurrentResena(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/resena/dato-individual/${id}`);
      if (r.data?.exito) {
        const x = r.data.datos?.resena || {};
        setFormData({
          id_reserva: x.id_reserva || '',
          estrellas: x.estrellas || '',
          comentario: x.comentario || '',
          fecha_creacion: x.fecha_creacion ? new Date(x.fecha_creacion).toISOString().split('T')[0] : '',
          estado: x.estado !== undefined ? !!x.estado : false,
          verificado: x.verificado !== undefined ? !!x.verificado : false
        });
        setCurrentResena(x);
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
      const r = await api.get(`/resena/dato-individual/${id}`);
      if (r.data?.exito) {
        const x = r.data.datos?.resena || {};
        setFormData({
          id_reserva: x.id_reserva || '',
          estrellas: x.estrellas || '',
          comentario: x.comentario || '',
          fecha_creacion: x.fecha_creacion ? new Date(x.fecha_creacion).toISOString().split('T')[0] : '',
          estado: x.estado !== undefined ? !!x.estado : false,
          verificado: x.verificado !== undefined ? !!x.verificado : false
        });
        setCurrentResena(x);
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
    setCurrentResena(null);
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
      const rid = parseInt(formData.id_reserva);
      if (!reservas.some(r => r.id_reserva === rid)) { setError('La reserva seleccionada no es valida'); return; }
      const est = Number(formData.estrellas);
      if (!(est >= 1 && est <= 5)) { setError('Las estrellas deben estar entre 1 y 5'); return; }
      const payload = {
        id_reserva: rid,
        estrellas: est,
        comentario: formData.comentario || undefined,
        estado: !!formData.estado,
        verificado: !!formData.verificado
      };
      let r;
      if (editMode) r = await api.patch(`/resena/${currentResena.id_resena}`, payload);
      else r = await api.post('/resena/', payload);
      if (r.data?.exito) {
        closeModal();
        fetchResenas();
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
      <h2 className="text-xl font-semibold mb-4">Gestion de Resenas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha o comentario"
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
            className="border rounded px-3 py-2 flex-1 sm:min-w-[200px]"
          >
            <option value="">Todos - sin filtro</option>
            <option value="cliente_nombre">Ordenar por cliente</option>
            <option value="cancha_nombre">Ordenar por cancha</option>
            <option value="verificado_si">Solo verificadas</option>
            <option value="verificado_no">Solo no verificadas</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>⭐</span>
              <span>Crear resena</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando resenas...</p>
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
                  <th className="px-4 py-2 text-left">Estrellas</th>
                  <th className="px-4 py-2 text-left">Comentario</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {resenas.map((resena, index) => (
                  <tr key={resena.id_resena} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${resena.cliente_nombre} ${resena.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{resena.cancha_nombre}</td>
                    <td className="px-4 py-2">{resena.estrellas}</td>
                    <td className="px-4 py-2">{resena.comentario || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${resena.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {resena.verificado ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(resena.id_resena)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver datos
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
              {viewMode ? 'Ver datos de resena' : editMode ? 'Editar resena' : 'Crear resena'}
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
                  disabled={viewMode}
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map(reserva => (
                    <option key={reserva.id_reserva} value={reserva.id_reserva}>
                      Reserva #{reserva.id_reserva} - {reserva.cliente_nombre} {reserva.cliente_apellido} ({reserva.cancha_nombre}) - {reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toLocaleDateString() : (reserva.fecha ? new Date(reserva.fecha).toLocaleDateString() : '')}
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
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Comentario</label>
                <textarea
                  name="comentario"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              {editMode && (
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de creacion</label>
                  <input
                    name="fecha_creacion"
                    value={formData.fecha_creacion}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Fecha automatica asignada por el sistema</p>
                </div>
              )}
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <div
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={() => !viewMode && setFormData(prev => ({ ...prev, estado: !prev.estado }))}
                  >
                    <input
                      type="checkbox"
                      name="estado"
                      checked={formData.estado}
                      onChange={handleInputChange}
                      className="sr-only"
                      disabled={viewMode}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${formData.estado ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <div className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${formData.estado ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="ml-3 text-sm text-gray-600">{formData.estado ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Verificado</label>
                  <div
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={() => !viewMode && setFormData(prev => ({ ...prev, verificado: !prev.verificado }))}
                  >
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
                  </div>
                  <span className="ml-3 text-sm text-gray-600">{formData.verificado ? 'Si' : 'No'}</span>
                </div>
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

export default Resena;
