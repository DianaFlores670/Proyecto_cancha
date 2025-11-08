import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Solicitud from './pages/Solicitud';
import Usuario from './pages/Usuario';
import Administrador from './pages/Administrador';
import Cliente from './pages/Cliente';
import Admin_Esp_Dep from './pages/Admin_Esp_Dep';
import Deportista from './pages/Deportista';
import Control from './pages/Control';
import Encargado from './pages/Encargado';
import Empresa from './pages/Empresa';
import Espacio_Deportivo from './pages/Espacio_Deportivo';
import Cancha from './pages/Cancha';
import Disciplina from './pages/Disciplina';
import Reserva from './pages/Reserva';
import Reserva_Horario from './pages/Reserva_Horario';
import Pago from './pages/Pago';
import QR_Reserva from './pages/QR_Reserva';
import Reporte_Incidencia from './pages/Reporte_Incidencia';
import Resena from './pages/Resena';
import Se_Practica from './pages/Se_Practica';
import Participa_En from './pages/Participa_En';

// importa por roles
import QRControl from './roles/QRControl';
import ReporteEncargado from './roles/ReporteEncargado';
import EspacioDeportivoAdmin from './roles/EspacioDeportivoAdmin';
import CanchaAdmin from './roles/CanchaAdmin';

// Configuración de rutas para cada rol
const roleRoutesConfig = {
  ADMINISTRADOR: [
    { id: 'solicitud', label: 'Solicitud', icon: '📝', path: 'solicitud', component: Solicitud },
    { id: 'usuario', label: 'Usuario', icon: '👤', path: 'usuario', component: Usuario },
    { id: 'administrador', label: 'Administrador', icon: '👤', path: 'administrador', component: Administrador },
    { id: 'admin_esp_dep', label: 'Admin Esp Dep', icon: '⚙️', path: 'admin-esp-dep', component: Admin_Esp_Dep },
    { id: 'control', label: 'Control', icon: '🎮', path: 'control', component: Control },
    { id: 'encargado', label: 'Encargado', icon: '👨‍💼', path: 'encargado', component: Encargado },
    { id: 'cliente', label: 'Cliente', icon: '💼', path: 'cliente', component: Cliente },
    { id: 'deportista', label: 'Deportista', icon: '🏃', path: 'deportista', component: Deportista },
    { id: 'empresa', label: 'Empresa', icon: '🏢', path: 'empresa', component: Empresa },
    { id: 'espacio_deportivo', label: 'Espacio Deportivo', icon: '🏟️', path: 'espacio-deportivo', component: Espacio_Deportivo },
    { id: 'cancha', label: 'Cancha', icon: '🎾', path: 'cancha', component: Cancha },
    { id: 'disciplina', label: 'Disciplina', icon: '🥋', path: 'disciplina', component: Disciplina },
    { id: 'reserva', label: 'Reserva', icon: '📅', path: 'reserva', component: Reserva },
    { id: 'reserva_horario', label: 'Reserva Horario', icon: '⏰', path: 'reserva-horario', component: Reserva_Horario },
    { id: 'pago', label: 'Pago', icon: '💳', path: 'pago', component: Pago },
    { id: 'qr_reserva', label: 'QR Reserva', icon: '📱', path: 'qr-reserva', component: QR_Reserva },
    { id: 'reporte_incidencia', label: 'Reporte Incidencia', icon: '⚠️', path: 'reporte-incidencia', component: Reporte_Incidencia },
    { id: 'resena', label: 'Reseña', icon: '⭐', path: 'resena', component: Resena },
    { id: 'se_practica', label: 'Se Practica', icon: '🏸', path: 'se-practica', component: Se_Practica },
    { id: 'participa_en', label: 'Participa En', icon: '👥', path: 'participa-en', component: Participa_En },
  ],
  ADMIN_ESP_DEP: [
    { id: 'espacio_deportivo', label: 'Espacio Deportivo', icon: '🏟️', path: 'espacio-deportivo', component: EspacioDeportivoAdmin },
    { id: 'cancha', label: 'Cancha', icon: '🎾', path: 'cancha', component: CanchaAdmin },
    { id: 'disciplina', label: 'Disciplina', icon: '🥋', path: 'disciplina', component: Disciplina },
    { id: 'reserva', label: 'Reserva', icon: '📅', path: 'reserva', component: Reserva },
    { id: 'reserva_horario', label: 'Reserva Horario', icon: '⏰', path: 'reserva-horario', component: Reserva_Horario },
    { id: 'resena', label: 'Reseña', icon: '⭐', path: 'resena', component: Resena },
  ],
  CONTROL: [
    { id: 'qr_reserva', label: 'QR Reserva', icon: '📱', path: 'qr-reserva', component: QR_Reserva },
    { id: 'reserva', label: 'Reserva', icon: '📅', path: 'reserva', component: Reserva },
    { id: 'resena', label: 'Reseña', icon: '⭐', path: 'resena', component: Resena },
    { id: 'qr_control', label: 'QR Control', icon: '📱', path: 'qr-control', component: QRControl },

  ],
  ENCARGADO: [
    { id: 'reporte_incidencia', label: 'Reporte Incidencia', icon: '⚠️', path: 'reporte-incidencia', component: Reporte_Incidencia },
    { id: 'reserva', label: 'Reserva', icon: '📅', path: 'reserva', component: Reserva },
    { id: 'reserva_horario', label: 'Reserva Horario', icon: '⏰', path: 'reserva-horario', component: Reserva_Horario },
    { id: 'reporte_encargado', label: 'Reporte Encargado', icon: '⚠️', path: 'reporte-encargado', component: ReporteEncargado },

  ],
};

