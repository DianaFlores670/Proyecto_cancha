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
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  },
  ENCARGADO: {
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
  const prio = ["ADMINISTRADOR", "ADMIN_ESP_DEP", "ENCARGADO"];
  return (
    prio.find((r) => norm2.includes(r) && keys.includes(r)) ||
    norm2.find((r) => keys.includes(r)) ||
    "DEFAULT"
  );
};

const ReservaHorario = () => {
  const [horarios, setHorarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentHorario, setCurrentHorario] = useState(null);
  const [formData, setFormData] = useState({
    id_reserva: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    monto: "",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
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

  useEffect(() => {
    const fetchReservas = async () => {
      try {
        const response = await api.get("/reserva/activas");
        if (response.data?.exito)
          setReservas(response.data.datos.reservas || []);
        else setError(response.data?.mensaje || "Error al obtener reservas");
      } catch (err) {
        setError(
          err.response?.data?.mensaje || "Error de conexion al obtener reservas"
        );
      }
    };
    if (permissions.canView) fetchReservas();
  }, [role]);

  const fetchHorarios = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver los datos");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) response = await api.get('/reserva-horario/buscar', { params: fullParams });
      else if (params.tipo) response = await api.get('/reserva-horario/filtro', { params: fullParams });
      else response = await api.get('/reserva-horario/datos-especificos', { params: fullParams });

      if (response.data?.exito) {
        setHorarios(response.data.datos.horarios || []);
        setTotal(response.data.datos.paginacion?.total || 0);
      } else {
        setError(response.data?.mensaje || "Error al cargar horarios");
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion al servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHorarios();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setFiltro("");
    if (searchTerm.trim()) fetchHorarios({ q: searchTerm });
    else fetchHorarios();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    setSearchTerm("");
    if (tipo) fetchHorarios({ tipo });
    else fetchHorarios();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm("Estas seguro de eliminar este horario de reserva?"))
      return;
    try {
      const response = await api.delete(`/reserva-horario/${id}`);
      if (response.data?.exito) fetchHorarios();
      else setError(response.data?.mensaje || "No se pudo eliminar");
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      id_reserva: "",
      fecha: "",
      hora_inicio: "",
      hora_fin: "",
      monto: "",
    });
    setCurrentHorario(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/reserva-horario/dato-individual/${id}`);
      if (response.data?.exito) {
        const h = response.data.datos.horario;
        setFormData({
          id_reserva: h.id_reserva || "",
          fecha: h.fecha ? new Date(h.fecha).toISOString().split("T")[0] : "",
          hora_inicio: h.hora_inicio || "",
          hora_fin: h.hora_fin || "",
          monto: h.monto || "",
        });
        setCurrentHorario(h);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data?.mensaje || "No se pudo cargar el registro");
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/reserva-horario/dato-individual/${id}`);
      if (response.data?.exito) {
        const h = response.data.datos.horario;
        setFormData({
          id_reserva: h.id_reserva || "",
          fecha: h.fecha ? new Date(h.fecha).toISOString().split("T")[0] : "",
          hora_inicio: h.hora_inicio || "",
          hora_fin: h.hora_fin || "",
          monto: h.monto || "",
        });
        setCurrentHorario(h);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data?.mensaje || "No se pudo cargar el registro");
      }
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion al servidor");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentHorario(null);
    setError(null);
    setViewMode(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "id_reserva") {
      const selectedReserva = reservas.find(
        (r) => r.id_reserva === parseInt(value)
      );
      if (selectedReserva) {
        setFormData((prev) => ({
          ...prev,
          id_reserva: value,
          fecha: selectedReserva.fecha_reserva
            ? new Date(selectedReserva.fecha_reserva)
                .toISOString()
                .split("T")[0]
            : "",
          monto: selectedReserva.monto_total || "1",
        }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toTimeWithSeconds = (t) => (t && t.length === 5 ? `${t}:00` : t);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      viewMode ||
      (!permissions.canCreate && !editMode) ||
      (!permissions.canEdit && editMode)
    )
      return;
    try {
      const filtered = {
        id_reserva: formData.id_reserva
          ? parseInt(formData.id_reserva)
          : undefined,
        fecha: formData.fecha || undefined,
        hora_inicio: toTimeWithSeconds(formData.hora_inicio || ""),
        hora_fin: toTimeWithSeconds(formData.hora_fin || ""),
        monto: formData.monto !== "" ? parseFloat(formData.monto) : undefined,
      };
      if (
        !filtered.id_reserva ||
        !reservas.some((r) => r.id_reserva === filtered.id_reserva)
      ) {
        setError("La reserva seleccionada no es valida");
        return;
      }
      if (!filtered.fecha) {
        setError("La fecha es obligatoria");
        return;
      }
      const f = new Date(filtered.fecha);
      if (isNaN(f.getTime())) {
        setError("La fecha no es valida");
        return;
      }
      const re = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!filtered.hora_inicio || !re.test(filtered.hora_inicio)) {
        setError("Hora inicio invalida");
        return;
      }
      if (!filtered.hora_fin || !re.test(filtered.hora_fin)) {
        setError("Hora fin invalida");
        return;
      }
      const hi = new Date(
        `1970-01-01T${toTimeWithSeconds(filtered.hora_inicio)}Z`
      );
      const hf = new Date(
        `1970-01-01T${toTimeWithSeconds(filtered.hora_fin)}Z`
      );
      if (hi >= hf) {
        setError("La hora de inicio debe ser anterior a la hora de fin");
        return;
      }
      if (
        filtered.monto !== undefined &&
        (isNaN(filtered.monto) || filtered.monto < 0)
      ) {
        setError("El monto debe ser numero no negativo");
        return;
      }

      let response;
      if (editMode) response = await api.patch(`/reserva-horario/${currentHorario.id_horario}`, filtered);
      else response = await api.post('/reserva-horario/', filtered);

      if (response.data?.exito) {
        closeModal();
        fetchHorarios();
      } else setError(response.data?.mensaje || "No se pudo guardar");
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
      <h2 className="text-xl font-semibold mb-4">
        Gestion de Horarios de Reserva
      </h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente o cancha"
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
            className="border rounded px-3 py-2 flex-1 sm:min-w-[160px]"
          >
            <option value="">Todos - Sin filtro</option>
            <option value="fecha">Ordenar por fecha</option>
            <option value="hora">Ordenar por hora</option>
            <option value="monto">Ordenar por monto</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear Horario
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando horarios...</p>
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
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Hora Inicio</th>
                  <th className="px-4 py-2 text-left">Hora Fin</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario, index) => (
                  <tr key={horario.id_horario} className="border-t">
                    <td className="px-4 py-2">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-2">{`${horario.cliente_nombre} ${horario.cliente_apellido}`}</td>
                    <td className="px-4 py-2">{horario.cancha_nombre}</td>
                    <td className="px-4 py-2">
                      {new Date(horario.fecha).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">{horario.hora_inicio}</td>
                    <td className="px-4 py-2">{horario.hora_fin}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(horario.id_horario)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(horario.id_horario)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(horario.id_horario)}
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
              {viewMode
                ? "Ver Datos de Horario de Reserva"
                : editMode
                ? "Editar Horario de Reserva"
                : "Crear Horario de Reserva"}
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
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
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
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="date"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Hora Inicio
                </label>
                <input
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Hora Fin
                </label>
                <input
                  name="hora_fin"
                  value={formData.hora_fin}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="time"
                  step="1"
                  required
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Monto</label>
                <input
                  name="monto"
                  value={formData.monto}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2 flex justify-end mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
                >
                  Cerrar
                </button>
                {!viewMode && (
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {editMode ? "Actualizar" : "Crear"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservaHorario;
