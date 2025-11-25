/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';

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
    ADMINISTRADOR: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    ADMIN_ESP_DEP: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    DEFAULT: { canView: false, canCreate: false, canEdit: false, canDelete: false },
};

const PagoAdmin = () => {
    const [role, setRole] = useState(null);
    const [idAdminEspDep, setIdAdminEspDep] = useState(null);

    const [pagos, setPagos] = useState([]);
    const [reservas, setReservas] = useState([]);
    const [canchas, setCanchas] = useState([]);
    const [espacios, setEspacios] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filtro, setFiltro] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const [formData, setFormData] = useState({
        id_reserva: '',
        monto: '',
        metodo_pago: '',
        fecha_pago: '',
        id_reserva_filtro: '',
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [currentPago, setCurrentPago] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const reservaId = params.get('id_reserva');
    const canchaId = params.get('id_cancha');
    const espacioId = params.get('id_espacio');

    useEffect(() => {
        const u = readUser();
        const p = readTokenPayload();
        const r = pickRole(u, p);
        setRole(r);
        const idGuess = resolveAdminId(u, p);
        setIdAdminEspDep(r === 'ADMIN_ESP_DEP' ? idGuess : null);
    }, []);

    const permissions = permissionsConfig[role || 'DEFAULT'] || permissionsConfig.DEFAULT;

    useEffect(() => {
        const fetchData = async () => {
            if (!idAdminEspDep) return;
            try {
                const [resReservas, resCanchas, resEspacios] = await Promise.all([
                    api.get('/reserva-admin/datos-especificos', {
                        params: { id_admin_esp_dep: idAdminEspDep, limit: 1000, offset: 0 },
                    }),
                    api.get('/cancha-admin/datos-especificos', {
                        params: { id_admin_esp_dep: idAdminEspDep },
                    }),
                    api.get('/espacio-admin/datos-especificos', {
                        params: { id_admin_esp_dep: idAdminEspDep },
                    }),
                ]);
                if (resReservas.data?.exito) setReservas(resReservas.data.datos.reservas || []);
                if (resCanchas.data?.exito) setCanchas(resCanchas.data.datos.canchas || []);
                if (resEspacios.data?.exito) setEspacios(resEspacios.data.datos.espacios || []);
            } catch {
                setError('Error al cargar datos relacionados');
            }
        };
        if (permissions.canView) fetchData();
    }, [idAdminEspDep, permissions.canView]);

    const fetchPagos = async (params = {}) => {
        if (!permissions.canView) return;
        setLoading(true);
        setError(null);
        const offset = (page - 1) * limit;
        const baseParams = {
            limit,
            offset,
            id_admin_esp_dep: idAdminEspDep,
        };

        if (reservaId) baseParams.id_reserva = reservaId;
        if (canchaId) baseParams.id_cancha = canchaId;
        if (espacioId) baseParams.id_espacio = espacioId;
        if (formData.id_reserva_filtro) baseParams.id_reserva = formData.id_reserva_filtro;

        try {
            let resp;
            if (params.q) {
                resp = await api.get('/pago-admin/buscar', { params: { ...baseParams, ...params } });
            } else if (params.tipo) {
                resp = await api.get('/pago-admin/filtro', { params: { ...baseParams, ...params } });
            } else {
                resp = await api.get('/pago-admin/datos-especificos', {
                    params: { ...baseParams, ...params },
                });
            }

            if (resp.data?.exito) {
                setPagos(resp.data.datos.pagos || []);
                setTotal(resp.data.datos.paginacion?.total || 0);
            } else {
                setError(resp.data?.mensaje || 'Error al cargar pagos');
            }
        } catch {
            setError('Error de conexion');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (idAdminEspDep) {
            fetchPagos({});
        }
    }, [idAdminEspDep, page, reservaId, canchaId, espacioId]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        if (searchTerm.trim()) {
            fetchPagos({ q: searchTerm });
        } else {
            fetchPagos({});
        }
    };

    const handleFiltroChange = (e) => {
        const tipo = e.target.value;
        setFiltro(tipo);
        setPage(1);
        if (tipo) {
            fetchPagos({ tipo });
        } else {
            fetchPagos({});
        }
    };

    const openModal = (mode, pago = null) => {
        setEditMode(mode === 'edit');
        setViewMode(mode === 'view');
        setCurrentPago(pago);
        setFormData(
            pago
                ? {
                    id_reserva: pago.id_reserva || '',
                    monto: pago.monto || '',
                    metodo_pago: pago.metodo_pago || '',
                    fecha_pago: pago.fecha_pago ? pago.fecha_pago.split('T')[0] : '',
                    id_reserva_filtro: formData.id_reserva_filtro || '',
                }
                : { id_reserva: '', monto: '', metodo_pago: '', fecha_pago: '', id_reserva_filtro: '' }
        );
        setModalOpen(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                id_reserva: parseInt(formData.id_reserva),
                monto: parseFloat(formData.monto),
                metodo_pago: formData.metodo_pago,
                fecha_pago: formData.fecha_pago,
            };
            const res = await api.post('/pago/', payload);
            if (res.data?.exito) {
                setModalOpen(false);
                fetchPagos({});
            } else {
                setError(res.data?.mensaje || 'Error al crear pago');
            }
        } catch {
            setError('Error de conexion al servidor');
        }
    };

    const handlePageChange = (newPage) => {
        const maxPage = Math.ceil(total / limit) || 1;
        if (newPage >= 1 && newPage <= maxPage) {
            setPage(newPage);
        }
    };

    if (!role || (role === 'ADMIN_ESP_DEP' && !idAdminEspDep)) {
        return <p>Cargando permisos...</p>;
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Gestion de Pagos</h2>

            <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
                <div className="flex-1">
                    <form onSubmit={handleSearch} className="flex h-full">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por cliente, metodo o cancha"
                            className="border rounded-l px-4 py-2 w-full"
                        />
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600"
                        >
                            Buscar
                        </button>
                    </form>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                        value={formData.id_reserva_filtro || ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            setFormData((prev) => ({ ...prev, id_reserva_filtro: id }));
                            setPage(1);
                            if (id) fetchPagos({ id_reserva: id });
                            else fetchPagos({});
                        }}
                        className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
                    >
                        <option value="">Todas las reservas</option>
                        {reservas.map((r) => (
                            <option key={r.id_reserva} value={r.id_reserva}>
                                #{r.id_reserva} - {r.cliente_nombre} {r.cliente_apellido} ({r.cancha_nombre})
                            </option>
                        ))}
                    </select>

                    <select
                        value={filtro}
                        onChange={handleFiltroChange}
                        className="border rounded px-3 py-2 flex-1 sm:min-w-[180px]"
                    >
                        <option value="">Sin filtro</option>
                        <option value="fecha">Fecha</option>
                        <option value="monto">Monto</option>
                        <option value="metodo">Metodo</option>
                    </select>
                    <button
                        onClick={() => openModal('create')}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap"
                    >
                        Registrar pago
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Cargando pagos...</p>
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
                                    <th className="px-4 py-2 text-left">Reserva</th>
                                    <th className="px-4 py-2 text-left">Monto</th>
                                    <th className="px-4 py-2 text-left">Metodo</th>
                                    <th className="px-4 py-2 text-left">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagos.map((p, i) => (
                                    <tr key={p.id_pago} className="border-t">
                                        <td className="px-4 py-2">{(page - 1) * limit + i + 1}</td>
                                        <td className="px-4 py-2">
                                            {`${p.cliente_nombre} ${p.cliente_apellido}`}
                                        </td>
                                        <td className="px-4 py-2">{p.cancha_nombre}</td>
                                        <td className="px-4 py-2">#{p.id_reserva}</td>
                                        <td className="px-4 py-2">{p.monto ? `Bs ${p.monto}` : '-'}</td>
                                        <td className="px-4 py-2">{p.metodo_pago}</td>
                                        <td className="px-4 py-2">
                                            {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {pagos.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-4 text-center" colSpan={7}>
                                            No hay pagos registrados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {total > 0 && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-l hover:bg-gray-400 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <span className="px-4 py-2 bg-gray-100">
                                Pagina {page} de {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-r hover:bg-gray-400 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </>
            )}

            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-lg w-full">
                        <h3 className="text-lg font-semibold mb-4">
                            {editMode ? 'Editar Pago' : viewMode ? 'Ver Pago' : 'Registrar Pago'}
                        </h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Reserva</label>
                                <select
                                    name="id_reserva"
                                    value={formData.id_reserva}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2 bg-gray-100"
                                    disabled={viewMode}
                                    required
                                >
                                    <option value="">Seleccione reserva</option>
                                    {reservas
                                        .filter(r => r.estado === 'pendiente' || r.estado === 'en_cuotas')
                                        .map(r => (
                                            <option key={r.id_reserva} value={r.id_reserva}>
                                                {`#${r.id_reserva} - ${r.cliente_nombre} ${r.cliente_apellido} (${r.cancha_nombre}) - saldo Bs ${r.saldo_pendiente || 0}`}
                                            </option>
                                        ))}
                                </select>

                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Monto</label>
                                <input
                                    type="number"
                                    name="monto"
                                    step="0.01"
                                    value={formData.monto}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2 bg-gray-100"
                                    required
                                    disabled={viewMode}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Metodo de Pago</label>
                                <select
                                    name="metodo_pago"
                                    value={formData.metodo_pago}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2 bg-gray-100"
                                    disabled={viewMode}
                                    required
                                >
                                    <option value="">Seleccione metodo</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="QR">QR</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de Pago</label>
                                <input
                                    type="date"
                                    name="fecha_pago"
                                    value={formData.fecha_pago}
                                    onChange={handleInputChange}
                                    className="w-full border rounded px-3 py-2 bg-gray-100"
                                    disabled={viewMode}
                                    required
                                />
                            </div>

                            <div className="flex justify-end mt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
                                >
                                    Cerrar
                                </button>
                                {!viewMode && (
                                    <button
                                        type="submit"
                                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        {editMode ? 'Actualizar' : 'Registrar'}
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

export default PagoAdmin;
