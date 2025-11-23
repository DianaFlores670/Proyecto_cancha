/* eslint-disable no-undef */
import React, { useState, useEffect } from "react";
import api from "./services/api";
import { getImageUrl } from "./utils"; // importa la función
import {
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Usuario from "./pages/Usuario";
import Administrador from "./pages/Administrador";
import Cliente from "./pages/Cliente";
import Admin_Esp_Dep from "./pages/Admin_Esp_Dep";
import Deportista from "./pages/Deportista";
import Control from "./pages/Control";
import Encargado from "./pages/Encargado";
import Empresa from "./pages/Empresa";
import Espacio_Deportivo from "./pages/Espacio_Deportivo";
import Cancha from "./pages/Cancha";
import Disciplina from "./pages/Disciplina";
import Reserva from "./pages/Reserva";
import Reserva_Horario from "./pages/Reserva_Horario";
import Pago from "./pages/Pago";
import QR_Reserva from "./pages/QR_Reserva";
import Reporte_Incidencia from "./pages/Reporte_Incidencia";
import Resena from "./pages/Resena";
import Se_Practica from "./pages/Se_Practica";
import Participa_En from "./pages/Participa_En";

// importa por roles
import EspacioDeportivoAdmin from "./roles/admin/EspacioDeportivoAdmin";
import CanchaAdmin from "./roles/admin/CanchaAdmin";
import ReservaAdmin from "./roles/admin/ReservaAdmin";
import Reserva_HorarioAdmin from "./roles/admin/Reserva_HorarioAdmin";
import ResenaAdmin from "./roles/admin/ResenaAdmin";
import EspaciosView from "./roles/admin/EspaciosView";
import CalendarioReservasAdmin from "./roles/admin/CalendarioReservasAdmin";
import PagoAdmin from "./roles/admin/PagoAdmin";
import SolicitudAdminEspDep from "./pages/SolicitudAdminEspDep";
import SolicitudEncargado from "./pages/SolicitudEncargado";
import SolicitudControl from "./pages/SolicitudControl";
import Reporte_incidenciaAdmin from "./roles/admin/Reporte_IncidenciaAdmin";
import EncargadoAdmin from "./roles/admin/EncargadoAdmin";
import ControlAdmin from "./roles/admin/ControlAdmin";
import Espacio_DeportivoEncargado from "./roles/encargado/Espacio_DeportivoEncargado";
import CanchaEncargado from "./roles/encargado/CanchaEncargado";
import ReservaEncargado from "./roles/encargado/ReservaEncargado";
import Reporte_IncidenciaEncargado from "./roles/encargado/Reporte_IncidenciaEncargado";
import QR_AccesoEncargado from "./roles/control/QR_AccesoEncargado";

// Configuración de rutas para cada rol
const roleRoutesConfig = {
  ADMINISTRADOR: [
    {
      id: "solicitud_admin_esp",
      label: "Solicitudes Admin Esp",
      icon: "📑",
      path: "solicitud-admin-esp",
      component: SolicitudAdminEspDep,
    },
    {
      id: "solicitud_encargado",
      label: "Solicitudes Encargado",
      icon: "🧩",
      path: "solicitud-encargado",
      component: SolicitudEncargado,
    },
    {
      id: "solicitud_control",
      label: "Solicitudes Control",
      icon: "🧩",
      path: "solicitud-control",
      component: SolicitudControl,
    },
    {
      id: "usuario",
      label: "Usuario",
      icon: "👤",
      path: "usuario",
      component: Usuario,
    },
    {
      id: "administrador",
      label: "Administrador",
      icon: "👤",
      path: "administrador",
      component: Administrador,
    },
    {
      id: "admin_esp_dep",
      label: "Admin Esp Dep",
      icon: "⚙️",
      path: "admin-esp-dep",
      component: Admin_Esp_Dep,
    },
    {
      id: "control",
      label: "Control",
      icon: "🎮",
      path: "control",
      component: Control,
    },
    {
      id: "encargado",
      label: "Encargado",
      icon: "👨‍💼",
      path: "encargado",
      component: Encargado,
    },
    {
      id: "cliente",
      label: "Cliente",
      icon: "💼",
      path: "cliente",
      component: Cliente,
    },
    {
      id: "deportista",
      label: "Deportista",
      icon: "🏃",
      path: "deportista",
      component: Deportista,
    },
    {
      id: "empresa",
      label: "Empresa",
      icon: "🏢",
      path: "empresa",
      component: Empresa,
    },
    {
      id: "espacio_deportivo",
      label: "Espacio Deportivo",
      icon: "🏟️",
      path: "espacio-deportivo",
      component: Espacio_Deportivo,
    },
    {
      id: "cancha",
      label: "Cancha",
      icon: "🎾",
      path: "cancha",
      component: Cancha,
    },
    {
      id: "disciplina",
      label: "Disciplina",
      icon: "🥋",
      path: "disciplina",
      component: Disciplina,
    },
    {
      id: "reserva",
      label: "Reserva",
      icon: "📅",
      path: "reserva",
      component: Reserva,
    },
    {
      id: "reserva_horario",
      label: "Reserva Horario",
      icon: "⏰",
      path: "reserva-horario",
      component: Reserva_Horario,
    },
    { id: "pago", label: "Pago", icon: "💳", path: "pago", component: Pago },
    {
      id: "qr_reserva",
      label: "QR Reserva",
      icon: "📱",
      path: "qr-reserva",
      component: QR_Reserva,
    },
    {
      id: "reporte_incidencia",
      label: "Reporte Incidencia",
      icon: "⚠️",
      path: "reporte-incidencia",
      component: Reporte_Incidencia,
    },
    {
      id: "resena",
      label: "Reseña",
      icon: "⭐",
      path: "resena",
      component: Resena,
    },
    {
      id: "se_practica",
      label: "Se Practica",
      icon: "🏸",
      path: "se-practica",
      component: Se_Practica,
    },
    {
      id: "participa_en",
      label: "Participa En",
      icon: "👥",
      path: "participa-en",
      component: Participa_En,
    },
  ],
  ADMIN_ESP_DEP: [
    {
      id: "estadisticas",
      label: "Estadisticas",
      icon: "📊",
      path: "estadisticas",
      component: EspaciosView,
    },
    {
      id: "calendario",
      label: "Calendario",
      icon: "📆",
      path: "calendario",
      component: CalendarioReservasAdmin,
    },
    {
      id: "espacio_deportivo",
      label: "Espacio Deportivo",
      icon: "🏟️",
      path: "espacio-deportivo",
      component: EspacioDeportivoAdmin,
    },
    {
      id: "cancha",
      label: "Cancha",
      icon: "🎾",
      path: "cancha",
      component: CanchaAdmin,
    },
    {
      id: "reserva",
      label: "Reserva",
      icon: "📅",
      path: "reserva",
      component: ReservaAdmin,
    },
    {
      id: "reserva_horario",
      label: "Reserva Horario",
      icon: "⏰",
      path: "reserva-horario",
      component: Reserva_HorarioAdmin,
    },
    {
      id: "pago",
      label: "Pago",
      icon: "💳",
      path: "pago",
      component: PagoAdmin,
    },
    {
      id: "resena",
      label: "Reseña",
      icon: "⭐",
      path: "resena",
      component: ResenaAdmin,
    },
    {
      id: "reporte_incidencia",
      label: "Reporte Incidencia",
      icon: "⚠️",
      path: "reporte_incidencia",
      component: Reporte_incidenciaAdmin,
    },
    {
      id: "encargado",
      label: "Encargado",
      icon: "👨‍💼",
      path: "encargado",
      component: EncargadoAdmin,
    },
    {
      id: "control",
      label: "Control",
      icon: "🎮",
      path: "control",
      component: ControlAdmin,
    },
    {
      id: "disciplina",
      label: "Disciplina",
      icon: "🥋",
      path: "disciplina",
      component: Disciplina,
    },
  ],
  CONTROL: [
    {
      id: "qr_reserva",
      label: "QR Reserva",
      icon: "📱",
      path: "qr-reserva",
      component: QR_AccesoEncargado,
    },
  ],
  ENCARGADO: [
    {
      id: "reporte_incidencia",
      label: "Reporte Incidencia",
      icon: "⚠️",
      path: "reporte-incidencia",
      component: Reporte_IncidenciaEncargado,
    },
    {
      id: "reserva",
      label: "Reserva",
      icon: "📅",
      path: "reserva",
      component: ReservaEncargado,
    },
    {
      id: "espacio_deportivo",
      label: "Espacio Deportivo",
      icon: "🏟️",
      path: "espacio-deportivo",
      component: Espacio_DeportivoEncargado,
    },
    {
      id: "cancha",
      label: "Cancha",
      icon: "🎾",
      path: "cancha",
      component: CanchaEncargado,
    },
  ],
};

// Roles que tienen rutas en tu config (panel)
const PANEL_ROLES = Object.keys(roleRoutesConfig);

// Prioridad para elegir el rol efectivo cuando hay varios
const ROLE_PRIORITY = [
  "ADMINISTRADOR",
  "ADMIN_ESP_DEP",
  "ENCARGADO",
  "CONTROL",
];

// Soporta {role:'X'} (viejo) o {roles:['X','Y']} (nuevo)
const getUserRoles = (u) => {
  if (Array.isArray(u?.roles))
    return u.roles.map((r) => String(r?.rol ?? r).toUpperCase());
  if (u?.role) return [String(u.role).toUpperCase()];
  return [];
};

// Toma solo roles que existen en roleRoutesConfig y elige 1 por prioridad
const pickEffectiveRole = (u) => {
  const roles = getUserRoles(u).filter((r) => PANEL_ROLES.includes(r));
  if (roles.length === 0) return null;
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0]; // fallback: el primero válido
};

