/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiMoreVertical, FiX } from 'react-icons/fi';

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
      else if (r && typeof r === 'object') ['rol', 'role', 'nombre', 'name'].forEach(k => { if (r[k]) bag.add(r[k]); });
    }
    if (bag.size === 0 && u?.role) bag.add(u.role);
  } catch { }
  const tok = localStorage.getItem('token');
  if (bag.size === 0 && tok && tok.split('.').length === 3) {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const t = Array.isArray(payload?.roles) ? payload.roles : (payload?.rol ? [payload.rol] : []);
      t.forEach(v => bag.add(v));
    } catch { }
  }
  const norm = Array.from(bag).map(v => String(v || '').trim().toUpperCase().replace(/\s+/g, '_'));
  const map = v => v === 'ADMIN' ? 'ADMINISTRADOR' : v;
  const norm2 = norm.map(map);
  const prio = ['ADMINISTRADOR', 'CONTROL', 'ADMIN_ESP_DEP'];
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
  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
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

  const handleDelete = (resena) => {
    setDeleteUser(resena);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;

    if (!permissions.canDelete) {
      setError('No tienes permisos para eliminar reseñas');
      return;
    }

    try {
      const response = await api.delete(`/resena/${deleteUser.id_resena}`);

      if (response.data.exito) {
        setDeleteOpen(false);
        setDeleteUser(null);
        fetchResenas();
      } else {
        setError(response.data.mensaje || 'No se pudo eliminar');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteUser(null);
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
    setModalError(null);
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
        const mensajeError = r.data.mensaje || "No se pudo guardar";
        setModalError(mensajeError);  // Mostrar el mensaje de error del backend
        setTimeout(() => {
          setModalError(null);
        }, 5000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setModalError(errorMessage); // Mostramos el mensaje amigable desde el servidor
      setTimeout(() => {
        setModalError(null);
      }, 5000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestión de Reseñas</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha o comentario"
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
            />
            <button
              type="submit"
              className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full"
            >
              Buscar
            </button>
          </form>
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
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
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              <span>Crear Reseña</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando resenas...</p>
      ) : error ? (
        <p className="text-red-500 mt-3">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Estrellas</th>
                  <th className="px-4 py-2 text-left">Comentario</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {resenas.map((resena, index) => (
                  <tr key={resena.id_resena} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">{`${resena.cliente_nombre} ${resena.cliente_apellido}`}</td>
                    <td className="px-4 py-3">{resena.cancha_nombre}</td>
                    <td className="px-4 py-3">{resena.estrellas}</td>
                    <td className="px-4 py-3">{resena.comentario || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs border ${resena.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {resena.verificado ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(resena.id_resena)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(resena.id_resena)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(resena)}
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
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {resenas.map((resena, index) => (
              <div
                key={resena.id_resena}
                className="border bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">

                  {/* INFORMACIÓN PRINCIPAL */}
                  <div>
                    {/* CLIENTE */}
                    <div className="font-bold text-[#23475F]">
                      {resena.cliente_nombre} {resena.cliente_apellido}
                    </div>

                    {/* NUMERO */}
                    <div className="text-xs text-gray-500">
                      Reseña #{(page - 1) * limit + index + 1}
                    </div>

                    {/* DETALLES */}
                    <div className="mt-3 text-sm space-y-1">

                      <div>
                        <span className="font-semibold">Cancha: </span>
                        {resena.cancha_nombre}
                      </div>

                      <div>
                        <span className="font-semibold">Estrellas: </span>
                        <span className="inline-block text-[#efb810]">
                          {"★".repeat(Number(resena.estrellas) || 0)}
                          {"☆".repeat(5 - (Number(resena.estrellas) || 0))}
                        </span>
                      </div>

                      <div>
                        <span className="font-semibold">Comentario: </span>
                        {resena.comentario
                          ? resena.comentario.substring(0, 50) +
                          (resena.comentario.length > 50 ? "..." : "")
                          : "-"}
                      </div>

                      <div>
                        <span className="font-semibold">Verificado: </span>
                        {resena.verificado ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            Si
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                            No
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN OPCIONES */}
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(resena)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>

                </div>
              </div>
            ))}

            {/* PAGINACION SOLO MOVIL */}
            <div className="md:hidden w-full flex justify-center items-center gap-3 py-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Anterior
              </button>

              <div className="px-4 py-2 bg-gray-100 rounded-full text-sm">
                Pag {page} de {Math.ceil(total / limit) || 1}
              </div>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === Math.ceil(total / limit)}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>

          {/* PAGINACION STICKY */}
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-50 mt-6">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} de {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit)}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">
                {viewMode ? 'Ver datos de reseña' : editMode ? 'Editar reseña' : 'Crear reseña'}
              </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  disabled={viewMode}
                  required
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#23475F]"
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map(r => (
                    <option key={r.id_reserva} value={r.id_reserva}>
                      #{r.id_reserva} - {r.cliente_nombre} {r.cliente_apellido} ({r.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>

              {/* ESTRELLAS */}
              <div>
                <label className="block text-sm font-semibold mb-1">Estrellas</label>
                <input
                  name="estrellas"
                  value={formData.estrellas}
                  onChange={handleInputChange}
                  type="number"
                  min="1"
                  max="5"
                  disabled={viewMode}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#23475F]"
                  required
                />
              </div>

              {/* FECHA (SOLO EDICIÓN) */}
              {editMode && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Fecha creación</label>
                  <input
                    name="fecha_creacion"
                    value={formData.fecha_creacion}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-100"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Fecha automática asignada por el sistema</p>
                </div>
              )}

              {/* COMENTARIO */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Comentario</label>
                <textarea
                  name="comentario"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  disabled={viewMode}
                  rows="3"
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#23475F]"
                />
              </div>

              <div className="md:col-span-2 flex md:flex-row gap-6 md:gap-12 mt-1">
                <div>
                  <label className="block text-sm font-semibold mb-2">Estado</label>
                  <div className="relative inline-flex items-center cursor-pointer"
                    onClick={() => !viewMode && setFormData(p => ({ ...p, estado: !p.estado }))}>
                    <input type="checkbox" checked={formData.estado} onChange={handleInputChange} className="sr-only" />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${formData.estado ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition duration-300 ${formData.estado ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="ml-3 text-sm">{formData.estado ? 'Activo' : 'Inactivo'}</span>
                </div>

                {/* VERIFICADO */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Verificado</label>
                  <div className="relative inline-flex items-center cursor-pointer"
                    onClick={() => !viewMode && setFormData(p => ({ ...p, verificado: !p.verificado }))}>
                    <input type="checkbox" checked={formData.verificado} className="sr-only" />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${formData.verificado ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition duration-300 ${formData.verificado ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="ml-3 text-sm">{formData.verificado ? 'Sí' : 'No'}</span>
                </div>
              </div>
              <div className="md:col-span-2 border-t pt-4 mt-4">
              {modalError && (
                  <div className="bg-red-100 text-red-600 p-3 mb-4 rounded-md text-sm">
                  {modalError}
                </div>
              )}
              </div>
              <div className="md:col-span-2 flex justify-end mt-1 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-md font-medium"
                >
                  Cerrar
                </button>

                {!viewMode && (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#23475F] hover:bg-[#1c3345] text-white rounded-full text-md font-medium"
                  >
                    {editMode ? 'Actualizar' : 'Crear'}
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>
      )}

      {mobileModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-72 p-5 shadow-xl animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#23475F] text-lg">Opciones</h3>
              <button onClick={() => setMobileModal(null)}>
                <FiX size={20} />
              </button>
            </div>

            <div className="flex flex-col text-md">
              {/* Ver datos del control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_resena); // Abre el modal para ver datos del control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              {/* Editar control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_resena); // Abre el modal para editar control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
              </button>

              {/* Eliminar control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);  // Abre el modal de eliminación
                  setDeleteUser(mobileModal); // Establece el control a eliminar
                }}
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
              >
                Eliminar
              </button>

              {/* Cancelar opción */}
              <button
                onClick={() => setMobileModal(null)}
                className="px-3 py-2 text-left text-gray-700 hover:bg-gray-100 mt-1 rounded"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteOpen && deleteUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">

            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Eliminar reseña
            </h3>
            <p className="text-gray-700 text-md">
              ¿Estás seguro de eliminar <span className="font-bold">#{deleteUser.id_resena} {deleteUser.cliente_nombre} {deleteUser.cliente_apellido}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              {/* Botón de cancelar */}
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

              {/* Botón de eliminar */}
              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-full text-md font-medium hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Resena;
