/* eslint-disable no-undef */
import React, { useState } from "react";
import api from "../services/api";
import { getImageUrl } from "../utils";
import { FaTimes, FaCamera, FaUser, FaKey, FaSave } from "react-icons/fa";

const EditarPerfilModal = ({
  userData,
  onClose,
  onUpdated,
}) => {
  const [formData, setFormData] = useState({
    nombre: userData.nombre || "",
    apellido: userData.apellido || "",
    correo: userData.correo || "",
    usuario: userData.usuario || "",
    telefono: userData.telefono || "",
    sexo: userData.sexo || "",
  });

  const [passwords, setPasswords] = useState({
    nueva_contrasena: "",
    confirmar_contrasena: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(
    userData.imagen_perfil ? getImageUrl(userData.imagen_perfil) : null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [passwordMatchError, setPasswordMatchError] = useState("");

  const sexosPermitidos = ["Masculino", "Femenino"];

  // ============================
  // HANDLERS
  // ============================
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "nueva_contrasena" || name === "confirmar_contrasena") {
      setPasswords({ ...passwords, [name]: value });

      if (
        name === "confirmar_contrasena" &&
        value !== passwords.nueva_contrasena
      ) {
        setPasswordMatchError("Las contrasenas no coinciden");
      } else {
        setPasswordMatchError("");
      }
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleImageError = () => {
    setPreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

const handleEditProfileSubmit = async (e) => {
  e.preventDefault();

  if (passwordMatchError) return;

  setSaving(true);
  setError(null);

  try {
    const fd = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fd.append(key, value);
      }
    });

    if (selectedFile) {
      fd.append("imagen_perfil", selectedFile);
    }

    if (passwords.nueva_contrasena) {
      fd.append("nueva_contrasena", passwords.nueva_contrasena);
    }

    const res = await api.patch(
      `/usuario/${userData.id_persona}`,
      fd
    );

    if (res.data?.exito || res.data?.success) {
      onUpdated(res.data);
      onClose();
    } else {
      setError(res.data?.mensaje || res.data?.message || "Error al actualizar perfil");
    }
  } catch (err) {
    console.log("error editar perfil", err.response || err);

    const serverMsg =
      err.response?.data?.mensaje ||
      err.response?.data?.message ||
      err.response?.data?.error;

    setError(serverMsg || "Error al actualizar perfil");
  } finally {
    setSaving(false);
  }
};

  const handleClose = () => {
    onClose();
  };

  // ============================
  // COMPONENTE
  // ============================
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[80] p-3 sm:p-4 animate-fadeIn">

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-white/40 animate-scaleIn relative">

        {/* BOTÓN CERRAR */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#23475F] hover:text-[#01CD6C] text-xl bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition"
        >
          <FaTimes />
        </button>

        {/* ENCABEZADO */}
        <div className="text-center mb-8">
          {preview ? (
            <img
              src={preview}
              alt="Perfil"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#01CD6C] shadow-xl object-cover mx-auto"
              onError={handleImageError}
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-[#01CD6C] to-[#23475F] rounded-full border-4 border-[#01CD6C] flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-xl">
              {formData.nombre.charAt(0)}
              {formData.apellido.charAt(0)}
            </div>
          )}

          <h3 className="text-2xl sm:text-3xl font-bold text-[#23475F] mt-4">
            Editar mi perfil
          </h3>

          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Actualiza tu información personal
          </p>
        </div>
        {/* FORMULARIO */}
        <form onSubmit={handleEditProfileSubmit} className="space-y-8">

          {/* FOTO DE PERFIL */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <h4 className="text-lg font-bold text-[#23475F] mb-4 flex items-center gap-2">
              <FaCamera className="text-[#01CD6C]" />
              Foto de perfil
            </h4>

            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-full px-4 py-2 bg-white focus:ring-2 focus:ring-[#01CD6C] text-sm file:bg-[#01CD6C] file:text-white file:px-4 file:py-1 file:rounded-full file:border-0 hover:file:bg-[#00b359] cursor-pointer"
            />

            <p className="text-xs text-gray-500 mt-2">
              Formatos permitidos: JPG, PNG, GIF – Máx 5MB
            </p>
          </div>

          {/* INFORMACION PERSONAL */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <h4 className="text-lg font-bold text-[#23475F] mb-4 flex items-center gap-2">
              <FaUser className="text-[#01CD6C]" />
              Información personal
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <Input label="Nombre *" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              <Input label="Apellido *" name="apellido" value={formData.apellido} onChange={handleInputChange} required />
              <Input label="Correo *" name="correo" type="email" value={formData.correo} onChange={handleInputChange} required />
              <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleInputChange} />

              {/* SELECT SEXO */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-[#23475F]">
                  Sexo
                </label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleInputChange}
                  className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] cursor-pointer text-sm"
                >
                  <option value="">Selecciona</option>
                  {sexosPermitidos.map((sexo) => (
                    <option key={sexo} value={sexo}>
                      {sexo}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* CAMBIAR CONTRASEÑA */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <h4 className="text-lg font-bold text-[#23475F] mb-4 flex items-center gap-2">
              <FaKey className="text-[#01CD6C]" />
              Cambiar contraseña
            </h4>

            <div className="space-y-4">
              <Input
                label="Nueva contraseña"
                name="nueva_contrasena"
                type="password"
                value={passwords.nueva_contrasena}
                onChange={handleInputChange}
                placeholder="Dejar vacío si no deseas cambiarla"
              />

              <Input
                label="Confirmar contraseña"
                name="confirmar_contrasena"
                type="password"
                value={passwords.confirmar_contrasena}
                onChange={handleInputChange}
                placeholder="Confirmar contraseña"
              />

              {passwordMatchError && (
                <p className="text-[#A31621] text-xs mt-1">
                  {passwordMatchError}
                </p>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-full px-4 py-3 text-center">
              <p className="text-[#A31621] text-xs sm:text-sm font-medium">
                {error}
              </p>
            </div>
          )}
          {/* BOTONES */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 border border-gray-400 text-gray-700 rounded-full font-semibold hover:bg-gray-100 transition text-sm"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-[#01CD6C] to-[#00b359] text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition text-sm disabled:opacity-50"
            >
              <FaSave className="inline-block mr-2" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================
// COMPONENTE INPUT
// =========================
const Input = ({ label, name, value, onChange, type = "text", required, placeholder }) => (
  <div>
    <label className="text-xs sm:text-sm font-medium text-[#23475F]">
      {label}
    </label>
    <input
      type={type}
      name={name}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#01CD6C] text-sm"
    />
  </div>
);

export default EditarPerfilModal;