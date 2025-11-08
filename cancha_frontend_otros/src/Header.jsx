/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './services/api';

const ROLE_PANEL_MAP = {
  admin_esp_dep: { path: '/administrador', label: 'Ir a Panel Administrador' },
  control: { path: '/control', label: 'Ir a Panel Control' },
  encargado: { path: '/encargado', label: 'Ir a Panel Encargado' }
};

const getPanelEntries = (u) => {
  const raw = Array.isArray(u?.roles) ? u.roles : [];
  const list = raw
    .map(r => (r?.rol || '').toLowerCase())
    .filter(r => r && r !== 'cliente' && r !== 'administrador');
  const uniq = Array.from(new Set(list));
  return uniq
    .map(r => ROLE_PANEL_MAP[r])
    .filter(Boolean);
};


const formatRole = (v) => {
  const s = (v || '').toString().replace(/[_-]+/g, ' ').trim();
  return s ? s.replace(/\b\w/g, c => c.toUpperCase()) : 'Sin rol';
};

const formatValue = (v) => {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    try {
      return new Date(v).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { /* noop */ }
  }
  return String(v ?? '');
};

const normalizeUser = (u) => {
  const rolesSrc = Array.isArray(u?.roles) ? u.roles : [];
  const roles = rolesSrc.map((r) => {
    if (typeof r === 'string') return { rol: r.toLowerCase(), tabla: '', datos: {} };
    const rol = typeof r?.rol === 'string' ? r.rol : '';
    const tabla = typeof r?.tabla === 'string' ? r.tabla : '';
    const datos = r && typeof r.datos === 'object' && r.datos !== null ? r.datos : {};
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
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [registerData, setRegisterData] = useState({
    usuario: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    rol_agregar: 'cliente',
    id_espacio: '',
    motivo: ''
  });
  const [espaciosLibres, setEspaciosLibres] = useState([]);
  const [espaciosLoading, setEspaciosLoading] = useState(false);
  const [espaciosError, setEspaciosError] = useState(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
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
    nombre: '',
    apellido: '',
    correo: '',
    usuario: '',
    telefono: '',
    sexo: '',
    imagen_perfil: '',
    latitud: '',
    longitud: '',
    datos_especificos: {},
  });
  const [passwordData, setPasswordData] = useState({
    nueva_contrasena: '',
    confirmar_contrasena: '',
  });
  const [passwordMatchError, setPasswordMatchError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  const sexosPermitidos = ['masculino', 'femenino'];
  const rolesDisponibles = [
    { valor: 'admin_esp_dep', etiqueta: 'Administrador de espacios deportivos' },
    { valor: 'encargado', etiqueta: 'Encargado' },
    { valor: 'control', etiqueta: 'Control' },
    { valor: 'cliente', etiqueta: 'Cliente' },
  ];

  const fetchEspaciosLibres = async () => {
    setEspaciosLoading(true);
    setEspaciosError(null);
    try {
      const r = await api.get('/solicitud-admin-esp-dep/espacios-libres');
      const list =
        r.data?.datos?.espacios ||
        r.data?.datos ||
        r.data?.data?.espacios ||
        [];
      setEspaciosLibres(Array.isArray(list) ? list : []);
    } catch (err) {
      setEspaciosError('Error al cargar espacios libres');
      setEspaciosLibres([]);
    } finally {
      setEspaciosLoading(false);
    }
  };


  // Check login status and load user data
  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    setIsLoggedIn(!!token);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeUser(parsed);
        setUser(normalized);
        setFormData({
          nombre: normalized.nombre || '',
          apellido: normalized.apellido || '',
          correo: normalized.correo || '',
          usuario: normalized.usuario || '',
          telefono: normalized.telefono || '',
          sexo: normalized.sexo || '',
          imagen_perfil: normalized.imagen_perfil || '',
          latitud: normalized.latitud || '',
          longitud: normalized.longitud || '',
          // muestra por defecto los datos del PRIMER rol
          datos_especificos: normalized.roles?.[0]?.datos || {},
        });
        setImagePreview(normalized.imagen_perfil ? getImageUrl(normalized.imagen_perfil) : null);
      } catch (e) {
        console.error('Error parsing user from LS:', e);
      }
    }
  }, []);


  // Fetch company data
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

  // Handle scroll behavior
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY <= 0) {
      //setIsHeaderVisible(true);
    } else if (currentScrollY > lastScrollY) {
      //setIsHeaderVisible(false);
    } else {
      //setIsHeaderVisible(true);
    }
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Handle login
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
        const normalized = normalizeUser(data.data.usuario);
        if (data.success && data.data.token && data.data.usuario) {
          const normalized = normalizeUser(data.data.usuario);
          console.log(normalized.roles);
          const hasRole = Array.isArray(normalized.roles) && normalized.roles.length > 0;
          if (!hasRole) {
            setLoginError('Tu cuenta no tiene roles habilitados. Solicita acceso o espera aprobacion.');
            setLoginLoading(false);
            return;
          }

          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(normalized));
          setIsLoggedIn(true);
          setUser(normalized);
          setFormData({
            nombre: normalized.nombre || '',
            apellido: normalized.apellido || '',
            correo: normalized.correo || '',
            usuario: normalized.usuario || '',
            telefono: normalized.telefono || '',
            sexo: normalized.sexo || '',
            imagen_perfil: normalized.imagen_perfil || '',
            latitud: normalized.latitud || '',
            longitud: normalized.longitud || '',
            datos_especificos: normalized.roles?.[0]?.datos || {},
          });
          setImagePreview(normalized.imagen_perfil ? getImageUrl(normalized.imagen_perfil) : null);

          const roleSet = new Set((normalized.roles ?? []).map(r => (r.rol || '').toUpperCase()));
          if (roleSet.has('CLIENTE') || roleSet.has('DEPORTISTA')) {
            navigate('/espacios-deportivos');
          } else {
            navigate('/administrador');
          }
        } else {
          setLoginError('Respuesta del servidor invalida. Intenta de nuevo.');
          setLoginLoading(false);
        }


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

  // Handle registration
  const handleRegister = async (e) => {
  e.preventDefault();
  setRegisterLoading(true);
  setRegisterError(null);

  if (registerData.contrasena !== registerData.confirmarContrasena) {
    setRegisterError('Las contrasenas no coinciden');
    setRegisterLoading(false);
    return;
  }

  const wantsAdmin = (registerData.rol_agregar || 'cliente') === 'admin_esp_dep';
  if (wantsAdmin && !registerData.id_espacio) {
    setRegisterError('Debe seleccionar un espacio deportivo');
    setRegisterLoading(false);
    return;
  }

  try {
    const payload = {
      usuario: registerData.usuario,
      correo: registerData.correo,
      contrasena: registerData.contrasena,
      rol: registerData.rol_agregar || 'cliente',
      ...(wantsAdmin ? {
        id_espacio: Number(registerData.id_espacio),
        motivo: (registerData.motivo || '').trim()
      } : {})
    };

    const res = await api.post('/usuario/', payload);
    const ok = res.data?.exito === true;
    if (!ok) throw new Error(res.data?.mensaje || 'Registro fallido');

    setShowRegisterModal(false);
    setSubmissionMessage(
      wantsAdmin
        ? 'Solicitud creada. Te avisaremos por correo cuando se revise.'
        : 'Registro completado. Bienvenido.'
    );
    setShowSubmissionModal(true);
    setRegisterData({
      usuario: '',
      correo: '',
      contrasena: '',
      confirmarContrasena: '',
      rol_agregar: 'cliente',
      id_espacio: '',
      motivo: ''
    });
    setShowRoleSection(false);
  } catch (err) {
    setRegisterError(err?.message || 'Error de conexion');
  } finally {
    setRegisterLoading(false);
  }
};

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.setItem('user', JSON.stringify({}));
    setIsLoggedIn(false);
    setUser(null);
    setFormData({
      nombre: '',
      apellido: '',
      correo: '',
      usuario: '',
      telefono: '',
      sexo: '',
      imagen_perfil: '',
      latitud: '',
      longitud: '',
      datos_especificos: {},
    });
    setImagePreview(null);
    setSelectedFile(null);
    setShowMenu(false);
    navigate('/');
  };

  // Handle image error
  const handleImageError = (e) => {
    console.error('Error cargando imagen:', e.target.src);
    e.target.style.display = 'none';
  };

  // Get image URL
  const getImageUrl = (path) => {
    if (!path) return '';
    const base = api.defaults.baseURL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${base}/${cleanPath}`;
  };

  // Toggle hamburger menu
  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
  };

  // Open profile modal
  const openProfileModal = async () => {
    setShowMenu(false);
    setProfileError(null);
    try {
      const response = await api.get(`/usuario/dato-individual/${user.id_persona}`);
      if (response.data.exito) {
        const userData = response.data.datos.usuario;
        const normalized = normalizeUser(userData);

        // <-- CAMBIO CLAVE PARA ROLES -->
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        // --------------------------------

        setFormData({
          nombre: normalized.nombre || '',
          apellido: normalized.apellido || '',
          correo: normalized.correo || '',
          usuario: normalized.usuario || '',
          telefono: normalized.telefono || '',
          sexo: normalized.sexo || '',
          imagen_perfil: normalized.imagen_perfil || '',
          latitud: normalized.latitud || '',
          longitud: normalized.longitud || '',
          datos_especificos: normalized.roles?.[0]?.datos || {},
          fecha_creacion: normalized.fecha_creacion ? new Date(normalized.fecha_creacion).toISOString().split('T')[0] : '',
        });
        setImagePreview(normalized.imagen_perfil ? getImageUrl(normalized.imagen_perfil) : null);

        setShowProfileModal(true);
      } else {
        setProfileError(response.data.mensaje);
      }
    } catch (err) {
      console.error('Error in openProfileModal:', err);
      setProfileError(err.response?.data?.mensaje || 'Error al cargar los datos del usuario');
    }
  };

  // Open edit profile modal
  const openEditProfileModal = async () => {
    setShowMenu(false);
    setEditProfileError(null);
    try {
      const response = await api.get(`/usuario/dato-individual/${user.id_persona}`);
      if (response.data.exito) {
        const userData = response.data.datos.usuario;
        const normalized = normalizeUser(userData);

        // <-- CAMBIO CLAVE PARA ROLES -->
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        // --------------------------------

        setFormData({
          nombre: normalized.nombre || '',
          apellido: normalized.apellido || '',
          correo: normalized.correo || '',
          usuario: normalized.usuario || '',
          telefono: normalized.telefono || '',
          sexo: normalized.sexo || '',
          imagen_perfil: normalized.imagen_perfil || '',
          latitud: normalized.latitud || '',
          longitud: normalized.longitud || '',
          datos_especificos: normalized.roles?.[0]?.datos || {},
          fecha_creacion: normalized.fecha_creacion ? new Date(normalized.fecha_creacion).toISOString().split('T')[0] : '',
        });
        setImagePreview(normalized.imagen_perfil ? getImageUrl(normalized.imagen_perfil) : null);

        setSelectedFile(null);
        setPasswordData({ nueva_contrasena: '', confirmar_contrasena: '' });
        setShowEditProfileModal(true);
      } else {
        setEditProfileError(response.data.mensaje);
      }
    } catch (err) {
      console.error('Error in openEditProfileModal:', err);
      setEditProfileError(err.response?.data?.mensaje || 'Error al cargar los datos del usuario');
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('nueva_') || name.startsWith('confirmar_')) {
      setPasswordData((prev) => {
        const next = { ...prev, [name]: value };
        if (next.nueva_contrasena && next.confirmar_contrasena) {
          setPasswordMatchError(
            next.nueva_contrasena !== next.confirmar_contrasena ? 'Las contrasenas no coinciden' : null
          );
        } else {
          setPasswordMatchError(null);
        }
        return next;
      });
      return;
    }

    if (name in registerData) {
      if (name === 'rol_agregar') {
        const val = value;
        setRegisterData((prev) => ({
          ...prev,
          rol_agregar: val,
          id_espacio: val === 'admin_esp_dep' ? prev.id_espacio : '',
          motivo: val === 'admin_esp_dep' ? prev.motivo : ''
        }));
        if (val === 'admin_esp_dep' && espaciosLibres.length === 0) {
          fetchEspaciosLibres();
        }
        return;
      }

      setRegisterData((prev) => ({ ...prev, [name]: value }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  // Handle file change for profile image
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle edit profile submission
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setEditProfileLoading(true);
    setEditProfileError(null);

    // Validate passwords if changing
    if (passwordData.nueva_contrasena && passwordData.nueva_contrasena !== passwordData.confirmar_contrasena) {
      setEditProfileError('Las contraseñas no coinciden');
      setEditProfileLoading(false);
      return;
    }

    try {
      const data = new FormData();
      const campos = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo: formData.correo,
        telefono: formData.telefono || '',
        sexo: formData.sexo || '',
        latitud: formData.latitud || '',
        longitud: formData.longitud || '',
      };

      Object.entries(campos).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          data.append(key, value);
        }
      });

      // Add new password if provided
      if (passwordData.nueva_contrasena) {
        data.append('contrasena', passwordData.nueva_contrasena);
      }

      if (formData.datos_especificos && Object.keys(formData.datos_especificos).length > 0) {
        data.append('datos_especificos', JSON.stringify(formData.datos_especificos));
      }

      if (selectedFile) {
        data.append('imagen_perfil', selectedFile);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

      const response = await api.patch(`/usuario/${user.id_persona}`, data, config);
      if (response.data.exito) {
        const updatedUser = response.data.datos?.usuario || {
          ...user,
          ...campos,
          imagen_perfil: selectedFile ? response.data.datos?.usuario?.imagen_perfil || formData.imagen_perfil : formData.imagen_perfil,
          datos_rol: formData.datos_especificos,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPasswordData({ nueva_contrasena: '', confirmar_contrasena: '' });
        setShowEditProfileModal(false);
        setEditProfileLoading(false);
      } else {
        setEditProfileError(response.data.mensaje);
        setEditProfileLoading(false);
      }
    } catch (err) {
      console.error('Error in handleEditProfileSubmit:', err);
      setEditProfileError(err.response?.data?.mensaje || 'Error al actualizar el perfil');
      setEditProfileLoading(false);
    }
  };

  // Close modals
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setCorreo('');
    setContrasena('');
    setLoginError(null);
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterData({
      usuario: '',
      correo: '',
      contrasena: '',
      confirmarContrasena: '',
      rol_agregar: 'cliente',
      id_espacio: '',
      motivo: ''
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
    setImagePreview(user.imagen_perfil ? getImageUrl(user.imagen_perfil) : null);
    setPasswordData({ nueva_contrasena: '', confirmar_contrasena: '' });
    setPasswordMatchError(null);
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 w-full bg-[#0F2634] px-6 py-2 z-50 shadow-sm transition-transform duration-300"
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo and Title Section */}
          <div className="bg-[#0F2634] rounded-2xl shadow-sm p-2 border border-[#23475F]/20">
            <div className="flex items-center gap-4">
              {company && company.logo_imagen && (
                <Link to="/" className="group relative">
                  <img
                    src={getImageUrl(company.logo_imagen)}
                    alt={`${company.nombre_sistema} logo`}
                    className="h-16 w-16 object-contain rounded-full border-4 border-[#01CD6C] shadow-md"
                    onError={handleImageError}
                    aria-label="Ir a la página principal"
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-[-2rem] bg-[#0F2634] text-[#FFFFFF] text-sm font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Home
                  </span>
                </Link>
              )}
              {company && (
                <div>
                  <h2 className="text-3xl font-bold text-[#01cd6c] mb-2">{company.nombre_sistema}</h2>
                </div>
              )}
            </div>
          </div>

          {/* Navigation and User Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/espacios-deportivos"
              className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-semibold py-2 px-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
              aria-label="Ir a Espacios Deportivos"
            >
              Espacios Deportivos
            </Link>
            <Link
              to="/canchas"
              className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-semibold py-2 px-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
              aria-label="Ir a Canchas"
            >
              Canchas
            </Link>
            {!isLoggedIn && (
              <button
                onClick={() => setShowRegisterModal(true)}
                className="bg-[#01CD6C] hover:bg-[#00b359] text-[#FFFFFF] font-semibold py-2 px-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
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
                  aria-label="Abrir menú de usuario"
                >
                  {user.imagen_perfil ? (
                    <img
                      src={getImageUrl(user.imagen_perfil)}
                      alt="Foto de perfil"
                      onError={handleImageError}
                      className="h-10 w-10 md:h-12 md:w-12 object-cover rounded-full ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 md:h-12 md:w-12 bg-white/10 text-white rounded-full flex items-center justify-center ring-2 ring-white/10">
                      <span className="font-semibold">
                        {(user?.nombre?.charAt(0) ?? 'S').toUpperCase()}
                        {(user?.apellido?.charAt(0) ?? 'A').toUpperCase()}
                      </span>
                    </div>
                  )}

                  <span className="text-white font-medium md:max-w-[12rem] truncate pr-2">
                    {user?.nombre ?? 'Nombre'}
                  </span>
                </button>

                {showMenu && (
  <div className="absolute right-0 mt-2 w-56 bg-[#FFFFFF] rounded-lg shadow-lg z-50">
    <div className="px-4 py-3 text-[#23475F] font-medium border-b border-gray-200">
      {user?.nombre || 'Sin nombre'} {user?.apellido || 'Sin apellido'}
    </div>

    {/* paneles segun roles */}
    {getPanelEntries(user).map((p, idx) => (
      <button
        key={idx}
        onClick={() => { setShowMenu(false); navigate(p.path); }}
        className="block w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#01CD6C] hover:text-white transition-colors duration-200"
      >
        {p.label}
      </button>
    ))}

    <button
      onClick={openProfileModal}
      className="block w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#01CD6C] hover:text-white transition-colors duration-200"
    >
      Mi Perfil
    </button>
    <button
      onClick={openEditProfileModal}
      className="block w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#01CD6C] hover:text-white transition-colors duration-200"
    >
      Editar Mi Perfil
    </button>
    <button
      onClick={handleLogout}
      className="w-full text-left px-4 py-2 text-[#23475F] hover:bg-[#A31621] hover:text-white transition-colors duration-200"
    >
      Cerrar Sesion
    </button>
  </div>
)}

              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="bg-[#01CD6C] hover:bg-[#00b359] text-white font-semibold py-2 px-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-50"
                aria-label="Iniciar sesión"
              >
                Iniciar Sesión
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-8 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={handleCloseLoginModal}
              className="absolute top-2 right-2 text-[#23475F] hover:text-[#01CD6C] text-2xl"
              aria-label="Cerrar modal de inicio de sesión"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-center text-[#23475F] mb-6">Iniciar Sesión</h2>
            <div className="space-y-4">
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
                  aria-label="Correo electrónico"
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
                  aria-label="Contraseña"
                />
              </div>
              {loginError && (
                <p className="text-[#A31621] text-sm">{loginError}</p>
              )}
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className={`w-full py-2 px-4 bg-[#01CD6C] text-[#FFFFFF] rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F] ${loginLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                aria-label="Iniciar sesión"
              >
                {loginLoading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] p-8 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              onClick={handleCloseRegisterModal}
              className="absolute top-2 right-2 text-[#23475F] hover:text-[#01CD6C] text-2xl"
              aria-label="Cerrar modal de registro"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold text-center text-[#23475F] mb-6">Registrarse como Usuario</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="register-usuario" className="block text-sm font-medium text-[#23475F]">
                  Usuario
                </label>
                <input
                  id="register-usuario"
                  name="usuario"
                  type="text"
                  value={registerData.usuario}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                  placeholder="Ingrese su usuario"
                  aria-label="Nombre de usuario"
                />
              </div>
              <div>
                <label htmlFor="register-correo" className="block text-sm font-medium text-[#23475F]">
                  Correo
                </label>
                <input
                  id="register-correo"
                  name="correo"
                  type="email"
                  value={registerData.correo}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                  placeholder="Ingrese su correo"
                  aria-label="Correo electrónico"
                />
              </div>
              <div>
                <label htmlFor="register-contrasena" className="block text-sm font-medium text-[#23475F]">
                  Contraseña
                </label>
                <input
                  id="register-contrasena"
                  name="contrasena"
                  type="password"
                  value={registerData.contrasena}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                  placeholder="Ingrese su contraseña"
                  aria-label="Contraseña"
                />
              </div>
              <div>
                <label htmlFor="register-confirmar-contrasena" className="block text-sm font-medium text-[#23475F]">
                  Confirmar Contraseña
                </label>
                <input
                  id="register-confirmar-contrasena"
                  name="confirmarContrasena"
                  type="password"
                  value={registerData.confirmarContrasena}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                  placeholder="Confirme su contraseña"
                  aria-label="Confirmar contraseña"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showRoleSection;
                    setShowRoleSection(next);
                    if (next && registerData.rol_agregar === 'admin_esp_dep') {
                      fetchEspaciosLibres();
                    }
                  }}
                  className="text-[#01CD6C] hover:text-[#00b359] text-sm font-medium flex items-center gap-2"
                >
                  Quiero ser parte del sistema
                  <svg
                    className={`w-4 h-4 transform transition-transform ${showRoleSection ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showRoleSection && (
                  <div className="mt-2">
                    <label htmlFor="rol_agregar" className="block text-sm font-medium text-[#23475F]">
                      Solicitar Rol
                    </label>
                    <select
                      id="rol_agregar"
                      name="rol_agregar"
                      value={registerData.rol_agregar}
                      onChange={handleInputChange}
                      className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                    >
                      <option value="cliente">Cliente (por defecto)</option>
                      {rolesDisponibles
                        .filter(rol => rol.valor !== 'cliente')
                        .map(rol => (
                          <option key={rol.valor} value={rol.valor}>{rol.etiqueta}</option>
                        ))}
                    </select>

                    {registerData.rol_agregar === 'admin_esp_dep' && (
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-[#23475F]">Seleccionar espacio deportivo</label>
                        {espaciosLoading ? (
                          <div className="text-sm text-[#23475F]">Cargando espacios...</div>
                        ) : espaciosError ? (
                          <div className="text-sm text-[#A31621]">{espaciosError}</div>
                        ) : (
                          <select
                            name="id_espacio"
                            value={registerData.id_espacio}
                            onChange={handleInputChange}
                            className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                          >
                            <option value="">Seleccione un espacio</option>
                            {espaciosLibres.map(e => (
                              <option key={e.id_espacio} value={e.id_espacio}>
                                {e.nombre} {e.direccion ? `- ${e.direccion}` : ''}
                              </option>
                            ))}
                          </select>
                        )}

                        <label className="block text-sm font-medium text-[#23475F]">Motivo de solicitud (opcional)</label>
                        <textarea
                          name="motivo"
                          value={registerData.motivo}
                          onChange={handleInputChange}
                          rows={3}
                          className="mt-1 w-full px-3 py-2 border border-[#23475F] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#01CD6C]"
                          placeholder="Explique brevemente por que solicita administrar el espacio"
                        />
                      </div>
                    )}

                  </div>
                )}
              </div>
              {registerError && (
                <p className="text-[#A31621] text-sm">{registerError}</p>
              )}
              <button
                onClick={handleRegister}
                disabled={registerLoading}
                className={`w-full py-2 px-4 bg-[#01CD6C] text-[#FFFFFF] rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F] ${registerLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                aria-label="Registrarse"
              >
                {registerLoading ? 'Cargando...' : 'Registrarse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmissionModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md relative text-center">
            <h3 className="text-2xl font-bold text-[#23475F] mb-4">Solicitud enviada</h3>
            <p className="text-[#23475F] mb-6">{submissionMessage}</p>
            <button
              onClick={() => {
                setShowSubmissionModal(false);
                navigate('/espacios-deportivos');
              }}
              className="w-full py-2 px-4 bg-[#01CD6C] text-white rounded-md hover:bg-[#00b359] focus:outline-none focus:ring-2 focus:ring-[#23475F]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}


      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FFFFFF] rounded-2xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl">
            <button
              onClick={handleCloseProfileModal}
              className="absolute top-4 right-4 text-[#23475F] hover:text-[#01CD6C] text-2xl transition-colors duration-200"
              aria-label="Cerrar modal de perfil"
            >
              &times;
            </button>

            {/* Profile Header */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Perfil"
                    className="w-24 h-24 object-cover rounded-full border-4 border-[#01CD6C] shadow-lg mx-auto"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-[#01CD6C] to-[#23475F] rounded-full border-4 border-[#01CD6C] flex items-center justify-center text-white text-2xl font-bold mx-auto">
                    {formData.nombre?.charAt(0)}{formData.apellido?.charAt(0)}
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-bold text-[#23475F] mt-4">
                {formData.nombre} {formData.apellido}
              </h2>
              <p className="text-[#666] text-lg">{formData.usuario}</p>

              {/* Role Badges */}
              <div className="flex justify-center flex-wrap gap-2 mt-3">
                {(user?.roles ?? []).map((r, i) => (
                  <span
                    key={`${r.tabla || r.rol || 'rol'}-${i}`}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-[#01CD6C] to-[#23475F] text-white font-medium shadow-sm"
                  >
                    {formatRole(r.rol)}
                  </span>
                ))}
              </div>

            </div>

            {profileError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-[#A31621] text-sm">{profileError}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-[#23475F] mb-4 flex items-center">
                    <span className="w-2 h-6 bg-[#01CD6C] rounded-full mr-3"></span>
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-[#666] block">Nombre completo</span>
                      <p className="text-[#23475F] font-semibold text-lg">
                        {formData.nombre} {formData.apellido}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-[#666] block">Correo electrónico</span>
                      <p className="text-[#23475F] font-semibold text-lg break-all">
                        {formData.correo}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-[#666] block">Teléfono</span>
                      <p className="text-[#23475F] font-semibold text-lg">
                        {formData.telefono || 'No especificado'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-[#666] block">Sexo</span>
                      <p className="text-[#23475F] font-semibold text-lg">
                        {formData.sexo ? formData.sexo.charAt(0).toUpperCase() + formData.sexo.slice(1) : 'No especificado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-[#23475F] mb-4 flex items-center">
                    <span className="w-2 h-6 bg-[#01CD6C] rounded-full mr-3"></span>
                    Información de la Cuenta
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-[#666] block">Usuario</span>
                      <p className="text-[#23475F] font-semibold text-lg">{formData.usuario}</p>
                    </div>
                    {formData.fecha_creacion && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-[#666] block">Miembro desde</span>
                        <p className="text-[#23475F] font-semibold text-lg">
                          {new Date(formData.fecha_creacion).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role-Specific Data */}
                {formData.datos_especificos && Object.keys(formData.datos_especificos).length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#23475F] mb-4 flex items-center">
                      <span className="w-2 h-6 bg-[#01CD6C] rounded-full mr-3"></span>
                      Información Adicional
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(formData.datos_especificos).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <span className="text-sm font-medium text-[#666] block capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <p className="text-[#23475F] font-semibold text-lg">
                            {value || 'No especificado'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleCloseProfileModal}
                className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors duration-200 font-semibold shadow-sm"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  openEditProfileModal();
                }}
                className="bg-[#01CD6C] text-white px-6 py-3 rounded-xl hover:bg-[#00b359] transition-colors duration-200 font-semibold shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-[#0F2634] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FFFFFF] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button
              onClick={handleCloseEditProfileModal}
              className="absolute top-6 right-6 text-[#23475F] hover:text-[#01CD6C] text-2xl transition-colors duration-200 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center"
              aria-label="Cerrar modal de edición de perfil"
            >
              &times;
            </button>

            {/* Modal Header */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Vista previa de perfil"
                    className="w-20 h-20 object-cover rounded-full border-4 border-[#01CD6C] shadow-lg mx-auto"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-[#01CD6C] to-[#23475F] rounded-full border-4 border-[#01CD6C] flex items-center justify-center text-white text-xl font-bold mx-auto">
                    {formData.nombre?.charAt(0)}{formData.apellido?.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-[#23475F] mb-2">Editar Mi Perfil</h3>
              <p className="text-[#666]">Actualiza tu información personal</p>
            </div>

            {editProfileError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
                <p className="text-[#A31621] text-sm font-medium">{editProfileError}</p>
              </div>
            )}

            <form onSubmit={handleEditProfileSubmit} className="space-y-6">
              {/* Profile Picture Section */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h3><b>Subir una imagen</b></h3>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#01CD6C] file:text-white hover:file:bg-[#00b359]"
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Formatos: JPG, PNG, GIF. Máx: 5MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-[#23475F] mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#01CD6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Información Personal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Nombre *
                    </label>
                    <input
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white"
                      required
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Apellido *
                    </label>
                    <input
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white"
                      required
                      placeholder="Tu apellido"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Correo Electrónico *
                    </label>
                    <input
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white"
                      type="email"
                      required
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Usuario
                    </label>
                    <input
                      name="usuario"
                      value={formData.usuario}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                      readOnly
                      title="El usuario no se puede modificar"
                    />
                    <p className="text-xs text-gray-500">Usuario no modificable</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Teléfono
                    </label>
                    <input
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Sexo
                    </label>
                    <select
                      name="sexo"
                      value={formData.sexo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white appearance-none cursor-pointer"
                    >
                      <option value="">Selecciona tu sexo</option>
                      {sexosPermitidos.map((sexo) => (
                        <option key={sexo} value={sexo}>
                          {sexo.charAt(0).toUpperCase() + sexo.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-[#23475F] mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#01CD6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Cambiar Contraseña
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Nueva Contraseña
                    </label>
                    <input
                      name="nueva_contrasena"
                      type="password"
                      value={passwordData.nueva_contrasena}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white"
                      placeholder="Dejar en blanco para no cambiar"
                      aria-describedby={passwordMatchError ? 'password-error' : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#23475F]">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      name="confirmar_contrasena"
                      type="password"
                      value={passwordData.confirmar_contrasena}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#01CD6C] focus:ring-2 focus:ring-[#01CD6C] focus:ring-opacity-20 transition-all duration-200 bg-white"
                      placeholder="Confirmar nueva contraseña"
                      aria-describedby={passwordMatchError ? 'password-error' : undefined}
                    />
                    {passwordMatchError && (
                      <p id="password-error" className="text-[#A31621] text-sm mt-2">{passwordMatchError}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Solo completa estos campos si deseas cambiar tu contraseña
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseEditProfileModal}
                  className="px-6 py-2 border-2 border-gray-400 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-500 transition-all duration-200 font-semibold shadow-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white rounded-lg hover:from-[#00b359] hover:to-[#01CD6C] transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2 ${editProfileLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg transform hover:scale-105'
                    }`}
                  disabled={editProfileLoading}
                >
                  {editProfileLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Cambios
                    </>
                  )}
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
