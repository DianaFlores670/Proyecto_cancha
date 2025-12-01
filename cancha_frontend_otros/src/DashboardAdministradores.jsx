/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
/* eslint-disable no-undef */
import React, { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import api from "./services/api";
import { getImageUrl } from "./utils";

// paginas del sistema
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
import SolicitudAdminEspDep from "./pages/SolicitudAdminEspDep";
import SolicitudEncargado from "./pages/SolicitudEncargado";
import SolicitudControl from "./pages/SolicitudControl";

// panel admin esp dep
import EspacioDeportivoAdmin from "./roles/admin/EspacioDeportivoAdmin";
import CanchaAdmin from "./roles/admin/CanchaAdmin";
import ReservaAdmin from "./roles/admin/ReservaAdmin";
import Reserva_HorarioAdmin from "./roles/admin/Reserva_HorarioAdmin";
import ResenaAdmin from "./roles/admin/ResenaAdmin";
import EspaciosView from "./roles/admin/EspaciosView";
import CalendarioReservasAdmin from "./roles/admin/CalendarioReservasAdmin";
import PagoAdmin from "./roles/admin/PagoAdmin";
import Reporte_incidenciaAdmin from "./roles/admin/Reporte_IncidenciaAdmin";
import EncargadoAdmin from "./roles/admin/EncargadoAdmin";
import ControlAdmin from "./roles/admin/ControlAdmin";

import MobileTabBar from "./MobileTabBar";
import PerfilAdmin from "./pages/PerfilAdmin";
import InicioModulos from "./InicioModulos";

// roles permitidos para este dashboard
const roleRoutesConfig = {
  ADMINISTRADOR: [
    { id: "solicitud_admin_esp", label: "Solicitudes Admin Esp", icon: "📑", path: "solicitud-admin-esp", component: SolicitudAdminEspDep },
    { id: "solicitud_encargado", label: "Solicitudes Encargado", icon: "🧩", path: "solicitud-encargado", component: SolicitudEncargado },
    { id: "solicitud_control", label: "Solicitudes Control", icon: "🧩", path: "solicitud-control", component: SolicitudControl },
    { id: "usuario", label: "Usuario", icon: "👤", path: "usuario", component: Usuario },
    { id: "administrador", label: "Administrador", icon: "👤", path: "administrador", component: Administrador },
    { id: "admin_esp_dep", label: "Admin Esp Dep", icon: "⚙️", path: "admin-esp-dep", component: Admin_Esp_Dep },
    { id: "control", label: "Control", icon: "🎮", path: "control", component: Control },
    { id: "encargado", label: "Encargado", icon: "👨‍💼", path: "encargado", component: Encargado },
    { id: "cliente", label: "Cliente", icon: "💼", path: "cliente", component: Cliente },
    { id: "deportista", label: "Deportista", icon: "🏃", path: "deportista", component: Deportista },
    { id: "empresa", label: "Empresa", icon: "🏢", path: "empresa", component: Empresa },
    { id: "espacio_deportivo", label: "Espacio Deportivo", icon: "🏟️", path: "espacio-deportivo", component: Espacio_Deportivo },
    { id: "cancha", label: "Cancha", icon: "🎾", path: "cancha", component: Cancha },
    { id: "disciplina", label: "Disciplina", icon: "🥋", path: "disciplina", component: Disciplina },
    { id: "reserva", label: "Reserva", icon: "📅", path: "reserva", component: Reserva },
    { id: "pago", label: "Pago", icon: "💳", path: "pago", component: Pago },
    { id: "qr_reserva", label: "QR Reserva", icon: "📱", path: "qr-reserva", component: QR_Reserva },
    { id: "reporte_incidencia", label: "Reporte Incidencia", icon: "⚠️", path: "reporte-incidencia", component: Reporte_Incidencia },
    { id: "resena", label: "Reseña", icon: "⭐", path: "resena", component: Resena },
    { id: "participa_en", label: "Participantes por Reserva", icon: "👥", path: "participa-en", component: Participa_En }
  ],

  ADMIN_ESP_DEP: [
    { id: "estadisticas", label: "Estadisticas", icon: "📊", path: "estadisticas", component: EspaciosView },
    { id: "calendario", label: "Calendario", icon: "📆", path: "calendario", component: CalendarioReservasAdmin },
    { id: "espacio_deportivo", label: "Espacio Deportivo", icon: "🏟️", path: "espacio-deportivo", component: EspacioDeportivoAdmin },
    { id: "cancha", label: "Cancha", icon: "🎾", path: "cancha", component: CanchaAdmin },
    { id: "reserva", label: "Reserva", icon: "📅", path: "reserva", component: ReservaAdmin },
    { id: "pago", label: "Pago", icon: "💳", path: "pago", component: PagoAdmin },
    { id: "resena", label: "Reseña", icon: "⭐", path: "resena", component: ResenaAdmin },
    { id: "reporte_incidencia", label: "Reporte Incidencia", icon: "⚠️", path: "reporte_incidencia", component: Reporte_incidenciaAdmin },
    { id: "encargado", label: "Encargado", icon: "👨‍💼", path: "encargado", component: EncargadoAdmin },
    { id: "control", label: "Control", icon: "🎮", path: "control", component: ControlAdmin }
  ]
};

const PANEL_ROLES = ["ADMINISTRADOR", "ADMIN_ESP_DEP"];
const PANEL_ROLE_KEY = "panelRole";

// Obtener roles reales del usuario
const getUserRoles = (u) => {
  if (Array.isArray(u?.roles)) return u.roles.map((r) => String(r?.rol ?? r).toUpperCase());
  if (u?.role) return [String(u.role).toUpperCase()];
  return [];
};

// Elegir el rol efectivo
const pickEffectiveRole = (u, preferredRole) => {
  const roles = getUserRoles(u).filter((r) => PANEL_ROLES.includes(r));
  if (roles.length === 0) return null;

  const normalized = preferredRole ? preferredRole.toUpperCase() : null;
  if (normalized && roles.includes(normalized)) return normalized;

  return roles[0];
};

const Header = ({ title, toggleSidebar, isSidebarOpen }) => {
  return (
    <header className="bg-white/90 backdrop-blur-sm shadow-md border-b flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-40">
      <button
        className="mr-2 text-[#23475F] hover:text-[#01CD6C] active:scale-95 transition-all hidden md:block"
        onClick={toggleSidebar}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      <h1 className="text-lg md:text-2xl font-bold text-[#23475F] truncate">
        {title}
      </h1>
    </header>
  );
};

const Sidebar = ({
  routes,
  onPageChange,
  currentPage,
  onLogout,
  user,
  empresa,
  isSidebarOpen,
  activePanelRole
}) => {
  return (
    <div
      className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r shadow-lg flex flex-col z-50
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-64"}
      `}
    >
      {/* HEADER DEL SIDEBAR */}
      <div className="px-5 py-5 border-b flex flex-col items-start gap-3 bg-white/60 backdrop-blur-md">

        <div className="flex items-center gap-3 w-full">
          <img
            src={empresa?.logo_imagen ? getImageUrl(empresa.logo_imagen) : "/placeholder-logo.png"}
            alt="logo"
            className="w-12 h-12 rounded-xl object-cover border shadow-sm bg-[#0F2634]"
          />

          <div className="flex flex-col">
            <span className="text-lg font-bold text-[#23475F] leading-none">
              {empresa?.nombre_sistema || "Sistema"}
            </span>
            <span className="text-xs text-[#23475F]/60">Panel Administrativo</span>
          </div>
        </div>

        {/* USUARIO Y ROL ACTIVO */}
        <div className="mt-1 text-left w-full">
          <p className="text-sm text-[#23475F]">
            Hola, <span className="font-semibold">{user?.nombre}</span>
          </p>

          {/* SOLO EL ROL ACTIVO */}
          <div className="flex flex-wrap gap-1 mt-1">
            {activePanelRole && (
              <span
                className={`
                  text-[11px] px-2 py-1 rounded-md font-semibold
                  ${activePanelRole === "ADMINISTRADOR"
                    ? "bg-[#01CD6C]/20 text-[#01CD6C]"
                    : ""
                  }
                  ${activePanelRole === "ADMIN_ESP_DEP"
                    ? "bg-[#01CD6C]/15 text-[#01CD6C]"
                    : ""
                  }
                `}
              >
                {activePanelRole}
              </span>
            )}
          </div>
        </div>

        {/* PERFIL */}
        <div className="w-full mt-1 flex flex-col gap-1 text-sm">
          <Link
            to="/administrador/perfil"
            className="flex items-center gap-2 text-[#23475F] hover:bg-[#01CD6C]/10 hover:text-[#01CD6C] px-2 py-2 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 12a4 4 0 100-8 4 4 0 000 8zm6 8a6 6 0 00-12 0"
              />
            </svg>
            Ver perfil
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-[#23475F] hover:bg-[#01CD6C]/10 hover:text-[#01CD6C] px-2 py-2 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-1 7H4L3 4z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 11v9h14v-9" />
            </svg>
            Ir a Vista Cliente
          </Link>
        </div>
      </div>

      {/* MENÚ PRINCIPAL */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">

        {routes.map((item) => {
          const active = currentPage === item.id;
          return (
            <Link
              key={item.id}
              to={`/administrador/${item.path}`}
              onClick={() => onPageChange(item.id, item.label)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all
                ${active
                  ? "bg-[#01CD6C] text-white shadow-sm"
                  : "text-[#23475F] hover:bg-[#01CD6C]/10 hover:text-[#01CD6C]"
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

      </nav>

      {/* CERRAR SESIÓN */}
      <div className="p-4 border-t bg-white/80 backdrop-blur-md">
        <button
          onClick={onLogout}
          className="flex items-center w-full justify-center gap-2 text-[#A31621] hover:text-[#D7263D] hover:bg-[#D7263D]/10 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Cerrar sesión
        </button>
      </div>

    </div>
  );
};

const DashboardAdministradores = () => {
  const [currentPage, setCurrentPage] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activePanelRole, setActivePanelRole] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const res = await api.get("/empresa/dato-individual/2");
        setEmpresa(res.data?.datos?.empresa || null);
      } catch (err) { }
    };
    fetchEmpresa();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/");
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);

      const storedPanelRole = localStorage.getItem(PANEL_ROLE_KEY);
      const preferredRole = storedPanelRole ? storedPanelRole.toUpperCase() : null;

      const effectiveRole = pickEffectiveRole(parsed, preferredRole);

      setActivePanelRole(effectiveRole);

      const roleRoutes = effectiveRole ? roleRoutesConfig[effectiveRole] : [];
      setRoutes(roleRoutes);

      const currentPath = location.pathname.replace("/administrador/", "");
      const protectedPaths = ["inicio", "modulos", "perfil"];

      const currentRoute = roleRoutes.find((r) => r.path === currentPath) || null;

      if (protectedPaths.includes(currentPath)) {
        setCurrentPage(currentPath);
        setPageTitle(
          currentPath === "inicio"
            ? "Inicio"
            : currentPath === "modulos"
              ? "Modulos"
              : "Perfil"
        );
      } else if (currentRoute) {
        setCurrentPage(currentRoute.id);
        setPageTitle(currentRoute.label);
      } else {
        if (roleRoutes.length > 0) {
          navigate(`/administrador/${roleRoutes[0].path}`);
        }
      }

    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Cargando...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">

      <div className="hidden md:block">
        {routes.length > 0 && (
          <Sidebar
            routes={routes}
            onPageChange={(id, label) => {
              setCurrentPage(id);
              setPageTitle(label);
            }}
            currentPage={currentPage}
            onLogout={handleLogout}
            user={user}
            empresa={empresa}
            isSidebarOpen={isSidebarOpen}
            activePanelRole={activePanelRole}
          />
        )}
      </div>

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 
        ${isSidebarOpen ? "md:ml-64" : "md:ml-0"}`}
      >
        <Header
          title={pageTitle}
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <Routes>
            <Route path="inicio" element={<InicioModulos user={user} routes={routes} panelBasePath="administrador" />} />
            <Route path="perfil" element={<PerfilAdmin user={user} />} />

            {routes.map((route) => (
              <Route key={route.id} path={route.path} element={<route.component />} />
            ))}

            <Route
              path="*"
              element={<Navigate to={`/administrador/${routes[0]?.path}`} replace />}
            />
          </Routes>
        </main>
      </div>

      <div className="md:hidden">
        <MobileTabBar user={user} onLogout={handleLogout} panelBasePath="administrador" />
      </div>
    </div>
  );
};

export default DashboardAdministradores;
