/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import api from "../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

const permissionsConfig = {
  ADMINISTRADOR: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true
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
  } catch { }
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
    } catch { }
  }
  const norm2 = Array.from(bag).map((v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
  );
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
  const [modalOpen, setModalOpen] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [currentQR, setCurrentQR] = useState(null);
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
        const r = await api.get("/reserva/datos-especificos", {
          params: { limit: 9999, offset: 0 }
        });
        if (r.data?.exito) setReservas(r.data.datos?.reservas || []);
      } catch { }
    };

    const fetchControles = async () => {
      try {
        const r = await api.get("/control/datos-especificos", {
          params: { limit: 9999, offset: 0 }
        });
        if (r.data?.exito) setControles(r.data.datos?.controles || []);
      } catch { }
    };

    if (permissions.canView) {
      fetchReservas();
      fetchControles();
    }
  }, [role, permissions.canView]);

  const openDetailModal = async (qr) => {
    if (!permissions.canView) return;

    try {
      const r = await api.get(`/qr-reserva/dato-individual/${qr.id_qr}`);
      if (r.data?.exito) {
        setSelectedQR(r.data.datos.qr);
        setModalOpen("detalle");
      }
    } catch (e) {
      setError("No se pudo cargar los datos completos");
    }
  };

  const fetchQRs = async (params = {}) => {
    if (!permissions.canView) return;
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
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = async (qr) => {
    if (!permissions.canView) return;

    try {
      const r = await api.get(`/qr-reserva/dato-individual/${qr.id_qr}`);
      if (r.data?.exito) {
        setSelectedQR(r.data.datos.qr);
        setModalOpen("detalle");
      }
    } catch {
      setError("No se pudo cargar los datos completos");
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
    setSearchTerm("");
    setPage(1);
    if (tipo) fetchQRs({ tipo });
    else fetchQRs();
  };

  const handleDelete = (qr) => {
    setDeleteUser(qr);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteUser) return;
    try {
      const r = await api.delete(`/qr-reserva/${deleteUser.id_qr}`);
      if (r.data?.exito) {
        setDeleteOpen(false);
        setDeleteUser(null);
        fetchQRs();
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error al eliminar");
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteUser(null);
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setCurrentQR(null);
    setSelectedQR(null);
    setJoinLink(null);
    setFormData({
      id_reserva: "",
      fecha_generado: new Date().toISOString().slice(0, 16),
      fecha_expira: "",
      codigo_qr: "",
      estado: "activo",
      id_control: "",
      verificado: false
    });
    setModalOpen("crear");
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const r = await api.get(`/qr-reserva/dato-individual/${id}`);
      if (r.data?.exito) {
        const qr = r.data.datos?.qr;
        setCurrentQR(qr);
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
        setEditMode(true);
        setSelectedQR(null);
        setJoinLink(null);
        setModalOpen("editar");
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error al cargar");
    }
  };

  const closeModal = () => {
    setModalOpen(null);
    setSelectedQR(null);
    setCurrentQR(null);
    setJoinLink(null);
    setModalError(null);
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
    try {
      const payloadBase = {
        id_reserva: parseInt(formData.id_reserva),
        fecha_generado: formData.fecha_generado,
        fecha_expira: formData.fecha_expira || undefined,
        estado: formData.estado,
        id_control: formData.id_control
          ? parseInt(formData.id_control)
          : undefined,
        verificado: !!formData.verificado
      };

      let r;

      if (editMode) {
        r = await api.patch(`/qr-reserva/${currentQR.id_qr}`, {
          ...payloadBase,
          codigo_qr: formData.codigo_qr || undefined
        });
      } else {
        r = await api.post("/qr-reserva/", payloadBase);
      }

      if (r.data?.exito) {
        if (!editMode && r.data.datos?.link_unirse)
          setJoinLink(r.data.datos.link_unirse);

        fetchQRs();

        if (editMode) closeModal();
      } else {
        setModalError(r.data?.mensaje || "No se pudo guardar");
        setTimeout(() => setModalError(null), 4000);
      }
    } catch (err) {
      setModalError(err.response?.data?.mensaje || "Error al guardar");
      setTimeout(() => setModalError(null), 4000);
    }
  };

  const handleRegenerarQR = async () => {
    if (!editMode || !currentQR?.id_reserva) return;
    try {
      const r = await api.post(
        `/qr-reserva/regenerar-por-reserva/${currentQR.id_reserva}`
      );
      if (r.data?.exito) {
        fetchQRs();
        closeModal();
      }
    } catch { }
  };

  const handlePageChange = (n) => {
    if (n >= 1 && n <= Math.ceil(total / limit)) setPage(n);
  };

  if (!permissions.canView)
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p>No tienes permisos para ver esta pagina.</p>
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Gestion de QR de Reservas
      </h2>

      {/* BUSCADOR */}
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0">
        <div className="flex flex-col md:flex-row gap-3">
          <form
            onSubmit={handleSearch}
            className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden"
          >
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cancha o codigo QR"
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
            />
            <button className="bg-[#23475F] text-white px-6 rounded-full text-md">
              Buscar
            </button>
          </form>

          <select
            value={filtro}
            onChange={handleFiltroChange}
            className="bg-[#F1F5F9] rounded-full px-4 py-2 shadow-sm text-md"
          >
            <option value="">Todos</option>
            <option value="cliente_nombre">Cliente A-Z</option>
            <option value="fecha_generado">Fecha reciente</option>
            <option value="verificado_si">Solo verificados</option>
            <option value="verificado_no">Solo no verificados</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm py-2"
            >
              Crear QR
            </button>
          )}
        </div>
      </div>

      {/* TABLA DESKTOP */}
      {!loading && !error && (
        <div className="hidden md:block mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse rounded-lg shadow-sm">
            <thead className="bg-[#23475F] text-white text-md">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Cancha</th>
                <th className="px-4 py-2 text-left">Fecha generado</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Verificado</th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {qrs.map((qr, idx) => (
                <tr
                  key={qr.id_qr}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">{(page - 1) * limit + idx + 1}</td>
                  <td className="px-4 py-3">
                    {qr.cliente_nombre} {qr.cliente_apellido}
                  </td>
                  <td className="px-4 py-3">{qr.cancha_nombre}</td>
                  <td className="px-4 py-3">
                    {new Date(qr.fecha_generado).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs border ${qr.estado === "activo"
                        ? "bg-green-100 text-green-800"
                        : qr.estado === "expirado"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                        }`}
                    >
                      {qr.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs border ${qr.verificado
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {qr.verificado ? "Si" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    {permissions.canView && (
                      <button
                        onClick={() => openDetailModal(qr)}
                        className="text-green-500 hover:text-green-700"
                      >
                        Ver
                      </button>
                    )}

                    {permissions.canEdit && (
                      <button
                        onClick={() => openEditModal(qr.id_qr)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        Editar
                      </button>
                    )}

                    {permissions.canDelete && (
                      <button
                        onClick={() => handleDelete(qr)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Eliminar
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
                    No hay registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CARDS MOVIL */}
      <div className="md:hidden mt-6 space-y-4 pb-32">
        {qrs.map((qr, idx) => (
          <div
            key={qr.id_qr}
            className="border bg-white rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-[#23475F]">
                  {qr.cliente_nombre} {qr.cliente_apellido}
                </div>
                <div className="text-xs text-gray-500">
                  QR #{(page - 1) * limit + idx + 1}
                </div>
                <div className="mt-3 text-sm space-y-1">
                  <div>
                    <span className="font-semibold">Cancha: </span>
                    {qr.cancha_nombre}
                  </div>
                  <div>
                    <span className="font-semibold">Generado: </span>
                    {new Date(qr.fecha_generado).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Estado: </span>
                    <span
                      className={`font-semibold ${qr.estado === "activo"
                        ? "text-green-600"
                        : qr.estado === "expirado"
                          ? "text-red-600"
                          : "text-yellow-600"
                        }`}
                    >
                      {qr.estado}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Verificado: </span>
                    <span
                      className={`font-semibold ${qr.verificado ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      {qr.verificado ? "Si" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              <button onClick={() => setMobileModal(qr)}>
                <FiMoreVertical size={22} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINACION */}
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

      {/* MODAL CREAR / EDITAR */}
      {modalOpen && (modalOpen === "crear" || modalOpen === "editar") && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              {modalOpen === "editar"
                ? "Editar QR de Reserva"
                : "Crear QR de Reserva"}
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
              <div>
                <label className="block text-sm font-semibold mb-1">Reserva</label>
                <select
                  name="id_reserva"
                  value={formData.id_reserva}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                >
                  <option value="">Seleccione</option>
                  {reservas.map((r) => (
                    <option key={r.id_reserva} value={r.id_reserva}>
                      #{r.id_reserva} - {r.cliente_nombre} {r.cliente_apellido}{" "}
                      ({r.cancha_nombre})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Fecha generado
                </label>
                <input
                  type="datetime-local"
                  name="fecha_generado"
                  value={formData.fecha_generado}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Fecha expira
                </label>
                <input
                  type="datetime-local"
                  name="fecha_expira"
                  value={formData.fecha_expira}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Codigo QR
                </label>
                <input
                  name="codigo_qr"
                  value={formData.codigo_qr}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  readOnly={modalOpen !== "editar"}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                >
                  <option value="activo">Activo</option>
                  <option value="expirado">Expirado</option>
                  <option value="usado">Usado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Control</label>
                <select
                  name="id_control"
                  value={formData.id_control}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                >
                  <option value="">Ninguno</option>
                  {controles.map((c) => (
                    <option key={c.id_control} value={c.id_control}>
                      #{c.id_control} - {c.nombre} {c.apellido}
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
                    className={`w-11 h-6 rounded-full transition-colors ${formData.verificado ? "bg-green-500" : "bg-gray-300"
                      }`}
                  />
                  <div
                    className={`absolute left-0.5 top-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform ${formData.verificado ? "translate-x-5" : ""
                      }`}
                  />
                  <span className="ml-3 text-sm text-gray-600">
                    {formData.verificado ? "Verificado" : "No verificado"}
                  </span>
                </label>
              </div>

              {formData.codigo_qr && (
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Vista previa
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
                  <label className="block text-sm font-semibold mb-1">
                    Link para unirse
                  </label>
                  <p className="mt-1 p-2 bg-gray-100 rounded break-words text-sm">
                    {joinLink}
                  </p>
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
                {modalOpen === "editar" && (
                  <button
                    type="button"
                    onClick={handleRegenerarQR}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600"
                  >
                    Regenerar QR
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded-full hover:bg-gray-600"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
                >
                  {modalOpen === "editar" ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {modalOpen === "detalle" && selectedQR && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Detalles completos del QR</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">ID QR:</label>
                  <p className="p-2 bg-gray-50 rounded">#{selectedQR.id_qr}</p>
                </div>

                <div>
                  <label className="font-medium text-gray-700">Reserva:</label>
                  <p className="p-2 bg-gray-50 rounded">#{selectedQR.id_reserva}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Cliente:</label>
                  <p className="p-2 bg-gray-50 rounded">
                    {selectedQR.cliente_nombre} {selectedQR.cliente_apellido}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Cancha:</label>
                  <p className="p-2 bg-gray-50 rounded">{selectedQR.cancha_nombre}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Fecha generado:</label>
                  <p className="p-2 bg-gray-50 rounded">
                    {new Date(selectedQR.fecha_generado).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Fecha expiracion:</label>
                  <p className="p-2 bg-gray-50 rounded">
                    {selectedQR.fecha_expira
                      ? new Date(selectedQR.fecha_expira).toLocaleString()
                      : "No expira"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-gray-700">Estado: </label>
                  <span
                    className={`px-3 py-1 rounded-full text-xs border ${selectedQR.estado === "activo"
                      ? "bg-green-100 text-green-800"
                      : selectedQR.estado === "expirado"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                      }`}
                  >
                    {selectedQR.estado}
                  </span>
                </div>

                <div>
                  <label className="font-medium text-gray-700">Verificado: </label>
                  <span
                    className={`px-3 py-1 rounded-full text-xs border ${selectedQR.verificado
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    {selectedQR.verificado ? "Si" : "No"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {selectedQR.id_control && (
                  <div>
                    <label className="font-medium text-gray-700">Control asociado:</label>
                    <p className="p-2 bg-gray-50 rounded">
                      #{selectedQR.id_control}{" "}
                      {selectedQR.control_nombre || selectedQR.control_apellido
                        ? ` - ${selectedQR.control_nombre || ""} ${selectedQR.control_apellido || ""}`
                        : ""}
                    </p>
                  </div>
                )}

                {selectedQR.codigo_qr && (
                  <div>
                    <label className="font-medium text-gray-700">QR generado</label>
                    <div className="mt-2 flex justify-center">
                      <div className="p-4 border rounded bg-white">
                        <QRCode value={selectedQR.codigo_qr} size={200} />
                      </div>
                    </div>
                    <p className="mt-2 p-2 bg-gray-100 rounded break-words font-mono text-sm">
                      {selectedQR.codigo_qr}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <button
                onClick={closeModal}
                className="bg-gray-500 text-white px-6 py-2 rounded-full hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE OPTIONS */}
      {mobileModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-72 p-5 shadow-xl">
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
                  openViewModal(mobileModal);
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_qr);
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);
                  setDeleteUser(mobileModal);
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

      {/* MODAL DELETE */}
      {deleteOpen && deleteUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Eliminar QR
            </h3>
            <p className="text-gray-700 text-md">
              Seguro de eliminar{" "}
              <span className="font-bold">
                #{deleteUser.id_qr} {deleteUser.cliente_nombre}{" "}
                {deleteUser.cliente_apellido}
              </span>
              ?
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

export default QRReserva;