/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  FaBullseye,
  FaStar,
  FaCheckCircle,
  FaFlag,
  FaUserShield,
  FaEnvelope,
  FaPhoneAlt,
  FaMapMarkerAlt,
} from "react-icons/fa";
import api from "./services/api";
import Header from "./Header";
import DashboardAdministradores from "./DashboardAdministradores";
import EspaciosDeportivos from "./casual/EspaciosDeportivos";
import CanchasEspacio from "./casual/CanchasEspacio";
import Cancha from "./casual/Cancha";
import ReservarCliente from "./roles/cliente/ReservarCliente";
import ReservaDetalleCompartida from "./roles/cliente/ReservaDetalleCompartida";
import MisReservasCliente from "./roles/cliente/MisReservasCliente";
import ComprobantePagoCliente from "./roles/cliente/ComprobantePagoCliente";
import UnirseReserva from "./roles/deportista/UnirseReserva";
import { getImageUrl } from "./utils"; // ajusta la ruta según tu estructura

// Componente ProtectedRoute para verificar roles
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUserRole(parsedUser.role);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#FFFFFF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#01CD6C] mx-auto mb-4"></div>
          <p className="text-[#23475F] font-light">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (userRole === "CLIENTE" || userRole === "DEPORTISTA") {
    return <Navigate to="/espacios-deportivos" replace />;
  }

  return children;
};

