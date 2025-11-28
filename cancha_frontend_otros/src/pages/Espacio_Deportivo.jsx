/* eslint-disable no-unused-vars */
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

const EspacioDeportivo = () => {
  const [espacios, setEspacios] = useState([]);
  const [administradores, setAdministradores] = useState([]);
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(() => getEffectiveRole());

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
    const fetchAdministradores = async () => {
      const limitEsp = 9999;
      const offset = 0;
      try {
        const response = await api.get("/admin_esp_dep/datos-especificos", {
          params: { limit: limitEsp, offset }
        });
        if (response.data?.exito)
          setAdministradores(response.data.datos.administradores || []);
      } catch { }
    };
    fetchAdministradores();
  }, []);

  const getImageUrlSafe = (path) => {
    if (!path) return null;
    // Si es URL completa
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    // Si es ruta relativa
    return `https://proyecto-cancha.onrender.com${path.startsWith("/") ? "" : "/"
      }${path}`;
  };

  const fetchEspacios = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver espacios");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q)
        response = await api.get("/espacio_deportivo/buscar", {
          params: fullParams,
        });
      else if (params.tipo)
        response = await api.get("/espacio_deportivo/filtro", {
          params: fullParams,
        });
      else
        response = await api.get("/espacio_deportivo/datos-especificos", {
          params: fullParams,
        });
      if (response.data.exito) {
        setEspacios(response.data.datos.espacios);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje || "Error al cargar espacios");
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
    if (role) fetchEspacios();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) fetchEspacios({ q: searchTerm });
    else fetchEspacios();
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchEspacios({ tipo });
    else fetchEspacios();
  };

