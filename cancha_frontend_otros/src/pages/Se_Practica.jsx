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
  const [viewMode, setViewMode] = useState(false);
  const [currentSePractica, setCurrentSePractica] = useState(null);
  const [formData, setFormData] = useState({ id_cancha: '', id_disciplina: '', frecuencia_practica: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState(() => getEffectiveRole());
  const limit = 10;

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
          api.get('/cancha/datos-especificos', { params: { limit: 1000 } }),
          api.get('/disciplina/datos-especificos', { params: { limit: 1000 } })
        ]);
        if (r1.data?.exito) setCanchas(r1.data.datos?.canchas || []);
        else setError(r1.data?.mensaje || 'Error al obtener canchas');
        if (r2.data?.exito) setDisciplinas(r2.data.datos?.disciplinas || []);
        else setError(r2.data?.mensaje || 'Error al obtener disciplinas');
      } catch (e) {
        setError(e.response?.data?.mensaje || 'Error de conexion al cargar datos base');
      }
    };
    if (permissions.canView || permissions.canCreate || permissions.canEdit) fetchAux();
    else setError('No tienes permisos para ver los datos');
  }, [role]);

  const fetchSePractica = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver los datos'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let r;
      if (params.q) r = await api.get('/se_practica/buscar', { params: fullParams });
      else if (params.tipo) r = await api.get('/se_practica/filtro', { params: fullParams });
      else r = await api.get('/se_practica/datos-especificos', { params: fullParams });
      if (r.data?.exito) {
        setSePractica(r.data.datos?.se_practica || []);
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

  useEffect(() => { fetchSePractica(); }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro('');
    if (searchTerm.trim()) fetchSePractica({ q: searchTerm });
    else fetchSePractica();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm('');
    if (tipo) fetchSePractica({ tipo });
    else fetchSePractica();
  };

  const handleDelete = async (id_cancha, id_disciplina) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar esta relacion se_practica?')) return;
    try {
      const r = await api.delete(`/se_practica/${id_cancha}/${id_disciplina}`);
      if (r.data?.exito) fetchSePractica();
      else setError(r.data?.mensaje || 'No se pudo eliminar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion al servidor');
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({ id_cancha: '', id_disciplina: '', frecuencia_practica: '' });
    setCurrentSePractica(null);
    setModalOpen(true);
  };

  const openEditModal = async (id_cancha, id_disciplina) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/se_practica/dato-individual/${id_cancha}/${id_disciplina}`);
      if (r.data?.exito) {
        const x = r.data.datos?.se_practica || {};
        setFormData({
          id_cancha: x.id_cancha || '',
          id_disciplina: x.id_disciplina || '',
          frecuencia_practica: x.frecuencia_practica || ''
        });
        setCurrentSePractica(x);
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

  const openViewModal = async (id_cancha, id_disciplina) => {
    if (!permissions.canView) return;
    try {
      const r = await api.get(`/se_practica/dato-individual/${id_cancha}/${id_disciplina}`);
      if (r.data?.exito) {
        const x = r.data.datos?.se_practica || {};
        setFormData({
          id_cancha: x.id_cancha || '',
          id_disciplina: x.id_disciplina || '',
          frecuencia_practica: x.frecuencia_practica || ''
        });
        setCurrentSePractica(x);
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
    if (viewMode) return;
    if ((editMode && !permissions.canEdit) || (!editMode && !permissions.canCreate)) return;
    try {
      const filtered = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (['id_cancha','id_disciplina'].includes(k)) filtered[k] = v;
        else if (v !== '' && v !== null && v !== undefined) filtered[k] = v;
      });
      const cid = parseInt(filtered.id_cancha);
      const did = parseInt(filtered.id_disciplina);
      if (!canchas.some(c => c.id_cancha === cid)) { setError('La cancha seleccionada no es valida'); return; }
      if (!disciplinas.some(d => d.id_disciplina === did)) { setError('La disciplina seleccionada no es valida'); return; }
      if (filtered.frecuencia_practica && String(filtered.frecuencia_practica).length > 50) { setError('La frecuencia no debe exceder 50 caracteres'); return; }
      const payload = { ...filtered, id_cancha: cid, id_disciplina: did };
      let r;
      if (editMode) r = await api.patch(`/se_practica/${currentSePractica.id_cancha}/${currentSePractica.id_disciplina}`, payload);
      else r = await api.post('/se_practica/', payload);
      if (r.data?.exito) { closeModal(); fetchSePractica(); }
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
      <h2 className="text-xl font-semibold mb-4">Gestion de Relaciones Se Practica</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cancha, disciplina o frecuencia"
              className="border rounded-l px-4 py-2 w-full"
              disabled={!permissions.canView}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
              disabled={!permissions.canView}
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
            disabled={!permissions.canView}
          >
            <option value="">Todos - sin filtro</option>
            <option value="cancha">Ordenar por cancha</option>
            <option value="disciplina">Ordenar por disciplina</option>
            <option value="frecuencia">Ordenar por frecuencia</option>
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
                  <th className="px-4 py-2 text-left">Frecuencia de practica</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sePractica.map((rel, index) => (
                  <tr key={`${rel.id_cancha}-${rel.id_disciplina}`} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{rel.cancha_nombre}</td>
                    <td className="px-4 py-2">{rel.disciplina_nombre}</td>
                    <td className="px-4 py-2">{rel.frecuencia_practica || '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(rel.id_cancha, rel.id_disciplina)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(rel.id_cancha, rel.id_disciplina)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(rel.id_cancha, rel.id_disciplina)}
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
              {viewMode ? 'Ver datos de relacion se practica' : editMode ? 'Editar relacion se practica' : 'Crear relacion se practica'}
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
                  {canchas.map(c => (
                    <option key={c.id_cancha} value={c.id_cancha}>{c.nombre}</option>
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
                  {disciplinas.map(d => (
                    <option key={d.id_disciplina} value={d.id_disciplina}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Frecuencia de practica</label>
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
                    disabled={(!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)}
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

export default SePractica;
