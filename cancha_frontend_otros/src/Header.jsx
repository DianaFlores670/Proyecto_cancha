/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./services/api";
import {
  FaEnvelope,
  FaLock,
  FaUser,
  FaUsersCog,
  FaClipboardList,
  FaCheckCircle,
  FaPhone,
  FaVenusMars,
  FaIdBadge,
  FaCalendarAlt,
  FaInfoCircle,
  FaUserTag,
  FaMapMarkerAlt,
  FaAlignLeft,
  FaCamera,
  FaKey,
  FaTimes,
  FaSave,
  FaBars,
  FaChevronDown,
} from "react-icons/fa";
import { getImageUrl } from "./utils";

const ROLE_PANEL_MAP = {
  administrador: {
    path: "/administrador",
    label: "de Administrador Gral.",
    value: "ADMINISTRADOR",
  },
  admin_esp_dep: {
    path: "/administrador",
    label: "de Administrador",
    value: "ADMIN_ESP_DEP",
  },
  control: {
    path: "/encargadocontrol",
    label: "de Control",
    value: "CONTROL",
  },
  encargado: {
    path: "/encargadocontrol",
    label: "de Encargado",
    value: "ENCARGADO",
  },
};

const getPanelEntries = (u) => {
  const raw = Array.isArray(u?.roles) ? u.roles : [];
  const list = raw
    .map((r) => (r?.rol || "").toLowerCase())
    .filter((r) => r && r !== "cliente" && r);
  const uniq = Array.from(new Set(list));
  return uniq.map((r) => ROLE_PANEL_MAP[r]).filter(Boolean);
};

const formatRole = (v) => {
  const s = (v || "").toString().replace(/[_-]+/g, " ").trim();
  return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : "Sin rol";
};

const formatValue = (v) => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try {
      return new Date(v).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch { }
  }
  return String(v ?? "");
};

