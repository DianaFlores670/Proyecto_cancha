/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: false, canCreate: false, canEdit: false, canDelete: false },
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
  const prio = ['ADMINISTRADOR','ADMIN_ESP_DEP'];
  return prio.find(r => norm2.includes(r) && keys.includes(r)) || norm2.find(r => keys.includes(r)) || 'DEFAULT';
};

const ParticipaEn = () => {
  const [participaEn, setParticipaEn] = useState([]);
  const [deportistas, setDeportistas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentParticipaEn, setCurrentParticipaEn] = useState(null);
  const [formData, setFormData] = useState({ id_deportista: '', id_reserva: '', fecha_reserva: '' });
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
    const fetchAux = async () => {
      try {
        const [r1, r2] = await Promise.all([
          api.get('/deportista/datos-especificos', { params: { limit: 1000 } }),
          api.get('/reserva/datos-especificos', { params: { limit: 1000 } })
        ]);
        if (r1.data?.exito) setDeportistas(r1.data.datos?.deportistas || []);
        else setError(r1.data?.mensaje || 'Error al obtener deportistas');
        if (r2.data?.exito) setReservas(r2.data.datos?.reservas || []);
        else setError(r2.data?.mensaje || 'Error al obtener reservas');
      } catch (e) {
        setError(e.response?.data?.mensaje || 'Error de conexion al cargar datos base');
      }
    };
    if (permissions.canView || permissions.canCreate || permissions.canEdit) fetchAux();
    else setError('No tienes permisos para ver los datos');
  }, [role]);

  const fetchParticipa = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver los datos'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let r;
      if (params.q) r = await api.get('/participa_en/buscar', { params: fullParams });
      else if (params.tipo) r = await api.get('/participa_en/filtro', { params: fullParams });
      else r = await api.get('/participa_en/datos-especificos', { params: fullParams });
      if (r.data?.exito) {
        setParticipaEn(r.data.datos?.participa_en || []);
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

  useEffect(() => { fetchParticipa(); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
    if (searchTerm.trim()) fetchParticipa({ q: searchTerm });
    else fetchParticipa();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm('');
    if (tipo) fetchParticipa({ tipo });
    else fetchParticipa();
  };

  const handleDelete = async (id_deportista, id_reserva) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar esta relacion participa_en?')) return;
    try {
      const r = await api.delete(`/participa_en/${id_deportista}/${id_reserva}`);
      if (r.data?.exito) fetchParticipa();
      else setError(r.data?.mensaje || 'No se pudo eliminar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({ id_deportista: '', id_reserva: '', fecha_reserva: '' });
    setCurrentParticipaEn(null);
    setModalOpen(true);
  };

  const openEditModal = async (id_deportista, id_reserva) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/participa_en/dato-individual/${id_deportista}/${id_reserva}`);
      if (r.data?.exito) {
        const x = r.data.datos?.participa_en || {};
        setFormData({
          id_deportista: x.id_deportista || '',
          id_reserva: x.id_reserva || '',
          fecha_reserva: x.fecha_reserva ? new Date(x.fecha_reserva).toISOString().split('T')[0] : ''
        });
        setCurrentParticipaEn(x);
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

  const openViewModal = async (id_deportista, id_reserva) => {
    if (!permissions.canView) return;
    try {
      const r = await api.get(`/participa_en/dato-individual/${id_deportista}/${id_reserva}`);
      if (r.data?.exito) {
        const x = r.data.datos?.participa_en || {};
        setFormData({
          id_deportista: x.id_deportista || '',
          id_reserva: x.id_reserva || '',
          fecha_reserva: x.fecha_reserva ? new Date(x.fecha_reserva).toISOString().split('T')[0] : ''
        });
        setCurrentParticipaEn(x);
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
    setCurrentParticipaEn(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode) return;
    if ((editMode && !permissions.canEdit) || (!editMode && !permissions.canCreate)) return;
    try {
      const filtered = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (['id_deportista','id_reserva'].includes(k)) filtered[k] = v;
        else if (v !== '' && v !== null && v !== undefined) filtered[k] = v;
      });
      const did = parseInt(filtered.id_deportista);
      const rid = parseInt(filtered.id_reserva);
      if (!deportistas.some(d => d.id_deportista === did)) { setError('El deportista seleccionado no es valido'); return; }
      if (!reservas.some(r => r.id_reserva === rid)) { setError('La reserva seleccionada no es valida'); return; }
      if (filtered.fecha_reserva) {
        const f = new Date(filtered.fecha_reserva);
        if (isNaN(f.getTime())) { setError('La fecha de reserva no es valida'); return; }
      }
      const payload = { ...filtered, id_deportista: did, id_reserva: rid };
      let r;
      if (editMode) r = await api.patch(`/participa_en/${currentParticipaEn.id_deportista}/${currentParticipaEn.id_reserva}`, payload);
      else r = await api.post('/participa_en/', payload);
      if (r.data?.exito) { closeModal(); fetchParticipa(); }
      else setError(r.data?.mensaje || 'No se pudo guardar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Relaciones Participa En</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por deportista, cliente o cancha"
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
            <option value="deportista">Ordenar por deportista</option>
            <option value="reserva">Ordenar por reserva</option>
            <option value="fecha">Ordenar por fecha</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full flex items-center justify-center gap-2"
            >
              <span>Link</span>
              <span>Crear relacion</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando relaciones participa_en...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Deportista</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Fecha reserva</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {participaEn.map((rel, index) => (
                  <tr key={`${rel.id_deportista}-${rel.id_reserva}`} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{`${rel.deportista_nombre} ${rel.deportista_apellido}`}</td>
                    <td className="px-4 py-2">{`${rel.cliente_nombre} ${rel.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{rel.cancha_nombre}</td>
                    <td className="px-4 py-2">{rel.fecha_reserva ? new Date(rel.fecha_reserva).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(rel.id_deportista, rel.id_reserva)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(rel.id_deportista, rel.id_reserva)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(rel.id_deportista, rel.id_reserva)}
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
              {viewMode ? 'Ver datos de relacion participa en' : editMode ? 'Editar relacion participa en' : 'Crear relacion participa en'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Deportista</label>
                <select
                  name="id_deportista"
                  value={formData.id_deportista}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={editMode || viewMode}
                >
                  <option value="">Seleccione un deportista</option>
                  {deportistas.map(d => (
                    <option key={d.id_deportista} value={d.id_deportista}>
                      {d.nombre} {d.apellido}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={editMode || viewMode}
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map(r => (
                    <option key={r.id_reserva} value={r.id_reserva}>
                      Reserva #{r.id_reserva} - {r.cliente_nombre} {r.cliente_apellido} ({r.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Fecha de reserva</label>
                <input
                  name="fecha_reserva"
                  value={formData.fecha_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="date"
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
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipaEn;
