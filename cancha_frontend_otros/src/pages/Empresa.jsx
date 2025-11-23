/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { getImageUrl } from "../utils";

const permissionsConfig = {
  ADMINISTRADOR: {
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
  const prio = ["ADMINISTRADOR"];
  return (
    prio.find((r) => norm2.includes(r) && keys.includes(r)) ||
    norm2.find((r) => keys.includes(r)) ||
    "DEFAULT"
  );
};

const Empresa = () => {
  const [empresas, setEmpresas] = useState([]);
  const [administradores, setAdministradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [currentEmpresa, setCurrentEmpresa] = useState(null);
  const [formData, setFormData] = useState({
    nombre_sistema: "",
    logo_imagen: "",
    imagen_hero: "",
    titulo_h1: "",
    descripcion_h1: "",
    te_ofrecemos: "",
    imagen_1: "",
    imagen_2: "",
    imagen_3: "",
    titulo_1: "",
    titulo_2: "",
    titulo_3: "",
    descripcion_1: "",
    descripcion_2: "",
    descripcion_3: "",
    mision: "",
    vision: "",
    nuestro_objetivo: "",
    objetivo_1: "",
    objetivo_2: "",
    objetivo_3: "",
    quienes_somos: "",
    correo_empresa: "",
    telefonoss: "",
    direccion: "",
    id_administrador: "",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [role, setRole] = useState(() => getEffectiveRole());

  const [selectedFiles, setSelectedFiles] = useState({
    logo_imagen: null,
    imagen_hero: null,
    imagen_1: null,
    imagen_2: null,
    imagen_3: null,
  });
  const [imagePreviews, setImagePreviews] = useState({
    logo_imagen: null,
    imagen_hero: null,
    imagen_1: null,
    imagen_2: null,
    imagen_3: null,
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
      try {
        const response = await api.get("/administrador/datos-especificos");
        if (response.data?.exito)
          setAdministradores(response.data.datos.administradores || []);
      } catch {}
    };
    fetchAdministradores();
  }, []);

  const getImageUrl = (path) => {
    if (!path) return "";
    try {
      const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
      const cleanPath = String(path).replace(/^\//, "");
      return `${base}/${cleanPath}`;
    } catch {
      return path;
    }
  };

  const fetchEmpresas = async (params = {}) => {
    if (!permissions.canView) {
      setError("No tienes permisos para ver empresas");
      return;
    }
    setLoading(true);
    setError(null);
    const offset = (page - 1) * limit;
    const fullParams = { ...params, limit, offset };
    try {
      let response;
      if (params.q)
        response = await api.get("/empresa/buscar", { params: fullParams });
      else if (params.tipo)
        response = await api.get("/empresa/filtro", { params: fullParams });
      else
        response = await api.get("/empresa/datos-especificos", {
          params: fullParams,
        });
      if (response.data.exito) {
        setEmpresas(response.data.datos.empresas);
        setTotal(response.data.datos.paginacion.total);
      } else {
        setError(response.data.mensaje || "Error al cargar empresas");
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
    if (role) fetchEmpresas();
  }, [page, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!permissions.canView) return;
    setPage(1);
    if (searchTerm.trim()) fetchEmpresas({ q: searchTerm });
    else fetchEmpresas();
  };

  const handleFiltroChange = (e) => {
    if (!permissions.canView) return;
    const tipo = e.target.value;
    setFiltro(tipo);
    setPage(1);
    if (tipo) fetchEmpresas({ tipo });
    else fetchEmpresas();
  };

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm("Estas seguro de eliminar esta empresa?")) return;
    try {
      const response = await api.delete(`/empresa/${id}`);
      if (response.data.exito) fetchEmpresas();
      else setError(response.data.mensaje || "No se pudo eliminar");
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(errorMessage);
    }
  };

  const openCreateModal = () => {
    if (!permissions.canCreate) return;
    setEditMode(false);
    setViewMode(false);
    setFormData({
      nombre_sistema: "",
      logo_imagen: "",
      imagen_hero: "",
      titulo_h1: "",
      descripcion_h1: "",
      te_ofrecemos: "",
      imagen_1: "",
      imagen_2: "",
      imagen_3: "",
      titulo_1: "",
      titulo_2: "",
      titulo_3: "",
      descripcion_1: "",
      descripcion_2: "",
      descripcion_3: "",
      mision: "",
      vision: "",
      nuestro_objetivo: "",
      objetivo_1: "",
      objetivo_2: "",
      objetivo_3: "",
      quienes_somos: "",
      correo_empresa: "",
      telefonoss: "",
      direccion: "",
      id_administrador: "",
    });
    setSelectedFiles({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null,
    });
    setImagePreviews({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null,
    });
    setCurrentEmpresa(null);
    setModalOpen(true);
  };

  const openEditModal = async (id) => {
    if (!permissions.canEdit) return;
    try {
      const response = await api.get(`/empresa/dato-individual/${id}`);
      if (response.data.exito) {
        const e = response.data.datos.empresa;
        setFormData({
          nombre_sistema: e.nombre_sistema || "",
          logo_imagen: e.logo_imagen || "",
          imagen_hero: e.imagen_hero || "",
          titulo_h1: e.titulo_h1 || "",
          descripcion_h1: e.descripcion_h1 || "",
          te_ofrecemos: e.te_ofrecemos || "",
          imagen_1: e.imagen_1 || "",
          imagen_2: e.imagen_2 || "",
          imagen_3: e.imagen_3 || "",
          titulo_1: e.titulo_1 || "",
          titulo_2: e.titulo_2 || "",
          titulo_3: e.titulo_3 || "",
          descripcion_1: e.descripcion_1 || "",
          descripcion_2: e.descripcion_2 || "",
          descripcion_3: e.descripcion_3 || "",
          mision: e.mision || "",
          vision: e.vision || "",
          nuestro_objetivo: e.nuestro_objetivo || "",
          objetivo_1: e.objetivo_1 || "",
          objetivo_2: e.objetivo_2 || "",
          objetivo_3: e.objetivo_3 || "",
          quienes_somos: e.quienes_somos || "",
          correo_empresa: e.correo_empresa || "",
          telefonoss: e.telefonoss || "",
          direccion: e.direccion || "",
          id_administrador: e.id_administrador || "",
        });
        setImagePreviews({
          logo_imagen: e.logo_imagen ? getImageUrl(e.logo_imagen) : null,
          imagen_hero: e.imagen_hero ? getImageUrl(e.imagen_hero) : null,
          imagen_1: e.imagen_1 ? getImageUrl(e.imagen_1) : null,
          imagen_2: e.imagen_2 ? getImageUrl(e.imagen_2) : null,
          imagen_3: e.imagen_3 ? getImageUrl(e.imagen_3) : null,
        });
        setSelectedFiles({
          logo_imagen: null,
          imagen_hero: null,
          imagen_1: null,
          imagen_2: null,
          imagen_3: null,
        });
        setCurrentEmpresa(e);
        setEditMode(true);
        setViewMode(false);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || "No se pudo cargar la empresa");
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
      const response = await api.get(`/empresa/dato-individual/${id}`);
      if (response.data.exito) {
        const e = response.data.datos.empresa;
        setFormData({
          nombre_sistema: e.nombre_sistema || "",
          logo_imagen: e.logo_imagen || "",
          imagen_hero: e.imagen_hero || "",
          titulo_h1: e.titulo_h1 || "",
          descripcion_h1: e.descripcion_h1 || "",
          te_ofrecemos: e.te_ofrecemos || "",
          imagen_1: e.imagen_1 || "",
          imagen_2: e.imagen_2 || "",
          imagen_3: e.imagen_3 || "",
          titulo_1: e.titulo_1 || "",
          titulo_2: e.titulo_2 || "",
          titulo_3: e.titulo_3 || "",
          descripcion_1: e.descripcion_1 || "",
          descripcion_2: e.descripcion_2 || "",
          descripcion_3: e.descripcion_3 || "",
          mision: e.mision || "",
          vision: e.vision || "",
          nuestro_objetivo: e.nuestro_objetivo || "",
          objetivo_1: e.objetivo_1 || "",
          objetivo_2: e.objetivo_2 || "",
          objetivo_3: e.objetivo_3 || "",
          quienes_somos: e.quienes_somos || "",
          correo_empresa: e.correo_empresa || "",
          telefonoss: e.telefonoss || "",
          direccion: e.direccion || "",
          id_administrador: e.id_administrador || "",
        });
        setImagePreviews({
          logo_imagen: e.logo_imagen ? getImageUrl(e.logo_imagen) : null,
          imagen_hero: e.imagen_hero ? getImageUrl(e.imagen_hero) : null,
          imagen_1: e.imagen_1 ? getImageUrl(e.imagen_1) : null,
          imagen_2: e.imagen_2 ? getImageUrl(e.imagen_2) : null,
          imagen_3: e.imagen_3 ? getImageUrl(e.imagen_3) : null,
        });
        setSelectedFiles({
          logo_imagen: null,
          imagen_hero: null,
          imagen_1: null,
          imagen_2: null,
          imagen_3: null,
        });
        setCurrentEmpresa(e);
        setEditMode(false);
        setViewMode(true);
        setModalOpen(true);
      } else {
        setError(response.data.mensaje || "No se pudo cargar la empresa");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(errorMessage);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentEmpresa(null);
    setError(null);
    setViewMode(false);
    setSelectedFiles({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null,
    });
    setImagePreviews({
      logo_imagen: null,
      imagen_hero: null,
      imagen_1: null,
      imagen_2: null,
      imagen_3: null,
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
          const required = ["nombre_sistema", "id_administrador"];
          if (required.includes(key)) return true;
          return value !== "" && value !== null && value !== undefined;
        })
      );
      Object.entries(filteredData).forEach(([key, value]) => {
        if (
          ![
            "logo_imagen",
            "imagen_hero",
            "imagen_1",
            "imagen_2",
            "imagen_3",
          ].includes(key)
        )
          data.append(key, value);
      });
      [
        "logo_imagen",
        "imagen_hero",
        "imagen_1",
        "imagen_2",
        "imagen_3",
      ].forEach((field) => {
        if (selectedFiles[field]) data.append(field, selectedFiles[field]);
      });
      if (
        filteredData.nombre_sistema &&
        filteredData.nombre_sistema.length > 100
      ) {
        setError("El nombre del sistema no debe exceder 100 caracteres");
        return;
      }
      if (filteredData.titulo_h1 && filteredData.titulo_h1.length > 150) {
        setError("El titulo H1 no debe exceder 150 caracteres");
        return;
      }
      if (
        filteredData.correo_empresa &&
        filteredData.correo_empresa.length > 150
      ) {
        setError("El correo de la empresa no debe exceder 150 caracteres");
        return;
      }
      if (filteredData.telefonoss && filteredData.telefonoss.length > 50) {
        setError("El telefono no debe exceder 50 caracteres");
        return;
      }
      if (
        filteredData.correo_empresa &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(filteredData.correo_empresa)
      ) {
        setError("El correo de la empresa no es valido");
        return;
      }
      if (
        filteredData.id_administrador &&
        !administradores.some(
          (a) => a.id_administrador === parseInt(filteredData.id_administrador)
        )
      ) {
        setError("El administrador seleccionado no es valido");
        return;
      }
      const config = { headers: { "Content-Type": "multipart/form-data" } };
      if (editMode)
        response = await api.patch(
          `/empresa/${currentEmpresa.id_empresa}`,
          data,
          config
        );
      else response = await api.post("/empresa/", data, config);
      if (response.data.exito) {
        closeModal();
        fetchEmpresas();
      } else {
        setError(response.data.mensaje || "No se pudo guardar");
      }
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

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Gestion de Empresas</h2>

      <div className="flex flex-col xl:flex-row gap-4 mb-6 items-stretch">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex h-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, direccion o administrador"
              className="border rounded-l px-4 py-2 w-full"
              disabled={!permissions.canView}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-r hover:bg-blue-600 whitespace-nowrap"
              disabled={!permissions.canView}
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
            disabled={!permissions.canView}
          >
            <option value="">Sin filtro</option>
            <option value="nombre">Por nombre</option>
            <option value="fecha">Por fecha</option>
            <option value="correo">Por correo</option>
          </select>

          {permissions.canCreate && (
            <button
              onClick={openCreateModal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 whitespace-nowrap sm:w-auto w-full"
            >
              Crear Empresa
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Cargando empresas...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Nombre Sistema</th>
                  <th className="px-4 py-2 text-left">Correo</th>
                  <th className="px-4 py-2 text-left">Telefono</th>
                  <th className="px-4 py-2 text-left">Administrador</th>
                  <th className="px-4 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e, index) => (
                  <tr key={e.id_empresa} className="border-t">
                    <td className="px-4 py-2">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-4 py-2">{e.nombre_sistema}</td>
                    <td className="px-4 py-2">{e.correo_empresa || "-"}</td>
                    <td className="px-4 py-2">{e.telefonoss || "-"}</td>
                    <td className="px-4 py-2">{`${e.admin_nombre} ${e.admin_apellido}`}</td>
                    <td className="px-4 py-2 flex gap-2">
                      {permissions.canView && (
                        <button
                          onClick={() => openViewModal(e.id_empresa)}
                          className="text-green-500 hover:text-green-700 mr-2"
                        >
                          Ver Datos
                        </button>
                      )}
                      {permissions.canEdit && (
                        <button
                          onClick={() => openEditModal(e.id_empresa)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Editar
                        </button>
                      )}
                      {permissions.canDelete && (
                        <button
                          onClick={() => handleDelete(e.id_empresa)}
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
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {viewMode
                ? "Ver Datos de Empresa"
                : editMode
                ? "Editar Empresa"
                : "Crear Empresa"}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre del Sistema
                </label>
                <input
                  name="nombre_sistema"
                  value={formData.nombre_sistema}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Correo Empresa
                </label>
                <input
                  name="correo_empresa"
                  value={formData.correo_empresa}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  type="email"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Telefono
                </label>
                <input
                  name="telefonoss"
                  value={formData.telefonoss}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Direccion
                </label>
                <input
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Administrador
                </label>
                <select
                  name="id_administrador"
                  value={formData.id_administrador}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  required
                  disabled={viewMode}
                >
                  <option value="">Seleccione un administrador</option>
                  {administradores.map((a) => (
                    <option key={a.id_administrador} value={a.id_administrador}>
                      {`${a.nombre} ${a.apellido}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Logo</label>
                {imagePreviews.logo_imagen ? (
                  <img
                    src={getImageUrl(imagePreviews.logo_imagen)} // usa la función getImageUrl
                    alt="Logo"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay logo</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "logo_imagen")}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Imagen Hero
                </label>
                {imagePreviews.imagen_hero ? (
                  <img
                    src={getImageUrl(imagePreviews.imagen_hero)}
                    alt="Hero"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen hero</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_hero")}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Titulo H1
                </label>
                <input
                  name="titulo_h1"
                  value={formData.titulo_h1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descripcion H1
                </label>
                <textarea
                  name="descripcion_h1"
                  value={formData.descripcion_h1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Te Ofrecemos
                </label>
                <textarea
                  name="te_ofrecemos"
                  value={formData.te_ofrecemos}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Imagen 1
                </label>
                {imagePreviews.imagen_1 ? (
                  <img
                    src={getImageUrl(imagePreviews.imagen_1)}
                    alt="Imagen 1"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen 1</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_1")}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titulo 1
                </label>
                <input
                  name="titulo_1"
                  value={formData.titulo_1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descripcion 1
                </label>
                <textarea
                  name="descripcion_1"
                  value={formData.descripcion_1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Imagen 2
                </label>
                {imagePreviews.imagen_2 ? (
                  <img
                    src={getImageUrl(imagePreviews.imagen_2)}
                    alt="Imagen 2"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen 2</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_2")}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titulo 2
                </label>
                <input
                  name="titulo_2"
                  value={formData.titulo_2}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descripcion 2
                </label>
                <textarea
                  name="descripcion_2"
                  value={formData.descripcion_2}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Imagen 3
                </label>
                {imagePreviews.imagen_3 ? (
                  <img
                    src={getImageUrl(imagePreviews.imagen_3)}
                    alt="Imagen 3"
                    className="w-32 h-32 object-cover rounded mb-2"
                  />
                ) : viewMode ? (
                  <p className="text-gray-500">No hay imagen 3</p>
                ) : null}
                {!viewMode && (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "imagen_3")}
                    className="w-full border rounded px-3 py-2 bg-gray-100"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titulo 3
                </label>
                <input
                  name="titulo_3"
                  value={formData.titulo_3}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Descripcion 3
                </label>
                <textarea
                  name="descripcion_3"
                  value={formData.descripcion_3}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Mision</label>
                <textarea
                  name="mision"
                  value={formData.mision}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Vision</label>
                <textarea
                  name="vision"
                  value={formData.vision}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Nuestro Objetivo
                </label>
                <textarea
                  name="nuestro_objetivo"
                  value={formData.nuestro_objetivo}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Objetivo 1
                </label>
                <textarea
                  name="objetivo_1"
                  value={formData.objetivo_1}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Objetivo 2
                </label>
                <textarea
                  name="objetivo_2"
                  value={formData.objetivo_2}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Objetivo 3
                </label>
                <textarea
                  name="objetivo_3"
                  value={formData.objetivo_3}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
                  disabled={viewMode}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Quienes Somos
                </label>
                <textarea
                  name="quienes_somos"
                  value={formData.quienes_somos}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                  rows="3"
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

export default Empresa;
