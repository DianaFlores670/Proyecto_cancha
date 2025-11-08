/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
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

const CanchaAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);

  const [canchas, setCanchas] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinasSeleccionadas, setDisciplinasSeleccionadas] = useState([]);

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
  const [currentCancha, setCurrentCancha] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: '',
    capacidad: '',
    estado: '',
    monto_por_hora: '',
    imagen_cancha: '',
    id_espacio: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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

  useEffect(() => {
  const fetchEspacios = async () => {
    if (!(role && permissions.canView)) return;
    const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
    try {
      const r = await api.get('/cancha-admin/espacios', { params: { ...extra, limit: 100, offset: 0 } });
      if (r.data?.exito) setEspacios(Array.isArray(r.data.datos?.espacios) ? r.data.datos.espacios : []);
    } catch (e) {}
  };
  fetchEspacios();
}, [role, idAdminEspDep, permissions.canView]);

useEffect(() => {
  if (!(role && permissions.canView)) return;
  const fetchDisciplinas = async () => {
    try {
      const r = await api.get('/cancha-admin/disciplinas');
      const list = Array.isArray(r.data?.datos?.disciplinas) ? r.data.datos.disciplinas : [];
      setDisciplinas(list);
    } catch (e) {
      setError('Error al cargar disciplinas');
    }
  };
  fetchDisciplinas();
}, [role, permissions.canView]);



  const fetchCanchas = async (params = {}) => {
    if (!permissions.canView) { setError('No tienes permisos para ver'); return; }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
    const fullParams = { ...params, limit, offset, ...extra };
    try {
      let resp;
      if (params.q) resp = await api.get('/cancha-admin/buscar', { params: fullParams });
      else if (params.tipo) resp = await api.get('/cancha-admin/filtro', { params: fullParams });
      else resp = await api.get('/cancha-admin/datos-especificos', { params: fullParams });
      if (resp.data?.exito) {
        const rows = Array.isArray(resp.data.datos?.canchas) ? resp.data.datos.canchas : [];
        const t = resp.data.datos?.paginacion?.total;
        setCanchas(rows);
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
    fetchCanchas();
  }, [role, idAdminEspDep, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchCanchas({ q: searchTerm });
    else fetchCanchas();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchCanchas({ tipo });
    else fetchCanchas();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar esta cancha?')) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.delete(`/cancha-admin/${id}`, { params: extra });
      if (r.data?.exito) fetchCanchas();
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
    if (!permissions.canEdit) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.get(`/cancha-admin/dato-individual/${id}`, { params: extra });
      if (!r.data?.exito) { setError(r.data?.mensaje || 'No se pudo cargar'); return; }
      const c = r.data.datos?.cancha || {};
      setFormData({
        nombre: c.nombre || '',
        ubicacion: c.ubicacion || '',
        capacidad: c.capacidad || '',
        estado: c.estado || '',
        monto_por_hora: c.monto_por_hora || '',
        imagen_cancha: c.imagen_cancha || '',
        id_espacio: c.id_espacio || ''
      });
      setImagePreview(c.imagen_cancha ? getImageUrl(c.imagen_cancha) : null);
      setSelectedFile(null);
      setDisciplinasSeleccionadas(c.disciplinas ? c.disciplinas.map(d => ({
        id_disciplina: d.id_disciplina,
        nombre: d.nombre,
        frecuencia_practica: d.frecuencia_practica || 'Regular'
      })) : []);
      setCurrentCancha(c);
      setEditMode(true);
      setViewMode(false);
      setModalOpen(true);
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.get(`/cancha-admin/dato-individual/${id}`, { params: extra });
      if (!r.data?.exito) { setError(r.data?.mensaje || 'No se pudo cargar'); return; }
      const c = r.data.datos?.cancha || {};
      setFormData({
        nombre: c.nombre || '',
        ubicacion: c.ubicacion || '',
        capacidad: c.capacidad || '',
        estado: c.estado || '',
        monto_por_hora: c.monto_por_hora || '',
        imagen_cancha: c.imagen_cancha || '',
        id_espacio: c.id_espacio || ''
      });
      setImagePreview(c.imagen_cancha ? getImageUrl(c.imagen_cancha) : null);
      setSelectedFile(null);
      setDisciplinasSeleccionadas(c.disciplinas ? c.disciplinas.map(d => ({
        id_disciplina: d.id_disciplina,
        nombre: d.nombre,
        frecuencia_practica: d.frecuencia_practica || 'Regular'
      })) : []);
      setCurrentCancha(c);
      setEditMode(false);
      setViewMode(true);
      setModalOpen(true);
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
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
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;
    try {
      let resp;
      const data = new FormData();
      const filtered = Object.fromEntries(
        Object.entries(formData).filter(([k, v]) => {
          const req = ['nombre', 'id_espacio'];
          if (req.includes(k)) return true;
          return v !== '' && v !== null && v !== undefined;
        })
      );
      Object.entries(filtered).forEach(([k, v]) => { if (k !== 'imagen_cancha') data.append(k, v); });
      if (selectedFile) data.append('imagen_cancha', selectedFile);
      if (role === 'ADMIN_ESP_DEP' && idAdminEspDep) data.append('id_admin_esp_dep', idAdminEspDep);

      if (filtered.nombre && filtered.nombre.length > 100) { setError('Nombre muy largo'); return; }
      if (filtered.ubicacion && filtered.ubicacion.length > 255) { setError('Ubicacion muy larga'); return; }
      if (filtered.capacidad && (isNaN(filtered.capacidad) || filtered.capacidad < 0)) { setError('Capacidad invalida'); return; }
      const estadosValidos = ['disponible','ocupada','mantenimiento'];
      if (filtered.estado && !estadosValidos.includes(filtered.estado)) { setError('Estado invalido'); return; }
      if (filtered.monto_por_hora && (isNaN(filtered.monto_por_hora) || filtered.monto_por_hora < 0)) { setError('Monto invalido'); return; }
      if (filtered.id_espacio && !espacios.some(e => e.id_espacio === parseInt(filtered.id_espacio))) { setError('Espacio invalido'); return; }

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editMode) {
        resp = await api.patch(`/cancha/${currentCancha.id_cancha}`, data, cfg);
        if (resp.data?.exito && disciplinasSeleccionadas.length > 0) {
          await api.post(`/cancha/${currentCancha.id_cancha}/disciplinas`, { id_admin_esp_dep: idAdminEspDep, disciplinas: disciplinasSeleccionadas }, cfg);
        }
      } else {
        resp = await api.post('/cancha/', data, cfg);
        if (resp.data?.exito && disciplinasSeleccionadas.length > 0) {
          const nuevaId = resp.data.datos?.cancha?.id_cancha;
          if (nuevaId) {
            await api.post(`/cancha/${nuevaId}/disciplinas`, { id_admin_esp_dep: idAdminEspDep, disciplinas: disciplinasSeleccionadas }, cfg);
          }
        }
      }
      if (resp.data?.exito) { closeModal(); fetchCanchas(); }
      else setError(resp.data?.mensaje || 'No se pudo guardar');
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message || 'Error de conexion');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  const handleDisciplinaChange = (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    if (disciplinasSeleccionadas.some(d => d.id_disciplina === id)) return;
    const d = disciplinas.find(x => x.id_disciplina === id);
    if (!d) return;
    setDisciplinasSeleccionadas(prev => [...prev, { id_disciplina: d.id_disciplina, nombre: d.nombre, frecuencia_practica: 'Regular' }]);
  };

  const handleFrecuenciaChange = (id_disciplina, frecuencia) => {
    setDisciplinasSeleccionadas(prev => prev.map(d => d.id_disciplina === id_disciplina ? { ...d, frecuencia_practica: frecuencia } : d));
  };

  const handleRemoveDisciplina = (id_disciplina) => {
    setDisciplinasSeleccionadas(prev => prev.filter(d => d.id_disciplina !== id_disciplina));
  };

  if (!role || (role === 'ADMIN_ESP_DEP' && !idAdminEspDep)) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Canchas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, ubicacion o espacio deportivo"
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
            <option value="estado">Por estado</option>
            <option value="monto">Por monto por hora</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear cancha
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
                  <th className="px-4 py-2 text-left">Ubicacion</th>
                  <th className="px-4 py-2 text-left">Capacidad</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Monto por hora</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {canchas.map((c, index) => (
                  <tr key={c.id_cancha} className="border-t">
                    <td className="px-4 py-2">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-2">{c.nombre}</td>
                    <td className="px-4 py-2">{c.ubicacion || '-'}</td>
                    <td className="px-4 py-2">{c.capacidad || '-'}</td>
                    <td className="px-4 py-2">{c.estado || '-'}</td>
                    <td className="px-4 py-2">{c.monto_por_hora ? `$${c.monto_por_hora}` : '-'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(c.id_cancha)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(c.id_cancha)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(c.id_cancha)}
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
              {viewMode ? 'Ver datos de cancha' : editMode ? 'Editar cancha' : 'Crear cancha'}
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
                <label className="block text-sm font-medium mb-1">Ubicacion</label>
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
                  className="w-full border rounded px-3 py-2 bg-gray-100"
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
                  <option value="disponible">disponible</option>
                  <option value="ocupada">ocupada</option>
                  <option value="mantenimiento">mantenimiento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monto por hora</label>
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
                <label className="block text-sm font-medium mb-1">Imagen cancha</label>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="imagen_cancha"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">Sin imagen</p>
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
                <label className="block text-sm font-medium mb-1">Espacio deportivo</label>
                <select
                  name="id_espacio"
                  value={formData.id_espacio}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un espacio</option>
                  {espacios.map(e => (
                    <option key={e.id_espacio} value={e.id_espacio}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Disciplinas</label>
                {viewMode ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {disciplinasSeleccionadas.map(d => (
                      <div key={d.id_disciplina} className="flex items-center justify-between p-2 border rounded">
                        <span className="flex-1">{d.nombre}</span>
                        <span>{d.frecuencia_practica}</span>
                      </div>
                    ))}
                    {disciplinasSeleccionadas.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-2">Sin disciplinas</p>
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
                      <option value="">Agregar disciplina</option>
                      {disciplinas
                        .filter(d => !disciplinasSeleccionadas.some(s => s.id_disciplina === d.id_disciplina))
                        .map(d => (
                          <option key={d.id_disciplina} value={d.id_disciplina}>
                            {d.nombre}
                          </option>
                        ))
                      }
                    </select>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {disciplinasSeleccionadas.map(d => (
                        <div key={d.id_disciplina} className="flex items-center justify-between p-2 border rounded">
                          <span className="flex-1">{d.nombre}</span>
                          <select
                            value={d.frecuencia_practica}
                            onChange={(e) => handleFrecuenciaChange(d.id_disciplina, e.target.value)}
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
                            onClick={() => handleRemoveDisciplina(d.id_disciplina)}
                            className="text-red-500 hover:text-red-700 ml-2"
                            disabled={viewMode}
                          >
                            x
                          </button>
                        </div>
                      ))}
                      {disciplinasSeleccionadas.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-2">Sin disciplinas</p>
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

export default CanchaAdmin;
