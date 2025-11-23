/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */
import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { FaChevronDown, FaChevronRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import DashboardAdminEsp from "./DashboardAdminEsp";

const norm = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

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
    bag.add(
      norm(
        typeof r === "string" ? r : r?.rol || r?.role || r?.nombre || r?.name
      )
    )
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

  const toggleExpand = async (idEspacio) => {
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Panel de Gestión</h2>
      <DashboardAdminEsp idAdminEspDep={idAdminEspDep} />
      <h2 className="text-xl font-semibold mb-4">Mis Espacios Deportivos</h2>

      {espacios.length === 0 ? (
        <p>No tienes espacios registrados.</p>
      ) : (
        espacios.map((esp) => (
          <div key={esp.id_espacio} className="border rounded-lg mb-4">
            <div
              className="flex justify-between items-center bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleExpand(esp.id_espacio)}
            >
              <div>
                <h3 className="text-lg font-medium">{esp.nombre}</h3>
                <p className="text-sm text-gray-600">
                  {esp.direccion || "Sin dirección registrada"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {esp.total_canchas || 0} canchas
                </span>
                {expanded[esp.id_espacio] ? (
                  <FaChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <FaChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </div>
            </div>

            {expanded[esp.id_espacio] && (
              <div className="px-4 pb-4 overflow-x-auto">
                {esp.canchas && esp.canchas.length > 0 ? (
                  <table className="min-w-full table-auto border-collapse mt-2">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-2 text-left">Cancha</th>
                        <th className="px-4 py-2 text-left">Capacidad</th>
                        <th className="px-4 py-2 text-left">Monto/h</th>
                        <th className="px-4 py-2 text-left">Estado</th>
                        <th className="px-4 py-2 text-left">Disciplinas</th>
                        <th className="px-4 py-2 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {esp.canchas.map((c) => (
                        <tr key={c.id_cancha} className="border-t">
                          <td className="px-4 py-2 font-medium">{c.nombre}</td>
                          <td className="px-4 py-2">{c.capacidad}</td>
                          <td className="px-4 py-2">Bs. {c.monto_por_hora}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                c.estado === "disponible"
                                  ? "bg-green-100 text-green-700"
                                  : c.estado === "mantenimiento"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {c.estado}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {(c.disciplinas || []).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-2 flex gap-2">
                            <button
                              onClick={() => handleVerReservas(c.id_cancha)}
                              className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600"
                            >
                              Reservas
                            </button>
                            <button
                              onClick={() => handleVerResenas(c.id_cancha)}
                              className="bg-yellow-500 text-white text-sm px-3 py-1 rounded hover:bg-yellow-600"
                            >
                              Reseñas
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 mt-2">
                    No hay canchas registradas en este espacio.
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default EspaciosView;
