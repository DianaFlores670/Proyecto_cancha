/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { FiMoreVertical, FiX } from "react-icons/fi";

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
      else if (r && typeof r === "object") {
        ["rol", "role", "nombre", "name"].forEach((k) => {
          if (r[k]) bag.add(r[k]);
        });
      }
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

const Usuario = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(() => getEffectiveRole());
  const rolesDisponibles = [
    { valor: "cliente", etiqueta: "Cliente" },
    { valor: "administrador", etiqueta: "Administrador" },
    { valor: "admin_esp_dep", etiqueta: "Administrador Espacio Deportivo" },
    { valor: "deportista", etiqueta: "Deportista" },
    { valor: "control", etiqueta: "Control" },
    { valor: "encargado", etiqueta: "Encargado" }
  ];
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    usuario: "",
    telefono: "",
    sexo: "",
    imagen_perfil: "",
    latitud: "",
    longitud: "",
    contrasena: "",
    fecha_creacion: "",
    rol: "",
    rol_agregar: "",
    rol_eliminar: "",
    datos_especificos: {}
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const sexosPermitidos = ["masculino", "femenino"];
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [mobileModal, setMobileModal] = useState(null);

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

  const getImageUrl = (path) => {
    if (!path) return "";
    const base = api.defaults.baseURL.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    return `${base}/${cleanPath}`;
  };

  const fetchUsuarios = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver los usuarios");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q) {
        response = await api.get("/usuario/buscar", { params: fullParams });
      } else if (params.tipo) {
        response = await api.get("/usuario/filtro", { params: fullParams });
      } else {
        response = await api.get("/usuario/datos-especificos", {
          params: fullParams
        });
      }
      if (response.data.exito) {
        setUsuarios(response.data.datos.usuarios);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje || "Error al cargar usuarios");
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
    if (role) fetchUsuarios();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) {
      fetchUsuarios({ q: searchTerm });
    } else {
      fetchUsuarios();
    }
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchUsuarios({ tipo });
    else fetchUsuarios();
  };

  const confirmDelete = async () => {
    if (!permissions.canDelete || !deleteUser) return;

    try {
      const response = await api.delete(`/usuario/${deleteUser.id_persona}`);
      if (response.data.exito) {
        setDeleteOpen(false);
        setDeleteUser(null);
        fetchUsuarios();
      } else {
        setError(response.data.mensaje || "No se pudo eliminar");
      }
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(mensaje);
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre: "",
      apellido: "",
      correo: "",
      usuario: "",
      telefono: "",
      sexo: "",
      imagen_perfil: "",
      latitud: "",
      longitud: "",
      contrasena: "",
      fecha_creacion: "",
      rol: "",
      rol_agregar: "",
      rol_eliminar: "",
      datos_especificos: {}
    });
    setSelectedFile(null);
    setImagePreview(null);
    setCurrentUser(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/usuario/dato-individual/${id}`);
      if (response.data.exito) {
        const user = response.data.datos.usuario;
        setFormData({
          nombre: user.nombre || "",
          apellido: user.apellido || "",
          correo: user.correo || "",
          usuario: user.usuario || "",
          telefono: user.telefono || "",
          sexo: user.sexo || "",
          imagen_perfil: user.imagen_perfil || "",
          latitud: user.latitud || "",
          longitud: user.longitud || "",
          contrasena: "",
          fecha_creacion: user.fecha_creacion
            ? new Date(user.fecha_creacion).toISOString().split("T")[0]
            : "",
          rol: user.rol || "",
          rol_agregar: "",
          rol_eliminar: "",
          datos_especificos: user.datos_rol || {}
        });
        setImagePreview(
          user.imagen_perfil ? getImageUrl(user.imagen_perfil) : null
        );
        setSelectedFile(null);
        setCurrentUser(user);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || "No se pudo cargar usuario");
      }
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(mensaje);
    }
  };

  const openViewModal = async (id) => {
    if (!permissions.canView) return;
    try {
      const response = await api.get(`/usuario/dato-individual/${id}`);
      if (response.data.exito) {
        const user = response.data.datos.usuario;
        setFormData({
          nombre: user.nombre || "",
          apellido: user.apellido || "",
          correo: user.correo || "",
          usuario: user.usuario || "",
          telefono: user.telefono || "",
          sexo: user.sexo || "",
          imagen_perfil: user.imagen_perfil || "",
          latitud: user.latitud || "",
          longitud: user.longitud || "",
          contrasena: "",
          fecha_creacion: user.fecha_creacion
            ? new Date(user.fecha_creacion).toISOString().split("T")[0]
            : "",
          rol: user.rol || "",
          rol_agregar: "",
          rol_eliminar: "",
          datos_especificos: user.datos_rol || {}
        });
        setImagePreview(
          user.imagen_perfil ? getImageUrl(user.imagen_perfil) : null
        );
        setSelectedFile(null);
        setCurrentUser(user);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || "No se pudo cargar usuario");
      }
    } catch (err) {
      const mensaje =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(mensaje);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentUser(null);
    setError(null);
    setViewMode(false);
    setSelectedFile(null);
    setImagePreview(null);
    setModalError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDatosEspecificosChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      datos_especificos: { ...prev.datos_especificos, [name]: value }
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
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
      const filteredData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          const requiredFields = ['nombre', 'apellido', 'correo', 'usuario', 'contrasena'];
          if (editMode && ['usuario', 'contrasena'].includes(key)) return false;
          if (requiredFields.includes(key)) return true;
          return value !== '' && value !== null && value !== undefined;
        })
      );
      if (editMode) {
        response = await api.patch(`/usuario/${currentUser.id_persona}`, filteredData);
      } else {
        response = await api.post('/usuario/', filteredData);
      }

      if (response.data.exito) {
        closeModal();
        fetchUsuarios();
      } else {
        setModalError(response.data.mensaje || "No se pudo guardar");
        setTimeout(() => {
          setModalError(null);
        }, 5000); // Resetear el mensaje de error después de 5 segundos
      }
    } catch (err) {
      const errorMessage = err.response?.data?.mensaje || 'Error de conexión al servidor';
      if (errorMessage === 'El correo electrónico ya está en uso.') {
        setModalError('Este correo ya está registrado. Por favor, use otro correo.'); // Error amigable para el usuario
      } else {
        setModalError(errorMessage); // Mostrar otros errores
      }

      // Resetear el error después de 5 segundos
      setTimeout(() => {
        setModalError(null);
      }, 5000); // Resetear el mensaje de error después de 5 segundos
    }
  };

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Gestion de Usuarios
      </h2>

      <div className="sticky top-0 bg-white z-40 pb-4 pt-2 border-b md:border-0 md:static md:top-auto">
        <div className="flex flex-col md:flex-row gap-3">
          <form
            onSubmit={handleSearch}
            className="flex flex-1 bg-[#F1F5F9] rounded-full shadow-sm overflow-hidden"
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent flex-1 px-4 py-2 focus:outline-none text-md"
              placeholder="Buscar usuario..."
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
            <option value="nombre">Ordenar por nombre</option>
            <option value="fecha">Ordenar por fecha</option>
            <option value="correo">Ordenar por correo</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-[#01CD6C] text-white rounded-full px-5 text-md shadow-sm disabled:opacity-40 py-2"
            >
              Crear usuario
            </button>
          )}
        </div>
      </div>

      {loading && <p>Cargando usuarios...</p>}
      {error && <p className="text-red-500 mt-3">{error}</p>}

      {!loading && !error && (
        <>
          {/* TABLA DESKTOP */}
          <div className="hidden md:block mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-[#23475F] text-white text-md">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Apellido</th>
                  <th className="px-4 py-3 text-left">Correo</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-md">
                {usuarios.map((u, i) => (
                  <tr
                    key={u.id_persona}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-4 py-3">{u.nombre}</td>
                    <td className="px-4 py-3">{u.apellido}</td>
                    <td className="px-4 py-3">{u.correo}</td>
                    <td className="px-4 py-3">{u.usuario}</td>
                    <td className="px-4 py-3 flex gap-3">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(u.id_persona)}
                          className="text-green-500 hover:text-green-700"
                        >
                          Ver
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(u.id_persona)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => {
                            setDeleteOpen(true);
                            setDeleteUser(u);
                          }}
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

            {usuarios.length === 0 && (
              <div className="text-center py-6 text-gray-500 text-md">
                Sin datos
              </div>
            )}
          </div>
          {/*CARDS MOBILE */}
          <div className="md:hidden mt-6 space-y-4 pb-32">
            {usuarios.map((u, i) => (
              <div key={u.id_persona} className="border bg-white rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[#23475F]">
                      {u.nombre} {u.apellido}
                    </div>
                    <div className="text-xs text-gray-500">
                      Usuario #{(page - 1) * limit + i + 1}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => setMobileModal(u)}>
                      <FiMoreVertical size={22} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-sm space-y-1">
                  <div>
                    <span className="font-semibold">Correo: </span>
                    {u.correo}
                  </div>
                  <div>
                    <span className="font-semibold">Usuario: </span>
                    {u.usuario}
                  </div>
                  {u.telefono && (
                    <div>
                      <span className="font-semibold">Telefono: </span>
                      {u.telefono}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* PAGINACIÓN SOLO MOVIL */}
            <div className="md:hidden w-full flex justify-center items-center gap-3 py-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Anterior
              </button>

              <div className="px-4 py-2 bg-gray-100 rounded-full text-sm">
                Pag {page} de {Math.ceil(total / limit) || 1}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === Math.ceil(total / limit)}
                className="px-4 py-2 bg-gray-200 rounded-full text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
          <div className="fixed md:static bottom-0 left-0 right-0 bg-white border-t shadow-lg py-3 flex justify-center gap-3 z-40 mt-6">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Anterior
            </button>
            <div className="px-4 py-2 bg-gray-100 rounded-full text-md">
              Pag {page} de {Math.ceil(total / limit) || 1}
            </div>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === Math.ceil(total / limit) || total === 0}
              className="px-4 py-2 bg-gray-200 rounded-full disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </>
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
              <button
                onClick={() => {
                  setMobileModal(null);
                  openViewModal(mobileModal.id_persona);  // Cambia openView por el que uses
                }}
                className="px-3 py-2 text-left hover:bg-gray-100"
              >
                Ver datos
              </button>

              <button
                onClick={() => {
                  setMobileModal(null);
                  openEditModal(mobileModal.id_persona);  // Cambia openEdit por el que uses
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
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              {viewMode
                ? "Ver datos de usuario"
                : editMode
                  ? "Editar usuario"
                  : "Crear usuario"}
            </h3>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-md"
            >
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Nombre
                </label>
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
                  Apellido
                </label>
                <input
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Correo
                </label>
                <input
                  name="correo"
                  value={formData.correo}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  type="email"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Usuario
                </label>
                <input
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  required={!editMode && !viewMode}
                  disabled={editMode || viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Telefono
                </label>
                <input
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Sexo
                </label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleInputChange}
                  className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                  disabled={viewMode}
                >
                  <option value="">Seleccione</option>
                  {sexosPermitidos.map((sexo) => (
                    <option key={sexo} value={sexo}>
                      {sexo.charAt(0).toUpperCase() + sexo.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">
                  Imagen de perfil
                </label>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Perfil"
                    className="w-32 h-32 object-cover rounded mb-2 border"
                    onError={(e) => {
                      e.target.src = "/placeholder.png";
                    }}
                  />
                ) : viewMode ? (
                  <p className="text-gray-500 text-sm">
                    No hay imagen de perfil
                  </p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50 mt-1"
                    disabled={!permissions.canEdit && editMode}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Latitud
                </label>
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
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Longitud
                </label>
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
              {!editMode && !viewMode && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">
                    Contrasena
                  </label>
                  <input
                    name="contrasena"
                    value={formData.contrasena || ""}
                    onChange={handleInputChange}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    type="password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Opcional</p>
                </div>
              )}
              {(editMode || viewMode) && (
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Fecha de creacion
                  </label>
                  <input
                    name="fecha_creacion"
                    value={formData.fecha_creacion}
                    className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    type="date"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">Solo lectura</p>
                </div>
              )}
              <div className="md:col-span-2 border-t pt-4 mt-4">
                <h4 className="text-lg font-semibold mb-3">
                  {editMode
                    ? "Gestion de roles"
                    : viewMode
                      ? "Roles asignados"
                      : "Asignar rol inicial"}
                </h4>
                {editMode ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">
                        Roles actuales
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {currentUser?.roles?.map((rolObj, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {rolesDisponibles.find(
                              (r) => r.valor === rolObj.rol
                            )?.etiqueta || rolObj.rol}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  rol_eliminar: rolObj.rol
                                }));
                              }}
                              className="ml-2 text-red-500 hover:text-red-700"
                              disabled={viewMode || !permissions.canEdit}
                            >
                              x
                            </button>
                          </span>
                        ))}
                        {(!currentUser?.roles ||
                          currentUser.roles.length === 0) && (
                            <span className="text-gray-500 text-sm">
                              Sin roles asignados
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          Agregar nuevo rol
                        </label>
                        <select
                          name="rol_agregar"
                          value={formData.rol_agregar || ""}
                          onChange={handleInputChange}
                          className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                          disabled={viewMode || !permissions.canEdit}
                        >
                          <option value="">Seleccionar rol</option>
                          {rolesDisponibles
                            .filter(
                              (rol) =>
                                !currentUser?.roles?.some(
                                  (r) => r.rol === rol.valor
                                )
                            )
                            .map((rol) => (
                              <option key={rol.valor} value={rol.valor}>
                                {rol.etiqueta}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          Eliminar rol
                        </label>
                        <select
                          name="rol_eliminar"
                          value={formData.rol_eliminar || ""}
                          onChange={handleInputChange}
                          className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                          disabled={viewMode || !permissions.canEdit}
                        >
                          <option value="">Seleccionar rol</option>
                          {currentUser?.roles?.map((rolObj) => (
                            <option key={rolObj.rol} value={rolObj.rol}>
                              {rolesDisponibles.find(
                                (r) => r.valor === rolObj.rol
                              )?.etiqueta || rolObj.rol}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : viewMode ? (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">
                      Roles actuales
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentUser?.roles?.map((rolObj, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {rolesDisponibles.find(
                            (r) => r.valor === rolObj.rol
                          )?.etiqueta || rolObj.rol}
                        </span>
                      ))}
                      {(!currentUser?.roles ||
                        currentUser.roles.length === 0) && (
                          <span className="text-gray-500 text-sm">
                            Sin roles asignados
                          </span>
                        )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold mb-1">
                      Asignar rol inicial
                    </label>
                    <select
                      name="rol_agregar"
                      value={formData.rol_agregar || ""}
                      onChange={handleInputChange}
                      className="w-full border rounded-xl px-3 py-2 bg-gray-50"
                    >
                      <option value="">Seleccionar rol inicial</option>
                      {rolesDisponibles.map((rol) => (
                        <option key={rol.valor} value={rol.valor}>
                          {rol.etiqueta}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Puedes agregar mas roles despues y agregar datos en su respectiva ruta
                    </p>
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
                    disabled={
                      (!permissions.canCreate && !editMode) ||
                      (!permissions.canEdit && editMode)
                    }
                  >
                    {editMode ? "Actualizar" : "Crear"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteOpen && deleteUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">

            <h3 className="text-xl font-semibold text-red-600 mb-2">
              Eliminar usuario
            </h3>
            <p className="text-gray-700 text-md">
              ¿Estas seguro de eliminar a <span className="font-bold">{deleteUser.nombre} {deleteUser.apellido}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteUser(null);
                }}
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

export default Usuario;