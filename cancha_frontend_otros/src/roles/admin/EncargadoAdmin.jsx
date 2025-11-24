import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

// normalizador
const norm = (v) => String(v || '').trim().toUpperCase().replace(/\s+/g, '_');

// leer usuario
const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
};

// leer token
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

// rol
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

// obtener id admin
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

// permisos
const permissionsConfig = {
    ADMIN_ESP_DEP: { canView: true, canEdit: true },
    DEFAULT: { canView: false, canEdit: false },
};

// truncador
const truncate = (text, max = 40) => {
    if (!text) return '-';
    const s = String(text);
    if (s.length <= max) return s;
    return s.slice(0, max) + '...';
};

const formatDateDdMmYyyy = (value) => {
    if (!value) return '';
    if (value instanceof Date) {
        const yyyy = value.getFullYear();
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        const dd = String(value.getDate()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}`;
    }
    const s = String(value);
    if (s.length < 10) return '';
    const part = s.slice(0, 10);
    const parts = part.split('-');
    if (parts.length !== 3) return '';
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];
    if (!yyyy || !mm || !dd) return '';
    return `${dd}/${mm}/${yyyy}`;
};


const EncargadoAdmin = () => {
    const [role, setRole] = useState(null);
    const [idAdminEspDep, setIdAdminEspDep] = useState(null);
    const [encargados, setEncargados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filtro, setFiltro] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [currentEncargado, setCurrentEncargado] = useState(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const canchaId = params.get('cancha');

    const limit = 10;

    // inicializar permisos
    useEffect(() => {
        const u = readUser();
        const p = readTokenPayload();
        const r = pickRole(u, p);
        const idGuess = resolveAdminId(u, p);

        setRole(r);
        setIdAdminEspDep(idGuess);
    }, []);

    const permissions = permissionsConfig[role || 'DEFAULT'] || permissionsConfig.DEFAULT;

    // obtener encargados
    const fetchEncargados = async (extraParams = {}) => {
        if (!permissions.canView) {
            setError('No tienes permisos');
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
                r = await api.get('/encargado-admin/buscar', { params: fullParams });
            } else if (extraParams.tipo) {
                r = await api.get('/encargado-admin/filtro', { params: fullParams });
            } else {
                r = await api.get('/encargado-admin/datos-especificos', { params: fullParams });
            }

            if (r.data?.exito) {
                const d = r.data.datos || {};
                setEncargados(d.encargados || []);
                setTotal(d.paginacion?.total || 0);
            } else {
                setError(r.data?.mensaje || 'Error al cargar');
            }
        } catch (e) {
            setError(e.response?.data?.mensaje || 'Error de conexion');
        } finally {
            setLoading(false);
        }
    };

    // recarga cada vez que cambie
    useEffect(() => {
        if (role && idAdminEspDep) {
            fetchEncargados(canchaId ? { id_cancha: canchaId } : {});
        }
    }, [role, idAdminEspDep, page, canchaId]);

    // buscar
    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        const baseParams = canchaId ? { id_cancha: canchaId } : {};

        if (searchTerm.trim()) {
            fetchEncargados({ q: searchTerm.trim(), ...baseParams });
        } else {
            fetchEncargados(baseParams);
        }
    };

    // filtro
    const handleFiltroChange = (e) => {
        const tipo = e.target.value;
        setFiltro(tipo);
        setPage(1);
        const baseParams = canchaId ? { id_cancha: canchaId } : {};

        if (tipo) {
            fetchEncargados({ tipo, ...baseParams });
        } else {
            fetchEncargados(baseParams);
        }
    };

    // abrir modal
    const openViewModal = async (id) => {
        if (!permissions.canView) return;

        try {
            const r = await api.get(`/encargado-admin/dato-individual/${id}`, {
                params: { id_admin_esp_dep: idAdminEspDep },
            });

            if (r.data?.exito) {
                setCurrentEncargado(r.data.datos?.encargado || {});
                setModalOpen(true);
            } else {
                setError(r.data?.mensaje || 'No se pudo cargar');
            }
        } catch (e) {
            setError(e.response?.data?.mensaje || 'Error de conexion');
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setCurrentEncargado(null);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= Math.ceil(total / limit)) {
            setPage(newPage);
        }
    };



    if (!role) return <p>Cargando permisos...</p>;
    if (!permissions.canView) return <p>No tienes permisos.</p>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
                Gestion de encargados {canchaId ? `(Cancha #${canchaId})` : '(General)'}
            </h2>

            {/* Buscador y filtro */}
            <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
                <div className="flex-1">
                    <form onSubmit={handleSearch} className="flex h-full">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, apellido, correo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border px-4 py-2 w-full rounded-l"
                        />
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600">
                            Buscar
                        </button>
                    </form>
                </div>

                <select
                    value={filtro}
                    onChange={handleFiltroChange}
                    className="border rounded px-3 py-2 sm:min-w-[200px]"
                >
                    <option value="">Todos sin filtro</option>
                    <option value="nombre">Ordenar por nombre</option>
                    <option value="apellido">Ordenar por apellido</option>
                    <option value="correo">Ordenar por correo</option>
                    <option value="fecha">Ordenar por fecha de inicio</option>
                </select>
            </div>

            {/* Tabla */}
            {loading ? (
                <p>Cargando encargados...</p>
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
                                    <th className="px-4 py-2 text-left">Correo</th>
                                    <th className="px-4 py-2 text-left">Responsabilidad</th>
                                    <th className="px-4 py-2 text-left">Fecha Inicio</th>
                                    <th className="px-4 py-2 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {encargados.map((x, i) => (
                                    <tr key={x.id_encargado} className="border-t">
                                        <td className="px-4 py-2">{(page - 1) * limit + i + 1}</td>
                                        <td className="px-4 py-2">
                                            {x.encargado_nombre} {x.encargado_apellido}
                                        </td>
                                        <td className="px-4 py-2">{x.correo || '-'}</td>
                                        <td className="px-4 py-2">{truncate(x.responsabilidad, 35)}</td>
                                        <td className="px-4 py-2">{formatDateDdMmYyyy(x.fecha_inicio) || '-'}</td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => openViewModal(x.id_encargado)}
                                                className="text-green-500 hover:text-green-700"
                                            >
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {encargados.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-4">
                                            Sin datos
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginacion */}
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="bg-gray-300 px-4 py-2 rounded-l disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="px-4 py-2 bg-gray-100">
                            Pagina {page} de {Math.ceil(total / limit) || 1}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === Math.ceil(total / limit)}
                            className="bg-gray-300 px-4 py-2 rounded-r disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </>
            )}

            {/* Modal */}
            {modalOpen && currentEncargado && (
  <div className="fixed inset-0 bg-[#020617]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-[#0F172A]">
            Detalle del encargado
          </h3>
          <p className="text-xs text-[#64748B] mt-1">
            Informacion del encargado asignado al espacio deportivo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {typeof currentEncargado.estado === 'boolean' && (
            <span
              className={
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ' +
                (currentEncargado.estado
                  ? 'bg-[#DCFCE7] text-[#15803D]'
                  : 'bg-[#FEE2E2] text-[#B91C1C]')
              }
            >
              {currentEncargado.estado ? 'Activo' : 'Inactivo'}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[60vh] text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              ID encargado
            </p>
            <p className="text-[#0F172A]">
              {currentEncargado.id_encargado}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Nombre completo
            </p>
            <p className="text-[#0F172A]">
              {currentEncargado.nombre} {currentEncargado.apellido}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Correo
            </p>
            <p className="text-[#0F172A]">
              {currentEncargado.correo || '-'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Responsabilidad
            </p>
            <p className="text-[#0F172A]">
              {currentEncargado.responsabilidad || '-'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Fecha inicio
            </p>
            <p className="text-[#0F172A]">
              {formatDateDdMmYyyy(currentEncargado.fecha_inicio) || '-'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
              Horario
            </p>
            <p className="text-[#0F172A]">
              {currentEncargado.hora_ingreso || '-'} {' - '}
              {currentEncargado.hora_salida || '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F9FAFB] flex justify-end">
        <button
          type="button"
          onClick={closeModal}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#0F172A] text-white hover:bg-[#020617] transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}


        </div>
    );
};

export default EncargadoAdmin;
