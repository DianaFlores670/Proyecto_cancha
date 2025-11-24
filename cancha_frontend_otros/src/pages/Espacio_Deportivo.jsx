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
  const prio = ["ADMINISTRADOR", "ADMIN_ESP_DEP"];
  return (
    prio.find((r) => norm2.includes(r) && keys.includes(r)) ||
    norm2.find((r) => keys.includes(r)) ||
    "DEFAULT"
  );
};

// --- CORREGIDO: getImageUrl ---
const getImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path; // ya es URL completa
  const base = (api.defaults?.baseURL || "").replace(/\/$/, "");
  const cleanPath = String(path).replace(/^\//, "");
  return `${base}/${cleanPath}`;
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
      try {
        const response = await api.get("/admin_esp_dep/datos-especificos");
        if (response.data?.exito)
          setAdministradores(response.data.datos.administradores || []);
      } catch {}
    };
    fetchAdministradores();
  }, []);

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

  const handleDelete = async (id) => {
    if (!permissions.canDelete) return;
    if (!window.confirm("Estas seguro de eliminar este espacio deportivo?"))
      return;
    try {
      const response = await api.delete(`/espacio_deportivo/${id}`);
      if (response.data.exito) fetchEspacios();
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
            ? getImageUrl(e.imagen_principal)
            : null,
          imagen_sec_1: e.imagen_sec_1 ? getImageUrl(e.imagen_sec_1) : null,
          imagen_sec_2: e.imagen_sec_2 ? getImageUrl(e.imagen_sec_2) : null,
          imagen_sec_3: e.imagen_sec_3 ? getImageUrl(e.imagen_sec_3) : null,
          imagen_sec_4: e.imagen_sec_4 ? getImageUrl(e.imagen_sec_4) : null,
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
            ? getImageUrl(e.imagen_principal)
            : null,
          imagen_sec_1: e.imagen_sec_1 ? getImageUrl(e.imagen_sec_1) : null,
          imagen_sec_2: e.imagen_sec_2 ? getImageUrl(e.imagen_sec_2) : null,
          imagen_sec_3: e.imagen_sec_3 ? getImageUrl(e.imagen_sec_3) : null,
          imagen_sec_4: e.imagen_sec_4 ? getImageUrl(e.imagen_sec_4) : null,
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
        setError(response.data.mensaje || "No se pudo cargar el espacio");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.mensaje || "Error de conexion al servidor";
      setError(errorMessage);
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

      // Validaciones simples
      if (filteredData.nombre && filteredData.nombre.length > 100) {
        setError("El nombre no debe exceder 100 caracteres");
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

  if (!role) return <p>Cargando permisos...</p>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Aquí iría todo tu renderizado de tabla, formulario y modal */}
      {/* Asegúrate de que en todos los <img> uses `src={imagePreviews.[imagen]}` */}
    </div>
  );
};

export default EspacioDeportivo;
