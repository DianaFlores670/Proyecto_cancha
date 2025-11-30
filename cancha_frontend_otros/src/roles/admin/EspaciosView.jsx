/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import DashboardAdminEsp from "./DashboardAdminEsp";

const norm = (v) =>
  String(v || "").trim().toUpperCase().replace(/\s+/g, "_");

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const readTokenPayload = () => {
  try {
    const t = localStorage.getItem("token");
    if (!t || t.split(".").length !== 3) return {};
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b.length % 4)) % 4);
    return JSON.parse(atob(b + pad));
  } catch {
    return {};
  }
};

const pickRole = (u, p) => {
  const bag = new Set();
  const arr = Array.isArray(u?.roles) ? u.roles : u?.role ? [u.role] : [];
  arr.forEach((r) =>
    bag.add(norm(typeof r === "string" ? r : r?.rol || r?.role || r?.nombre || r?.name))
  );
  const parr = Array.isArray(p?.roles) ? p.roles : p?.rol ? [p.rol] : [];
  parr.forEach((r) => bag.add(norm(r)));
  const list = Array.from(bag);
  if (list.includes("ADMIN_ESP_DEP")) return "ADMIN_ESP_DEP";
  return list[0] || "DEFAULT";
};

const resolveAdminId = (u, p) => {
  if (Number.isInteger(u?.id_admin_esp_dep)) return u.id_admin_esp_dep;
  if (Number.isInteger(u?.id_persona)) return u.id_persona;
  if (Number.isInteger(u?.id)) return u.id;
  if (Number.isInteger(u?.persona?.id_persona)) return u.persona.id_persona;
  if (Number.isInteger(p?.id_admin_esp_dep)) return p.id_admin_esp_dep;
  if (Number.isInteger(p?.id_persona)) return p.id_persona;
  if (Number.isInteger(p?.id)) return p.id;
  return null;
};

const EspaciosView = () => {
  const [idAdminEspDep, setIdAdminEspDep] = useState(null);
  const [espacios, setEspacios] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = readUser();
    const p = readTokenPayload();
    const id = resolveAdminId(u, p);
    setIdAdminEspDep(id);
  }, []);

  const fetchEspacios = async () => {
    if (!idAdminEspDep) return;
    setLoading(true);
    try {
      const r = await api.get("/espacio-admin/mis-espacios", {
        params: { id_admin_esp_dep: idAdminEspDep },
      });
      if (r.data?.exito) setEspacios(r.data.datos?.espacios || []);
      else setError(r.data?.mensaje || "Error al cargar espacios");
    } catch (e) {
      setError(e.response?.data?.mensaje || "Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEspacios();
  }, [idAdminEspDep]);

  const toggleExpand = (idEspacio) => {
    setExpanded((prev) => ({
      ...prev,
      [idEspacio]: !prev[idEspacio],
    }));
  };

  const handleVerReservas = (idCancha) => {
    navigate(`/administrador/reserva?cancha=${idCancha}`);
  };

  const handleVerResenas = (idCancha) => {
    navigate(`/administrador/resena?cancha=${idCancha}`);
  };

  if (loading) return <p>Cargando espacios...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white rounded-lg shadow px-4 py-6 md:p-6">
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">Panel de Gestión</h2>
      <DashboardAdminEsp idAdminEspDep={idAdminEspDep} />
      <h2 className="text-2xl font-bold mb-6 text-[#23475F] border-l-4 border-[#01CD6C] pl-3">
        Mis Espacios Deportivos
      </h2>

      {espacios.length === 0 ? (
        <p>No tienes espacios registrados.</p>
      ) : (
        espacios.map((esp) => (
          <div key={esp.id_espacio} className="border rounded-xl mb-4 shadow-sm">

            {/* HEADER */}
            <div
              className="flex justify-between items-center bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 rounded-t-xl"
              onClick={() => toggleExpand(esp.id_espacio)}
            >
              <div className="max-w-[70%]">
                <h3 className="text-lg font-medium truncate">{esp.nombre}</h3>
                <p classname="text-sm text-gray-600 truncate">
                  {esp.direccion || "Sin dirección registrada"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {esp.total_canchas || 0} canchas
                </span>
                {expanded[esp.id_espacio] ? (
                  <FaChevronDown className="w-4 h-4" />
                ) : (
                  <FaChevronRight className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* TABLE / CARDS */}
            {expanded[esp.id_espacio] && (
              <div className="p-4">
                {/* MOBILE: CARDS */}
                <div className="md:hidden space-y-4">
                  {esp.canchas?.map((c) => (
                    <div
                      key={c.id_cancha}
                      className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-all"
                    >
                      {/* TÍTULO */}
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-lg text-gray-800">{c.nombre}</h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${c.estado === "disponible"
                            ? "bg-green-100 text-green-700"
                            : c.estado === "mantenimiento"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                            }`}
                        >
                          {c.estado}
                        </span>
                      </div>

                      {/* INFO */}
                      <div className="space-y-1 text-sm text-gray-700">
                        <p>
                          <span className="font-medium text-gray-900">Capacidad: </span>
                          {c.capacidad}
                        </p>

                        <p>
                          <span className="font-medium text-gray-900">Monto/hora: </span>
                          Bs. {c.monto_por_hora}
                        </p>

                        <p>
                          <span className="font-medium text-gray-900">Disciplinas: </span>
                          {(c.disciplinas || []).join(", ") || "—"}
                        </p>
                      </div>

                      {/* BOTONES */}
                      <div className="flex mt-4 gap-2">
                        <button
                          onClick={() => handleVerReservas(c.id_cancha)}
                          className="flex-1 bg-[#23475F] text-white text-sm px-3 py-2 rounded-full hover:bg-[#1d3a4e] transition"
                        >
                          Reservas
                        </button>

                        <button
                          onClick={() => handleVerResenas(c.id_cancha)}
                          className="flex-1 bg-[#01CD6C] text-white text-sm px-3 py-2 rounded-full hover:bg-[#00b25b] transition"
                        >
                          Reseñas
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP TABLE */}
                <div className="hidden md:block mt-6 overflow-x-auto">
                  <table className="min-w-full border-collapse rounded-lg overflow-hidden shadow-sm">
                    <thead className="bg-[#23475F] text-white text-md">
                      <tr>
                        <th className="px-4 py-2 text-left">Cancha</th>
                        <th className="px-4 py-2 text-left">Capacidad</th>
                        <th className="px-4 py-2 text-left">Monto/h</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                        <th className="px-4 py-2 text-left">Disciplinas</th>
                        <th className="px-4 py-2 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {esp.canchas?.map((c) => (
                        <tr key={c.id_cancha} className="border-t hover:bg-gray-50 transition">
                          <td className="px-4 py-3">{c.nombre}</td>
                          <td className="px-4 py-3">{c.capacidad}</td>
                          <td className="px-4 py-3">Bs. {c.monto_por_hora}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs border ${c.estado === "disponible"
                                ? "bg-green-100 text-green-800"
                                : c.estado === "mantenimiento"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                                }`}
                            >
                              {c.estado}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {(c.disciplinas || []).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-3 flex gap-3">
                            <button
                              onClick={() => handleVerReservas(c.id_cancha)}
                              className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full hover:bg-blue-600"
                            >
                              Reservas
                            </button>
                            <button
                              onClick={() => handleVerResenas(c.id_cancha)}
                              className="bg-yellow-500 text-white text-sm px-3 py-1 rounded-full hover:bg-yellow-600"
                            >
                              Reseñas
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default EspaciosView;