const normalizeUser = (u) => {
  const rolesSrc = Array.isArray(u?.roles) ? u.roles : [];
  const roles = rolesSrc.map((r) => {
    if (typeof r === "string")
      return { rol: r.toLowerCase(), tabla: "", datos: {} };
    const rol = typeof r?.rol === "string" ? r.rol : "";
    const tabla = typeof r?.tabla === "string" ? r.tabla : "";
    const datos =
      r && typeof r.datos === "object" && r.datos !== null ? r.datos : {};
    return { rol, tabla, datos };
  });
  return { ...u, roles };
};

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [registerData, setRegisterData] = useState({
    usuario: "",
    correo: "",
    contrasena: "",
    confirmarContrasena: "",
    rol_agregar: "cliente",
    id_espacio: "",
    motivo: "",
  });
  const [espaciosLibres, setEspaciosLibres] = useState([]);
  const [espaciosLoading, setEspaciosLoading] = useState(false);
  const [espaciosError, setEspaciosError] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [TitlesubmissionMessage, setTitleSubmissionMessage] = useState("");
  const [showRoleSection, setShowRoleSection] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [editProfileError, setEditProfileError] = useState(null);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
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
    datos_especificos: {},
  });
  const [passwordData, setPasswordData] = useState({
    nueva_contrasena: "",
    confirmar_contrasena: "",
  });
  const [passwordMatchError, setPasswordMatchError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const panelMenuRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileUserMenu, setMobileUserMenu] = useState(false);
  const [showPanelMenu, setShowPanelMenu] = useState(false);
  const [mobilePanelMenuOpen, setMobilePanelMenuOpen] = useState(false);

  const sexosPermitidos = ["masculino", "femenino"];
  const rolesDisponibles = [
    {
      valor: "admin_esp_dep",
      etiqueta: "Administrador de espacios deportivos",
    },
    { valor: "encargado", etiqueta: "Encargado" },
    { valor: "control", etiqueta: "Control" },
    { valor: "cliente", etiqueta: "Cliente" },
  ];

  const [roleRequest, setRoleRequest] = useState({
    rol: "",
    id_espacio: "",
    motivo: "",
  });
  const [roleRequestLoading, setRoleRequestLoading] = useState(false);
  const [roleRequestError, setRoleRequestError] = useState(null);
  const [roleRequestSuccess, setRoleRequestSuccess] = useState(null);

  const userRolesSet = new Set(
    (user?.roles ?? []).map((r) => (r.rol || "").toLowerCase())
  );

  const panelEntries = getPanelEntries(user || {});
  const hasPanels = isLoggedIn && panelEntries.length > 0;

  const availableRoles = rolesDisponibles.filter(
    (r) => !userRolesSet.has(r.valor)
  );

  const [showRoleRequestModal, setShowRoleRequestModal] = useState(false);
  const handleSendRoleRequestFromModal = () => {
    handleSendRoleRequest();
  };

  const [espaciosEncargado, setEspaciosEncargado] = useState([]);
  const [loadingEspaciosEncargado, setLoadingEspaciosEncargado] =
    useState(false);

  const fetchEspaciosLibres = async () => {
    setEspaciosLoading(true);
    setEspaciosError(null);
    try {
      const r = await api.get("/solicitud-admin-esp-dep/espacios-libres");
      const list =
        r.data?.datos?.espacios ||
        r.data?.datos ||
        r.data?.data?.espacios ||
        [];
      setEspaciosLibres(Array.isArray(list) ? list : []);
    } catch (err) {
      setEspaciosError("Error al cargar espacios libres");
      setEspaciosLibres([]);
    } finally {
      setEspaciosLoading(false);
    }
  };

  const fetchEspaciosEncargado_Public = async () => {
    try {
      const r = await api.get("/espacio_deportivo/filtro", {
        params: { tipo: "nombre", limit: 200, offset: 0 },
      });

      const datos = r.data?.datos?.espacios || [];
      setEspaciosEncargado(datos);
    } catch (e) {
      console.error("Error cargando espacios para encargado:", e);
      setEspaciosEncargado([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    setIsLoggedIn(!!token);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeUser(parsed);
        setUser(normalized);
        setFormData({
          nombre: normalized.nombre || "",
          apellido: normalized.apellido || "",
          correo: normalized.correo || "",
          usuario: normalized.usuario || "",
          telefono: normalized.telefono || "",
          sexo: normalized.sexo || "",
          imagen_perfil: normalized.imagen_perfil || "",
          latitud: normalized.latitud || "",
          longitud: normalized.longitud || "",
          datos_especificos: normalized.roles?.[0]?.datos || {},
        });
        setImagePreview(
          normalized.imagen_perfil
            ? getImageUrl(normalized.imagen_perfil)
            : null
        );
      } catch (e) {
        console.error("Error parsing user from LS:", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await api.get("/empresa/dato-individual/2");
        setCompany(response.data.datos.empresa);
        setLoading(false);
      } catch (err) {
        setError("Error al cargar los datos de la empresa");
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY <= 0) {
    } else if (currentScrollY > lastScrollY) {
    } else {
    }
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (panelMenuRef.current && !panelMenuRef.current.contains(event.target)) {
        setShowPanelMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await api.post("/registro/sign-in", {
        correo,
        contrasena,
      });

      const data = response.data;

      if (data.success && data.data.token && data.data.usuario) {
        const normalized = normalizeUser(data.data.usuario);
        const hasRole =
          Array.isArray(normalized.roles) && normalized.roles.length > 0;

        if (!hasRole) {
          setLoginError(
            "Tu cuenta no tiene roles habilitados. Solicita acceso o espera aprobacion."
          );
          return;
        }

        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(normalized));
        setIsLoggedIn(true);
        setUser(normalized);

        setShowLoginModal(false);
        setCorreo("");
        setContrasena("");

        const roleSet = new Set(
          (normalized.roles ?? []).map((r) => (r.rol || "").toUpperCase())
        );

        const isMobile = window.innerWidth < 768;

        if (roleSet.has("ADMINISTRADOR")) {
          if (isMobile) {
            navigate("/administrador/inicio");
          } else {
            navigate("/administrador");
          }
        } else if (roleSet.has("ADMIN_ESP_DEP")) {
          if (isMobile) {
            navigate("/administrador/inicio");
          } else {
            navigate("/administrador");
          }
        } else if (roleSet.has("ENCARGADO")) {
          if (isMobile) {
            navigate("/encargadocontrol/inicio");
          } else {
            navigate("/encargadocontrol");
          }
        } else if (roleSet.has("CONTROL")) {
          if (isMobile) {
            navigate("/encargadocontrol/inicio");
          } else {
            navigate("/encargadocontrol");
          }
        } else {
          navigate("/espacios-deportivos");
        }
      } else {
        setLoginError("Respuesta invalida del servidor");
      }
    } catch (err) {
      setLoginError(
        err.response?.data?.message ||
        "Error al iniciar sesion. Verifica tus credenciales."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);

    if (registerData.contrasena !== registerData.confirmarContrasena) {
      setRegisterError("Las contrasenas no coinciden");
      setRegisterLoading(false);
      return;
    }

    const rol = registerData.rol_agregar || "cliente";
    const wantsAdmin = rol === "admin_esp_dep";

    if (wantsAdmin && !registerData.id_espacio) {
      setRegisterError("Debe seleccionar un espacio deportivo");
      setRegisterLoading(false);
      return;
    }

    try {
      const payloadUser = {
        usuario: registerData.usuario,
        correo: registerData.correo,
        contrasena: registerData.contrasena,
        rol: "cliente",
      };

      const res = await api.post("/usuario/", payloadUser);
      const ok = res.data?.exito === true;

      if (!ok) throw new Error(res.data?.mensaje || "Registro fallido");

      const newUserId = res.data?.datos?.usuario?.id_persona;
      if (!newUserId) throw new Error("No se recibio ID del usuario creado");

      if (rol === "admin_esp_dep") {
        await api.post("/solicitud-admin-esp-dep/", {
          id_usuario: newUserId,
          id_espacio: Number(registerData.id_espacio),
          motivo: registerData.motivo || null,
        });
      } else if (rol === "encargado") {
        await api.post("/solicitud-encargado/", {
          id_usuario: newUserId,
          id_espacio: Number(registerData.id_espacio),
          rol,
          motivo: registerData.motivo || null,
        });
      } else if (rol === "control") {
        await api.post("/solicitud-control/", {
          id_usuario: newUserId,
          id_espacio: Number(registerData.id_espacio),
          rol,
          motivo: registerData.motivo || null,
        });
      }

      setShowRegisterModal(false);
      setRegisterError(null);

      setTitleSubmissionMessage(
        rol === "cliente" ? "Registro completado" : "Solicitud enviada"
      );
      setSubmissionMessage(
        rol === "cliente"
          ? "Bienvenido. Puede iniciar sesion."
          : "Solicitud creada. Te avisaremos por correo cuando se revise."
      );
      setShowSubmissionModal(true);

      setRegisterData({
        usuario: "",
        correo: "",
        contrasena: "",
        confirmarContrasena: "",
        rol_agregar: "cliente",
        id_espacio: "",
        motivo: "",
      });
      setShowRoleSection(false);
    } catch (err) {
      setRegisterError(err?.message || "Error de conexion");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify({}));
    setIsLoggedIn(false);
    setUser(null);
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
      datos_especificos: {},
    });
    setImagePreview(null);
    setSelectedFile(null);
    setShowMenu(false);
    setShowPanelMenu(false);
    setMobileMenuOpen(false);
    setMobileUserMenu(false);
    setMobilePanelMenuOpen(false);
    navigate("/");
  };

  const handleRoleSelect = async (e) => {
    const v = e.target.value;

    setRoleRequest({
      rol: v,
      id_espacio: "",
      motivo: "",
    });

    setRoleRequestError(null);
    setRoleRequestSuccess(null);

    if (v === "admin_esp_dep") {
      if (!espaciosLibres.length) fetchEspaciosLibres();
    }

    if (v === "encargado" || v === "control") {
      fetchEspaciosEncargado_Public();
    }
  };

  const handleImageError = (e) => {
    console.error("Error cargando imagen:", e.target.src);
    e.target.style.display = "none";
  };

  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
  };

  const openProfileModal = async () => {
    setShowMenu(false);
    setMobileUserMenu(false);
    setProfileError(null);
    try {
      const response = await api.get(
        `/usuario/dato-individual/${user.id_persona}`
      );
      if (response.data.exito) {
        const userData = response.data.datos.usuario;
        const normalized = normalizeUser(userData);

        setUser(normalized);
        localStorage.setItem("user", JSON.stringify(normalized));

        setFormData({
          nombre: normalized.nombre || "",
          apellido: normalized.apellido || "",
          correo: normalized.correo || "",
          usuario: normalized.usuario || "",
          telefono: normalized.telefono || "",
          sexo: normalized.sexo || "",
          imagen_perfil: normalized.imagen_perfil || "",
          latitud: normalized.latitud || "",
          longitud: normalized.longitud || "",
          datos_especificos: normalized.roles?.[0]?.datos || {},
          fecha_creacion: normalized.fecha_creacion
            ? new Date(normalized.fecha_creacion).toISOString().split("T")[0]
            : "",
        });
        setImagePreview(
          normalized.imagen_perfil
            ? getImageUrl(normalized.imagen_perfil)
            : null
        );

        setShowProfileModal(true);
      } else {
        setProfileError(response.data.mensaje);
      }
    } catch (err) {
      console.error("Error in openProfileModal:", err);
      setProfileError(
        err.response?.data?.mensaje || "Error al cargar los datos del usuario"
      );
    }
  };

  const openEditProfileModal = async () => {
    setShowMenu(false);
    setMobileUserMenu(false);
    setEditProfileError(null);
    try {
      const response = await api.get(
        `/usuario/dato-individual/${user.id_persona}`
      );
      if (response.data.exito) {
        const userData = response.data.datos.usuario;
        const normalized = normalizeUser(userData);

        setUser(normalized);
        localStorage.setItem("user", JSON.stringify(normalized));

        setFormData({
          nombre: normalized.nombre || "",
          apellido: normalized.apellido || "",
          correo: normalized.correo || "",
          usuario: normalized.usuario || "",
          telefono: normalized.telefono || "",
          sexo: normalized.sexo || "",
          imagen_perfil: normalized.imagen_perfil || "",
          latitud: normalized.latitud || "",
          longitud: normalized.longitud || "",
          datos_especificos: normalized.roles?.[0]?.datos || {},
          fecha_creacion: normalized.fecha_creacion
            ? new Date(normalized.fecha_creacion).toISOString().split("T")[0]
            : "",
        });
        setImagePreview(
          normalized.imagen_perfil
            ? getImageUrl(normalized.imagen_perfil)
            : null
        );

        setSelectedFile(null);
        setPasswordData({ nueva_contrasena: "", confirmar_contrasena: "" });
        setShowEditProfileModal(true);
      } else {
        setEditProfileError(response.data.mensaje);
      }
    } catch (err) {
      console.error("Error in openEditProfileModal:", err);
      setEditProfileError(
        err.response?.data?.mensaje || "Error al cargar los datos del usuario"
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("nueva_") || name.startsWith("confirmar_")) {
      setPasswordData((prev) => {
        const next = { ...prev, [name]: value };
        if (next.nueva_contrasena && next.confirmar_contrasena) {
          setPasswordMatchError(
            next.nueva_contrasena !== next.confirmar_contrasena
              ? "Las contrasenas no coinciden"
              : null
          );
        } else {
          setPasswordMatchError(null);
        }
        return next;
      });
      return;
    }

    if (name in registerData) {
      if (name === "rol_agregar") {
        const val = value;

        setRegisterData((prev) => ({
          ...prev,
          rol_agregar: val,
          id_espacio: "",
          motivo: "",
        }));

        if (val === "admin_esp_dep") {
          if (!espaciosLibres.length) fetchEspaciosLibres();
        }

        if (val === "control" || val === "encargado") {
          fetchEspaciosEncargado_Public();
        }

        return;
      }

      setRegisterData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleRequestChange = (e) => {
    const { name, value } = e.target;

    if (name === "rol") {
      const v = value;
      setRoleRequest((prev) => ({
        ...prev,
        rol: v,
        id_espacio: v === "admin_esp_dep" ? prev.id_espacio : "",
      }));
      setRoleRequestError(null);
      setRoleRequestSuccess(null);
      if (v === "admin_esp_dep" && espaciosLibres.length === 0) {
        fetchEspaciosLibres();
      }
      return;
    }

    setRoleRequest((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSendRoleRequest = async () => {
    if (!user) return;

    if (!roleRequest.rol) {
      setRoleRequestError("Debes seleccionar un rol");
      return;
    }

    setRoleRequestLoading(true);
    setRoleRequestError(null);
    setRoleRequestSuccess(null);

    try {
      if (roleRequest.rol === "admin_esp_dep") {
        if (!roleRequest.id_espacio) {
          setRoleRequestError("Debes seleccionar un espacio");
          setRoleRequestLoading(false);
          return;
        }

        const payload = {
          id_usuario: user.id_persona,
          id_espacio: Number(roleRequest.id_espacio),
          motivo: roleRequest.motivo || null,
        };

        const res = await api.post("/solicitud-admin-esp-dep/", payload);
        const ok = res.data?.exito === true;
        if (!ok)
          throw new Error(res.data?.mensaje || "No se pudo crear la solicitud");

        setRoleRequestSuccess("Solicitud enviada correctamente");

        setTimeout(() => {
          setShowRoleRequestModal(false);
          setRoleRequest({
            rol: "",
            id_espacio: "",
            motivo: "",
          });
          setRoleRequestError(null);
          setRoleRequestSuccess(null);
        }, 600);
      } else if (roleRequest.rol === "encargado") {
        if (!roleRequest.id_espacio) {
          setRoleRequestError("Debes seleccionar un espacio");
          setRoleRequestLoading(false);
          return;
        }

        const payload = {
          id_usuario: user.id_persona,
          id_espacio: Number(roleRequest.id_espacio),
          rol: roleRequest.rol,
          motivo: roleRequest.motivo || null,
        };

        const res = await api.post("/solicitud-encargado/", payload);
        const ok = res.data?.exito === true;
        if (!ok)
          throw new Error(res.data?.mensaje || "No se pudo crear la solicitud");

        setRoleRequestSuccess("Solicitud enviada correctamente");

        setTimeout(() => {
          setShowRoleRequestModal(false);
          setRoleRequest({
            rol: "",
            id_espacio: "",
            motivo: "",
          });
          setRoleRequestError(null);
          setRoleRequestSuccess(null);
        }, 600);
      } else if (roleRequest.rol === "control") {
        if (!roleRequest.id_espacio) {
          setRoleRequestError("Debes seleccionar un espacio");
          setRoleRequestLoading(false);
          return;
        }

        const payload = {
          id_usuario: user.id_persona,
          id_espacio: Number(roleRequest.id_espacio),
          rol: roleRequest.rol,
          motivo: roleRequest.motivo || null,
        };

        const res = await api.post("/solicitud-control/", payload);
        const ok = res.data?.exito === true;
        if (!ok)
          throw new Error(res.data?.mensaje || "No se pudo crear la solicitud");

        setRoleRequestSuccess("Solicitud enviada correctamente");

        setTimeout(() => {
          setShowRoleRequestModal(false);
          setRoleRequest({
            rol: "",
            id_espacio: "",
            motivo: "",
          });
          setRoleRequestError(null);
          setRoleRequestSuccess(null);
        }, 600);
      } else {
        setRoleRequestError("Rol no soportado");
      }
    } catch (err) {
      const backendMsg =
        err?.response?.data?.mensaje || err?.response?.data?.error;
      if (backendMsg) {
        setRoleRequestError(backendMsg);
      } else {
        setRoleRequestError("No se pudo enviar la solicitud");
      }
    } finally {
      setRoleRequestLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setEditProfileLoading(true);
    setEditProfileError(null);

    if (
      passwordData.nueva_contrasena &&
      passwordData.nueva_contrasena !== passwordData.confirmar_contrasena
    ) {
      setEditProfileError("Las contrasenas no coinciden");
      setEditProfileLoading(false);
      return;
    }

    try {
      const data = new FormData();
      const campos = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo: formData.correo,
        telefono: formData.telefono || "",
        sexo: formData.sexo || "",
        latitud: formData.latitud || "",
        longitud: formData.longitud || "",
      };

      Object.entries(campos).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          data.append(key, value);
        }
      });

      if (passwordData.nueva_contrasena) {
        data.append("contrasena", passwordData.nueva_contrasena);
      }

      if (
        formData.datos_especificos &&
        Object.keys(formData.datos_especificos).length > 0
      ) {
        data.append(
          "datos_especificos",
          JSON.stringify(formData.datos_especificos)
        );
      }

      if (selectedFile) {
        data.append("imagen_perfil", selectedFile);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      const response = await api.patch(
        `/usuario/${user.id_persona}`,
        data,
        config
      );
      if (response.data.exito) {
        const updatedUser = response.data.datos?.usuario || {
          ...user,
          ...campos,
          imagen_perfil: selectedFile
            ? response.data.datos?.usuario?.imagen_perfil ||
            formData.imagen_perfil
            : formData.imagen_perfil,
          datos_rol: formData.datos_especificos,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPasswordData({ nueva_contrasena: "", confirmar_contrasena: "" });
        setShowEditProfileModal(false);
        setEditProfileLoading(false);
      } else {
        setEditProfileError(response.data.mensaje);
        setEditProfileLoading(false);
      }
    } catch (err) {
      console.error("Error in handleEditProfileSubmit:", err);
      setEditProfileError(
        err.response?.data?.mensaje || "Error al actualizar el perfil"
      );
      setEditProfileLoading(false);
    }
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setCorreo("");
    setContrasena("");
    setLoginError(null);
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterData({
      usuario: "",
      correo: "",
      contrasena: "",
      confirmarContrasena: "",
      rol_agregar: "cliente",
      id_espacio: "",
      motivo: "",
    });
    setShowRoleSection(false);
    setRegisterError(null);
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setProfileError(null);
  };

  const handleCloseEditProfileModal = () => {
    setShowEditProfileModal(false);
    setEditProfileError(null);
    setSelectedFile(null);
    setImagePreview(
      user?.imagen_perfil ? getImageUrl(user.imagen_perfil) : null
    );
    setPasswordData({ nueva_contrasena: "", confirmar_contrasena: "" });
    setPasswordMatchError(null);
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-[#0F2634]/95 backdrop-blur-md px-5 py-3 z-50 shadow-lg transition-transform duration-300 md:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {company && company.logo_imagen ? (
              <img
                src={
                  company?.logo_imagen
                    ? getImageUrl(company.logo_imagen)
                    : "/placeholder-logo.png"
                }
                alt={`${company?.nombre_sistema || "Empresa"} logo`}
                onError={handleImageError}
                className="h-10 w-10 object-contain rounded-full border-2 border-[#01CD6C] flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-[#01CD6C]/40 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                {(company?.nombre_sistema?.charAt(0) ?? "S").toUpperCase()}
              </div>
            )}

            <div className="flex items-center gap-2 flex-1">
              <span className="text-base font-semibold text-[#01CD6C] truncate">
                {company?.nombre_sistema ?? "Sistema"}
              </span>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen((s) => !s);
                setMobileUserMenu(false);
                setMobilePanelMenuOpen(false);
              }}
              aria-label="Abrir menu"
              className="ml-1 text-white text-2xl hover:text-[#01CD6C] transition-all focus:outline-none flex-shrink-0"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          <div className="flex items-center justify-end flex-shrink-0">
            {isLoggedIn && user ? (
              <button
                onClick={() => {
                  setMobileUserMenu((s) => !s);
                  setMobileMenuOpen(false);
                  setMobilePanelMenuOpen(false);
                }}
                className="flex items-center gap-2 focus:outline-none"
                aria-haspopup="menu"
                aria-expanded={mobileUserMenu}
              >
                {user.imagen_perfil ? (
                  <img
                    src={
                      user?.imagen_perfil
                        ? getImageUrl(user.imagen_perfil)
                        : "/placeholder-profile.png"
                    }
                    alt="Foto perfil"
                    onError={handleImageError}
                    className="h-9 w-9 object-cover rounded-full border border-white flex-shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 bg-white/10 text-white rounded-full flex items-center justify-center border border-white flex-shrink-0">
                    {(user?.nombre?.charAt(0) ?? "U").toUpperCase()}
                  </div>
                )}
                <span className="text-white font-medium truncate max-w-[6rem] text-sm">
                  {user?.nombre ?? "Usuario"}
                </span>
                <FaChevronDown
                  className={`text-white text-xs transition-transform ${mobileUserMenu ? "rotate-180" : ""
                    }`}
                />
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowLoginModal(true);
                  setMobileMenuOpen(false);
                  setMobileUserMenu(false);
                  setMobilePanelMenuOpen(false);
                }}
                className="bg-[#01CD6C] px-3 py-1 rounded-lg text-white font-semibold text-sm"
              >
                Iniciar sesion
              </button>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mt-3 bg-[#0F2634] text-white px-4 pb-4 rounded-2xl border border-[#01CD6C]/20">
            <nav className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-2 rounded-lg text-sm font-medium hover:bg-[#01CD6C]/20 transition-all"
              >
                Inicio
              </Link>
              <Link
                to="/espacios-deportivos"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-2 rounded-lg text-sm font-medium hover:bg-[#01CD6C]/20 transition-all"
              >
                Espacios deportivos
              </Link>
              <Link
                to="/canchas"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-2 rounded-lg text-sm font-medium hover:bg-[#01CD6C]/20 transition-all"
              >
                Canchas
              </Link>
              {isLoggedIn ? (
                <Link
                  to="/mis-reservas"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 px-2 rounded-lg text-sm font-medium hover:bg-[#01CD6C]/20 transition-all"
                >
                  Mis reservas
                </Link>
              ) : null}

              {hasPanels && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setMobilePanelMenuOpen((prev) => !prev)
                    }
                    className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium bg-[#01CD6C] hover:bg-[#00b359] transition-all"
                  >
                    <span>Ir a Panel... </span>
                    <FaChevronDown
                      className={`text-xs transition-transform ${mobilePanelMenuOpen ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {mobilePanelMenuOpen && (
                    <div className="mt-2 flex flex-col gap-1">
                      {panelEntries.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setMobilePanelMenuOpen(false);
                            setMobileMenuOpen(false);
                            if (p.value) {
                              localStorage.setItem("panelRole", p.value);
                              navigate(`${p.path}?role=${p.value}`);
                            } else {
                              navigate(p.path);
                            }
                          }}
                          className="w-full text-left py-2 px-3 rounded-lg text-xs font-medium bg-white/5 hover:bg-[#01CD6C]/30 transition-all"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isLoggedIn ? (
                <button
                  onClick={() => {
                    setShowRegisterModal(true);
                    setMobileMenuOpen(false);
                    setMobilePanelMenuOpen(false);
                  }}
                  className="mt-2 py-2 text-left font-medium text-sm text-white bg-[#01CD6C]/10 rounded-lg px-3"
                >
                  Registrarse
                </button>
              ) : null}
            </nav>
          </div>
        )}

        {mobileUserMenu && isLoggedIn && user && (
          <div className="absolute top-[68px] right-4 z-[60] md:hidden w-64 bg-white rounded-xl shadow-xl text-[#23475F] border border-gray-100">
            <div className="px-4 py-3 font-medium border-b text-sm">
              {user?.nombre || "Sin nombre"} {user?.apellido || ""}
            </div>

            <div className="px-2 py-2 flex flex-col gap-1">
              <button
                onClick={() => {
                  setMobileUserMenu(false);
                  openProfileModal();
                }}
                className="text-left px-3 py-2 text-sm hover:bg-[#01CD6C] hover:text-white rounded"
              >
                Mi perfil
              </button>

              <button
                onClick={() => {
                  setMobileUserMenu(false);
                  openEditProfileModal();
                }}
                className="mt-1 px-3 py-2 bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white rounded-full font-semibold shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all text-sm flex items-center gap-2 justify-center"
              >
                Editar perfil
              </button>

              <button
                onClick={() => {
                  setMobileUserMenu(false);
                  setShowRoleRequestModal(true);
                }}
                className="text-left px-3 py-2 text-sm hover:bg-[#01CD6C] hover:text-white rounded"
              >
                Solicitar rol
              </button>

              <button
                onClick={() => {
                  setMobileUserMenu(false);
                  handleLogout();
                }}
                className="text-left px-3 py-2 text-sm hover:bg-[#A31621] hover:text-white rounded text-red-600"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex">
        <div className="fixed top-0 left-0 w-full bg-[#0F2634]/95 backdrop-blur-md px-8 py-3 z-40 shadow-lg transition-all duration-300">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-6">
            <div className="bg-[#0F2634] rounded-2xl shadow-sm p-2 border border-[#23475F]/20">
              <div className="flex items-center gap-4">
                {company && company.logo_imagen && (
                  <Link to="/" className="group relative">
                    <img
                      src={
                        company?.logo_imagen
                          ? getImageUrl(company.logo_imagen)
                          : "/placeholder-logo.png"
                      }
                      alt={`${company?.nombre_sistema || "Empresa"} logo`}
                      className="h-16 w-16 object-contain rounded-full border-4 border-[#01CD6C] shadow-md"
                      onError={handleImageError}
                      aria-label="Ir a la pagina principal"
                    />
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-[-2rem] bg-[#0F2634] text-[#FFFFFF] text-sm font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      Home
                    </span>
                  </Link>
                )}
                {company && (
                  <div>
                    <h2 className="text-3xl font-bold text-[#01cd6c] mb-0.5">
                      {company.nombre_sistema}
                    </h2>
                    <p className="text-xs text-white/70 max-w-xs">
                      Gestion de espacios deportivos de forma digital
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              <Link
                to="/"
                className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm"
                aria-label="Ir a inicio"
              >
                Inicio
              </Link>
              <Link
                to="/espacios-deportivos"
                className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm"
                aria-label="Ir a espacios deportivos"
              >
                Espacios deportivos
              </Link>
              <Link
                to="/canchas"
                className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm"
                aria-label="Ir a canchas"
              >
                Canchas
              </Link>

              {isLoggedIn && (
                <Link
                  to="/mis-reservas"
                  className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm"
                  aria-label="Ir a mis reservas"
                >
                  Mis reservas
                </Link>
              )}

              {hasPanels && (
                <div className="relative" ref={panelMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowPanelMenu((prev) => !prev)}
                    className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm flex items-center gap-2"
                  >
                    <span>Ir a panel...</span>
                    <FaChevronDown
                      className={`text-xs transition-transform ${showPanelMenu ? "rotate-180" : ""
                        }`}
                    />
                  </button>
                  {showPanelMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-[#0F2634] rounded-xl shadow-xl border border-gray-100 z-50 py-2">
                      {panelEntries.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setShowPanelMenu(false);
                            if (p.value) {
                              localStorage.setItem("panelRole", p.value);
                              navigate(`${p.path}?role=${p.value}`);
                            } else {
                              navigate(p.path);
                            }
                          }}
                          className="block w-full text-left px-4 py-2 text-white hover:bg-[#01CD6C]/30 hover:text-white transition-colors duration-200 text-sm"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!isLoggedIn && (
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm"
                  aria-label="Registrarse"
                >
                  Registrarse
                </button>
              )}
              {isLoggedIn && user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={toggleMenu}
                    className="flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#01CD6C]/60"
                    aria-haspopup="menu"
                    aria-expanded={showMenu}
                    aria-label="Abrir menu de usuario"
                  >
                    {user.imagen_perfil ? (
                      <img
                        src={
                          user?.imagen_perfil
                            ? getImageUrl(user.imagen_perfil)
                            : "/placeholder-profile.png"
                        }
                        alt={
                          user?.nombre
                            ? `${user.nombre} foto de perfil`
                            : "Foto de perfil"
                        }
                        onError={handleImageError}
                        className="h-11 w-11 md:h-14 md:w-14 object-cover rounded-full border-2 border-[#01CD6C] shadow-md"
                      />
                    ) : (
                      <div className="h-10 w-10 md:h-12 md:w-12 bg-white/10 text-white rounded-full flex items-center justify-center ring-2 ring-white/10">
                        <span className="font-semibold">
                          {(user?.nombre?.charAt(0) ?? "S").toUpperCase()}
                          {(user?.apellido?.charAt(0) ?? "A").toUpperCase()}
                        </span>
                      </div>
                    )}

                    <span className="text-white font-medium md:max-w-[12rem] truncate pr-2 text-sm md:text-base">
                      {user?.nombre ?? "Usuario"}
                    </span>
                    <FaChevronDown
                      className={`text-white text-xs md:text-sm opacity-80 transition-transform ${showMenu ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 transition-all duration-200">
                      <div className="px-4 py-3 text-[#23475F] font-medium border-b border-gray-200 text-sm">
                        {user?.nombre || "Sin nombre"}{" "}
                        {user?.apellido || "Sin apellido"}
                      </div>

                      <button
                        onClick={openProfileModal}
                        className="block w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#01CD6C] hover:text-white transition-colors duration-200 text-sm"
                      >
                        Mi perfil
                      </button>
                      <button
                        onClick={openEditProfileModal}
                        className="block w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#01CD6C] hover:text-white transition-colors duration-200 text-sm"
                      >
                        Editar mi perfil
                      </button>

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowRoleRequestModal(true);
                          setRoleRequestError(null);
                          setRoleRequestSuccess(null);
                          setRoleRequest({
                            rol: "",
                            id_espacio: "",
                            motivo: "",
                          });
                        }}
                        className="block w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#01CD6C] hover:text-white transition-colors duration-200 text-sm"
                      >
                        Solicitar rol
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#A31621] hover:text-white transition-colors duration-200 text-sm"
                      >
                        Cerrar sesion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-4 rounded-full shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-[2px] text-sm"
                  aria-label="Iniciar sesion"
                >
                  Iniciar sesion
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] animate-fadeIn px-3">
          <div className="bg-white backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md relative border border-white/30 animate-scaleIn">
            <button
              onClick={handleCloseLoginModal}
              className="absolute top-3 right-3 text-[#23475F] hover:text-[#01CD6C] text-2xl sm:text-3xl transition-all flex items-center justify-center"
              aria-label="Cerrar modal de inicio de sesion"
            >
              <FaTimes />
            </button>

            <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#23475F] mb-6">
              Iniciar sesion
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                  Correo
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                  <FaEnvelope className="text-[#01CD6C] text-lg" />
                  <input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    placeholder="example@mail.com"
                    aria-label="Correo electronico"
                    className="w-full bg-transparent outline-none text-[#23475F] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                  Contrasena
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                  <FaLock className="text-[#01CD6C] text-lg" />
                  <input
                    id="contrasena"
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    required
                    placeholder="********"
                    aria-label="Contrasena"
                    className="w-full bg-transparent outline-none text-[#23475F] text-sm"
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-[#A31621] text-xs sm:text-sm text-center font-medium">
                  {loginError}
                </p>
              )}

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className={`w-full py-3 px-4 bg-[#01CD6C] text-white text-base rounded-full shadow-lg hover:bg-[#00b359] transition-all font-semibold hover:translate-y-[-2px] hover:shadow-xl ${loginLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                aria-label="Iniciar sesion"
              >
                {loginLoading ? (
                  <div className="flex justify-center items-center gap-3">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Cargando...
                  </div>
                ) : (
                  "Iniciar sesion"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] animate-fadeIn px-3">
          <div className="bg-white backdrop-blur-xl p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative border border-white/40 animate-scaleIn">
            <button
              onClick={handleCloseRegisterModal}
              className="absolute top-3 right-3 text-[#23475F] hover:text-[#01CD6C] text-2xl sm:text-3xl transition-all flex items-center justify-center"
              aria-label="Cerrar modal de registro"
            >
              <FaTimes />
            </button>

            <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#23475F] mb-6">
              Crear cuenta
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                  Usuario
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                  <FaUser className="text-[#01CD6C] text-lg" />
                  <input
                    id="register-usuario"
                    name="usuario"
                    type="text"
                    value={registerData.usuario}
                    onChange={handleInputChange}
                    required
                    placeholder="Tu nombre de usuario"
                    className="w-full bg-transparent outline-none text-[#23475F] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                  Correo
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                  <FaEnvelope className="text-[#01CD6C] text-lg" />
                  <input
                    id="register-correo"
                    name="correo"
                    type="email"
                    value={registerData.correo}
                    onChange={handleInputChange}
                    required
                    placeholder="correo@email.com"
                    className="w-full bg-transparent outline-none text-[#23475F] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                  Contrasena
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                  <FaLock className="text-[#01CD6C] text-lg" />
                  <input
                    id="register-contrasena"
                    name="contrasena"
                    type="password"
                    value={registerData.contrasena}
                    onChange={handleInputChange}
                    required
                    placeholder="********"
                    className="w-full bg-transparent outline-none text-[#23475F] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                  Confirmar contrasena
                </label>
                <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                  <FaLock className="text-[#01CD6C] text-lg" />
                  <input
                    id="register-confirmar-contrasena"
                    name="confirmarContrasena"
                    type="password"
                    value={registerData.confirmarContrasena}
                    onChange={handleInputChange}
                    required
                    placeholder="Repite tu contrasena"
                    className="w-full bg-transparent outline-none text-[#23475F] text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showRoleSection;
                    setShowRoleSection(next);
                    if (next && registerData.rol_agregar === "admin_esp_dep") {
                      fetchEspaciosLibres();
                    }
                  }}
                  className="text-[#01CD6C] hover:text-[#00b359] text-xs sm:text-sm font-medium flex items-center gap-2 transition-all"
                >
                  <FaUsersCog className="text-lg" />
                  Quiero un rol en el sistema
                  <svg
                    className={`w-4 h-4 transform transition-transform ${showRoleSection ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showRoleSection && (
                  <div className="mt-3 bg-white/80 rounded-2xl p-4 border border-[#01CD6C]/40 shadow-inner animate-fadeIn">
                    <label className="block text-xs sm:text-sm font-medium text-[#23475F] mb-1">
                      Solicitar rol
                    </label>
                    <div className="flex items-center gap-3 bg-white border border-[#23475F]/40 rounded-full px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#01CD6C] transition-all">
                      <FaClipboardList className="text-[#01CD6C] text-lg" />
                      <select
                        id="rol_agregar"
                        name="rol_agregar"
                        value={registerData.rol_agregar}
                        onChange={handleInputChange}
                        className="w-full bg-transparent outline-none text-[#23475F] cursor-pointer text-sm"
                      >
                        <option value="cliente">Cliente (por defecto)</option>
                        {rolesDisponibles
                          .filter((rol) => rol.valor !== "cliente")
                          .map((rol) => (
                            <option key={rol.valor} value={rol.valor}>
                              {rol.etiqueta}
                            </option>
                          ))}
                      </select>
                    </div>

                    {["admin_esp_dep", "encargado", "control"].includes(
                      registerData.rol_agregar
                    ) && (
                        <div className="mt-4 space-y-3 animate-fadeIn">
                          <label className="block text-xs sm:text-sm font-medium text-[#23475F]">
                            Espacio deportivo
                          </label>

                          {espaciosLoading ? (
                            <div className="text-sm text-[#23475F]">
                              Cargando...
                            </div>
                          ) : espaciosError ? (
                            <div className="text-sm text-[#A31621]">
                              {espaciosError}
                            </div>
                          ) : (
                            <select
                              name="id_espacio"
                              value={registerData.id_espacio}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-[#23475F]/40 rounded-full focus:ring-[#01CD6C] focus:outline-none bg-white text-sm"
                            >
                              <option value="">Seleccione un espacio</option>

                              {registerData.rol_agregar === "admin_esp_dep" &&
                                espaciosLibres.map((e) => (
                                  <option
                                    key={e.id_espacio}
                                    value={e.id_espacio}
                                  >
                                    {e.nombre}
                                  </option>
                                ))}

                              {registerData.rol_agregar !== "admin_esp_dep" &&
                                espaciosEncargado.map((e) => (
                                  <option
                                    key={e.id_espacio}
                                    value={e.id_espacio}
                                  >
                                    {e.nombre}
                                  </option>
                                ))}
                            </select>
                          )}

                          <label className="block text-xs sm:text-sm font-medium text-[#23475F]">
                            Motivo (opcional)
                          </label>
                          <textarea
                            name="motivo"
                            value={registerData.motivo}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Explica por que deseas este rol"
                            className="w-full px-3 py-2 border border-[#23475F]/40 rounded-xl bg-white focus:ring-[#01CD6C] focus:outline-none text-sm"
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>

              {registerError && (
                <p className="text-[#A31621] text-xs sm:text-sm font-semibold text-center">
                  {registerError}
                </p>
              )}

              <button
                onClick={handleRegister}
                disabled={registerLoading}
                className={`w-full py-3 px-4 bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white text-base rounded-full shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all font-semibold ${registerLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {registerLoading ? (
                  <div className="flex justify-center items-center gap-3">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Cargando...
                  </div>
                ) : (
                  "Registrarse"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] animate-fadeIn px-3">
          <div className="bg-white/95 backdrop-blur-xl px-6 sm:px-8 py-6 sm:py-7 rounded-2xl shadow-2xl w-full max-w-sm relative border border-white/40 text-center animate-scaleIn">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#01CD6C]/10 flex items-center justify-center border border-[#01CD6C]/40">
                <FaCheckCircle className="text-[#01CD6C] text-2xl sm:text-3xl" />
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-[#23475F] mb-2">
              {TitlesubmissionMessage}
            </h3>

            <p className="text-xs sm:text-sm text-[#23475F] mb-6">
              {submissionMessage}
            </p>

            <button
              onClick={() => {
                setShowSubmissionModal(false);
                navigate("/espacios-deportivos");
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all font-semibold text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] animate-fadeIn px-3">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 animate-scaleIn relative">
            <button
              onClick={handleCloseProfileModal}
              className="absolute top-4 right-4 text-[#23475F] hover:text-[#01CD6C] text-2xl sm:text-3xl transition-all flex items-center justify-center"
            >
              <FaTimes />
            </button>

            <div className="bg-gradient-to-r from-[#01CD6C] to-[#23475F] text-white rounded-t-2xl p-8 sm:p-10 text-center shadow-lg">
              <div className="inline-block relative">
                {imagePreview ? (
                  <img
                    src={imagePreview ? imagePreview : "/placeholder-profile.png"}
                    alt="Perfil"
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 border-4 border-white flex items-center justify-center text-3xl font-bold shadow-lg">
                    {formData.nombre?.charAt(0)}
                    {formData.apellido?.charAt(0)}
                  </div>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mt-4">
                {formData.nombre} {formData.apellido}
              </h2>

              <p className="text-white/80 text-sm sm:text-lg">
                {formData.usuario}
              </p>

              <div className="flex justify-center flex-wrap gap-2 mt-4">
                {(user?.roles ?? []).map((r, i) => (
                  <span
                    key={i}
                    className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-sm border border-white/30"
                  >
                    {formatRole(r.rol)}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-[#23475F] mb-4 sm:mb-5 flex items-center gap-2">
                  <FaUser className="text-[#01CD6C]" />
                  Informacion personal
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Nombre completo
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-[#23475F]">
                      {formData.nombre} {formData.apellido}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Correo electronico
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-[#23475F] break-all flex items-center gap-2">
                      <FaEnvelope className="text-[#01CD6C]" />
                      {formData.correo}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Telefono
                    </p>
                    <p className="text-base sm:text-lg font-semibold text-[#23475F] flex items-center gap-2">
                      <FaPhone className="text-[#01CD6C]" />
                      {formData.telefono || "No especificado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Sexo</p>
                    <p className="text-base sm:text-lg font-semibold text-[#23475F] flex items-center gap-2">
                      <FaVenusMars className="text-[#01CD6C]" />
                      {formData.sexo
                        ? formData.sexo.charAt(0).toUpperCase() +
                        formData.sexo.slice(1)
                        : "No especificado"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-[#23475F] mb-4 sm:mb-5 flex items-center gap-2">
                  <FaIdBadge className="text-[#01CD6C]" />
                  Informacion de la cuenta
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Usuario</p>
                    <p className="text-base sm:text-lg font-semibold text-[#23475F]">
                      {formData.usuario}
                    </p>
                  </div>

                  {formData.fecha_creacion && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Miembro desde
                      </p>
                      <p className="text-base sm:text-lg font-semibold text-[#23475F] flex items-center gap-2">
                        <FaCalendarAlt className="text-[#01CD6C]" />
                        {new Date(
                          formData.fecha_creacion
                        ).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {formData.datos_especificos &&
                Object.keys(formData.datos_especificos).length > 0 && (
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#23475F] mb-4 sm:mb-5 flex items-center gap-2">
                      <FaInfoCircle className="text-[#01CD6C]" />
                      Informacion adicional
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {Object.entries(formData.datos_especificos).map(
                        ([key, value]) => (
                          <div key={key}>
                            <p className="text-xs sm:text-sm text-gray-500 capitalize">
                              {key.replace(/_/g, " ")}
                            </p>
                            <p className="text-base sm:text-lg font-semibold text-[#23475F]">
                              {value || "No especificado"}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 p-5 sm:p-6 border-t border-gray-200">
              <button
                onClick={handleCloseProfileModal}
                className="px-5 py-2 border border-gray-400 text-gray-700 rounded-full font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 text-sm"
              >
                Cerrar
              </button>

              <button
                onClick={() => {
                  setShowProfileModal(false);
                  openEditProfileModal();
                }}
                className="bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white px-5 py-2.5 rounded-full hover:shadow-xl hover:translate-y-[-2px] transition-all font-semibold flex items-center justify-center gap-2 text-sm"
              >
                Editar perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] px-3">
          <div className="bg-white/95 backdrop-blur-xl px-6 sm:px-8 py-6 sm:py-7 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative border border-white/40">
            <button
              onClick={() => setShowRoleRequestModal(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-[#01CD6C] text-2xl bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center transition-all"
            >
              <FaTimes />
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 text-[#23475F]">
              Solicitar un nuevo rol
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-5 sm:mb-6">
              Completa la informacion para enviar tu solicitud al administrador
              del sistema
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-[#23475F] flex items-center gap-2">
                  <FaUserTag className="text-[#01CD6C]" />
                  Rol
                </label>
                <select
                  className="w-full border border-gray-300 rounded-full px-4 py-2.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] text-xs sm:text-sm"
                  value={roleRequest.rol}
                  onChange={handleRoleSelect}
                >
                  <option value="">Seleccione un rol</option>
                  {availableRoles
                    .filter((r) => r.valor !== "cliente")
                    .map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                </select>
              </div>

              {roleRequest.rol === "admin_esp_dep" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 text-[#23475F] flex items-center gap-2">
                    <FaMapMarkerAlt className="text-[#01CD6C]" />
                    Espacio deportivo
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-full px-4 py-2.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] text-xs sm:text-sm mb-1"
                    value={roleRequest.id_espacio}
                    onChange={(e) =>
                      setRoleRequest((prev) => ({
                        ...prev,
                        id_espacio: e.target.value,
                      }))
                    }
                  >
                    <option value="">Seleccione</option>
                    {espaciosLibres.map((e) => (
                      <option key={e.id_espacio} value={e.id_espacio}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(roleRequest.rol === "encargado" ||
                roleRequest.rol === "control") && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1 text-[#23475F] flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[#01CD6C]" />
                      Espacio deportivo
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-full px-4 py-2.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] text-xs sm:text-sm mb-1"
                      value={roleRequest.id_espacio}
                      onChange={(e) =>
                        setRoleRequest((prev) => ({
                          ...prev,
                          id_espacio: e.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccione</option>
                      {espaciosEncargado.map((e) => (
                        <option key={e.id_espacio} value={e.id_espacio}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-[#23475F] flex items-center gap-2">
                  <FaAlignLeft className="text-[#01CD6C]" />
                  Motivo
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] text-xs sm:text-sm min-h-[90px]"
                  rows={3}
                  value={roleRequest.motivo}
                  onChange={(e) =>
                    setRoleRequest((prev) => ({
                      ...prev,
                      motivo: e.target.value,
                    }))
                  }
                  placeholder="Explique por que solicita este rol"
                />
              </div>

              {roleRequestError && (
                <p className="text-red-600 text-xs sm:text-sm mb-1 bg-red-50 border border-red-100 rounded-full px-4 py-2 text-center">
                  {roleRequestError}
                </p>
              )}
              {roleRequestSuccess && (
                <p className="text-green-700 text-xs sm:text-sm mb-1 bg-green-50 border border-green-100 rounded-full px-4 py-2 text-center">
                  {roleRequestSuccess}
                </p>
              )}

              <button
                onClick={() => handleSendRoleRequestFromModal()}
                disabled={roleRequestLoading || !roleRequest.rol}
                className={`w-full py-3 rounded-full text-white font-semibold transition-all shadow-md text-sm ${roleRequestLoading || !roleRequest.rol
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#01CD6C] to-[#00b359] hover:shadow-lg hover:translate-y-[-1px]"
                  }`}
              >
                {roleRequestLoading ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40 animate-scaleIn relative">
            <button
              onClick={handleCloseEditProfileModal}
              className="absolute top-4 right-4 text-[#23475F] hover:text-[#01CD6C] text-xl sm:text-2xl bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center transition-all hover:bg-gray-200"
            >
              <FaTimes />
            </button>

            <div className="text-center mb-6 sm:mb-8">
              {imagePreview ? (
                <img
                  src={imagePreview ? imagePreview : "/placeholder-profile.png"}
                  alt="Perfil"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#01CD6C] shadow-xl object-cover mx-auto"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#01CD6C] to-[#23475F] rounded-full border-4 border-[#01CD6C] flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mx-auto shadow-xl">
                  {formData.nombre?.charAt(0)}
                  {formData.apellido?.charAt(0)}
                </div>
              )}

              <h3 className="text-2xl sm:text-3xl font-bold text-[#23475F] mt-3 sm:mt-4">
                Editar mi perfil
              </h3>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">
                Actualiza tu informacion personal
              </p>
            </div>
            <form
              onSubmit={handleEditProfileSubmit}
              className="space-y-6 sm:space-y-8"
            >
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 sm:p-6">
                <h4 className="text-base sm:text-lg font-bold text-[#23475F] mb-3 sm:mb-4 flex items-center gap-2">
                  <FaCamera className="text-[#01CD6C]" />
                  Foto de perfil
                </h4>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full border border-gray-300 rounded-full px-4 py-2 bg-white focus:ring-2 focus:ring-[#01CD6C] text-xs sm:text-sm file:bg-[#01CD6C] file:text-white file:px-4 file:py-1 file:rounded-full file:border-0 hover:file:bg-[#00b359]"
                />

                <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
                  Formatos: JPG, PNG, GIF – Max 5MB
                </p>
              </div>

              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 sm:p-6">
                <h4 className="text-base sm:text-lg font-bold text-[#23475F] mb-3 sm:mb-4 flex items-center gap-2">
                  <FaUser className="text-[#01CD6C]" />
                  Informacion personal
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Nombre *
                    </label>
                    <input
                      name="nombre"
                      required
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Apellido *
                    </label>
                    <input
                      name="apellido"
                      required
                      value={formData.apellido}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
                      placeholder="Tu apellido"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Correo *
                    </label>
                    <input
                      name="correo"
                      type="email"
                      required
                      value={formData.correo}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
                      placeholder="email@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Telefono
                    </label>
                    <input
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
                      placeholder="Ej: 77777777"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Sexo
                    </label>
                    <select
                      name="sexo"
                      value={formData.sexo}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full cursor-pointer focus:ring-2 focus:ring-[#01CD6C] text-sm"
                    >
                      <option value="">Selecciona</option>
                      {sexosPermitidos.map((sexo) => (
                        <option key={sexo} value={sexo}>
                          {sexo.charAt(0).toUpperCase() + sexo.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 sm:p-6">
                <h4 className="text-base sm:text-lg font-bold text-[#23475F] mb-3 sm:mb-4 flex items-center gap-2">
                  <FaKey className="text-[#01CD6C]" />
                  Cambiar contrasena
                </h4>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Nueva
                    </label>
                    <input
                      name="nueva_contrasena"
                      type="password"
                      value={passwordData.nueva_contrasena}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
                      placeholder="Dejar vacio si no deseas cambiarla"
                    />
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                      Confirmar
                    </label>
                    <input
                      name="confirmar_contrasena"
                      type="password"
                      value={passwordData.confirmar_contrasena}
                      onChange={handleInputChange}
                      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
                      placeholder="Confirmar contrasena"
                    />
                    {passwordMatchError && (
                      <p className="text-[#A31621] text-xs sm:text-sm mt-1.5">
                        {passwordMatchError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {editProfileError && (
                <div className="bg-red-50 border border-red-200 rounded-full px-4 py-3 text-center mb-2 sm:mb-4">
                  <p className="text-[#A31621] text-xs sm:text-sm font-medium">
                    {editProfileError}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseEditProfileModal}
                  className="px-5 py-2 border border-gray-400 text-gray-700 rounded-full font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={editProfileLoading}
                  className="px-5 sm:px-6 py-2 bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaSave />
                  {editProfileLoading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
