/* eslint-disable no-undef */
import React, { useEffect, useState } from "react";
import api from "../services/api";
import { getImageUrl } from "../utils";
import EditarPerfilModal from "./EditarPerfilModal";
import { FaUser, FaEnvelope, FaClock } from "react-icons/fa";

// ========================================================
// FORMATO DE FECHAS Y DATOS
// ========================================================
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;

  return date.toLocaleString("es-BO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const smartFormat = (value) => {
  if (value === null || value === undefined || value === "") return "No disponible";

  if (typeof value === "boolean") return value ? "Activo" : "Inactivo";

  if (typeof value === "number") return value;

  if (typeof value === "string" && !/\d{4}-\d{2}-\d{2}/.test(value)) return value;

  const d = new Date(value);
  if (!isNaN(d.getTime())) return formatDate(value);

  return value;
};

// ========================================================
// CARD GENERICA
// ========================================================
const Card = ({ title, value }) => (
  <div className="bg-white shadow-sm border rounded-xl p-4">
    <p className="text-xs text-[#23475F]/60 mb-1">{title}</p>
    <p className="text-[#23475F] font-semibold break-words">{value}</p>
  </div>
);

// ========================================================
// COMPONENTE PRINCIPAL
// ========================================================
const PerfilAdmin = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);

  // Estado para acordeones
  const [openAccordion, setOpenAccordion] = useState(null);

  const toggleAccordion = (index) =>
    setOpenAccordion((prev) => (prev === index ? null : index));

  // ======================================================
  // CARGA DE DATOS
  // ======================================================
  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const response = await api.get(`/usuario/dato-individual/${user.id_persona}`);

        if (response.data.exito) {
          const userData = response.data.datos.usuario;
          setPerfil(userData);
          localStorage.setItem("user", JSON.stringify(userData));
        } else {
          setError(response.data.mensaje);
        }
      } catch (err) {
        setError(err.response?.data?.mensaje || "Error al cargar el perfil del usuario");
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, [user]);

  // Para refrescar luego de editar
  const reloadPerfil = async () => {
    const res = await api.get(`/usuario/dato-individual/${user.id_persona}`);
    if (res.data.exito) {
      setPerfil(res.data.datos.usuario);
      localStorage.setItem("user", JSON.stringify(res.data.datos.usuario));
    }
  };

  // ======================================================
  // RENDER
  // ======================================================
  if (loading) {
    return (
      <div className="p-6 text-center animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-40 w-40 bg-gray-200 rounded-full mx-auto mt-4"></div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600 font-semibold">{error}</div>;
  }

  //const rolPrincipal = perfil.roles?.[0]?.rol || "SIN ROL";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-28 md:pb-8">

      {/* ==================================== */}
      {/* HEADER */}
      {/* ==================================== */}
      <div className="flex flex-col md:flex-row md:justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-[#23475F]">Mi Perfil</h2>

        <button
          onClick={() => setShowEditModal(true)}
          className="hidden md:flex items-center gap-2 bg-[#01CD6C] hover:bg-[#00b85f] text-white px-4 py-2 rounded-xl shadow active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3.536 3.536-6 6H9v-3.536z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V5" />
          </svg>
          Editar perfil
        </button>
      </div>

      {/* ==================================== */}
      {/* ENCABEZADO USUARIO */}
      {/* ==================================== */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
        <div className="flex flex-col items-center">
          {perfil.imagen_perfil ? (
            <img
              src={getImageUrl(perfil.imagen_perfil)}
              alt="Foto de perfil"
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-[#01CD6C] shadow-md"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-[#01CD6C] to-[#23475F] text-white flex items-center justify-center text-4xl md:text-5xl font-bold shadow-md">
              {(perfil.nombre?.charAt(0) || "U").toUpperCase()}
            </div>
          )}

          <button
            onClick={() => setShowEditModal(true)}
            className="mt-4 md:hidden flex items-center gap-2 bg-[#01CD6C] hover:bg-[#00b85f] text-white px-4 py-2 rounded-xl shadow"
          >
            Editar
          </button>
        </div>

        <div className="flex-1 text-center md:text-left space-y-1.5">

          <h2 className="text-2xl md:text-3xl font-bold text-[#23475F] leading-tight">
            {perfil.nombre} {perfil.apellido}
          </h2>

          <p className="flex items-center justify-center md:justify-start gap-2 text-sm md:text-base text-[#23475F]/80">
            <FaUser className="text-[#01CD6C] text-lg" />
            <span className="font-medium">Usuario:</span>
            <b className="text-[#23475F]">{perfil.usuario}</b>
          </p>

          <p className="flex items-center justify-center md:justify-start gap-2 text-sm md:text-base text-[#23475F]/80">
            <FaEnvelope className="text-[#01CD6C] text-lg" />
            <span className="font-medium">Correo:</span>
            <b className="text-[#23475F]">{perfil.correo}</b>
          </p>

          {perfil.ultimo_login && (
            <p className="flex items-center justify-center md:justify-start gap-2 text-sm md:text-base text-[#23475F]/60 mt-2">
              <FaClock className="text-[#01CD6C] text-lg" />
              <span>Último inicio:</span>
              <b className="text-[#23475F]">{formatDate(perfil.ultimo_login)}</b>
            </p>
          )}
        </div>
      </div>

      {/* SEPARADOR */}
      <div className="w-full h-px bg-[#23475F]/20 my-8"></div>

      {/* ==================================== */}
      {/* DATOS PERSONALES */}
      {/* ==================================== */}
      <h3 className="text-xl font-bold text-[#23475F] mb-4">Datos personales</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Nombre completo" value={`${perfil.nombre} ${perfil.apellido}`} />
        <Card title="Correo" value={perfil.correo} />
        <Card title="Teléfono" value={perfil.telefono || "No registrado"} />
        <Card title="Sexo" value={perfil.sexo || "No definido"} />

        {(perfil.latitud || perfil.longitud) && (
          <Card title="Ubicación" value={`Lat: ${perfil.latitud} | Lon: ${perfil.longitud}`} />
        )}

        {perfil.fecha_creacion && (
          <Card title="Cuenta creada" value={formatDate(perfil.fecha_creacion)} />
        )}
      </div>

      {/* SEPARADOR */}
      <div className="w-full h-px bg-[#23475F]/20 my-8"></div>

      {/* ==================================== */}
      {/* ROLES (ACCORDION UI) */}
      {/* ==================================== */}
      <h3 className="text-xl font-bold text-[#23475F] mb-4">Roles del usuario</h3>

      <div className="space-y-4">
        {perfil.roles?.map((r, i) => (
          <div
            key={i}
            className="border rounded-2xl bg-white shadow-sm overflow-hidden"
          >
            {/* HEADER ROL */}
            <button
              onClick={() => toggleAccordion(i)}
              className="w-full flex justify-between items-center px-4 py-3 bg-[#01CD6C]/10 hover:bg-[#01CD6C]/20 transition-all"
            >
              <span className="text-[#01CD6C] font-semibold uppercase tracking-wide">
                {r.rol}
              </span>

              <svg
                className={`w-5 h-5 transition-transform ${openAccordion === i ? "rotate-180" : ""
                  }`}
                fill="none" stroke="#23475F" strokeWidth="2" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* CONTENIDO */}
            {openAccordion === i && (
              <div className="px-4 py-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                {Object.entries(r.datos || {}).map(([campo, valor]) => (
                  <Card
                    key={campo}
                    title={campo.replace(/_/g, " ").toUpperCase()}
                    value={smartFormat(valor)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL DE EDICIÓN */}
      {showEditModal && (
        <EditarPerfilModal
          userData={perfil}
          onClose={() => setShowEditModal(false)}
          onUpdated={reloadPerfil}
        />
      )}
    </div>
  );
};

export default PerfilAdmin;