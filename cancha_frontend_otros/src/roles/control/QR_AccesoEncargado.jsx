/* eslint-disable no-unused-vars */
/* eslint-disable no-empty */

import React, { useState, useEffect } from "react";
import QrScanner from "react-qr-scanner";
import api from "../../services/api";

const QR_AccesoEncargado = () => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const canUseCamera =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  // Función para manejar el escaneo
  const handleScan = async (value) => {
    if (!value || !scanning) return;

    setScanning(false);
    setResult(null);
    setErrorMsg("");
    setSuccessMsg("");
    setConfirmed(false);

    try {
      const resp = await api.post("/qr-acceso-control/scan", {
        codigo_qr: value,
      });

      if (resp.data.exito) {
        setResult(resp.data.datos);
        setErrorMsg("");
      } else {
        setErrorMsg(resp.data.mensaje || "Error no especificado");
      }
    } catch (e) {
      const msg = e.response?.data?.mensaje || "Error de conexion";
      setErrorMsg(msg);
    }
  };

  // Función para permitir el acceso (después de la validación)
  const permitirAcceso = async () => {
    if (!result) return;

    try {
      const resp = await api.post("/qr-acceso-control/permitir", {
        id_qr: result.id_qr,
      });

      if (resp.data.exito) {
        setSuccessMsg(resp.data.mensaje || "Acceso permitido");
        setResult(resp.data.datos || result);
        setErrorMsg("");
        setConfirmed(true);
      } else {
        setErrorMsg(resp.data.mensaje || "Error al permitir acceso");
      }
    } catch (e) {
      const msg = e.response?.data?.mensaje || "Error de conexion";
      setErrorMsg(msg);
    }
  };

  // Temporización para limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (result || errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setResult(null);
        setErrorMsg("");
        setSuccessMsg("");
        setConfirmed(false);
        setScanning(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [result, errorMsg, successMsg, confirmed]);

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-xl mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4 text-center">
        Control de acceso - Escanear QR
      </h2>

      <div className="w-full flex justify-center mb-4">
        <div className="w-64 h-64 border rounded overflow-hidden">
          {scanning && canUseCamera ? (
            <QrScanner
              delay={500}
              onScan={(data) => {
                if (data) handleScan(data.text || data);
              }}
              onError={(err) => console.log("qr-error", err)}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-700">
              Camara no disponible   
            </div>
          )}
        </div>
      </div>

      {/* Mostrar mensaje de éxito al permitir el acceso */}
      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-4">
          <p className="font-bold">{successMsg}</p>
        </div>
      )}

      {/* Mostrar resultado del QR escaneado */}
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded mb-4">
          <p className="font-bold">
            {confirmed
              ? "Acceso permitido"
              : "Acceso permitido (preparado para confirmar)"}
          </p>
          <p>ID QR: {result.id_qr}</p>
          <p>ID Reserva: {result.id_reserva}</p>
          <p>
            Cupos usados: {result.accesos_usados} / {result.cupo_total}
          </p>

          {!confirmed && (
            <button
              onClick={permitirAcceso}
              className="bg-blue-600 text-white px-4 py-2 rounded mt-4 hover:bg-blue-700"
            >
              Permitir Acceso
            </button>
          )}
        </div>
      )}

      {/* Mostrar error si el acceso está denegado */}
      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
          <p className="font-bold">Acceso denegado</p>
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Botón para escanear de nuevo */}
      {!scanning && (
        <button
          onClick={() => {
            setResult(null);
            setErrorMsg("");
            setSuccessMsg("");
            setScanning(true);
          }}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Escanear de nuevo
        </button>
      )}
    </div>
  );
};

export default QR_AccesoEncargado;
