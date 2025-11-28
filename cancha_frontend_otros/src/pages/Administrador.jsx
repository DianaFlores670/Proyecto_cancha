/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiMoreVertical, FiX } from 'react-icons/fi';

const permissionsConfig = {
  ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
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
      else if (r && typeof r === 'object') {
        ['rol', 'role', 'nombre', 'name'].forEach(k => { if (r[k]) bag.add(r[k]); });
      }
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
  const prio = ['ADMINISTRADOR'];
  return prio.find(r => norm2.includes(r) && keys.includes(r)) || norm2.find(r => keys.includes(r)) || 'DEFAULT';
};

const Administrador = () => {
  const [administradores, setAdministradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileModal, setMobileModal] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    usuario: '',
    direccion: '',
    estado: true,
    ultimo_login: '',
    contrasena: '',
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

  useEffect(() => { setError(null); }, [role]);

  const permissions = role && permissionsConfig[role] ? permissionsConfig[role] : permissionsConfig.DEFAULT;

  const fetchAdministradores = async (params = {}) => {
    if (!permissions.canView) {
      setError('No tienes permisos para ver los administradores');
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get('/administrador/buscar', { params: fullParams });
      } else if (params.tipo) {
        response = await api.get('/administrador/filtro', { params: fullParams });
      } else {
        response = await api.get('/administrador/datos-especificos', { params: fullParams });
      }
      if (response.data.exito) {
        setAdministradores(response.data.datos.administradores);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje || 'Error al cargar administradores');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexion al servidor';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) fetchAdministradores();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) fetchAdministradores({ q: searchTerm });
    else fetchAdministradores();
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchAdministradores({ tipo });
    else fetchAdministradores();
  };

  const handleDelete = (admin) => {
    setDeleteUser(admin);
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleteUser) return;

    try {
      const response = await api.delete(`/administrador/${deleteUser.id_administrador}`);
      if (response.data.exito) {
        setDeleteOpen(false);
        setDeleteUser(null);
        fetchAdministradores(); // Recargar la lista de administradores después de eliminar
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
      nombre: '',
      apellido: '',
      correo: '',
      usuario: '',
      direccion: '',
      estado: true,
      ultimo_login: '',
      contrasena: '',
    });
    setCurrentAdmin(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/administrador/dato-individual/${id}`);
      if (response.data.exito) {
        const admin = response.data.datos.administrador;
        setFormData({
          nombre: admin.nombre || '',
          apellido: admin.apellido || '',
          correo: admin.correo || '',
          usuario: admin.usuario || '',
          direccion: admin.direccion || '',
          estado: admin.estado !== undefined ? admin.estado : true,
          ultimo_login: admin.ultimo_login || '',
          contrasena: '',
        });
        setCurrentAdmin(admin);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || 'No se pudo cargar el administrador');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexion al servidor';
      setError(errorMessage);
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/administrador/dato-individual/${id}`);
      if (response.data.exito) {
        const admin = response.data.datos.administrador;
        setFormData({
          nombre: admin.nombre || '',
          apellido: admin.apellido || '',
          correo: admin.correo || '',
          usuario: admin.usuario || '',
          direccion: admin.direccion || '',
          estado: admin.estado !== undefined ? admin.estado : true,
          ultimo_login: admin.ultimo_login || '',
          contrasena: '',
        });
        setCurrentAdmin(admin);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || 'No se pudo cargar el administrador');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexion al servidor';
      setError(errorMessage);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentAdmin(null);
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
  if (viewMode || (!permissions.canCreate && !editMode) || (!permissions.canEdit && editMode)) return;

  try {
    let response;
    const filteredData = Object.fromEntries(
      Object.entries(formData).filter(([key, value]) => {
        const requiredFields = ['nombre', 'apellido', 'correo', 'usuario', 'contrasena'];
        if (editMode && ['usuario', 'contrasena'].includes(key)) return false;
        if (requiredFields.includes(key)) return true;
        return value !== '' && value !== null && value !== undefined;
      })
    );

    if (editMode) {
      response = await api.patch(`/administrador/${currentAdmin.id_administrador}`, filteredData);
    } else {
      response = await api.post('/administrador/', filteredData);
    }

    if (response.data.exito) {
      closeModal();
      fetchAdministradores();
    } else {
      // Aquí manejamos el mensaje de error
      const mensajeError = response.data.mensaje || "No se pudo guardar";
      setModalError(mensajeError);  // Mostrar el mensaje de error del backend
      setTimeout(() => {
        setModalError(null);
      }, 5000);
    }
  } catch (err) {
    // Aquí capturamos los errores específicos del backend
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

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestión de Administradores</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido, correo o dirección"
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
              disabled={!permissions.canView}
            />
            <button
              type="submit"
              className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full"
              disabled={!permissions.canView}
            >
              Buscar
            </button>
          </form>
          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
            disabled={!permissions.canView}
          >
            <option value="">Todos</option>
            <option value="nombre">Ordenar por nombre</option>
            <option value="fecha">Ordenar por fecha</option>
            <option value="correo">Ordenar por correo</option>
          </select>
          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              Crear Administrador
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando administradores...</p>
      ) : error ? (
        <p className="text-red-500 mt-3">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Apellido</th>
                  <th className="px-4 py-2 text-left">Correo</th>
                  <th className="px-4 py-2 text-left">Dirección</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {administradores.map((admin, index) => (
                  <tr key={admin.id_administrador} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                    <td className="px-4 py-3">{admin.nombre}</td>
                    <td className="px-4 py-3">{admin.apellido}</td>
                    <td className="px-4 py-3">{admin.correo}</td>
                    <td className="px-4 py-3">{admin.direccion || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs border ${admin.estado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {admin.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(admin.id_administrador)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(admin.id_administrador)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(admin)} // Llama a la función handleDelete y pasa el admin
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
            {administradores.map((admin, index) => (
              <div key={admin.id_administrador} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {admin.nombre} {admin.apellido}
                    </div>
                    <div className="text-xs text-gray-500">
                      Usuario #{(page - 1) * limit + index + 1}
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Correo: </span>
                        {admin.correo}
                      </div>
                      <div>
                        <span className="font-semibold">Direccion: </span>
                        {admin.direccion}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(admin)}>
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
            <div className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} de {Math.ceil(total / limit) || 1}
            </div>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit) || total === 0}
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
              {viewMode ? 'Ver Datos de Administrador' : editMode ? 'Editar Administrador' : 'Crear Administrador'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre</label>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Apellido</label>
                <input
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Correo</label>
                <input
                  name="correo"
                  value={formData.correo}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="email"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Usuario</label>
                <input
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required={!editMode && !viewMode}
                  disabled={editMode || viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Direccion</label>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-3">Estado</label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, estado: !prev.estado }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${formData.estado ? 'bg-green-500' : 'bg-gray-300'}`}
                    disabled={viewMode}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.estado ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {formData.estado ? (
                      <span className="text-green-600 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Activo
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        Inactivo
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Ultimo Login</label>
                <input
                  name="ultimo_login"
                  value={formData.ultimo_login ? new Date(formData.ultimo_login).toLocaleString() : 'Nunca'}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  readOnly
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Campo automático</p>
              </div>
              {editMode && !viewMode && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Contraseña</label>
                  <input
                    name="contrasena"
                    value={formData.contrasena}
                    onChange={handleInputChange}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    type="password"
                    disabled={viewMode}
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional</p>
                </div>
              )}
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
                  className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
                >
                  Cerrar
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#23475F] text-white rounded-full text-md font-medium hover:bg-[#1d3a4e]"
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
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_administrador); // Cambia openView por el que uses
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_administrador); // Cambia openEdit por el que uses
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);  // Abre el modal de eliminación
                  setDeleteUser(mobileModal); // Establece el usuario a eliminar
                }}
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
              >
                Eliminar
              </button>

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
              Eliminar administrador
            </h3>
            <p className="text-gray-700 text-md">
              ¿Estás seguro de eliminar a <span className="font-bold">{deleteUser.nombre} {deleteUser.apellido}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

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

export default Administrador;