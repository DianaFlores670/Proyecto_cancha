/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { FiMoreVertical, FiX } from 'react-icons/fi';

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
  ADMIN_ESP_DEP: { canView: true, canEdit: true, canDelete: true },
  DEFAULT: { canView: false, canEdit: false, canDelete: false },
};

const ResenaAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [currentResena, setCurrentResena] = useState(null);
  const [formData, setFormData] = useState({
    estrellas: '',
    comentario: '',
    estado: false,
    verificado: false
  });
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const canchaId = params.get('cancha'); // 👈 obtiene el id_cancha desde la URL si existe


  const limit = 10;

  useEffect(() => {
    const u = readUser();
    const p = readTokenPayload();
    const r = pickRole(u, p);
    setRole(r);
    const idGuess = resolveAdminId(u, p);
    setIdAdminEspDep(idGuess);
  }, []);

  const permissions = permissionsConfig[role || 'DEFAULT'] || permissionsConfig.DEFAULT;

  // === CARGAR RESEÑAS ===
  const fetchResenas = async (params = {}) => {
    if (!permissions.canView) {
      setError('No tienes permisos para ver reseñas');
      return;
    }

    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;

    // ✅ parámetros base: id_admin_esp_dep y paginación
    const fullParams = {
      ...params,
      limit,
      offset,
      id_admin_esp_dep: idAdminEspDep
    };

    // ✅ si hay una cancha en la URL, la añadimos
    if (canchaId) fullParams.id_cancha = canchaId;

    try {
      let r;

      // 🔹 Buscar reseñas
      if (params.q) {
        r = await api.get('/resena-admin/buscar', { params: fullParams });
      }

      // 🔹 Filtrar reseñas (verificado, cancha, cliente, etc.)
      else if (params.tipo) {
        r = await api.get('/resena-admin/filtro', { params: fullParams });
      }

      // 🔹 Datos normales (todas las reseñas)
      else {
        r = await api.get('/resena-admin/datos-especificos', { params: fullParams });
      }

      // ✅ respuesta
      if (r.data?.exito) {
        setResenas(r.data.datos.resenas || []);
        setTotal(r.data.datos.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || 'Error al cargar reseñas');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (role && idAdminEspDep) fetchResenas({ id_cancha: canchaId });
  }, [role, idAdminEspDep, page, canchaId]);


  const handleSearch = (e) => {
    e.preventDefault();
    const baseParams = canchaId ? { id_cancha: canchaId } : {};
    if (searchTerm.trim()) fetchResenas({ q: searchTerm, ...baseParams });
    else fetchResenas(baseParams);
  };


  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    const baseParams = canchaId ? { id_cancha: canchaId } : {};
    if (tipo) fetchResenas({ tipo, ...baseParams });
    else fetchResenas(baseParams);
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
      const response = await api.delete(`/resena-admin/${deleteUser.id_resena}`, { params: { id_admin_esp_dep: idAdminEspDep } });

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

  /*const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar esta reseña?')) return;
    try {
      const r = await api.delete(`/resena-admin/${id}`, { params: { id_admin_esp_dep: idAdminEspDep } });
      if (r.data?.exito) fetchResenas();
      else setError(r.data?.mensaje || 'No se pudo eliminar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };*/

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/resena-admin/dato-individual/${id}`, { params: { id_admin_esp_dep: idAdminEspDep } });
      if (r.data?.exito) {
        const x = r.data.datos?.resena || {};
        setFormData({
          estrellas: x.estrellas || '',
          comentario: x.comentario || '',
          estado: x.estado || false,
          verificado: x.verificado || false
        });
        setCurrentResena(x);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else setError(r.data?.mensaje || 'No se pudo cargar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const r = await api.get(`/resena-admin/dato-individual/${id}`, { params: { id_admin_esp_dep: idAdminEspDep } });
      if (r.data?.exito) {
        const x = r.data.datos?.resena || {};
        setFormData({
          estrellas: x.estrellas || '',
          comentario: x.comentario || '',
          estado: x.estado || false,
          verificado: x.verificado || false
        });
        setCurrentResena(x);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else setError(r.data?.mensaje || 'No se pudo cargar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
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
    if (!permissions.canEdit || viewMode) return;
    try {
      const payload = {
        estrellas: Number(formData.estrellas),
        comentario: formData.comentario || null,
        estado: !!formData.estado,
        verificado: !!formData.verificado
      };
      const r = await api.patch(`/resena-admin/${currentResena.id_resena}`, payload, { params: { id_admin_esp_dep: idAdminEspDep } });
      if (r.data?.exito) { closeModal(); fetchResenas(); }
      else {
        const mensajeError = r.data.mensaje || "No se pudo guardar";
        setModalError(mensajeError);  // Mostrar el mensaje de error del backend
        setTimeout(() => {
          setModalError(null);
        }, 5000);
      }
    } catch (e) {
      const errorMessage = e.response?.data?.mensaje || 'Error de conexión al servidor';
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
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Gestion de Reseñas {canchaId ? `(Cancha #${canchaId})` : '(Todas las canchas)'}
      </h2>
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
            <button type="submit" className="bg-[#23475F] text-white px-6 text-md font-medium rounded-full">
              Buscar
            </button>
          </form>
          <select value={filtro} onChange={handleFiltroChange} className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md">
            <option value="">Todos - sin filtro</option>
            <option value="cliente_nombre">Ordenar por cliente</option>
            <option value="cancha_nombre">Ordenar por cancha</option>
            <option value="verificado_si">Solo verificadas</option>
            <option value="verificado_no">Solo no verificadas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando reseñas...</p>
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
                {resenas.map((x, i) => (
                  <tr key={x.id_resena} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">{`${x.cliente_nombre} ${x.cliente_apellido}`}</td>
                    <td className="px-4 py-3">{x.cancha_nombre}</td>
                    <td className="px-4 py-3">{x.estrellas}</td>
                    <td className="px-4 py-3">{x.comentario || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs border ${x.verificado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {x.verificado ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button onClick={() => openViewModal(x.id_resena)} className="text-green-500 hover:text-green-700">
                          Ver
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button onClick={() => openEditModal(x.id_resena)} className="text-blue-500 hover:text-blue-700">
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button onClick={() => handleDelete(x)} className="text-red-500 hover:text-red-700">
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
              {viewMode ? 'Ver reseña' : 'Editar reseña'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Estrellas</label>
                <input
                  name="estrellas"
                  value={formData.estrellas}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#23475F]"
                  type="number"
                  min="1"
                  max="5"
                  required
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Comentario</label>
                <textarea
                  name="comentario"
                  value={formData.comentario}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-[#23475F]"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <label className="flex items-center space-x-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="estado"
                    checked={formData.estado}
                    onChange={handleInputChange}
                    disabled={viewMode}
                    className="form-checkbox text-[#23475F] focus:ring-2 focus:ring-[#23475F]"
                  />
                  <span>Activo</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    name="verificado"
                    checked={formData.verificado}
                    onChange={handleInputChange}
                    disabled={viewMode}
                    className="form-checkbox text-[#23475F] focus:ring-2 focus:ring-[#23475F]"
                  />
                  <span>Verificado</span>
                </label>
              </div>

              {/* Sección de errores */}
              <div className="md:col-span-2 border-t pt-4 mt-4">
                {modalError && (
                  <div className="bg-red-100 text-red-600 p-3 mb-4 rounded-md text-sm">
                    {modalError}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="md:col-span-2 flex justify-end mt-1 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-md font-medium"
                >
                  Cerrar
                </button>
                {!viewMode && (
                  <button type="submit" className="px-5 py-2 bg-[#23475F] hover:bg-[#1c3345] text-white rounded-full text-md font-medium">
                    Actualizar
                  </button>
                )}
              </div>
            </form>
            {error && <p className="text-red-500 mt-4">{error}</p>}
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

export default ResenaAdmin;