const AppContent = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getImageUrlLocal = (path) => {
    if (!path) return "";
    const base = api.defaults.baseURL.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    return `${base}/${cleanPath}`;
  };

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

  const handleImageError = (e) => {
    console.error("Error cargando imagen:", e.target.src);
    e.target.style.display = "none";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#FFFFFF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#01CD6C] mx-auto mb-4"></div>
          <p className="text-[#23475F] font-light">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#A31621]/10 border-l-4 border-[#A31621] text-[#A31621] p-4 m-4 rounded-lg shadow-sm">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans relative">
      <Header />

      {/* =========================================
                HERO 100% RESPONSIVE
      ========================================== */}
      <section className="relative w-full min-h-[70vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
        {(company.imagen_hero || company.imagen_1) && (
          <img
            src={getImageUrlLocal(company.imagen_hero) || getImageUrlLocal(company.imagen_1)}
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleImageError}
          />
        )}

        <div className="absolute inset-0 bg-[#0F2634]/70" />

        <div className="relative z-10 text-center px-4 max-w-2xl">
          <h1 className="text-3xl md:text-6xl font-extrabold text-white drop-shadow-lg mb-4 leading-tight">
            {company.titulo_h1 || "Bienvenido a nuestra plataforma"}
          </h1>

          <p className="text-base md:text-xl text-white/90 leading-relaxed mb-6 px-2">
            {company.descripcion_h1 ||
              "Gestiona y administra tus espacios deportivos de forma moderna y digital."}
          </p>

          <a
            href="/espacios-deportivos"
            className="px-8 py-3 md:px-10 md:py-4 bg-[#01CD6C] text-white font-bold rounded-full shadow-xl hover:bg-[#0fb668] transition-all text-base md:text-lg"
          >
            Ver Espacios Disponibles
          </a>
        </div>
      </section>

      {/* =========================================
                SERVICIOS RESPONSIVE
      ========================================== */}
      <section className="py-14 md:py-20 bg-[#F7F9FA]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0F2634] mb-10">
            Nuestros Servicios
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5 md:p-7 border border-[#23475F]/20 flex flex-col"
              >
                {company[`imagen_${n}`] && (
                  <img
                    src={getImageUrlLocal(company[`imagen_${n}`])}
                    alt={`Servicio ${n}`}
                    className="w-full h-36 md:h-48 object-cover rounded-xl mb-5"
                    onError={handleImageError}
                  />
                )}

                <h3 className="text-xl md:text-2xl font-semibold text-[#0F2634] mb-2">
                  {company[`titulo_${n}`] || `Servicio ${n}`}
                </h3>

                <p className="text-[#23475F] text-sm md:text-base flex-grow">
                  {company[`descripcion_${n}`] || "Descripción no disponible."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
                SOBRE NOSOTROS RESPONSIVE
      ========================================== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0F2634] mb-12">
            Sobre Nosotros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-14">
            {[
              ["Misión", company.mision],
              ["Visión", company.vision],
              ["Quiénes Somos", company.quienes_somos],
            ].map(([titulo, texto], i) => (
              <div
                key={i}
                className="text-center bg-[#F7F9FA] p-8 rounded-3xl shadow-sm border border-[#23475F]/20"
              >
                <h3 className="text-xl md:text-2xl font-semibold text-[#01CD6C] mb-4">
                  {titulo}
                </h3>
                <p className="text-[#23475F] text-sm md:text-base leading-relaxed">
                  {texto || "No proporcionado"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
                OBJETIVOS RESPONSIVE
      ========================================== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#0F2634] mb-12">
            Nuestros Objetivos
          </h2>

          <div className="space-y-8 border-l-4 border-[#01CD6C]/40 pl-6 md:pl-10">
            {[
              ["Objetivo Principal", company.nuestro_objetivo, <FaBullseye />],
              ["Objetivo 1", company.objetivo_1, <FaStar />],
              ["Objetivo 2", company.objetivo_2, <FaCheckCircle />],
              ["Objetivo 3", company.objetivo_3, <FaFlag />],
            ].map(([titulo, texto, Icon], i) => (
              <div key={i} className="relative">
                <span className="absolute -left-8 md:-left-10 bg-[#01CD6C] text-white w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full">
                  {Icon}
                </span>

                <div className="bg-[#F7F9FA] p-4 md:p-5 rounded-2xl shadow-sm border border-[#23475F]/20">
                  <h3 className="text-lg md:text-xl font-semibold text-[#01CD6C] mb-1">
                    {titulo}
                  </h3>
                  <p className="text-[#23475F] text-sm md:text-base">
                    {texto || "No proporcionado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================
                FOOTER RESPONSIVE
      ========================================== */}
      <footer className="bg-[#0F2634] text-white pt-14 pb-10 px-4 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex items-start gap-4">
            {company.logo_imagen && (
              <img
                src={getImageUrlLocal(company.logo_imagen)}
                alt="logo"
                className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-full border-2 border-[#01CD6C]"
                onError={handleImageError}
              />
            )}

            <div>
              <h4 className="text-2xl md:text-3xl font-bold">
                {company.nombre_sistema}
              </h4>

              <p className="text-[#01CD6C] mt-1 text-sm md:text-base">
                Administrador: {company.admin_nombre} {company.admin_apellido}
              </p>

              <p className="text-[#01CD6C] text-sm flex items-center gap-2 mt-2">
                <FaEnvelope /> {company.admin_correo}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm md:text-base">
            <p className="flex items-center gap-2 text-[#01CD6C] font-semibold">
              <FaEnvelope /> Email corporativo
            </p>
            <p>{company.correo_empresa || "No disponible"}</p>

            <p className="flex items-center gap-2 text-[#01CD6C] font-semibold mt-4">
              <FaPhoneAlt /> Telefonos
            </p>
            {(company.telefonos || []).map((t, i) => (
              <p key={i}>{t}</p>
            ))}

            <p className="flex items-center gap-2 text-[#01CD6C] font-semibold mt-4">
              <FaMapMarkerAlt /> Ubicacion
            </p>
            <p>{company.direccion || "No disponible"}</p>
          </div>
        </div>

        <div className="text-center mt-10 border-t border-[#23475F] pt-6 text-xs md:text-sm text-white/80">
          &copy; {new Date().getFullYear()} {company.nombre_sistema}
        </div>
      </footer>
    </div>
  );
};


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/espacios-deportivos" element={<EspaciosDeportivos />} />
        <Route path="/canchas-espacio/:id" element={<CanchasEspacio />} />
        <Route path="/canchas" element={<Cancha />} />
        <Route path="/reservar/:idCancha" element={<ReservarCliente />} />
        <Route
          path="/reserva-detalle/:idReserva"
          element={<ReservaDetalleCompartida />}
        />
        <Route path="/mis-reservas" element={<MisReservasCliente />} />
        <Route
          path="/comprobante-pago/:idPago"
          element={<ComprobantePagoCliente />}
        />
        <Route path="/unirse-reserva" element={<UnirseReserva />} />
        <Route
          path="/administrador/*"
          element={
            <ProtectedRoute>
              <DashboardAdministradores/>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
