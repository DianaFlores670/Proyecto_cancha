/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import api from "../services/api";

const permissionsConfig = {
  ADMINISTRADOR: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  ADMIN_ESP_DEP: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  CONTROL: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
  DEFAULT: {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  },
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
        ["rol", "role", "nombre", "name"].forEach((k) => {
          if (r[k]) bag.add(r[k]);
        });
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
  const norm = Array.from(bag).map((v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
  );
  const map = (v) => (v === "ADMIN" ? "ADMINISTRADOR" : v);
  const norm2 = norm.map(map);
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
    qr_url_imagen: "",
    codigo_qr: "",
    estado: "activo",
    id_control: "",
    verificado: false,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [previewQR, setPreviewQR] = useState(null);
  const [role, setRole] = useState(() => getEffectiveRole());

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

  const getImageUrl = (path) => {
    if (!path) return "";

    // Si ya es una URL absoluta, usar tal cual
    if (/^https?:\/\//i.test(path)) return path;

    // Asegurarse que baseURL termina sin slash
    const base = (api.defaults?.baseURL || "").replace(/\/$/, "");

    // Normalizar path: quitar slashes al inicio, reemplazar backslashes, y forzar lowercase si quieres
    const cleanPath = String(path)
      .replace(/^\/+/, "") // quitar slashes al inicio
      .replace(/\\/g, "/"); // reemplazar backslashes por slash

    // Combinar base y path
    return `${base}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const r = await api.get("/reserva/datos-especificos");
        if (r.data?.exito) setReservas(r.data.datos?.reservas || []);
        else setError(r.data?.mensaje || "Error al obtener reservas");
      } catch (e) {
        setError(
          e.response?.data?.mensaje || "Error de conexion al obtener reservas"
        );
      }
    };
    const fetchControles = async () => {
      try {
        const r = await api.get("/control/datos-especificos");
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
  }, [role]);

  const openDetailModal = (qr) => {
    if (!permissions.canView) return;
    setSelectedQR(qr);
    setPreviewQR(qr.qr_url_imagen ? getImageUrl(qr.qr_url_imagen) : null);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedQR(null);
    setPreviewQR(null);
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
          params: fullParams,
        });
      if (r.data?.exito) {
        setQRs(r.data.datos?.qrs || []);
        setTotal(r.data.datos?.paginacion?.total || 0);
      } else {
        setError(r.data?.mensaje || "Error al cargar datos");
      }
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
    setFormData({
      id_reserva: "",
      fecha_generado: new Date().toISOString().slice(0, 16),
      fecha_expira: "",
      qr_url_imagen: "",
      codigo_qr: "",
      estado: "activo",
      id_control: "",
      verificado: false,
    });
    setPreviewQR(null);
    setCurrentQR(null);
    setModalOpen(true);
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
          qr_url_imagen: qr.qr_url_imagen || "",
          codigo_qr: qr.codigo_qr || "",
          estado: qr.estado || "activo",
          id_control: qr.id_control || "",
          verificado: !!qr.verificado,
        });
        setPreviewQR(qr.qr_url_imagen ? getImageUrl(qr.qr_url_imagen) : null);
        setCurrentQR(qr);
        setEditMode(true);
        setModalOpen(true);
      } else {
        setError(r.data?.mensaje || "No se pudo cargar el registro");
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentQR(null);
    setPreviewQR(null);
    setError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
      for (const f of required)
        if (!base[f]) {
          setError(`El campo ${f} es obligatorio`);
          return;
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
      const payload = {
        id_reserva: rid,
        fecha_generado: base.fecha_generado,
        fecha_expira: base.fecha_expira || undefined,
        codigo_qr: base.codigo_qr || undefined,
        estado: base.estado || "activo",
        id_control: base.id_control ? parseInt(base.id_control) : undefined,
        verificado: !!base.verificado,
      };
      let r;
      if (editMode)
        r = await api.patch(`/qr-reserva/${currentQR.id_qr}`, payload);
      else r = await api.post("/qr-reserva/", payload);
      if (r.data?.exito) {
        if (r.data.datos?.qr?.qr_url_imagen)
          setPreviewQR(getImageUrl(r.data.datos.qr.qr_url_imagen));
        closeModal();
        fetchQRs();
      } else {
        setError(r.data?.mensaje || "No se pudo guardar");
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

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
                      {permissions.canView && qr.qr_url_imagen && (
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
                  maxLength="255"
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
              {editMode && formData.qr_url_imagen && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Imagen QR
                  </label>
                  <input
                    name="qr_url_imagen"
                    value={formData.qr_url_imagen}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                    type="text"
                    disabled
                  />
                </div>
              )}
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
              {previewQR && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Vista previa del QR
                  </label>
                  <img
                    src={
                      /^https?:\/\//i.test(previewQR)
                        ? previewQR
                        : getImageUrl(previewQR)
                    }
                    alt="Vista previa del QR"
                    className="max-w-xs h-auto rounded"
                    onError={(e) => {
                      console.error("Error loading QR image:", e.target.src);
                      e.target.src = "/fallback-qr.png"; // opcional: imagen por defecto
                    }}
                  />
                </div>
              )}
              <div className="col-span-2 flex justify-end mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
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
              <div className="grid grid-cols-1 gap-4">
                {selectedQR.qr_url_imagen && (
                  <div>
                    <label className="font-medium text-gray-700">
                      Imagen QR:
                    </label>
                    <p className="mt-1 p-2 bg-gray-100 rounded break-words font-mono text-sm">
                      {selectedQR.qr_url_imagen}
                    </p>
                    <img
                      src={
                        /^https?:\/\//i.test(selectedQR.qr_url_imagen)
                          ? selectedQR.qr_url_imagen
                          : getImageUrl(selectedQR.qr_url_imagen)
                      }
                      alt="QR"
                      className="mt-2 max-w-xs h-auto rounded"
                      onError={(e) => {
                        console.error("Error loading QR image:", e.target.src);
                        e.target.src = "/fallback-qr.png";
                      }}
                    />
                  </div>
                )}
                {selectedQR.codigo_qr && (
                  <div>
                    <label className="font-medium text-gray-700">
                      Codigo QR:
                    </label>
                    <p className="mt-1 p-2 bg-gray-100 rounded break-words font-mono text-sm">
                      {selectedQR.codigo_qr}
                    </p>
                  </div>
                )}
              </div>
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
