import React, { useState, useEffect } from 'react';
import api from '../services/api';

const norm = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '_');

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
};

const readTokenPayload = () => {
  try {
    const t = localStorage.getItem('token');
    if (!t || t.split('.').length !== 3) return {};
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b.length % 4)) % 4);
    return JSON.parse(atob(b + pad));
  } catch { return {}; }
};

const pickRole = (u, p) => {
  const bag = new Set();
  const arr = Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
  arr.forEach(r => bag.add(norm(typeof r === 'string' ? r : r?.rol || r?.role || r?.nombre || r?.name)));
  const parr = Array.isArray(p?.roles) ? p.roles : (p?.rol ? [p.rol] : []);
  parr.forEach(r => bag.add(norm(r)));
  const list = Array.from(bag);
  if (list.includes('ADMIN_ESP_DEP')) return 'ADMIN_ESP_DEP';
  if (list.includes('ADMIN') || list.includes('ADMINISTRADOR')) return 'ADMINISTRADOR';
  return list[0] || 'DEFAULT';
};

const resolveAdminId = (u, p) => {
  if (Number.isInteger(u?.id_admin_esp_dep)) return u.id_admin_esp_dep;
  if (Number.isInteger(u?.id_persona)) return u.id_persona;
  if (Number.isInteger(u?.id)) return u.id;
  if (Number.isInteger(u?.persona?.id_persona)) return u.persona.id_persona;
  if (Number.isInteger(p?.id_admin_esp_dep)) return p.id_admin_esp_dep;
  if (Number.isInteger(p?.id_persona)) return p.id_persona;
  if (Number.isInteger(p?.id)) return p.id;
  return null;
};

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  ADMIN_ESP_DEP: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  DEFAULT: { canView: false, canCreate: false, canEdit: false, canDelete: false },
};

