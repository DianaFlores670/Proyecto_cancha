import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import api from './services/api';
import PaginaPrincipal from './pagina_principal';
import EspaciosDeportivos from './casual/EspaciosDeportivos';
import CanchasEspacio from './casual/CanchasEspacio';
import Cancha from './casual/Cancha';

const AppContent = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleIniciarSesionClick = () => {
    setShowLoginModal(true);
  };

  const handleCloseModal = () => {
    setShowLoginModal(false);
    setCorreo('');
    setContrasena('');
    setLoginError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await api.post('/registro/sign-in', {
        correo,
        contrasena,
      });

      const data = response.data;

      if (data.success && data.data.token && data.data.usuario) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.usuario));
        setLoginLoading(false);
        setShowLoginModal(false);
        navigate('/administrador'); // Redirect to /administrador after successful login
      } else {
        setLoginError('Respuesta del servidor inválida. Intenta de nuevo.');
        setLoginLoading(false);
      }
    } catch (err) {
      setLoginError(
        err.response?.data?.message ||
          'Error al iniciar sesión. Verifica tus credenciales.'
      );
      setLoginLoading(false);
    }
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
    <div className="min-h-screen bg-[#FFFFFF] p-6 font-sans relative">
      {/* Header con botones */}
      <div className="fixed top-6 right-6 z-50 flex gap-4">
        <Link
          to="/espacios-deportivos"
          className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
        >
          Espacios Deportivos →
        </Link>
        <Link
          to="/canchas"
          className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
        >
          Canchas →
        </Link>
        <button
          onClick={handleIniciarSesionClick}
          className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
        >
          Iniciar Sesión →
        </button>
      </div>

      {/* Modal de Login */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-8 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-[#23475F] hover:text-[#01CD6C] text-2xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-center text-[#23475F] mb-6">Iniciar Sesión</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="correo" className="block text-sm font-medium text-[#23475F]">
                  Correo
                </label>
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                  placeholder="Ingrese su correo"
                />
              </div>
              <div>
                <label htmlFor="contrasena" className="block text-sm font-medium text-[#23475F]">
                  Contraseña
                </label>
                <input
                  id="contrasena"
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                  placeholder="Ingrese su contraseña"
                />
              </div>
              {loginError && (
                <p className="text-[#A31621] text-sm">{loginError}</p>
              )}
              <button
                type="submit"
                disabled={loginLoading}
                className={`w-full py-2 px-4 bg-[#01CD6C] text-[#FFFFFF] rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F] ${
                  loginLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loginLoading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 mb-8 border border-[#23475F]/20">
          <div className="flex items-center gap-6">
            {company.logo_imagen && (
              <img
                src={getImageUrl(company.logo_imagen)}
                alt={`${company.nombre_sistema} logo`}
                className="h-20 w-20 object-contain rounded-full border-4 border-[#01CD6C] shadow-md"
                onError={handleImageError}
              />
            )}
            <div>
              <h2 className="text-4xl font-bold text-[#0F2634] mb-2">{company.nombre_sistema}</h2>
              <p className="text-[#23475F] text-lg">Bienvenido a tu panel de control</p>
            </div>
          </div>
        </div>

        {/* Contenido Principal - 3 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Misión y Visión */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
            <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Misión & Visión</h3>
            <div className="space-y-6">
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">🎯 Misión:</span>
                <p className="text-[#23475F] leading-relaxed">{company.mision || 'No proporcionada'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">👁️ Visión:</span>
                <p className="text-[#23475F] leading-relaxed">{company.vision || 'No proporcionada'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">👥 Quiénes Somos:</span>
                <p className="text-[#23475F] leading-relaxed">{company.quienes_somos || 'No proporcionado'}</p>
              </div>
            </div>
          </div>

          {/* Nuestros Objetivos */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
            <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Nuestros Objetivos</h3>
            <div className="space-y-5">
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">⭐ Objetivo Principal:</span>
                <p className="text-[#23475F]">{company.nuestro_objetivo || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">✅ Objetivo 1:</span>
                <p className="text-[#23475F]">{company.objetivo_1 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">✅ Objetivo 2:</span>
                <p className="text-[#23475F]">{company.objetivo_2 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">✅ Objetivo 3:</span>
                <p className="text-[#23475F]">{company.objetivo_3 || 'No proporcionado'}</p>
              </div>
            </div>
          </div>

          {/* Información Adicional */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
            <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Información Adicional</h3>
            <div className="space-y-5">
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">🏷️ Título Principal:</span>
                <p className="text-[#23475F]">{company.titulo_h1 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">📝 Descripción:</span>
                <p className="text-[#23475F]">{company.descripcion_h1 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">💫 Te Ofrecemos:</span>
                <p className="text-[#23475F]">{company.te_ofrecemos || 'No proporcionado'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Servicios - 3 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Servicio 1 */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
            <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Servicio 1</h3>
            <div className="space-y-4">
              {company.imagen_1 && (
                <img
                  src={getImageUrl(company.imagen_1)}
                  alt="Servicio 1"
                  className="w-full h-40 object-cover rounded-lg mb-4"
                  onError={handleImageError}
                />
              )}
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">🏷️ Título:</span>
                <p className="text-[#23475F] font-semibold">{company.titulo_1 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">📖 Descripción:</span>
                <p className="text-[#23475F] leading-relaxed">{company.descripcion_1 || 'No proporcionado'}</p>
              </div>
            </div>
          </div>

          {/* Servicio 2 */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
            <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Servicio 2</h3>
            <div className="space-y-4">
              {company.imagen_2 && (
                <img
                  src={getImageUrl(company.imagen_2)}
                  alt="Servicio 2"
                  className="w-full h-40 object-cover rounded-lg mb-4"
                  onError={handleImageError}
                />
              )}
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">🏷️ Título:</span>
                <p className="text-[#23475F] font-semibold">{company.titulo_2 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">📖 Descripción:</span>
                <p className="text-[#23475F] leading-relaxed">{company.descripcion_2 || 'No proporcionado'}</p>
              </div>
            </div>
          </div>

          {/* Servicio 3 */}
          <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
            <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Servicio 3</h3>
            <div className="space-y-4">
              {company.imagen_3 && (
                <img
                  src={getImageUrl(company.imagen_3)}
                  alt="Servicio 3"
                  className="w-full h-40 object-cover rounded-lg mb-4"
                  onError={handleImageError}
                />
              )}
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">🏷️ Título:</span>
                <p className="text-[#23475F] font-semibold">{company.titulo_3 || 'No proporcionado'}</p>
              </div>
              <div>
                <span className="text-[#01CD6C] font-medium block mb-2">📖 Descripción:</span>
                <p className="text-[#23475F] leading-relaxed">{company.descripcion_3 || 'No proporcionado'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Imagen Hero - Full width */}
        {company.imagen_hero && (
          <div className="mb-8">
            <div className="bg-[#FFFFFF] rounded-2xl shadow-sm p-8 border border-[#23475F]/20">
              <h3 className="text-2xl font-semibold text-[#0F2634] mb-6 pb-2 border-b border-[#23475F]/20">Imagen Principal</h3>
              <img
                src={getImageUrl(company.imagen_hero)}
                alt="Imagen principal de la empresa"
                className="w-full h-20 object-contain rounded-xl shadow-sm"
                onError={handleImageError}
              />
            </div>
          </div>
        )}

        {/* Footer con información de la compañía */}
        <footer className="bg-[#0F2634] text-[#FFFFFF] rounded-2xl p-8 mt-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <h4 className="text-2xl font-bold mb-4 text-[#FFFFFF]">{company.nombre_sistema}</h4>
              <p className="text-[#01CD6C] mb-2">
                <span className="font-medium">Administrador:</span> {company.admin_nombre} {company.admin_apellido}
              </p>
              <p className="text-[#01CD6C] mb-2">
                <span className="font-medium">Email Admin:</span> {company.admin_correo || 'No disponible'}
              </p>
            </div>
            <div className="flex flex-col justify-center space-y-3">
              <div className="flex items-center">
                <span className="text-[#01CD6C] mr-3">📧</span>
                <div>
                  <p className="text-[#01CD6C] font-medium">Email Corporativo</p>
                  <p className="text-[#FFFFFF]">{company.correo_empresa || 'No disponible'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-[#01CD6C] mr-3">📞</span>
                <div>
                  <p className="text-[#01CD6C] font-medium">Teléfono</p>
                  <p className="text-[#FFFFFF]">{company.telefono || 'No disponible'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-[#01CD6C] mr-3">📍</span>
                <div>
                  <p className="text-[#01CD6C] font-medium">Ubicación</p>
                  <p className="text-[#FFFFFF]">{company.direccion || 'No disponible'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#23475F] mt-8 pt-6 text-center">
            <p className="text-[#01CD6C] text-sm">
              &copy; {new Date().getFullYear()} {company.nombre_sistema}. Todos los derechos reservados.
            </p>
            <p className="text-[#FFFFFF]/80 text-xs mt-2">
              Registrado el {new Date(company.fecha_registrado).toLocaleDateString('es-ES')}
            </p>
          </div>
        </footer>
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
        <Route path="/administrador/*" element={<PaginaPrincipal />} />
      </Routes>
    </Router>
  );
};

export default App;