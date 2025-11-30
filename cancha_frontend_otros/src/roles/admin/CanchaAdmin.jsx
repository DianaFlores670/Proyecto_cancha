/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

const norm = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const readTokenPayload = () => {
  try {
    const t = localStorage.getItem("token");
    if (!t || t.split(".").length !== 3) return {};
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b.length % 4)) % 4);
    return JSON.parse(atob(b + pad));
  } catch {
    return {};
  }
};

const pickRole = (u, p) => {
  const bag = new Set();
  const arr = Array.isArray(u?.roles) ? u.roles : u?.role ? [u.role] : [];
  arr.forEach((r) =>
    bag.add(
      norm(
        typeof r === "string" ? r : r?.rol || r?.role || r?.nombre || r?.name
      )
    )
  );
  const parr = Array.isArray(p?.roles) ? p.roles : p?.rol ? [p.rol] : [];
  parr.forEach((r) => bag.add(norm(r)));
  const list = Array.from(bag);
  if (list.includes("ADMIN_ESP_DEP")) return "ADMIN_ESP_DEP";
  if (list.includes("ADMIN") || list.includes("ADMINISTRADOR"))
    return "ADMINISTRADOR";
  return list[0] || "DEFAULT";
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

// utils.js
export const getImageUrl = (path) => {
  if (!path) return "";

  // Si ya viene como URL completa, NO añadir dominio
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Si viene solo la ruta, concatenar dominio
  return `https://proyecto-cancha.onrender.com${path}`;
};

const CanchaAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);

  const [canchas, setCanchas] = useState([]);
  const [espacios, setEspacios] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [disciplinasSeleccionadas, setDisciplinasSeleccionadas] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

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

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const u = readUser();
    const p = readTokenPayload();
    const r = pickRole(u, p);
    setRole(r);
    const idGuess = resolveAdminId(u, p);
    setIdAdminEspDep(r === "ADMIN_ESP_DEP" ? idGuess : null);
  }, []);

  useEffect(() => {
    setError(null);
  }, [role, idAdminEspDep]);

  const permissions =
    permissionsConfig[role || "DEFAULT"] || permissionsConfig.DEFAULT;

  useEffect(() => {
    const fetchEspacios = async () => {
      if (!(role && permissions.canView)) return;
      const extra =
        role === "ADMIN_ESP_DEP" && idAdminEspDep
          ? { id_admin_esp_dep: idAdminEspDep }
          : {};
      try {
        const r = await api.get("/cancha-admin/espacios", {
          params: { ...extra, limit: 100, offset: 0 },
        });
        if (r.data?.exito)
          setEspacios(
            Array.isArray(r.data.datos?.espacios) ? r.data.datos.espacios : []
          );
      } catch (e) { }
    };
    fetchEspacios();
  }, [role, idAdminEspDep, permissions.canView]);

  useEffect(() => {
    if (!(role && permissions.canView)) return;
    const fetchDisciplinas = async () => {
      try {
        const r = await api.get("/cancha-admin/disciplinas");
        const list = Array.isArray(r.data?.datos?.disciplinas)
          ? r.data.datos.disciplinas
          : [];
        setDisciplinas(list);
      } catch (e) {
        setError("Error al cargar disciplinas");
      }
    };
    fetchDisciplinas();
  }, [role, permissions.canView]);

  const fetchCanchas = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const extra =
      role === "ADMIN_ESP_DEP" && idAdminEspDep
        ? { id_admin_esp_dep: idAdminEspDep }
        : {};
    const fullParams = { ...params, limit, offset, ...extra };
    try {
      let resp;
      if (params.q)
        resp = await api.get("/cancha-admin/buscar", { params: fullParams });
      else if (params.tipo)
        resp = await api.get("/cancha-admin/filtro", { params: fullParams });
      else
        resp = await api.get("/cancha-admin/datos-especificos", {
          params: fullParams,
        });
      if (resp.data?.exito) {
        const rows = Array.isArray(resp.data.datos?.canchas)
          ? resp.data.datos.canchas
          : [];
        const t = resp.data.datos?.paginacion?.total;
        setCanchas(rows);
        setTotal(typeof t === "number" ? t : rows.length);
      } else {
        setError(resp.data?.mensaje || "Error al cargar");
      }
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!role) return;
    fetchCanchas();
  }, [role, idAdminEspDep, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchCanchas({ q: searchTerm });
    else fetchCanchas();
  };

  const handleFiltroChange = (e) => {
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
      const extra =
        role === "ADMIN_ESP_DEP" && idAdminEspDep
          ? { id_admin_esp_dep: idAdminEspDep }
          : {};

      const response = await api.delete(
        `/cancha-admin/${deleteUser.id_cancha}`,
        { params: extra }
      );

      if (response.data.exito) {
        setDeleteOpen(false);
        setDeleteUser(null);
        fetchCanchas();
      } else {
        setError(response.data.mensaje || 'No se pudo eliminar');
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || 'Error de conexión al servidor';
      setError(errorMessage);
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
      const extra =
        role === "ADMIN_ESP_DEP" && idAdminEspDep
          ? { id_admin_esp_dep: idAdminEspDep }
          : {};
      const r = await api.get(`/cancha-admin/dato-individual/${id}`, {
        params: extra,
      });
      if (!r.data?.exito) {
        setError(r.data?.mensaje || "No se pudo cargar");
        return;
      }
      const c = r.data.datos?.cancha || {};
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
      setDisciplinasSeleccionadas(
        c.disciplinas
          ? c.disciplinas.map((d) => ({
            id_disciplina: d.id_disciplina,
            nombre: d.nombre,
            frecuencia_practica: d.frecuencia_practica || "Regular",
          }))
          : []
      );
      setCurrentCancha(c);
      setEditMode(true);
      setViewMode(false);
      setModalOpen(true);
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion");
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const extra =
        role === "ADMIN_ESP_DEP" && idAdminEspDep
          ? { id_admin_esp_dep: idAdminEspDep }
          : {};
      const r = await api.get(`/cancha-admin/dato-individual/${id}`, {
        params: extra,
      });
      if (!r.data?.exito) {
        setError(r.data?.mensaje || "No se pudo cargar");
        return;
      }
      const c = r.data.datos?.cancha || {};
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
      setDisciplinasSeleccionadas(
        c.disciplinas
          ? c.disciplinas.map((d) => ({
            id_disciplina: d.id_disciplina,
            nombre: d.nombre,
            frecuencia_practica: d.frecuencia_practica || "Regular",
          }))
          : []
      );
      setCurrentCancha(c);
      setEditMode(false);
      setViewMode(true);
      setModalOpen(true);
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentCancha(null);
    setDisciplinasSeleccionadas([]);
    setError(null);
    setModalError(null);
    setViewMode(false);
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
      let resp;
      const data = new FormData();
      const filtered = Object.fromEntries(
        Object.entries(formData).filter(([k, v]) => {
          const req = ["nombre", "id_espacio"];
          if (req.includes(k)) return true;
          return v !== "" && v !== null && v !== undefined;
        })
      );
      Object.entries(filtered).forEach(([k, v]) => {
        if (k !== "imagen_cancha") data.append(k, v);
      });
      if (selectedFile) data.append("imagen_cancha", selectedFile);
      if (role === "ADMIN_ESP_DEP" && idAdminEspDep)
        data.append("id_admin_esp_dep", idAdminEspDep);

      if (filtered.nombre && filtered.nombre.length > 100) {
        setError("Nombre muy largo");
        return;
      }
      if (filtered.ubicacion && filtered.ubicacion.length > 255) {
        setError("Ubicacion muy larga");
        return;
      }
      if (
        filtered.capacidad &&
        (isNaN(filtered.capacidad) || filtered.capacidad < 0)
      ) {
        setError("Capacidad invalida");
        return;
      }
      const estadosValidos = ["disponible", "ocupada", "mantenimiento"];
      if (filtered.estado && !estadosValidos.includes(filtered.estado)) {
        setError("Estado invalido");
        return;
      }
      if (
        filtered.monto_por_hora &&
        (isNaN(filtered.monto_por_hora) || filtered.monto_por_hora < 0)
      ) {
        setError("Monto invalido");
        return;
      }
      if (
        filtered.id_espacio &&
        !espacios.some((e) => e.id_espacio === parseInt(filtered.id_espacio))
      ) {
        setError("Espacio invalido");
        return;
      }

      const cfg = { headers: { "Content-Type": "multipart/form-data" } };
      if (editMode) {
        resp = await api.patch(`/cancha/${currentCancha.id_cancha}`, data, cfg);
        if (resp.data?.exito && disciplinasSeleccionadas.length > 0) {
          await api.post(
            `/cancha/${currentCancha.id_cancha}/disciplinas`,
            {
              id_admin_esp_dep: idAdminEspDep,
              disciplinas: disciplinasSeleccionadas,
            },
            { headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        resp = await api.post("/cancha/", data, cfg);
        if (resp.data?.exito && disciplinasSeleccionadas.length > 0) {
          const nuevaId = resp.data.datos?.cancha?.id_cancha;
          if (nuevaId) {
            await api.post(
              `/cancha/${nuevaId}/disciplinas`,
              {
                id_admin_esp_dep: idAdminEspDep,
                disciplinas: disciplinasSeleccionadas,
              },
              { headers: { "Content-Type": "application/json" } }
            );
          }
        }
      }
      if (resp.data?.exito) {
        closeModal();
        fetchCanchas();
      } else setError(resp.data?.mensaje || "No se pudo guardar");
    } catch (err) {
      setError(
        err.response?.data?.mensaje || err.message || "Error de conexion"
      );
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  const handleDisciplinaChange = (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    if (disciplinasSeleccionadas.some((d) => d.id_disciplina === id)) return;
    const d = disciplinas.find((x) => x.id_disciplina === id);
    if (!d) return;
    setDisciplinasSeleccionadas((prev) => [
      ...prev,
      {
        id_disciplina: d.id_disciplina,
        nombre: d.nombre,
        frecuencia_practica: "Regular",
      },
    ]);
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

  if (!role || (role === "ADMIN_ESP_DEP" && !idAdminEspDep))
    return <p>Cargando permisos...</p>;

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
            <option value="">Todos - sin filtro</option>
            <option value="nombre">Por nombre</option>
            <option value="estado">Por estado</option>
            <option value="monto">Por monto por hora</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              Crear cancha
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
                {canchas.map((c, index) => (
                  <tr key={c.id_cancha} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3">{c.nombre}</td>
                    <td className="px-4 py-3">{c.ubicacion || "-"}</td>
                    <td className="px-4 py-3">{c.capacidad || "-"}</td>
                    <td className="px-4 py-3">{c.estado || "-"}</td>
                    <td className="px-4 py-3">
                      {c.monto_por_hora ? `$${c.monto_por_hora}` : "-"}
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(c.id_cancha)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(c.id_cancha)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(c)}
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

export default CanchaAdmin;