// Roles que tienen rutas en tu config (panel)
const PANEL_ROLES = Object.keys(roleRoutesConfig);

// Prioridad para elegir el rol efectivo cuando hay varios
const ROLE_PRIORITY = ['ADMINISTRADOR', 'ADMIN_ESP_DEP', 'ENCARGADO', 'CONTROL'];

// Soporta {role:'X'} (viejo) o {roles:['X','Y']} (nuevo)
const getUserRoles = (u) => {
  if (Array.isArray(u?.roles)) return u.roles.map(r => String(r?.rol ?? r).toUpperCase());
  if (u?.role) return [String(u.role).toUpperCase()];
  return [];
};


// Toma solo roles que existen en roleRoutesConfig y elige 1 por prioridad
const pickEffectiveRole = (u) => {
  const roles = getUserRoles(u).filter(r => PANEL_ROLES.includes(r));
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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-[#23475F]">{title}</h1>
      </div>
    </header>
  );
};

const Sidebar = ({ routes, onPageChange, currentPage, onLogout, user, isSidebarOpen, toggleSidebar }) => {
  return (
    <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg overflow-y-auto transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-50`}>
      <div className="p-6 border-b flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[#23475F]">Mi App</h1>
          {user && (
            <p className="text-sm text-[#23475F] mt-1">Bienvenido, {user.nombre}</p>
          )}
          <br />
          <button
            onClick={onLogout}
            className="w-full text-[#23475F] hover:text-[#01CD6C] text-sm font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
        <button
          className="text-[#23475F] hover:text-[#01CD6C] focus:outline-none"
          onClick={toggleSidebar}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="mt-6">
        {routes.map((item) => (
          <Link
            key={item.id}
            to={`/administrador/${item.path}`}
            onClick={() => {
              onPageChange(item.id, item.label);
              toggleSidebar();
            }}
            className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${currentPage === item.id
                ? 'bg-[#01CD6C] text-white border-r-2 border-[#23475F]'
                : 'text-[#23475F] hover:bg-[#01CD6C] hover:text-white'
              }`}
          >
            <span className="text-lg mr-3">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

const PaginaPrincipal = () => {
  const [currentPage, setCurrentPage] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); // Nuevo estado para carga de auth
  const [user, setUser] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      setIsAuthenticated(false);
      setLoading(false);
      navigate('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      
      setIsAuthenticated(true);

      const effectiveRole = pickEffectiveRole(parsedUser);
      const roleRoutes = effectiveRole ? roleRoutesConfig[effectiveRole] : [];
      setRoutes(roleRoutes);

      const currentPath = location.pathname.replace('/administrador/', '');
      const currentRoute = roleRoutes.find(r => r.path === currentPath) || roleRoutes[0];

      if (currentRoute) {
        setCurrentPage(currentRoute.id);
        setPageTitle(currentRoute.label);
      } else if (roleRoutes[0]) {
        setCurrentPage(roleRoutes[0].id);
        setPageTitle(roleRoutes[0].label);
        navigate(`/administrador/${roleRoutes[0].path}`);
      } else {
        setCurrentPage('');
        setPageTitle('Dashboard');
        // Opcional: navigate('/'); si quieres sacarlo del panel cuando no hay rol de panel
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      navigate('/');
    } finally {
      setLoading(false); // Finaliza la carga siempre
    }
  }, [navigate, location.pathname]);

  // 👇 pega esto debajo del useEffect que setea user/routes y hace navigate según ruta
useEffect(() => {
  // espera a que el primer efecto termine
  if (loading) return;

  const isAdminPath = location.pathname.startsWith('/administrador');
  if (!isAdminPath) return;

  const userData = localStorage.getItem('user');
  if (!userData) return;

  const parsed = JSON.parse(userData);
  const roles = getUserRoles(parsed);
  const hasPanelRole = roles.some(r => PANEL_ROLES.includes(r));

  if (!hasPanelRole) {
    // redirige a la vista pública o perfil del cliente
    navigate('/espacios-deportivos', { replace: true });
    // o si tienes una ruta de perfil: navigate('/mi-perfil', { replace: true });
  }
}, [loading, location.pathname, navigate]);


  const handlePageChange = (page, title) => {
    setCurrentPage(page);
    setPageTitle(title);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setRoutes([]);
    navigate('/');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>; // Pantalla de carga durante verificación
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
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
      )}
      <div className={`flex-1 flex flex-col min-w-0 ${isSidebarOpen && routes.length > 0 ? 'ml-64' : 'ml-0'} transition-all duration-300`}>
        <Header title={pageTitle} toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
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