const handleDelete = (espacio) => {
  setDeleteUser(espacio);
  setDeleteOpen(true);
};


  const confirmDelete = async () => {
    if (!deleteUser) return;

    if (!permissions.canDelete) {
      setError('No tienes permisos para eliminar espacios');
      return;
    }

    try {
      // Llamada a la API para eliminar el control
      const response = await api.delete(`/espacio_deportivo/${deleteUser.id_espacio}`);

      // Verificar la respuesta de la API
      if (response.data.exito) {
        setDeleteOpen(false);  // Cerrar el modal de eliminación
        setDeleteUser(null);  // Limpiar el control a eliminar
        fetchEspacios();  // Recargar la lista de controles
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
    setDeleteUser(null);  // Limpiar el control a eliminar
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
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
    setCurrentEspacio(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(
        `/espacio_deportivo/dato-individual/${id}`
      );
      if (response.data.exito) {
        const e = response.data.datos.espacio;
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
          id_admin_esp_dep: e.id_admin_esp_dep || "",
        });
        setImagePreviews({
          imagen_principal: e.imagen_principal
            ? getImageUrlSafe(e.imagen_principal)
            : null,
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
      } else {
        setError(response.data.mensaje || "No se pudo cargar el espacio");
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
      const res = await api.get(`/espacio_deportivo/dato-individual/${id}`);
      if (res.data.exito) {
        const e = res.data.datos.espacio;
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
          id_admin_esp_dep: e.id_admin_esp_dep || "",
        });

        setImagePreviews({
          imagen_principal: e.imagen_principal
            ? getImageUrlSafe(e.imagen_principal)
            : null,
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
      } else {
        setError(res.data.mensaje || "No se pudo cargar el espacio");
      }
    } catch (err) {
      setError("Error de conexion al servidor");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEspacio(null);
    setError(null);
    setViewMode(false);
    setModalError(null);
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

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, [fieldName]: file }));
      setImagePreviews((prev) => ({
        ...prev,
        [fieldName]: URL.createObjectURL(file),
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
      let response;
      const data = new FormData();
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const required = ["nombre", "id_admin_esp_dep"];
          if (required.includes(key)) return true;
          return value !== "" && value !== null && value !== undefined;
        })
      );
      Object.entries(filteredData).forEach(([key, value]) => {
        if (
          ![
            "imagen_principal",
            "imagen_sec_1",
            "imagen_sec_2",
            "imagen_sec_3",
            "imagen_sec_4",
          ].includes(key)
        )
          data.append(key, value);
      });
      [
        "imagen_principal",
        "imagen_sec_1",
        "imagen_sec_2",
        "imagen_sec_3",
        "imagen_sec_4",
      ].forEach((field) => {
        if (selectedFiles[field]) data.append(field, selectedFiles[field]);
      });

      if (filteredData.nombre && filteredData.nombre.length > 100) {
        setError("El nombre no debe exceder 100 caracteres");
        return;
      }
      if (filteredData.direccion && filteredData.direccion.length > 255) {
        setError("La direccion no debe exceder 255 caracteres");
        return;
      }
      if (
        filteredData.latitud &&
        (filteredData.latitud < -90 || filteredData.latitud > 90)
      ) {
        setError("Latitud fuera de rango");
        return;
      }
      if (
        filteredData.longitud &&
        (filteredData.longitud < -180 || filteredData.longitud > 180)
      ) {
        setError("Longitud fuera de rango");
        return;
      }
      const validarHora = (h) =>
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(h);
      if (
        filteredData.horario_apertura &&
        !validarHora(filteredData.horario_apertura)
      ) {
        setError("Hora de apertura invalida");
        return;
      }
      if (
        filteredData.horario_cierre &&
        !validarHora(filteredData.horario_cierre)
      ) {
        setError("Hora de cierre invalida");
        return;
      }
      if (
        filteredData.id_admin_esp_dep &&
        !administradores.some(
          (a) => a.id_admin_esp_dep === parseInt(filteredData.id_admin_esp_dep)
        )
      ) {
        setError("Administrador invalido");
        return;
      }

      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (editMode)
        response = await api.patch(
          `/espacio_deportivo/${currentEspacio.id_espacio}`,
          data,
          config
        );
      else response = await api.post("/espacio_deportivo/", data, config);

      if (response.data.exito) {
        closeModal();
        fetchEspacios();
      } else {
        const mensajeError = response.data.mensaje || "No se pudo guardar";
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
            <option value="direccion">Por direccion</option>
            <option value="admin_nombre">Por administrador</option>
            <option value="sin_admin">Sin administrador</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              Crear Espacio
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando espacios deportivos...</p>
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
                  <th className="px-4 py-2 text-left">Horario</th>
                  <th className="px-4 py-2 text-left">Admin Esp Dep</th>
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
                    <td className="px-4 py-3">
                      {e.horario_apertura && e.horario_cierre
                        ? `${e.horario_apertura} - ${e.horario_cierre}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {e.id_admin_esp_dep
                        ? `${e.admin_nombre} ${e.admin_apellido}`
                        : "Sin administrador"}
                    </td>

                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(e.id_espacio)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
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
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(e)}
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
                    src={selectedFiles.imagen_principal ? URL.createObjectURL(selectedFiles.imagen_principal) : imagePreviews.imagen_principal}
                    alt="Imagen Principal"
                    className="w-32 h-32 object-cover rounded mb-2"
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
                    src={selectedFiles.imagen_sec_1 ? URL.createObjectURL(selectedFiles.imagen_sec_1) : imagePreviews.imagen_sec_1}
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
                    src={selectedFiles.imagen_sec_2 ? URL.createObjectURL(selectedFiles.imagen_sec_2) : imagePreviews.imagen_sec_2}
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
                    src={selectedFiles.imagen_sec_3 ? URL.createObjectURL(selectedFiles.imagen_sec_3) : imagePreviews.imagen_sec_3}
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
                    src={selectedFiles.imagen_sec_4 ? URL.createObjectURL(selectedFiles.imagen_sec_4) : imagePreviews.imagen_sec_4}
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

              {/* Administrador */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-1">Administrador Esp. Dep</label>
                <select
                  name="id_admin_esp_dep"
                  value={formData.id_admin_esp_dep}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                >
                  <option value="">Ninguno (opcional)</option>
                  {administradores.map((a) => (
                    <option key={a.id_admin_esp_dep} value={a.id_admin_esp_dep}>
                      {`${a.nombre} ${a.apellido}`}
                    </option>
                  ))}
                </select>
              </div>
                  <div className="md:col-span-2 border-t pt-4 mt-4">
                {modalError && (
                  <div className="bg-red-100 text-red-600 p-3 mb-4 rounded-md text-sm">
                    {modalError}
                  </div>
                )}
              </div>
              {/* Botones de Acción */}
              <div className="col-span-2 flex justify-end mt-4 gap-3">
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

              {/* Eliminar espacio */}
              <button
                onClick={() => {
                  setMobileModal(null);
                  setDeleteOpen(true);  // Abre el modal de eliminación
                  setDeleteUser(mobileModal); // Establece el control a eliminar
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
              Eliminar espacio deportivo
            </h3>
            <p className="text-gray-700 text-md">
              ¿Estás seguro de eliminar <span className="font-bold">{deleteUser.nombre}</span>?
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

export default EspacioDeportivo;
