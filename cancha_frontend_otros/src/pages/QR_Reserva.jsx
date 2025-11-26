/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import api from "../services/api";

const permissionsConfig = {
  ADMINISTRADOR: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true
  },
  ADMIN_ESP_DEP: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  },
  CONTROL: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false
  },
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false
  }
};

const getEffectiveRole = () => {
  const keys = Object.keys(permissionsConfig);
  const bag = new Set();
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const arr = Array.isArray(u?.roles) ? u.roles : [];
    for (const r of arr) {
      if (typeof r === "string") bag.add(r);
      else if (r && typeof r === "object")
        ["rol", "role", "nombre", "name"].forEach((k) => r[k] && bag.add(r[k]));
    }
    if (bag.size === 0 && u?.role) bag.add(u.role);
  } catch {}
  const tok = localStorage.getItem("token");
  if (bag.size === 0 && tok && tok.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        atob(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      const t = Array.isArray(payload?.roles)
        ? payload.roles
        : payload?.rol
        ? [payload.rol]
        : [];
      t.forEach((v) => bag.add(v));
    } catch {}
  }
  const norm2 = Array.from(bag).map((v) => {
    const val = String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    return val === "ADMIN" ? "ADMINISTRADOR" : val;
  });
  const prio = ["ADMINISTRADOR", "CONTROL", "ADMIN_ESP_DEP"];
  return (
    prio.find((r) => norm2.includes(r) && keys.includes(r)) ||
    norm2.find((r) => keys.includes(r)) ||
    "DEFAULT"
  );
};

