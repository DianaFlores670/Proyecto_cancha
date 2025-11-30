import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";
// ajusta la ruta según tu estructura

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

const getImageUrlSafe = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${api.defaults.baseURL.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;
};

const EspacioDeportivoAdmin = () => {
  const [role, setRole] = useState(null);
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);

  const [espacios, setEspacios] = useState([]);
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
  const [currentEspacio, setCurrentEspacio] = useState(null);

  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
    descripcion: "",
    latitud: "",
    longitud: "",
    horario_apertura: "",
    horario_cierre: "",
    imagen_principal: "",
    imagen_sec_1: "",
    imagen_sec_2: "",
    imagen_sec_3: "",
    imagen_sec_4: "",
    id_admin_esp_dep: "",
  });

  const [selectedFiles, setSelectedFiles] = useState({
    imagen_principal: null,
    imagen_sec_1: null,
    imagen_sec_2: null,
    imagen_sec_3: null,
    imagen_sec_4: null,
  });

  const [imagePreviews, setImagePreviews] = useState({
    imagen_principal: null,
    imagen_sec_1: null,
    imagen_sec_2: null,
    imagen_sec_3: null,
    imagen_sec_4: null,
  });

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

  const fetchEspacios = async (params = {}) => {
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
        resp = await api.get("/espacio-admin/buscar", { params: fullParams });
      else if (params.tipo)
        resp = await api.get("/espacio-admin/filtro", { params: fullParams });
      else
        resp = await api.get("/espacio-admin/datos-especificos", {
          params: fullParams,
        });
      if (resp.data?.exito) {
        const rows = Array.isArray(resp.data.datos?.espacios)
          ? resp.data.datos.espacios
          : [];
        const t = resp.data.datos?.paginacion?.total;
        setEspacios(rows);
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
    fetchEspacios();
  }, [role, idAdminEspDep, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    if (searchTerm.trim()) fetchEspacios({ q: searchTerm });
    else fetchEspacios();
  };

  const handleFiltroChange = (e) => {
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchEspacios({ tipo });
    else fetchEspacios();
  };

  /*const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm('Estas seguro de eliminar este espacio?')) return;
    try {
      const extra = role === 'ADMIN_ESP_DEP' && idAdminEspDep ? { id_admin_esp_dep: idAdminEspDep } : {};
      const r = await api.delete(`/espacio_deportivo/${id}`, { params: extra });
      if (r.data?.exito) fetchEspacios();
      else setError(r.data?.mensaje || 'No se pudo eliminar');
    } catch (e) {
      setError(e.response?.data?.mensaje || 'Error de conexion');
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: '',
      direccion: '',
      descripcion: '',
      latitud: '',
      longitud: '',
      horario_apertura: '',
      horario_cierre: '',
      imagen_principal: '',
      imagen_sec_1: '',
      imagen_sec_2: '',
      imagen_sec_3: '',
      imagen_sec_4: '',
      id_admin_esp_dep: role === 'ADMIN_ESP_DEP' && idAdminEspDep ? idAdminEspDep : ''
    });
    setSelectedFiles({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null
    });
    setImagePreviews({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null
    });
    setCurrentEspacio(null);
    setModalOpen(true);
  };*/

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const extra =
        role === "ADMIN_ESP_DEP" && idAdminEspDep
          ? { id_admin_esp_dep: idAdminEspDep }
          : {};
      const r = await api.get(`/espacio-admin/dato-individual/${id}`, {
        params: extra,
      });
      if (!r.data?.exito) {
        setError(r.data?.mensaje || "No se pudo cargar");
        return;
      }
      const e = r.data.datos?.espacio || {};
      setFormData({
        nombre: e.nombre || "",
        direccion: e.direccion || "",
        descripcion: e.descripcion || "",
        latitud: e.latitud || "",
        longitud: e.longitud || "",
        horario_apertura: e.horario_apertura || "",
        horario_cierre: e.horario_cierre || "",
        imagen_principal: e.imagen_principal || "",
        imagen_sec_1: e.imagen_sec_1 || "",
        imagen_sec_2: e.imagen_sec_2 || "",
        imagen_sec_3: e.imagen_sec_3 || "",
        imagen_sec_4: e.imagen_sec_4 || "",
        id_admin_esp_dep:
          e.id_admin_esp_dep ||
          (role === "ADMIN_ESP_DEP" && idAdminEspDep ? idAdminEspDep : ""),
      });
      setImagePreviews({
        imagen_principal: e.imagen_principal ? getImageUrlSafe(e.imagen_principal) : null,
        imagen_sec_1: e.imagen_sec_1 ? getImageUrlSafe(e.imagen_sec_1) : null,
        imagen_sec_2: e.imagen_sec_2 ? getImageUrlSafe(e.imagen_sec_2) : null,
        imagen_sec_3: e.imagen_sec_3 ? getImageUrlSafe(e.imagen_sec_3) : null,
        imagen_sec_4: e.imagen_sec_4 ? getImageUrlSafe(e.imagen_sec_4) : null,
      });


      setSelectedFiles({
        imagen_principal: null,
        imagen_sec_1: null,
        imagen_sec_2: null,
        imagen_sec_3: null,
        imagen_sec_4: null,
      });
      setCurrentEspacio(e);
      setEditMode(true);
      setViewMode(false);
      setModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion");
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const extra =
        role === "ADMIN_ESP_DEP" && idAdminEspDep
          ? { id_admin_esp_dep: idAdminEspDep }
          : {};
      const r = await api.get(`/espacio-admin/dato-individual/${id}`, {
        params: extra,
      });
      if (!r.data?.exito) {
        setError(r.data?.mensaje || "No se pudo cargar");
        return;
      }
      const e = r.data.datos?.espacio || {};
      setFormData({
        nombre: e.nombre || "",
        direccion: e.direccion || "",
        descripcion: e.descripcion || "",
        latitud: e.latitud || "",
        longitud: e.longitud || "",
        horario_apertura: e.horario_apertura || "",
        horario_cierre: e.horario_cierre || "",
        imagen_principal: e.imagen_principal || "",
        imagen_sec_1: e.imagen_sec_1 || "",
        imagen_sec_2: e.imagen_sec_2 || "",
        imagen_sec_3: e.imagen_sec_3 || "",
        imagen_sec_4: e.imagen_sec_4 || "",
        id_admin_esp_dep:
          e.id_admin_esp_dep ||
          (role === "ADMIN_ESP_DEP" && idAdminEspDep ? idAdminEspDep : ""),
      });
      setImagePreviews({
        imagen_principal: e.imagen_principal ? getImageUrlSafe(e.imagen_principal) : null,
        imagen_sec_1: e.imagen_sec_1 ? getImageUrlSafe(e.imagen_sec_1) : null,
        imagen_sec_2: e.imagen_sec_2 ? getImageUrlSafe(e.imagen_sec_2) : null,
        imagen_sec_3: e.imagen_sec_3 ? getImageUrlSafe(e.imagen_sec_3) : null,
        imagen_sec_4: e.imagen_sec_4 ? getImageUrlSafe(e.imagen_sec_4) : null,
      });

      setSelectedFiles({
        imagen_principal: null,
        imagen_sec_1: null,
        imagen_sec_2: null,
        imagen_sec_3: null,
        imagen_sec_4: null,
      });
      setCurrentEspacio(e);
      setEditMode(false);
      setViewMode(true);
      setModalOpen(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || "Error de conexion");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEspacio(null);
    setError(null);
    setViewMode(false);
    setSelectedFiles({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null,
    });
    setImagePreviews({
      imagen_principal: null,
      imagen_sec_1: null,
      imagen_sec_2: null,
      imagen_sec_3: null,
      imagen_sec_4: null,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, [field]: file }));
      setImagePreviews((prev) => ({
        ...prev,
        [field]: URL.createObjectURL(file),
      }));
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
      const data = new FormData();

      const filtered = Object.fromEntries(
        Object.entries(formData).filter(([k, v]) => {
          const req = ["nombre", "id_admin_esp_dep"];
          if (req.includes(k)) return true;
          return v !== "" && v !== null && v !== undefined;
        })
      );

      Object.entries(filtered).forEach(([k, v]) => {
        if (
          ![
            "imagen_principal",
            "imagen_sec_1",
            "imagen_sec_2",
            "imagen_sec_3",
            "imagen_sec_4",
          ].includes(k)
        )
          data.append(k, v);
      });

      [
        "imagen_principal",
        "imagen_sec_1",
        "imagen_sec_2",
        "imagen_sec_3",
        "imagen_sec_4",
      ].forEach((f) => {
        if (selectedFiles[f]) data.append(f, selectedFiles[f]);
      });

      // Validaciones
      if (filtered.nombre && filtered.nombre.length > 100) {
        setError("Nombre muy largo");
        return;
      }
      if (filtered.direccion && filtered.direccion.length > 255) {
        setError("Direccion muy larga");
        return;
      }
      if (
        filtered.latitud &&
        (isNaN(filtered.latitud) ||
          filtered.latitud < -90 ||
          filtered.latitud > 90)
      ) {
        setError("Latitud fuera de rango");
        return;
      }
      if (
        filtered.longitud &&
        (isNaN(filtered.longitud) ||
          filtered.longitud < -180 ||
          filtered.longitud > 180)
      ) {
        setError("Longitud fuera de rango");
        return;
      }
      const vHora = (h) =>
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(h);
      if (filtered.horario_apertura && !vHora(filtered.horario_apertura)) {
        setError("Hora apertura invalida");
        return;
      }
      if (filtered.horario_cierre && !vHora(filtered.horario_cierre)) {
        setError("Hora cierre invalida");
        return;
      }

      const cfg = { headers: { "Content-Type": "multipart/form-data" } };

      let resp;
      if (editMode) {
        // ✅ enviamos id_admin_esp_dep como query param
        resp = await api.patch(
          `/espacio-admin/${currentEspacio.id_espacio}`,
          data,
          {
            ...cfg,
            params: { id_admin_esp_dep: idAdminEspDep },
          }
        );
      } else {
        // POST no necesita query param, ya va en el body/formData
        data.append("id_admin_esp_dep", idAdminEspDep);
        resp = await api.post("/espacio-admin/", data, cfg);
      }

      if (resp.data?.exito) {
        closeModal();
        fetchEspacios();
      } else {
        const mensajeError = resp.data.mensaje || "No se pudo guardar";
        setModalError(mensajeError);  // Mostrar el mensaje de error del backend
        setTimeout(() => {
          setModalError(null);
        }, 5000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      setModalError(errorMessage); // Mostramos el mensaje amigable desde el servidor
      setTimeout(() => {
        setModalError(null);
      }, 5000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / limit)) setPage(newPage);
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Gestion de Espacios Deportivos</h2>
      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, direccion, descripcion o administrador"
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
            <option value="direccion">Por direccion</option>
            <option value="admin_nombre">Por administrador</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Cargando espacios...</p>
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
                  <th className="px-4 py-2 text-left">Direccion</th>
                  <th className="px-4 py-2 text-left">Horario apertura</th>
                  <th className="px-4 py-2 text-left">Horario cierre</th>
                  <th className="px-4 py-2 text-left">Administrador</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {espacios.map((e, index) => (
                  <tr key={e.id_espacio} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-3">{e.nombre}</td>
                    <td className="px-4 py-3">{e.direccion || "-"}</td>
                    <td className="px-4 py-3">{e.horario_apertura || "-"}</td>
                    <td className="px-4 py-3">{e.horario_cierre || "-"}</td>
                    <td className="px-4 py-3">
                      {e.admin_nombre || e.admin_apellido
                        ? `${e.admin_nombre || ""} ${e.admin_apellido || ""
                          }`.trim()
                        : "Sin administrador"}
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(e.id_espacio)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(e.id_espacio)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
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
            {espacios.map((espacio, index) => (
              <div key={espacio.id_espacio} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {espacio.nombre}
                    </div>
                    <div className="text-xs text-gray-500">
                      Espacio #{(page - 1) * limit + index + 1}
                    </div>
                    <div className="mt-3 text-sm space-y-1">
                      <div>
                        <span className="font-semibold">Direccion: </span>
                        {espacio.direccion || '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Horario: </span>
                        {espacio.horario_apertura && espacio.horario_cierre
                          ? `${espacio.horario_apertura} - ${espacio.horario_cierre}`
                          : '-'}
                      </div>
                      <div>
                        <span className="font-semibold">Administrador: </span>
                        {espacio.admin_nombre && espacio.admin_apellido
                          ? `${espacio.admin_nombre} ${espacio.admin_apellido}`
                          : 'Sin administrador'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(espacio)}>
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
                ? "Ver Datos de Espacio Deportivo"
                : editMode
                  ? "Editar Espacio Deportivo"
                  : "Crear Espacio Deportivo"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md">
              {/* Nombre */}
              <div className="col-span-2 md:col-span-1">
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

              {/* Dirección */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold mb-1">Dirección</label>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                />
              </div>

              {/* Descripción */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              {/* Latitud y Longitud */}
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold mb-1">Latitud</label>
                <input
                  name="latitud"
                  value={formData.latitud}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  step="0.000001"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-semibold mb-1">Longitud</label>
                <input
                  name="longitud"
                  value={formData.longitud}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="number"
                  step="0.000001"
                  disabled={viewMode}
                />
              </div>
              {/* Horarios */}
              <div className="col-span-2 md:col-span-1"><label className="block text-sm font-semibold mb-1">Horario de Apertura</label>
                <input
                  name="horario_apertura"
                  value={formData.horario_apertura}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="time"
                  step="1"
                  disabled={viewMode}
                /></div>
              <div className="col-span-2 md:col-span-1"><label className="block text-sm font-semibold mb-1">Horario de Cierre</label>
                <input
                  name="horario_cierre"
                  value={formData.horario_cierre}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="time"
                  step="1"
                  disabled={viewMode}
                /></div>

              {/* Imagen Principal */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Imagen Principal</label>
                {imagePreviews.imagen_principal && (
                  <img
                    src={
                      selectedFiles.imagen_principal
                        ? URL.createObjectURL(selectedFiles.imagen_principal)
                        : imagePreviews.imagen_principal
                    }
                    className="w-32 h-32 object-cover rounded mb-2"
                    alt="img"
                  />
                )}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_principal")}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  />
                )}
              </div>

              {/* Imagen Secundaria 1 */}
              <div>
                <label className="block text-sm font-semibold mb-1">Imagen Secundaria 1</label>
                {imagePreviews.imagen_sec_1 && (
                  <img
                    src={
                      selectedFiles.imagen_sec_1
                        ? URL.createObjectURL(selectedFiles.imagen_sec_1)
                        : imagePreviews.imagen_sec_1
                    }
                    alt="Imagen Secundaria 1"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                )}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_sec_1")}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  />
                )}
              </div>

              {/* Imagen Secundaria 2 */}
              <div>
                <label className="block text-sm font-semibold mb-1">Imagen Secundaria 2</label>
                {imagePreviews.imagen_sec_2 && (
                  <img
                    src={
                      selectedFiles.imagen_sec_2
                        ? URL.createObjectURL(selectedFiles.imagen_sec_2)
                        : imagePreviews.imagen_sec_2
                    }
                    alt="Imagen Secundaria 2"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                )}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_sec_2")}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  />
                )}
              </div>

              {/* Imagen Secundaria 3 */}
              <div>
                <label className="block text-sm font-semibold mb-1">Imagen Secundaria 3</label>
                {imagePreviews.imagen_sec_3 && (
                  <img
                    src={
                      selectedFiles.imagen_sec_3
                        ? URL.createObjectURL(selectedFiles.imagen_sec_3)
                        : imagePreviews.imagen_sec_3
                    }
                    alt="Imagen Secundaria 3"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                )}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_sec_3")}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  />
                )}
              </div>

              {/* Imagen Secundaria 4 */}
              <div>
                <label className="block text-sm font-semibold mb-1">Imagen Secundaria 4</label>
                {imagePreviews.imagen_sec_4 && (
                  <img
                    src={
                      selectedFiles.imagen_sec_4
                        ? URL.createObjectURL(selectedFiles.imagen_sec_4)
                        : imagePreviews.imagen_sec_4
                    }
                    alt="Imagen Secundaria 4"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                )}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_sec_4")}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  />
                )}
              </div>
              <div className="md:col-span-2 border-t pt-4 mt-4">
                {modalError && (
                  <div className="bg-red-100 text-red-600 p-3 mb-2 rounded-md text-sm">
                    {modalError}
                  </div>
                )}
              </div>
              <div className="col-span-2 flex justify-end mt-2 gap-3">
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
              {/* Ver datos del control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_espacio); // Abre el modal para ver datos del control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              {/* Editar control */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_espacio); // Abre el modal para editar control
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Editar
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
    </div>
  );
};

export default EspacioDeportivoAdmin;
