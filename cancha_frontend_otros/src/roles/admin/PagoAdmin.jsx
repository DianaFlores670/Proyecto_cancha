/* eslint-disable react-hooks/exhaustive-deps */
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
        if (!params.limpiar_reserva) {
            if (formData.id_reserva_filtro)
                baseParams.id_reserva = formData.id_reserva_filtro;
        }

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
    const handleFiltroReservasChange = (e) => {
        const id = e.target.value;

        setFormData(prev => ({
            ...prev,
            id_reserva_filtro: id === "" ? null : id
        }));

        setPage(1);

        if (id === "") {
            fetchPagos({ limpiar_reserva: true });
        } else {
            fetchPagos({ id_reserva: id });
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
        <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
            <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestion de Pagos</h2>
            <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
                <div className="flex flex-col md:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por cliente, metodo o cancha"
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
                        value={formData.id_reserva_filtro || ''}
                        onChange={handleFiltroReservasChange}
                        className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
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
                        className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
                    >
                        <option value="">Sin filtro</option>
                        <option value="fecha">Fecha</option>
                        <option value="monto">Monto</option>
                        <option value="metodo">Metodo</option>
                    </select>
                    <button
                        onClick={() => openModal('create')}
                        className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
                    >
                        Registrar pago
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Cargando pagos...</p>
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
                                    <th className="px-4 py-2 text-left">Reserva</th>
                                    <th className="px-4 py-2 text-left">Monto</th>
                                    <th className="px-4 py-2 text-left">Metodo</th>
                                    <th className="px-4 py-2 text-left">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="text-md">
                                {pagos.map((p, i) => (
                                    <tr key={p.id_pago} className="border-t hover:bg-gray-50 transition">
                                        <td className="px-4 py-3">{(page - 1) * limit + i + 1}</td>
                                        <td className="px-4 py-3">
                                            {`${p.cliente_nombre} ${p.cliente_apellido}`}
                                        </td>
                                        <td className="px-4 py-3">{p.cancha_nombre}</td>
                                        <td className="px-4 py-3">#{p.id_reserva}</td>
                                        <td className="px-4 py-3">{p.monto ? `Bs ${p.monto}` : '-'}</td>
                                        <td className="px-4 py-3">{p.metodo_pago}</td>
                                        <td className="px-4 py-3">
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
                    {/* CARDS MOBILE */}
                    <div className="md:hidden mt-6 space-y-4 pb-32">
                        {pagos.map((pago, index) => (
                            <div
                                key={pago.id_pago}
                                className="border bg-white rounded-lg p-4 shadow-sm"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        {/* CLIENTE */}
                                        <div className="font-bold text-[#23475F]">
                                            {pago.cliente_nombre} {pago.cliente_apellido}
                                        </div>

                                        {/* NUMERO DEL PAGO */}
                                        <div className="text-xs text-gray-500">
                                            Pago #{(page - 1) * limit + index + 1}
                                        </div>

                                        <div className="mt-3 text-sm space-y-1">

                                            {/* CANCHA */}
                                            <div>
                                                <span className="font-semibold">Cancha: </span>
                                                {pago.cancha_nombre}
                                            </div>

                                            {/* MONTO */}
                                            <div>
                                                <span className="font-semibold">Monto: </span>
                                                {pago.monto ? `$${pago.monto}` : '-'}
                                            </div>

                                            {/* METODO */}
                                            <div>
                                                <span className="font-semibold">Metodo: </span>
                                                {pago.metodo_pago}
                                            </div>

                                            {/* FECHA */}
                                            <div>
                                                <span className="font-semibold">Fecha: </span>
                                                {pago.fecha_pago
                                                    ? new Date(pago.fecha_pago).toLocaleDateString()
                                                    : '-'}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* PAGINACIÓN SOLO MOVIL */}
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
                            {editMode ? 'Editar Pago' : viewMode ? 'Ver Pago' : 'Registrar Pago'}
                        </h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Reserva</label>
                                <select
                                    name="id_reserva"
                                    value={formData.id_reserva}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
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
                                <label className="block text-sm font-semibold mb-1">Monto</label>
                                <input
                                    type="number"
                                    name="monto"
                                    step="0.01"
                                    value={formData.monto}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                                    required
                                    disabled={viewMode}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1">Metodo de Pago</label>
                                <select
                                    name="metodo_pago"
                                    value={formData.metodo_pago}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
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
                                <label className="block text-sm font-semibold mb-1">Fecha de Pago</label>
                                <input
                                    type="date"
                                    name="fecha_pago"
                                    value={formData.fecha_pago}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                                    disabled={viewMode}
                                    required
                                />
                            </div>

                            <div className="md:col-span-2 flex justify-end mt-1 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
                                >
                                    Cerrar
                                </button>
                                {!viewMode && (
                                    <button
                                        type="submit"
                                        className="px-5 py-2 bg-[#23475F] text-white rounded-full text-md font-medium hover:bg-[#1d3a4e]"
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
