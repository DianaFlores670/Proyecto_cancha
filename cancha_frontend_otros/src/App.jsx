/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FaBullseye, FaStar, FaCheckCircle, FaFlag, FaUserShield, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt } from "react-icons/fa";
import api from './services/api';
import Header from './Header';
import PaginaPrincipal from './pagina_principal';
import EspaciosDeportivos from './casual/EspaciosDeportivos';
import CanchasEspacio from './casual/CanchasEspacio';
import Cancha from './casual/Cancha';
import ReservarCliente from './roles/cliente/ReservarCliente';
import ReservaDetalleCompartida from './roles/cliente/ReservaDetalleCompartida';
import MisReservasCliente from './roles/cliente/MisReservasCliente';
import ComprobantePagoCliente from './roles/cliente/ComprobantePagoCliente';
import UnirseReserva from './roles/deportista/UnirseReserva';

// Componente ProtectedRoute para verificar roles
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

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
      console.error('Error parsing user data:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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

  if (userRole === 'CLIENTE' || userRole === 'DEPORTISTA') {
    return <Navigate to="/espacios-deportivos" replace />;
  }

  return children;
};

const AppContent = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const response = await api.get('/empresa/dato-individual/2');
        setCompany(response.data.datos.empresa);
        setLoading(false);
      } catch (err) {
        setError('Error al cargar los datos de la empresa');
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  const handleImageError = (e) => {
    console.error('Error cargando imagen:', e.target.src);
    e.target.style.display = 'none';
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
      <div className="bg-[#A31621]/10 border-l-4 border-[#A31621] text-[#A31621] p-4 m-4 rounded-lg shadow-sm" role="alert">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans relative">
      <Header />

      {/* ===================== HERO ===================== */}
      <section className="relative w-full h-[90vh] flex items-center justify-center overflow-hidden">
        {company.imagen_hero || company.imagen_1 ? (
          <img
            src={getImageUrl(company.imagen_hero || company.imagen_1)}
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : null}

        {/* Degradado de opacidad */}
        <div className="absolute inset-0 bg-[#0F2634]/70 backdrop-blur-sm"></div>

        {/* Contenido */}
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg mb-6">
            {company.titulo_h1 || "Bienvenido a nuestra plataforma"}
          </h1>

          <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-10">
            {company.descripcion_h1 ||
              "Gestiona y administra tus espacios deportivos de forma rápida, moderna y completamente digitalizada."}
          </p>

          <a
            href="/espacios-deportivos"
            className="px-10 py-4 bg-[#01CD6C] text-[#fff] font-bold rounded-full shadow-xl hover:bg-[#0fb668] transition-all"
          >
            Ver Espacios Disponibles
          </a>
        </div>
      </section>

      {/* ===================== SERVICIOS ===================== */}
      <section className="py-20 bg-[#F7F9FA]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-[#0F2634] mb-14">
            Nuestros Servicios
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Card Servicio */}
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl shadow-md hover:shadow-xl transition-shadow p-7 border border-[#23475F]/20 flex flex-col"
              >
                {company[`imagen_${n}`] ? (
                  <img
                    src={getImageUrl(company[`imagen_${n}`])}
                    alt={`Servicio ${n}`}
                    className="w-full h-48 object-cover rounded-2xl mb-6"
                    onError={handleImageError}
                  />
                ) : null}

                <h3 className="text-2xl font-semibold text-[#0F2634] mb-3">
                  {company[`titulo_${n}`] || `Servicio ${n}`}
                </h3>

                <p className="text-[#23475F] leading-relaxed flex-grow">
                  {company[`descripcion_${n}`] || "Descripción no disponible."}
                </p>

                <div className="mt-6">
                  <a
                    href="/espacios-deportivos"
                    className="text-[#01CD6C] font-bold hover:underline"
                  >
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ===================== SOBRE LA EMPRESA ===================== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-[#0F2634] mb-14">
            Sobre Nosotros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-14">
            {/* Misión */}
            <div className="text-center bg-[#F7F9FA] p-10 rounded-3xl shadow-sm border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#01CD6C] mb-4">
                Misión
              </h3>
              <p className="text-[#23475F] leading-relaxed">
                {company.mision || "No proporcionada"}
              </p>
            </div>

            {/* Visión */}
            <div className="text-center bg-[#F7F9FA] p-10 rounded-3xl shadow-sm border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#01CD6C] mb-4">
                Visión
              </h3>
              <p className="text-[#23475F] leading-relaxed">
                {company.vision || "No proporcionada"}
              </p>
            </div>

            {/* Quiénes somos */}
            <div className="text-center bg-[#F7F9FA] p-10 rounded-3xl shadow-sm border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#01CD6C] mb-4">
                Quiénes Somos
              </h3>
              <p className="text-[#23475F] leading-relaxed">
                {company.quienes_somos || "No proporcionado"}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* ===================== OBJETIVOS ===================== */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-[#0F2634] mb-16">
            Nuestros Objetivos
          </h2>

          <div className="relative border-l-4 border-[#01CD6C]/40 pl-8 space-y-5">

            {/* Objetivo Principal */}
            <div className="relative">
              <span className="absolute -left-[34px] top-0 bg-[#01CD6C] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-md">
                <FaBullseye />
              </span>
              <div className="bg-[#F7F9FA] p-4 rounded-3xl shadow-sm border border-[#23475F]/20">
                <h3 className="text-xl font-semibold text-[#01CD6C] mb-2">
                  Objetivo Principal
                </h3>
                <p className="text-[#23475F] leading-relaxed">
                  {company.nuestro_objetivo || "No proporcionado"}
                </p>
              </div>
            </div>

            {/* Objetivo 1 */}
            <div className="relative">
              <span className="absolute -left-[34px] top-0 bg-[#01CD6C] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-md">
                <FaStar />
              </span>
              <div className="bg-[#F7F9FA] p-4 rounded-3xl shadow-sm border border-[#23475F]/20">
                <h3 className="text-xl font-semibold text-[#01CD6C] mb-2">
                  Objetivo 1
                </h3>
                <p className="text-[#23475F] leading-relaxed">
                  {company.objetivo_1 || "No proporcionado"}
                </p>
              </div>
            </div>

            {/* Objetivo 2 */}
            <div className="relative">
              <span className="absolute -left-[34px] top-0 bg-[#01CD6C] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-md">
                <FaCheckCircle />
              </span>
              <div className="bg-[#F7F9FA] p-4 rounded-3xl shadow-sm border border-[#23475F]/20">
                <h3 className="text-xl font-semibold text-[#01CD6C] mb-2">
                  Objetivo 2
                </h3>
                <p className="text-[#23475F] leading-relaxed">
                  {company.objetivo_2 || "No proporcionado"}
                </p>
              </div>
            </div>

            {/* Objetivo 3 */}
            <div className="relative">
              <span className="absolute -left-[34px] top-0 bg-[#01CD6C] text-white w-10 h-10 flex items-center justify-center rounded-full shadow-md">
                <FaFlag />
              </span>
              <div className="bg-[#F7F9FA] p-4 rounded-3xl shadow-sm border border-[#23475F]/20">
                <h3 className="text-xl font-semibold text-[#01CD6C] mb-2">
                  Objetivo 3
                </h3>
                <p className="text-[#23475F] leading-relaxed">
                  {company.objetivo_3 || "No proporcionado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-[#0F2634] text-white pt-16 pb-10 px-6 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex items-start gap-5">
            {company.logo_imagen || company.imagen_1 ? (
              <img
                src={getImageUrl(company.logo_imagen || company.imagen_1)}
                alt="logo_imagen"
                className="w-20 h-20 object-contain rounded-full border-2 border-[#01CD6C] shadow-md"
                onError={handleImageError}
              />
            ) : null}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-3xl font-bold">
                  {company.nombre_sistema}
                </h4>
              </div>
              <p className="text-[#01CD6C] flex items-center gap-2">
                <FaUserShield className="text-[#01CD6C] text-xl" />
                Administrador: {company.admin_nombre} {company.admin_apellido}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <FaEnvelope className="text-[#01CD6C]" />
                <p className="text-[#01CD6C]">
                  Email: {company.admin_correo || "No disponible"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h5 className="text-[#01CD6C] font-semibold flex items-center gap-2">
                <FaEnvelope className="text-[#01CD6C]" />
                <span>Email corporativo</span>
              </h5>
              <p>{company.correo_empresa || "No disponible"}</p>
            </div>

            <div>
              <h5 className="text-[#01CD6C] font-semibold flex items-center gap-2">
                <FaPhoneAlt className="text-[#01CD6C]" />
                <span>Telefonos</span>
              </h5>
              {company.telefonos?.length ? (
                company.telefonos.map((t, i) => <p key={i}>{t}</p>)
              ) : (
                <p>No disponible</p>
              )}
            </div>

            <div>
              <h5 className="text-[#01CD6C] font-semibold flex items-center gap-2">
                <FaMapMarkerAlt className="text-[#01CD6C]" />
                <span>Ubicacion</span>
              </h5>
              <p>{company.direccion || "No disponible"}</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-10 border-t border-[#23475F] pt-6 text-sm text-white/80">
          &copy; {new Date().getFullYear()} {company.nombre_sistema}.
          Registrado el {new Date(company.fecha_registrado).toLocaleDateString("es-ES")}
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
        <Route path="/reserva-detalle/:idReserva" element={<ReservaDetalleCompartida />} />
        <Route path="/mis-reservas" element={<MisReservasCliente />} />
        <Route path="/comprobante-pago/:idPago" element={<ComprobantePagoCliente />} />
        <Route path="/unirse-reserva" element={<UnirseReserva />} />
        <Route
          path="/administrador/*"
          element={
            <ProtectedRoute>
              <PaginaPrincipal />
            </ProtectedRoute>
          }
        />
        
      </Routes>
    </Router>
  );
};

export default App;