const QRReserva = () => {
  const [qrs, setQRs] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: "",
    fecha_generado: new Date().toISOString().slice(0, 16),
    fecha_expira: "",
    codigo_qr: "",
    estado: "activo",
    id_control: "",
    verificado: false
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(() => getEffectiveRole());
  const [joinLink, setJoinLink] = useState(null);

  useEffect(() => {
    const sync = () => setRole(getEffectiveRole());
    window.addEventListener("storage", sync);
    window.addEventListener("auth-changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const permissions =
    role && permissionsConfig[role]
      ? permissionsConfig[role]
      : permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const limitEsp = 9999;
        const offset = 0;
        const r = await api.get("/reserva/datos-especificos", {
          params: { limit: limitEsp, offset }
        });
        if (r.data?.exito) setReservas(r.data.datos?.reservas || []);
        else setError(r.data?.mensaje || "Error al obtener reservas");
      } catch (e) {
        setError(
          e.response?.data?.mensaje || "Error de conexion al obtener reservas"
        );
      }
    };
    const fetchControles = async () => {
      const limitEsp = 9999;
      const offset = 0;
      try {
        const r = await api.get("/control/datos-especificos", {
          params: { limit: limitEsp, offset }
        });
        if (r.data?.exito) setControles(r.data.datos?.controles || []);
        else setError(r.data?.mensaje || "Error al obtener controles");
      } catch (e) {
        setError(
          e.response?.data?.mensaje || "Error de conexion al obtener controles"
        );
      }
    };
    if (permissions.canView) {
      fetchReservas();
      fetchControles();
    }
  }, [role, permissions.canView]);

  const openDetailModal = (qr) => {
    if (!permissions.canView) return;
    setSelectedQR(qr);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedQR(null);
  };

  const fetchQRs = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver los datos");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let r;
      if (params.q)
        r = await api.get("/qr-reserva/buscar", { params: fullParams });
      else if (params.tipo)
        r = await api.get("/qr-reserva/filtro", { params: fullParams });
      else
        r = await api.get("/qr-reserva/datos-especificos", {
          params: fullParams
        });
      if (r.data?.exito) {
        setQRs(r.data.datos?.qrs || []);
        setTotal(r.data.datos?.paginacion?.total || 0);
      } else setError(r.data?.mensaje || "Error al cargar datos");
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion al servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRs();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro("");
    if (searchTerm.trim()) fetchQRs({ q: searchTerm });
    else fetchQRs();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm("");
    if (tipo) fetchQRs({ tipo });
    else fetchQRs();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm("Estas seguro de eliminar este QR de reserva?")) return;
    try {
      const r = await api.delete(`/qr-reserva/${id}`);
      if (r.data?.exito) fetchQRs();
      else setError(r.data?.mensaje || "No se pudo eliminar");
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setCurrentQR(null);
    setFormData({
      id_reserva: "",
      fecha_generado: new Date().toISOString().slice(0, 16),
      fecha_expira: "",
      codigo_qr: "",
      estado: "activo",
      id_control: "",
      verificado: false
    });
    setJoinLink(null);
    setModalOpen(true);
    setError(null);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/qr-reserva/dato-individual/${id}`);
      if (r.data?.exito) {
        const qr = r.data.datos?.qr || {};
        setFormData({
          id_reserva: qr.id_reserva || "",
          fecha_generado: qr.fecha_generado
            ? new Date(qr.fecha_generado).toISOString().slice(0, 16)
            : "",
          fecha_expira: qr.fecha_expira
            ? new Date(qr.fecha_expira).toISOString().slice(0, 16)
            : "",
          codigo_qr: qr.codigo_qr || "",
          estado: qr.estado || "activo",
          id_control: qr.id_control || "",
          verificado: !!qr.verificado
        });
        setCurrentQR(qr);
        setEditMode(true);
        setJoinLink(null);
        setModalOpen(true);
        setError(null);
      } else setError(r.data?.mensaje || "No se pudo cargar el registro");
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentQR(null);
    setJoinLink(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      (editMode && !permissions.canEdit) ||
      (!editMode && !permissions.canCreate)
    )
      return;
    try {
      const base = { ...formData };
      const required = ["id_reserva", "fecha_generado"];
      for (const f of required) {
        if (!base[f]) {
          setError(`El campo ${f} es obligatorio`);
          return;
        }
      }

      const fg = new Date(base.fecha_generado);
      if (isNaN(fg.getTime())) {
        setError("La fecha de generacion no es valida");
        return;
      }
      if (base.fecha_expira) {
        const fe = new Date(base.fecha_expira);
        if (isNaN(fe.getTime())) {
          setError("La fecha de expiracion no es valida");
          return;
        }
        if (fe <= fg) {
          setError(
            "La fecha de expiracion debe ser posterior a la fecha de generacion"
          );
          return;
        }
      }

      const rid = parseInt(base.id_reserva);
      if (!reservas.some((r) => r.id_reserva === rid)) {
        setError("La reserva seleccionada no es valida");
        return;
      }

      const payloadBase = {
        id_reserva: rid,
        fecha_generado: base.fecha_generado,
        fecha_expira: base.fecha_expira || undefined,
        estado: base.estado || "activo",
        id_control: base.id_control ? parseInt(base.id_control) : undefined,
        verificado: !!base.verificado
      };

      let r;
      if (editMode) {
        const payload = {
          ...payloadBase,
          codigo_qr: base.codigo_qr || undefined
        };
        r = await api.patch(`/qr-reserva/${currentQR.id_qr}`, payload);
      } else {
        r = await api.post("/qr-reserva/", payloadBase);
      }

      if (r.data?.exito) {
        const qrResp = r.data.datos?.qr;
        if (!editMode && r.data.datos?.link_unirse) {
          setJoinLink(r.data.datos.link_unirse);
        } else if (editMode) {
          setJoinLink(null);
        }
        if (qrResp) {
          setCurrentQR(qrResp);
          setFormData((prev) => ({
            ...prev,
            codigo_qr: qrResp.codigo_qr || prev.codigo_qr
          }));
        }
        if (editMode) {
          closeModal();
        }
        fetchQRs();
      } else setError(r.data?.mensaje || "No se pudo guardar");
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const handleRegenerarQR = async () => {
    if (!editMode || !currentQR?.id_reserva) return;
    try {
      setError(null);
      const r = await api.post(
        `/qr-reserva/regenerar-por-reserva/${currentQR.id_reserva}`
      );
      if (r.data?.exito) {
        const qr = r.data.datos?.qr;
        if (qr) {
          setCurrentQR(qr);
          setFormData((prev) => ({
            ...prev,
            fecha_generado: qr.fecha_generado
              ? new Date(qr.fecha_generado).toISOString().slice(0, 16)
              : prev.fecha_generado,
            fecha_expira: qr.fecha_expira
              ? new Date(qr.fecha_expira).toISOString().slice(0, 16)
              : prev.fecha_expira,
            codigo_qr: qr.codigo_qr || "",
            estado: qr.estado || prev.estado,
            verificado:
              typeof qr.verificado === "boolean"
                ? qr.verificado
                : prev.verificado
          }));
          setJoinLink(null);
          fetchQRs();
        }
      } else {
        setError(r.data?.mensaje || "No se pudo regenerar el QR");
      }
    } catch (e) {
      setError(
        e.response?.data?.mensaje || "Error de conexion al regenerar el QR"
      );
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!permissions.canView) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Gestion de QR de Reservas</h2>
        <p className="text-gray-600">No tienes permisos para ver esta pagina.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de QR de Reservas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha o codigo QR"
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
            <option value="">Todos - sin orden</option>
            <option value="cliente_nombre">Cliente (A-Z)</option>
            <option value="fecha_generado">Fecha (reciente)</option>
            <option value="verificado_si">Solo verificados</option>
            <option value="verificado_no">Solo no verificados</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear QR
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando datos...</p>
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
                  <th className="px-4 py-2 text-left">Fecha generado</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Verificado</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {qrs.map((qr, index) => (
                  <tr key={qr.id_qr} className="border-t">
                    <td className="px-4 py-2">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-2">{`${qr.cliente_nombre} ${qr.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{qr.cancha_nombre}</td>
                    <td className="px-4 py-2">
                      {new Date(qr.fecha_generado).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          qr.estado === "activo"
                            ? "bg-green-100 text-green-800"
                            : qr.estado === "expirado"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {qr.estado === "activo"
                          ? "Activo"
                          : qr.estado === "expirado"
                          ? "Expirado"
                          : "Usado"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          qr.verificado
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {qr.verificado ? "Si" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(qr.id_qr)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(qr.id_qr)}
                          className="text-red-500 hover:text-red-700 mr-2"
                        >
                          Eliminar
                        </button>
                      )}
                      {permissions.canView && qr.codigo_qr && (
                        <button
                          onClick={() => openDetailModal(qr)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver QR
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {qrs.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-center text-gray-500"
                    >
                      No hay registros para mostrar
                    </td>
                  </tr>
                )}
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
              Pagina {page} de {Math.max(1, Math.ceil(total / limit))}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === Math.ceil(total / limit) || total === 0}
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
              {editMode ? "Editar QR de Reserva" : "Crear QR de Reserva"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reserva
                </label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Seleccione una reserva</option>
                  {reservas.map((reserva) => (
                    <option key={reserva.id_reserva} value={reserva.id_reserva}>
                      #{reserva.id_reserva} - {reserva.cliente_nombre}{" "}
                      {reserva.cliente_apellido} ({reserva.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de generacion
                </label>
                <input
                  name="fecha_generado"
                  value={formData.fecha_generado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  type="datetime-local"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de expiracion
                </label>
                <input
                  name="fecha_expira"
                  value={formData.fecha_expira}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  type="datetime-local"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Codigo QR
                </label>
                <input
                  name="codigo_qr"
                  value={formData.codigo_qr}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  type="text"
                  maxLength={255}
                  readOnly={!editMode}
                  placeholder={
                    editMode ? "" : "Se generara automaticamente al crear"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="activo">Activo</option>
                  <option value="expirado">Expirado</option>
                  <option value="usado">Usado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Control
                </label>
                <select
                  name="id_control"
                  value={formData.id_control}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Ninguno</option>
                  {controles.map((control) => (
                    <option key={control.id_control} value={control.id_control}>
                      #{control.id_control} - {control.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Verificado
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="verificado"
                    checked={formData.verificado}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors duration-300 ${
                      formData.verificado ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${
                      formData.verificado ? "translate-x-5" : ""
                    }`}
                  />
                  <span className="ml-3 text-sm text-gray-600">
                    {formData.verificado ? "Verificado" : "No verificado"}
                  </span>
                </label>
              </div>

              {formData.codigo_qr && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Vista previa del QR
                  </label>
                  <div className="inline-block p-4 border rounded bg-white">
                    <QRCode value={formData.codigo_qr} size={180} />
                  </div>
                  <p className="mt-2 p-2 bg-gray-100 rounded break-words font-mono text-xs">
                    {formData.codigo_qr}
                  </p>
                </div>
              )}

              {joinLink && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Link para unirse a la reserva
                  </label>
                  <p className="mt-1 p-2 bg-gray-100 rounded break-words text-sm">
                    {joinLink}
                  </p>
                </div>
              )}

              <div className="col-span-2 flex justify-between mt-4">
                {editMode && (
                  <button
                    type="button"
                    onClick={handleRegenerarQR}
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                  >
                    Regenerar QR
                  </button>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {editMode ? "Actualizar" : "Crear"}
                  </button>
                </div>
              </div>
            </form>
            {error && <p className="text-red-500 mt-4">{error}</p>}
          </div>
        </div>
      )}

      {detailModalOpen && selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Detalles completos del QR
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">
                    ID del QR:
                  </label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    #{selectedQR.id_qr}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Reserva:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    #{selectedQR.id_reserva}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Cliente:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedQR.cliente_nombre} {selectedQR.cliente_apellido}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Cancha:</label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedQR.cancha_nombre}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">
                    Fecha de generacion:
                  </label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {new Date(selectedQR.fecha_generado).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Fecha de expiracion:
                  </label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    {selectedQR.fecha_expira
                      ? new Date(selectedQR.fecha_expira).toLocaleString()
                      : "No expira"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Estado:</label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQR.estado === "activo"
                          ? "bg-green-100 text-green-800"
                          : selectedQR.estado === "expirado"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {selectedQR.estado === "activo"
                        ? "Activo"
                        : selectedQR.estado === "expirado"
                        ? "Expirado"
                        : "Usado"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="font-medium text-gray-700">
                    Verificado:
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQR.verificado
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {selectedQR.verificado ? "Si" : "No"}
                    </span>
                  </div>
                </div>
              </div>
              {selectedQR.id_control && (
                <div>
                  <label className="font-medium text-gray-700">
                    Control asociado:
                  </label>
                  <p className="mt-1 p-2 bg-gray-50 rounded">
                    #{selectedQR.id_control}{" "}
                    {selectedQR.control_nombre
                      ? `- ${selectedQR.control_nombre}`
                      : ""}
                  </p>
                </div>
              )}
              {selectedQR.codigo_qr && (
                <div>
                  <label className="font-medium text-gray-700">
                    QR generado desde codigo
                  </label>
                  <div className="mt-2 inline-block p-4 border rounded bg-white">
                    <QRCode value={selectedQR.codigo_qr} size={200} />
                  </div>
                  <p className="mt-2 p-2 bg-gray-100 rounded break-words font-mono text-sm">
                    {selectedQR.codigo_qr}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={closeDetailModal}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
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

export default QRReserva;