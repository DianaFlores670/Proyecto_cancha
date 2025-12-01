/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { FiMoreVertical, FiX } from 'react-icons/fi';

const norm = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '_');

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const readTokenPayload = () => {
  try {
    const t = localStorage.getItem('token');
    if (!t || t.split('.').length !== 3) return {};
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b.length % 4)) % 4);
    return JSON.parse(atob(b + pad));
  } catch {
    return {};
  }
};

const pickRole = (u, p) => {
  const bag = new Set();
  const arr = Array.isArray(u?.roles) ? u.roles : (u?.role ? [u.role] : []);
  arr.forEach((r) =>
    bag.add(norm(typeof r === 'string' ? r : r?.rol || r?.role || r?.nombre || r?.name))
  );
  const parr = Array.isArray(p?.roles) ? p.roles : (p?.rol ? [p.rol] : []);
  parr.forEach((r) => bag.add(norm(r)));
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
  ADMIN_ESP_DEP: { canView: true, canEdit: true },
  DEFAULT: { canView: false, canEdit: false },
};

const truncate = (text, max = 40) => {
  if (!text) return '-';
  const s = String(text);
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
};

const Reporte_incidenciaAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileModal, setMobileModal] = useState(null);
  const [currentReporte, setCurrentReporte] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [verificadoLocal, setVerificadoLocal] = useState(false);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const canchaId = params.get('cancha');
  const limit = 10;

  useEffect(() => {
    const u = readUser();
    const p = readTokenPayload();
    const r = pickRole(u, p);
    const idGuess = resolveAdminId(u, p);

    setRole(r);
    setIdAdminEspDep(idGuess);
  }, []);


  const permissions = permissionsConfig[role || 'DEFAULT'] || permissionsConfig.DEFAULT;

  const fetchIncidencias = async (extraParams = {}) => {
    if (!permissions.canView) {
      setError('No tienes permisos para ver incidencias');
      return;
    }
    if (!idAdminEspDep) return;

    setLoading(true);
    setError('');
    const offset = (page - 1) * limit;

    const baseParams = {
      id_admin_esp_dep: idAdminEspDep,
      limit,
      offset,
    };

    if (canchaId) baseParams.id_cancha = canchaId;

    const fullParams = { ...baseParams, ...extraParams };

    try {
      let r;
      if (extraParams.q) {
        r = await api.get('/reporte-incidencia-admin/buscar', { params: fullParams });
      } else if (extraParams.tipo) {
        r = await api.get('/reporte-incidencia-admin/filtro', { params: fullParams });
      } else {
        r = await api.get('/reporte-incidencia-admin/datos-especificos', { params: fullParams });
      }

      if (r.data?.exito) {
        const d = r.data.datos || {};
        setIncidencias(d.incidencias || []);
        setTotal(d.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || 'Error al cargar incidencias');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role && idAdminEspDep) {
      const baseParams = canchaId ? { id_cancha: canchaId } : {};
      fetchIncidencias(baseParams);
    }
  }, [role, idAdminEspDep, page, canchaId]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    const baseParams = canchaId ? { id_cancha: canchaId } : {};
    if (searchTerm.trim()) {
      fetchIncidencias({ q: searchTerm.trim(), ...baseParams });
    } else {
      fetchIncidencias(baseParams);
    }
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    const baseParams = canchaId ? { id_cancha: canchaId } : {};
    if (tipo) {
      fetchIncidencias({ tipo, ...baseParams });
    } else {
      fetchIncidencias(baseParams);
    }
  };

  const handleToggleVerificado = async (rep) => {
    if (!permissions.canEdit) return;
    try {
      const payload = { verificado: !rep.verificado };
      const r = await api.patch(
        `/reporte-incidencia-admin/${rep.id_reporte}`,
        payload,
        { params: { id_admin_esp_dep: idAdminEspDep } }
      );
      if (r.data?.exito) {
        const baseParams = canchaId ? { id_cancha: canchaId } : {};
        fetchIncidencias(baseParams);
      } else {
        const mensajeError = r.data.mensaje || "No se pudo guardar";
        setError(mensajeError);  // Mostrar el mensaje de error del backend
        setTimeout(() => {
          setError(null);
        }, 5000);
      }
    } catch (e) {
      const errorMessage = e.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage); // Mostramos el mensaje amigable desde el servidor
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const r = await api.get(`/reporte-incidencia-admin/dato-individual/${id}`, {
        params: { id_admin_esp_dep: idAdminEspDep },
      });
      if (r.data?.exito) {
        const x = r.data.datos?.incidencia || {};
        setCurrentReporte(x);
        setViewData(x);
        setVerificadoLocal(!!x.verificado);
        setModalOpen(true);
      } else {
        setError(r.data?.mensaje || 'No se pudo cargar el reporte');
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentReporte(null);
    setViewData(null);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
      setPage(newPage);
    }
  };

  if (!role) return <p>Cargando permisos...</p>;

  if (!permissions.canView) {
    return <p>No tienes permisos para ver incidencias.</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Gestion de incidencias {canchaId ? `(Cancha #${canchaId})` : '(Todas las canchas)'}
      </h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por encargado, cliente, cancha o texto"
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
            <option value="">Todos sin filtro</option>
            <option value="encargado_nombre">Ordenar por encargado</option>
            <option value="cliente_nombre">Ordenar por cliente</option>
            <option value="cancha_nombre">Ordenar por cancha</option>
            <option value="verificado_si">Solo verificados</option>
            <option value="verificado_no">Solo no verificados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando incidencias...</p>
      ) : error ? (
        <p className="text-red-500 mt-3">{error}</p>
      ) : (
        <>
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Encargado</th>
                  <th className="px-4 py-2 text-left">Detalle</th>
                  <th className="px-4 py-2 text-left">Sugerencia</th>
                  <th className="px-4 py-2 text-left">Reserva</th>
                  <th className="px-4 py-2 text-left">Cancha</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {incidencias.map((x, i) => (
                  <tr key={x.id_reporte} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3">
                      {x.encargado_nombre || x.encargado_apellido
                        ? `${x.encargado_nombre || ''} ${x.encargado_apellido || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">{truncate(x.detalle, 35)}</td>
                    <td className="px-4 py-3">{truncate(x.sugerencia, 35)}</td>
                    <td className="px-4 py-3">{x.id_reserva ? `#${x.id_reserva}` : '-'}</td>
                    <td className="px-4 py-3">{x.cancha_nombre || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'px-3 py-1 rounded-full text-xs border ' +
                          (x.verificado
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800')
                        }
                      >
                        {x.verificado ? 'Si' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button
                        onClick={() => openViewModal(x.id_reporte)}
                        className="text-green-500 hover:text-green-700"
                      >
                        Ver
                      </button>
                      {permissions.canEdit && (
                        <button
                          onClick={() => handleToggleVerificado(x)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Cambiar verificado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {incidencias.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {incidencias.map((rep, index) => (
              <div key={rep.id_reporte} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">

                  {/* Datos principales del reporte */}
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {rep.cliente_nombre} {rep.cliente_apellido}
                    </div>

                    <div className="text-xs text-gray-500">
                      Reporte #{(page - 1) * limit + index + 1}
                    </div>

                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Cancha: </span>
                        {rep.cancha_nombre}
                      </div>

                      <div>
                        <span className="font-semibold">Encargado: </span>
                        {rep.encargado_nombre} {rep.encargado_apellido}
                      </div>

                      <div>
                        <span className="font-semibold">Verificado: </span>
                        {rep.verificado ? (
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
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(rep)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* PAGINACIÓN SOLO MÓVIL */}
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
                disabled={page === Math.ceil(total / limit) || total === 0}
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
              Pag {page} de {Math.ceil(total / limit) || 1}
            </span>
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
      {modalOpen && viewData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Detalle de incidencia
                </h3>
              </div>
              {/* ID del reporte alineado a la derecha */}
              <div className="flex items-center gap-2">
                {viewData.id_reporte && (
                  <span className="inline-flex items-center rounded-full bg-[#E0F2FE] px-3 py-1 text-xs font-semibold text-[#0369A1]">
                    ID {viewData.id_reporte}
                  </span>
                )}
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Información de encargado, cliente, reserva y cancha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Encargado
                  </p>
                  <p className="text-[#0F172A]">
                    {viewData.encargado_nombre || viewData.encargado_apellido
                      ? `${viewData.encargado_nombre || ''} ${viewData.encargado_apellido || ''}`.trim()
                      : '-'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Cliente
                  </p>
                  <p className="text-[#0F172A]">
                    {viewData.cliente_nombre || viewData.cliente_apellido
                      ? `${viewData.cliente_nombre || ''} ${viewData.cliente_apellido || ''}`.trim()
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Reserva
                  </p>
                  <p className="text-[#0F172A]">
                    {viewData.id_reserva ? `#${viewData.id_reserva}` : '-'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
                    Cancha
                  </p>
                  <p className="text-[#0F172A]">
                    {viewData.cancha_nombre || '-'}
                  </p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                    Detalle
                  </p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-[#0F172A] text-sm">
                    {viewData.detalle || '-'}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1">
                    Sugerencia
                  </p>
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F9FAFB] px-3 py-2 text-[#0F172A] text-sm">
                    {viewData.sugerencia || '-'}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-default text-sm text-[#0F172A]">
                  <input
                    disabled
                    type="checkbox"
                    checked={viewData.verificado || false}
                    className="h-4 w-4 rounded border-[#CBD5E1] text-[#16A34A] focus:ring-[#16A34A]"
                  />
                  <span>Verificado</span>
                </label>
              </div>
              {error && (
                <p className="text-xs text-red-500 mt-1">
                  {error}
                </p>
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
            </div>
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
                  setMobileModal(null); // Cerrar el modal de opciones
                  openViewModal(mobileModal.id_reporte); // Abre el modal para ver datos del control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              {/* Cambiar verificado */}
              <button
                onClick={() => {
                  handleToggleVerificado(mobileModal); // Cambiar verificado para la incidencia actual
                  setMobileModal(null); // Cerrar el modal de opciones
                }}
                className="text-blue-500 hover:text-blue-700 hover:bg-gray-100 px-3 py-2 text-left"
              >
                Cambiar verificado
              </button>

              {/* Cancelar */}
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
    </div>
  );
};

export default Reporte_incidenciaAdmin;