const Header = ({ title, toggleSidebar, isSidebarOpen }) => {
  return (
    <header className="bg-white shadow-sm border-b flex items-center justify-between px-6 py-4">
      <div className="flex items-center">
        <button
          className="mr-4 text-[#23475F] hover:text-[#01CD6C] focus:outline-none"
          onClick={toggleSidebar}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isSidebarOpen
                  ? "M6 18L18 6M6 6l12 12"
                  : "M4 6h16M4 12h16M4 18h16"
              }
            />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-[#23475F]">{title}</h1>
      </div>
    </header>
  );
};

const getMainRole = (user) => {
  if (!user) return null;

  let roles = [];

  if (Array.isArray(user.roles)) {
    roles = user.roles.map((r) => String(r?.rol ?? r).toUpperCase());
  } else if (user.role) {
    roles = [String(user.role).toUpperCase()];
  }

  if (roles.includes("ADMIN_ESP_DEP")) return "ADMIN_ESP_DEP";
  if (roles.includes("ENCARGADO")) return "ENCARGADO";
  if (roles.includes("CONTROL")) return "CONTROL";

  return null;
};

const Sidebar = ({
  routes,
  onPageChange,
  currentPage,
  onLogout,
  user,
  empresa,
  isSidebarOpen,
  toggleSidebar,
}) => {
  return (
    <div
      className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl border-r 
      flex flex-col transform 
      ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
      transition-transform duration-300 ease-in-out z-50`}
    >
      {/* ENCABEZADO */}
      <div className="p-6 border-b bg-gradient-to-r from-[#E8F5EE] to-[#FFFFFF] flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img
              src={
                empresa?.logo_imagen
                  ? getImageUrl(empresa.logo_imagen)
                  : "/placeholder-logo.png"
              }
              alt="Logo Empresa"
              className="w-12 h-12 rounded-xl object-cover shadow-sm border bg-[#0F2634]"
            />

            <span className="text-lg font-extrabold text-[#23475F] leading-tight tracking-wide">
              {empresa?.nombre_sistema || "Cargando..."}
            </span>
          </div>

          {user && (
            <p className="text-sm text-[#23475F]/80">
              Hola, <span className="font-medium">{user.nombre}</span>
            </p>
          )}

          <button
            onClick={onLogout}
            className="mt-4 w-full text-[#23475F] hover:text-[#01CD6C] text-sm font-medium flex items-center gap-2 transition-all"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cerrar Sesión
          </button>

          {(getMainRole(user) === "ADMIN_ESP_DEP" ||
            getMainRole(user) === "ENCARGADO" ||
            getMainRole(user) === "CONTROL") && (
            <button
              onClick={() => (window.location.href = "/")}
              className="mt-3 w-full text-[#23475F] hover:text-[#01CD6C] text-sm font-medium flex items-center gap-2 transition-all"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Vista Cliente
            </button>
          )}
        </div>

        <button
          className="text-[#23475F] hover:text-[#01CD6C]"
          onClick={toggleSidebar}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* MENÚ — scrolleable */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#23475F]/40 scrollbar-track-transparent">
        {routes.map((item) => (
          <Link
            key={item.id}
            to={`/administrador/${item.path}`}
            onClick={() => {
              onPageChange(item.id, item.label);
              toggleSidebar();
            }}
            className={`flex items-center px-6 py-3 text-left text-sm font-medium transition-all
              ${
                currentPage === item.id
                  ? "bg-[#01CD6C] text-white shadow-inner border-l-4 border-[#0F2634]"
                  : "text-[#23475F] hover:bg-[#01CD6C]/15 hover:text-[#01CD6C]"
              }`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

const PaginaPrincipal = () => {
  const [currentPage, setCurrentPage] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Nuevo estado para carga de auth
  const [user, setUser] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await api.get("/empresa/dato-individual/2");

        console.log("EMPRESA API:", res.data);

        // OBTENER EMPRESA CORRECTAMENTE
        const info = res.data?.datos?.empresa || null;

        setEmpresa(info);
      } catch (err) {
        console.error("Error cargando datos de empresa:", err);
      }
    };

    fetchEmpresa();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      setIsAuthenticated(false);
      setLoading(false);
      navigate("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      setIsAuthenticated(true);

      const effectiveRole = pickEffectiveRole(parsedUser);
      const roleRoutes = effectiveRole ? roleRoutesConfig[effectiveRole] : [];
      setRoutes(roleRoutes);

      const currentPath = location.pathname.replace("/administrador/", "");
      const currentRoute =
        roleRoutes.find((r) => r.path === currentPath) || roleRoutes[0];

      if (currentRoute) {
        setCurrentPage(currentRoute.id);
        setPageTitle(currentRoute.label);
      } else if (roleRoutes[0]) {
        setCurrentPage(roleRoutes[0].id);
        setPageTitle(roleRoutes[0].label);
        navigate(`/administrador/${roleRoutes[0].path}`);
      } else {
        setCurrentPage("");
        setPageTitle("Dashboard");
        // Opcional: navigate('/'); si quieres sacarlo del panel cuando no hay rol de panel
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
      navigate("/");
    } finally {
      setLoading(false); // Finaliza la carga siempre
    }
  }, [navigate, location.pathname]);

  // 👇 pega esto debajo del useEffect que setea user/routes y hace navigate según ruta
  useEffect(() => {
    // espera a que el primer efecto termine
    if (loading) return;

    const isAdminPath = location.pathname.startsWith("/administrador");
    if (!isAdminPath) return;

    const userData = localStorage.getItem("user");
    if (!userData) return;

    const parsed = JSON.parse(userData);
    const roles = getUserRoles(parsed);
    const hasPanelRole = roles.some((r) => PANEL_ROLES.includes(r));

    if (!hasPanelRole) {
      // redirige a la vista pública o perfil del cliente
      navigate("/espacios-deportivos", { replace: true });
      // o si tienes una ruta de perfil: navigate('/mi-perfil', { replace: true });
    }
  }, [loading, location.pathname, navigate]);

  const handlePageChange = (page, title) => {
    setCurrentPage(page);
    setPageTitle(title);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    setRoutes([]);
    navigate("/");
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Cargando...
      </div>
    ); // Pantalla de carga durante verificación
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-[#FFFFFF] overflow-hidden">
      {routes.length > 0 && (
        <Sidebar
          routes={routes}
          onPageChange={handlePageChange}
          currentPage={currentPage}
          onLogout={handleLogout}
          user={user}
          empresa={empresa}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      )}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isSidebarOpen && routes.length > 0 ? "ml-64" : "ml-0"
        } transition-all duration-300`}
      >
        <Header
          title={pageTitle}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.id}
                path={route.path}
                element={<route.component />}
              />
            ))}
            {/* Ruta por defecto para evitar renderizado incorrecto */}
            <Route
              path="*"
              element={
                routes.length > 0 ? (
                  <Navigate to={`/administrador/${routes[0].path}`} replace />
                ) : (
                  <div>No hay rutas disponibles para este rol.</div>
                )
              }
            />
          </Routes>
        </main>
      </div>
      {isSidebarOpen && routes.length > 0 && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default PaginaPrincipal;
