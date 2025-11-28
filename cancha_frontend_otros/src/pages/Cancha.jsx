/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

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
  const norm = Array.from(bag).map((v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
  );
  const map = (v) => (v === "ADMIN" ? "ADMINISTRADOR" : v);
  const norm2 = norm.map(map);
  const prio = ["ADMINISTRADOR", "ADMIN_ESP_DEP"];
  return (
    prio.find((r) => norm2.includes(r) && keys.includes(r)) ||
    norm2.find((r) => keys.includes(r)) ||
    "DEFAULT"
  );
};

const Cancha = () => {
  const [canchas, setCanchas] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinasSeleccionadas, setDisciplinasSeleccionadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [currentCancha, setCurrentCancha] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "",
    ubicacion: "",
    capacidad: "",
    estado: "",
    monto_por_hora: "",
    imagen_cancha: "",
    id_espacio: "",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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

  useEffect(() => {
    setError(null);
  }, [role]);

  const permissions =
    role && permissionsConfig[role]
      ? permissionsConfig[role]
      : permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchEsp = async () => {
      const limitEsp = 9999;
      const offset = 0;
      try {
        const response = await api.get("/espacio_deportivo/datos-especificos", {
          params: { limit: limitEsp, offset }
        });
        if (response.data?.exito)
          setEspacios(response.data.datos.espacios || []);
      } catch { }
    };
    fetchEsp();
  }, []);

  useEffect(() => {
    const fetchDisc = async () => {
      const limitEsp = 9999;
      const offset = 0;
      try {
        const response = await api.get("/cancha/disciplinas", {
          params: { limit: limitEsp, offset }
        });
        if (response.data?.exito)
          setDisciplinas(response.data.datos.disciplinas || []);
      } catch { }
    };
    fetchDisc();
  }, []);

  const getImageUrl = (path) => {
    if (!path) return null;
    try {
      // Cambia a tu dominio de Render
      const base = "https://proyecto-cancha.onrender.com".replace(/\/$/, "");
      const cleanPath = String(path).replace(/^\//, "");
      return `${base}/${cleanPath}`;
    } catch {
      return path;
    }
  };

  const fetchCanchas = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver canchas");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q)
        response = await api.get("/cancha/buscar", { params: fullParams });
      else if (params.tipo)
        response = await api.get("/cancha/filtro", { params: fullParams });
      else
        response = await api.get("/cancha/datos-especificos", {
          params: fullParams,
        });
      if (response.data.exito) {
        setCanchas(response.data.datos.canchas);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje || "Error al cargar canchas");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) fetchCanchas();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) fetchCanchas({ q: searchTerm });
    else fetchCanchas();
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchCanchas({ tipo });
    else fetchCanchas();
  };
  const handleDelete = (cancha) => {
    setDeleteUser(cancha);
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleteUser) return;

    if (!permissions.canDelete) {
      setError('No tienes permisos para eliminar canchas');
      return;
    }

    try {
      // Llamada a la API para eliminar el cancha
      const response = await api.delete(`/cancha/${deleteUser.id_cancha}`);

      // Verificar la respuesta de la API
      if (response.data.exito) {
        setDeleteOpen(false);  // Cerrar el modal de eliminación
        setDeleteUser(null);  // Limpiar el cancha a eliminar
        fetchCanchas();  // Recargar la lista de canchaes
      } else {
        setError(response.data.mensaje || 'No se pudo eliminar');  // Si hay un mensaje de error, mostrarlo
      }
    } catch (err) {
      // Capturar cualquier error de la llamada a la API
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);  // Mostrar el mensaje de error
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);  // Cerrar el modal de eliminación
    setDeleteUser(null);  // Limpiar el cancha a eliminar
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: "",
      ubicacion: "",
      capacidad: "",
      estado: "",
      monto_por_hora: "",
      imagen_cancha: "",
      id_espacio: "",
    });
    setDisciplinasSeleccionadas([]);
    setSelectedFile(null);
    setImagePreview(null);
    setCurrentCancha(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/cancha/dato-individual/${id}`);
      if (response.data.exito) {
        const c = response.data.datos.cancha;
        setFormData({
          nombre: c.nombre || "",
          ubicacion: c.ubicacion || "",
          capacidad: c.capacidad || "",
          estado: c.estado || "",
          monto_por_hora: c.monto_por_hora || "",
          imagen_cancha: c.imagen_cancha || "",
          id_espacio: c.id_espacio || "",
        });
        setImagePreview(c.imagen_cancha ? getImageUrl(c.imagen_cancha) : null);
        setSelectedFile(null);
        if (Array.isArray(c.disciplinas)) {
          setDisciplinasSeleccionadas(
            c.disciplinas.map((d) => ({
              id_disciplina: d.id_disciplina,
              nombre: d.nombre,
              frecuencia_practica: d.frecuencia_practica || "Regular",
            }))
          );
        } else {
          setDisciplinasSeleccionadas([]);
        }
        setCurrentCancha(c);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || "No se pudo cargar la cancha");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(errorMessage);
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/cancha/dato-individual/${id}`);
      if (response.data.exito) {
        const c = response.data.datos.cancha;
        setFormData({
          nombre: c.nombre || "",
          ubicacion: c.ubicacion || "",
          capacidad: c.capacidad || "",
          estado: c.estado || "",
          monto_por_hora: c.monto_por_hora || "",
          imagen_cancha: c.imagen_cancha || "",
          id_espacio: c.id_espacio || "",
        });
        setImagePreview(c.imagen_cancha ? getImageUrl(c.imagen_cancha) : null);
        setSelectedFile(null);
        if (Array.isArray(c.disciplinas)) {
          setDisciplinasSeleccionadas(
            c.disciplinas.map((d) => ({
              id_disciplina: d.id_disciplina,
              nombre: d.nombre,
              frecuencia_practica: d.frecuencia_practica || "Regular",
            }))
          );
        } else {
          setDisciplinasSeleccionadas([]);
        }
        setCurrentCancha(c);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || "No se pudo cargar la cancha");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(errorMessage);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentCancha(null);
    setDisciplinasSeleccionadas([]);
    setError(null);
    setViewMode(false);
    setModalError(null);
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      viewMode ||
      (!permissions.canCreate && !editMode) ||
      (!permissions.canEdit && editMode)
    )
      return;
    try {
      let response;
      const data = new FormData();
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const required = ["nombre", "id_espacio"];
          if (required.includes(key)) return true;
          return value !== "" && value !== null && value !== undefined;
        })
      );
      Object.entries(filteredData).forEach(([key, value]) => {
        if (key !== "imagen_cancha") data.append(key, value);
      });
      if (selectedFile) data.append("imagen_cancha", selectedFile);

      if (filteredData.nombre && filteredData.nombre.length > 100) {
        setError("El nombre no debe exceder 100 caracteres");
        return;
      }
      if (filteredData.ubicacion && filteredData.ubicacion.length > 255) {
        setError("La ubicacion no debe exceder 255 caracteres");
        return;
      }
      if (
        filteredData.capacidad &&
        (isNaN(filteredData.capacidad) || Number(filteredData.capacidad) < 0)
      ) {
        setError("La capacidad debe ser un numero positivo");
        return;
      }
      const estadosValidos = ["disponible", "ocupada", "mantenimiento"];
      if (
        filteredData.estado &&
        !estadosValidos.includes(String(filteredData.estado))
      ) {
        setError("Estado invalido");
        return;
      }
      if (
        filteredData.monto_por_hora &&
        (isNaN(filteredData.monto_por_hora) ||
          Number(filteredData.monto_por_hora) < 0)
      ) {
        setError("El monto por hora debe ser un numero positivo");
        return;
      }
      if (
        filteredData.id_espacio &&
        !espacios.some(
          (e) => e.id_espacio === parseInt(filteredData.id_espacio)
        )
      ) {
        setError("El espacio deportivo seleccionado no es valido");
        return;
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      if (editMode) {
        response = await api.patch(
          `/cancha/${currentCancha.id_cancha}`,
          data,
          config
        );
        if (response.data.exito) {
          await api.post(`/cancha/${currentCancha.id_cancha}/disciplinas`, {
            disciplinas: disciplinasSeleccionadas,
          });
        }
      } else {
        response = await api.post("/cancha/", data, config);
        if (response.data.exito) {
          const nuevaId = response.data?.datos?.cancha?.id_cancha;
          if (nuevaId) {
            await api.post(`/cancha/${nuevaId}/disciplinas`, {
              disciplinas: disciplinasSeleccionadas,
            });
          }
        }
      }

      if (response.data.exito) {
        closeModal();
        fetchCanchas();
      } else setError(response.data.mensaje || "No se pudo guardar");
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje ||
        err.message ||
        "Error de conexion al servidor";
      setError(errorMessage);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  const handleDisciplinaChange = (e) => {
    const selectedId = parseInt(e.target.value);
    if (
      selectedId &&
      !disciplinasSeleccionadas.some((d) => d.id_disciplina === selectedId)
    ) {
      const disciplina = disciplinas.find(
        (d) => d.id_disciplina === selectedId
      );
      if (disciplina) {
        setDisciplinasSeleccionadas((prev) => [
          ...prev,
          {
            id_disciplina: disciplina.id_disciplina,
            nombre: disciplina.nombre,
            frecuencia_practica: "Regular",
          },
        ]);
      }
    }
  };

  const handleFrecuenciaChange = (id_disciplina, frecuencia) => {
    setDisciplinasSeleccionadas((prev) =>
      prev.map((d) =>
        d.id_disciplina === id_disciplina
          ? { ...d, frecuencia_practica: frecuencia }
          : d
      )
    );
  };

  const handleRemoveDisciplina = (id_disciplina) => {
    setDisciplinasSeleccionadas((prev) =>
      prev.filter((d) => d.id_disciplina !== id_disciplina)
    );
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestion de Canchas</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, ubicacion o espacio deportivo"
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
            <option value="">Sin filtro</option>
            <option value="nombre">Por nombre</option>
            <option value="estado">Por estado</option>
            <option value="monto">Por monto por hora</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              Crear Cancha
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando canchas...</p>
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
                  <th className="px-4 py-2 text-left">Ubicacion</th>
                  <th className="px-4 py-2 text-left">Capacidad</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Monto por hora</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {canchas.map((cancha, index) => (
                  <tr key={cancha.id_cancha} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3">{cancha.nombre}</td>
                    <td className="px-4 py-3">{cancha.ubicacion || "-"}</td>
                    <td className="px-4 py-3">{cancha.capacidad || "-"}</td>
                    <td className="px-4 py-3">{cancha.estado || "-"}</td>
                    <td className="px-4 py-3">
                      {cancha.monto_por_hora
                        ? `$${cancha.monto_por_hora}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(cancha.id_cancha)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(cancha.id_cancha)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(cancha)}
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
            {canchas.map((cancha, index) => (
              <div key={cancha.id_cancha} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {cancha.nombre}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cancha #{(page - 1) * limit + index + 1}
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Ubicación: </span>
                        {cancha.ubicacion || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Capacidad: </span>
                        {cancha.capacidad || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Estado: </span>
                        {cancha.estado || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Monto por hora: </span>
                        {cancha.monto_por_hora ? `$${cancha.monto_por_hora}` : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(cancha)}>
                      <FiMoreVertical size={22} />
                    </button>
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
              {viewMode
                ? "Ver Datos de Cancha"
                : editMode
                  ? "Editar Cancha"
                  : "Crear Cancha"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
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
                <label className="block text-sm font-semibold mb-1">
                  Ubicacion
                </label>
                <input
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Capacidad
                </label>
                <input
                  name="capacidad"
                  value={formData.capacidad}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                >
                  <option value="">Seleccione un estado</option>
                  <option value="disponible">Disponible</option>
                  <option value="ocupada">Ocupada</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Monto por hora
                </label>
                <input
                  name="monto_por_hora"
                  value={formData.monto_por_hora}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Imagen cancha
                </label>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Imagen Cancha"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen</p>
                ) : null}

                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  />
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">
                  Espacio deportivo
                </label>
                <select
                  name="id_espacio"
                  value={formData.id_espacio}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un espacio deportivo</option>
                  {espacios.map((espacio) => (
                    <option key={espacio.id_espacio} value={espacio.id_espacio}>
                      {espacio.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">
                  Disciplinas
                </label>
                {viewMode ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {disciplinasSeleccionadas.map((d) => (
                      <div
                        key={d.id_disciplina}
                        className="flex items-center justify-between p-2 border rounded-xl"
                      >
                        <span className="flex-1">{d.nombre}</span>
                        <span>{d.frecuencia_practica}</span>
                      </div>
                    ))}
                    {disciplinasSeleccionadas.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-2">
                        No hay disciplinas seleccionadas
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <select
                      onChange={handleDisciplinaChange}
                      className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                      value=""
                      disabled={viewMode}
                    >
                      <option value="">
                        Seleccione una disciplina para agregar
                      </option>
                      {disciplinas
                        .filter(
                          (d) =>
                            !disciplinasSeleccionadas.some(
                              (s) => s.id_disciplina === d.id_disciplina
                            )
                        )
                        .map((d) => (
                          <option key={d.id_disciplina} value={d.id_disciplina}>
                            {d.nombre}
                          </option>
                        ))}
                    </select>
                    <div className="space-y-2 max-h-40 overflow-y-auto mt-3">
                      {disciplinasSeleccionadas.map((d) => (
                        <div
                          key={d.id_disciplina}
                          className="flex items-center justify-between p-2 border rounded-xl"
                        >
                          <span className="flex-1">{d.nombre}</span>
                          <select
                            value={d.frecuencia_practica}
                            onChange={(e) =>
                              handleFrecuenciaChange(
                                d.id_disciplina,
                                e.target.value
                              )
                            }
                            className="border rounded px-2 py-1 mx-2"
                            disabled={viewMode}
                          >
                            <option value="Regular">Regular</option>
                            <option value="Ocasional">Ocasional</option>
                            <option value="Frecuente">Frecuente</option>
                            <option value="Intensivo">Intensivo</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveDisciplina(d.id_disciplina)
                            }
                            className="text-red-500 hover:text-red-700 ml-2"
                            disabled={viewMode}
                          >
                            x
                          </button>
                        </div>
                      ))}
                      {disciplinasSeleccionadas.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-2">
                          No hay disciplinas seleccionadas
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              {/* Ver datos del cancha */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_cancha); // Abre el modal para ver datos del cancha
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              {/* Editar cancha */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_cancha); // Abre el modal para editar cancha
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
              </button>

              {/* Eliminar cancha */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);  // Abre el modal de eliminación
                  setDeleteUser(mobileModal); // Establece el cancha a eliminar
                }}
                className="px-3 py-2 text-left text-red-600 hover:bg-red-50 mt-1 rounded"
              >
                Eliminar
              </button>

              {/* Cancelar opción */}
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
              Eliminar cancha
            </h3>
            <p className="text-gray-700 text-md">
              ¿Estás seguro de eliminar a <span className="font-bold">{deleteUser.nombre} {deleteUser.apellido}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              {/* Botón de cancelar */}
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2 bg-gray-200 rounded-full text-md font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancelar
              </button>

              {/* Botón de eliminar */}
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

export default Cancha;
