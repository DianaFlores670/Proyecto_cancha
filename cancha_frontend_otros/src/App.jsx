/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import api from "./services/api";
import Header from "./Header";
import PaginaPrincipal from "./pagina_principal";
import EspaciosDeportivos from "./casual/EspaciosDeportivos";
import CanchasEspacio from "./casual/CanchasEspacio";
import Cancha from "./casual/Cancha";
import ReservarCliente from "./roles/cliente/ReservarCliente";
import ReservaDetalleCompartida from "./roles/cliente/ReservaDetalleCompartida";
import MisReservasCliente from "./roles/cliente/MisReservasCliente";
import ComprobantePagoCliente from "./roles/cliente/ComprobantePagoCliente";
import UnirseReserva from "./roles/deportista/UnirseReserva";

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

  const getImageUrl = (path) => {
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
      <div
        className="bg-[#A31621]/10 border-l-4 border-[#A31621] text-[#A31621] p-4 m-4 rounded-lg shadow-sm"
        role="alert"
      >
        <p className="font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] font-sans relative">
      {/* Header */}
      <Header />

      {/* Contenido principal con padding-top para evitar superposición */}
      <div className="pt-24">
        <div className="max-w-8xl mx-auto px-4 py-6 md:px-6">
          {/* Sección de Servicios - 3 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Servicio 1 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">
                Servicio 1
              </h3>
              <div className="space-y-4">
                {company.imagen_1 && (
                  <img
                    src={getImageUrl(company.imagen_1)}
                    alt="Servicio 1"
                    className="w-full h-40 md:h-48 lg:h-56 object-cover rounded-lg mb-4"
                    onError={handleImageError}
                  />
                )}
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    🏷️ Título:
                  </span>
                  <p className="text-[#23475F] font-semibold">
                    {company.titulo_1 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    📖 Descripción:
                  </span>
                  <p className="text-[#23475F] leading-relaxed">
                    {company.descripcion_1 || "No proporcionado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Servicio 2 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">
                Servicio 2
              </h3>
              <div className="space-y-4">
                {company.imagen_2 && (
                  <img
                    src={getImageUrl(company.imagen_2)}
                    alt="Servicio 2"
                    className="w-full h-40 md:h-48 lg:h-56 object-cover rounded-lg mb-4"
                    onError={handleImageError}
                  />
                )}
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    🏷️ Título:
                  </span>
                  <p className="text-[#23475F] font-semibold">
                    {company.titulo_2 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    📖 Descripción:
                  </span>
                  <p className="text-[#23475F] leading-relaxed">
                    {company.descripcion_2 || "No proporcionado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Servicio 3 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">
                Servicio 3
              </h3>
              <div className="space-y-4">
                {company.imagen_3 && (
                  <img
                    src={getImageUrl(company.imagen_3)}
                    alt="Servicio 3"
                    className="w-full h-40 md:h-48 lg:h-56 object-cover rounded-lg mb-4"
                    onError={handleImageError}
                  />
                )}
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    🏷️ Título:
                  </span>
                  <p className="text-[#23475F] font-semibold">
                    {company.titulo_3 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    📖 Descripción:
                  </span>
                  <p className="text-[#23475F] leading-relaxed">
                    {company.descripcion_3 || "No proporcionado"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido Principal - 3 columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Misión y Visión */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">
                Misión & Visión
              </h3>
              <div className="space-y-6">
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    🎯 Misión:
                  </span>
                  <p className="text-[#23475F] leading-relaxed">
                    {company.mision || "No proporcionada"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    👁️ Visión:
                  </span>
                  <p className="text-[#23475F] leading-relaxed">
                    {company.vision || "No proporcionada"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    👥 Quiénes Somos:
                  </span>
                  <p className="text-[#23475F] leading-relaxed">
                    {company.quienes_somos || "No proporcionado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Nuestros Objetivos */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">
                Nuestros Objetivos
              </h3>
              <div className="space-y-5">
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    ⭐ Objetivo Principal:
                  </span>
                  <p className="text-[#23475F]">
                    {company.nuestro_objetivo || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    ✅ Objetivo 1:
                  </span>
                  <p className="text-[#23475F]">
                    {company.objetivo_1 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    ✅ Objetivo 2:
                  </span>
                  <p className="text-[#23475F]">
                    {company.objetivo_2 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    ✅ Objetivo 3:
                  </span>
                  <p className="text-[#23475F]">
                    {company.objetivo_3 || "No proporcionado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">
                Información Adicional
              </h3>
              <div className="space-y-5">
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    🏷️ Título Principal:
                  </span>
                  <p className="text-[#23475F]">
                    {company.titulo_h1 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    📝 Descripción:
                  </span>
                  <p className="text-[#23475F]">
                    {company.descripcion_h1 || "No proporcionado"}
                  </p>
                </div>
                <div>
                  <span className="text-[#01CD6C] font-medium block mb-2">
                    💫 Te Ofrecemos:
                  </span>
                  <p className="text-[#23475F]">
                    {company.te_ofrecemos || "No proporcionado"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con información de la compañía */}
          <footer className="bg-[#0F2634] text-[#FFFFFF] rounded-2xl p-8 mt-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-center">
                <h4 className="text-2xl font-bold mb-4 text-[#FFFFFF]">
                  {company.nombre_sistema}
                </h4>
                <p className="text-[#01CD6C] mb-2">
                  <span className="font-medium">Administrador:</span>{" "}
                  {company.admin_nombre} {company.admin_apellido}
                </p>
                <p className="text-[#01CD6C] mb-2">
                  <span className="font-medium">Email Administrador:</span>{" "}
                  {company.admin_correo || "No disponible"}
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <div className="flex items-center">
                  <span className="text-[#01CD6C] mr-3">📧</span>
                  <div>
                    <p className="text-[#01CD6C] font-medium">
                      Email Corporativo
                    </p>
                    <p className="text-[#FFFFFF]">
                      {company.correo_empresa || "No disponible"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="text-[#01CD6C] mr-3">📞</span>
                  <div>
                    <p className="text-[#01CD6C] font-medium">Teléfonos</p>
                    <div className="text-[#FFFFFF] space-y-1">
                      {company.telefonos && company.telefonos.length > 0 ? (
                        company.telefonos.map((telefono, index) => (
                          <p key={index} className="text-sm">
                            {telefono}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm">No disponible</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="text-[#01CD6C] mr-3">📍</span>
                  <div>
                    <p className="text-[#01CD6C] font-medium">Ubicación</p>
                    <p className="text-[#FFFFFF]">
                      {company.direccion || "No disponible"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-[#23475F] mt-8 pt-6 text-center">
              <p className="text-[#01CD6C] text-sm">
                &copy; {new Date().getFullYear()} {company.nombre_sistema}.
                Todos los derechos reservados.
              </p>
              <p className="text-[#FFFFFF]/80 text-xs mt-2">
                Registrado el{" "}
                {new Date(company.fecha_registrado).toLocaleDateString("es-ES")}
              </p>
            </div>
          </footer>
        </div>
      </div>
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
              <PaginaPrincipal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/encargado/*"
          element={
            <ProtectedRoute>
              <PaginaPrincipal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/control/*"
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