const getImageUrl = (path) => {
  if (!path) return '';
  const base = (api.defaults?.baseURL || '').replace(/\/$/, '');
  const clean = String(path).replace(/^\//, '');
  return `${base}/${clean}`;
};

const EspacioDeportivoAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);

  const [espacios, setEspacios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

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

  const [imageFiles, setImageFiles] = useState({
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

  useEffect(() => {
    const u = readUser();
    const p = readTokenPayload();
    const r = pickRole(u, p);
    setRole(r);
    const idGuess = resolveAdminId(u, p);
    setIdAdminEspDep(r === 'ADMIN_ESP_DEP' ? idGuess : null);
  }, []);

  useEffect(() => { setError(null); }, [role, idAdminEspDep]);

  const permissions = permissionsConfig[role || 'DEFAULT'] || permissionsConfig.DEFAULT;

  const fetchEspacios = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
    const fullParams = { ...params, limit, offset, ...extra };
    try {
      let resp;
      if (params.q) resp = await api.get('/espacio-admin/buscar', { params: fullParams });
      else if (params.tipo) resp = await api.get('/espacio-admin/filtro', { params: fullParams });
      else resp = await api.get('/espacio-admin/datos-especificos', { params: fullParams });
      if (resp.data?.exito) {
        const rows = Array.isArray(resp.data.datos?.espacios) ? resp.data.datos.espacios : [];
        const t = resp.data.datos?.paginacion?.total;
        setEspacios(rows);
        setTotal(typeof t === 'number' ? t : rows.length);
      } else {
        setError(resp.data?.mensaje || 'Error al cargar');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!role) return;
    fetchEspacios();
  }, [role, idAdminEspDep, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchEspacios({ q: searchTerm });
    else fetchEspacios();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchEspacios({ tipo });
    else fetchEspacios();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar este espacio?')) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.delete(`/espacio_deportivo/${id}`, { params: extra });
      if (r.data?.exito) fetchEspacios();
      else setError(r.data?.mensaje || 'No se pudo eliminar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
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
      id_admin_esp_dep: role === 'ADMIN_ESP_DEP' && idAdminEspDep ? idAdminEspDep : ''
    });
    setImageFiles({
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
    if (!permissions.canEdit) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.get(`/espacio-admin/dato-individual/${id}`, { params: extra });
      if (!r.data?.exito) { setError(r.data?.mensaje || 'No se pudo cargar'); return; }
      const e = r.data.datos?.espacio || {};
      setFormData({
        nombre: e.nombre || '',
        direccion: e.direccion || '',
        descripcion: e.descripcion || '',
        latitud: e.latitud || '',
        longitud: e.longitud || '',
        horario_apertura: e.horario_apertura || '',
        horario_cierre: e.horario_cierre || '',
        imagen_principal: e.imagen_principal || '',
        imagen_sec_1: e.imagen_sec_1 || '',
        imagen_sec_2: e.imagen_sec_2 || '',
        imagen_sec_3: e.imagen_sec_3 || '',
        imagen_sec_4: e.imagen_sec_4 || '',
        id_admin_esp_dep: e.id_admin_esp_dep || (role === 'ADMIN_ESP_DEP' && idAdminEspDep ? idAdminEspDep : '')
      });
      setImagePreviews({
        imagen_principal: e.imagen_principal ? getImageUrl(e.imagen_principal) : null,
        imagen_sec_1: e.imagen_sec_1 ? getImageUrl(e.imagen_sec_1) : null,
        imagen_sec_2: e.imagen_sec_2 ? getImageUrl(e.imagen_sec_2) : null,
        imagen_sec_3: e.imagen_sec_3 ? getImageUrl(e.imagen_sec_3) : null,
        imagen_sec_4: e.imagen_sec_4 ? getImageUrl(e.imagen_sec_4) : null
      });
      setImageFiles({
        imagen_principal: null,
        imagen_sec_1: null,
        imagen_sec_2: null,
        imagen_sec_3: null,
        imagen_sec_4: null
      });
      setCurrentEspacio(e);
      setEditMode(true);
      setViewMode(false);
      setModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.get(`/espacio-admin/dato-individual/${id}`, { params: extra });
      if (!r.data?.exito) { setError(r.data?.mensaje || 'No se pudo cargar'); return; }
      const e = r.data.datos?.espacio || {};
      setFormData({
        nombre: e.nombre || '',
        direccion: e.direccion || '',
        descripcion: e.descripcion || '',
        latitud: e.latitud || '',
        longitud: e.longitud || '',
        horario_apertura: e.horario_apertura || '',
        horario_cierre: e.horario_cierre || '',
        imagen_principal: e.imagen_principal || '',
        imagen_sec_1: e.imagen_sec_1 || '',
        imagen_sec_2: e.imagen_sec_2 || '',
        imagen_sec_3: e.imagen_sec_3 || '',
        imagen_sec_4: e.imagen_sec_4 || '',
        id_admin_esp_dep: e.id_admin_esp_dep || (role === 'ADMIN_ESP_DEP' && idAdminEspDep ? idAdminEspDep : '')
      });
      setImagePreviews({
        imagen_principal: e.imagen_principal ? getImageUrl(e.imagen_principal) : null,
        imagen_sec_1: e.imagen_sec_1 ? getImageUrl(e.imagen_sec_1) : null,
        imagen_sec_2: e.imagen_sec_2 ? getImageUrl(e.imagen_sec_2) : null,
        imagen_sec_3: e.imagen_sec_3 ? getImageUrl(e.imagen_sec_3) : null,
        imagen_sec_4: e.imagen_sec_4 ? getImageUrl(e.imagen_sec_4) : null
      });
      setImageFiles({
        imagen_principal: null,
        imagen_sec_1: null,
        imagen_sec_2: null,
        imagen_sec_3: null,
        imagen_sec_4: null
      });
      setCurrentEspacio(e);
      setEditMode(false);
      setViewMode(true);
      setModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEspacio(null);
    setError(null);
    setViewMode(false);
    setImageFiles({
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

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFiles(prev => ({ ...prev, [field]: file }));
      setImagePreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;
    try {
      const data = new FormData();
      const filtered = Object.fromEntries(
        Object.entries(formData).filter(([k, v]) => {
          const req = ['nombre', 'id_admin_esp_dep'];
          if (req.includes(k)) return true;
          return v !== '' && v !== null && v !== undefined;
        })
      );
      Object.entries(filtered).forEach(([k, v]) => {
        if (!['imagen_principal','imagen_sec_1','imagen_sec_2','imagen_sec_3','imagen_sec_4'].includes(k)) data.append(k, v);
      });
      ['imagen_principal','imagen_sec_1','imagen_sec_2','imagen_sec_3','imagen_sec_4'].forEach(f => {
        if (imageFiles[f]) data.append(f, imageFiles[f]);
      });
      if (filtered.nombre && filtered.nombre.length > 100) { setError('Nombre muy largo'); return; }
      if (filtered.direccion && filtered.direccion.length > 255) { setError('Direccion muy larga'); return; }
      if (filtered.latitud && (isNaN(filtered.latitud) || filtered.latitud < -90 || filtered.latitud > 90)) { setError('Latitud fuera de rango'); return; }
      if (filtered.longitud && (isNaN(filtered.longitud) || filtered.longitud < -180 || filtered.longitud > 180)) { setError('Longitud fuera de rango'); return; }
      const vHora = (h) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(h);
      if (filtered.horario_apertura && !vHora(filtered.horario_apertura)) { setError('Hora apertura invalida'); return; }
      if (filtered.horario_cierre && !vHora(filtered.horario_cierre)) { setError('Hora cierre invalida'); return; }
      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      let resp;
      if (editMode) resp = await api.patch(`/espacio-admin/${currentEspacio.id_espacio}`, data, cfg);
      else resp = await api.post('/espacio-admin/', data, cfg);
      if (resp.data?.exito) { closeModal(); fetchEspacios(); }
      else setError(resp.data?.mensaje || 'No se pudo guardar');
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message || 'Error de conexion');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Espacios Deportivos</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, direccion, descripcion o administrador"
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
            <option value="nombre">Por nombre</option>
            <option value="direccion">Por direccion</option>
            <option value="admin_nombre">Por administrador</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear espacio
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando espacios...</p>
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
                  <th className="px-4 py-2 text-left">Direccion</th>
                  <th className="px-4 py-2 text-left">Horario apertura</th>
                  <th className="px-4 py-2 text-left">Horario cierre</th>
                  <th className="px-4 py-2 text-left">Administrador</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {espacios.map((e, index) => (
                  <tr key={e.id_espacio} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{e.nombre}</td>
                    <td className="px-4 py-2">{e.direccion || '-'}</td>
                    <td className="px-4 py-2">{e.horario_apertura || '-'}</td>
                    <td className="px-4 py-2">{e.horario_cierre || '-'}</td>
                    <td className="px-4 py-2">
                      {e.admin_nombre || e.admin_apellido ? `${e.admin_nombre || ''} ${e.admin_apellido || ''}`.trim() : 'Sin administrador'}
                    </td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(e.id_espacio)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(e.id_espacio)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(e.id_espacio)}
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
              {viewMode ? 'Ver datos de espacio' : editMode ? 'Editar espacio' : 'Crear espacio'}
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
                <label className="block text-sm font-medium mb-1">Direccion</label>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Descripcion</label>
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
                  min="-90"
                  max="90"
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
                  min="-180"
                  max="180"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horario apertura (HH:MM:SS)</label>
                <input
                  name="horario_apertura"
                  value={formData.horario_apertura}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  placeholder="HH:MM:SS"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horario cierre (HH:MM:SS)</label>
                <input
                  name="horario_cierre"
                  value={formData.horario_cierre}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  placeholder="HH:MM:SS"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Imagen principal</label>
                {imagePreviews.imagen_principal ? (
                  <img src={imagePreviews.imagen_principal} alt="imagen_principal" className="w-32 h-32 object-cover rounded mb-2" />
                ) : viewMode ? (
                  <p className="text-gray-500">Sin imagen</p>
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

              {['imagen_sec_1','imagen_sec_2','imagen_sec_3','imagen_sec_4'].map((f) => (
                <div key={f}>
                  <label className="block text-sm font-medium mb-1">{f}</label>
                  {imagePreviews[f] ? (
                    <img src={imagePreviews[f]} alt={f} className="w-32 h-32 object-cover rounded mb-2" />
                  ) : viewMode ? (
                    <p className="text-gray-500">Sin imagen</p>
                  ) : null}
                  {!viewMode && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, f)}
                      className="w-full border rounded px-3 py-2 bg-gray-100"
                    />
                  )}
                </div>
              ))}

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

export default EspacioDeportivoAdmin;
