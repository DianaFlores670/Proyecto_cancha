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
  const [cameraConstraints, setCameraConstraints] = useState(null);

  const canUseCamera =
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  useEffect(() => {
    if (!canUseCamera) return;

    const ua = navigator.userAgent || "";
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      ua
    );

    if (isMobile) {
      setCameraConstraints({
        video: {
          facingMode: { ideal: "environment" }
        }
      });
    } else {
      setCameraConstraints({
        video: true
      });
    }
  }, [canUseCamera]);

  const handleScan = async (value) => {
    if (!value || !scanning) return;

    setScanning(false);
    setResult(null);
    setErrorMsg("");
    setSuccessMsg("");
    setConfirmed(false);

    try {
      const resp = await api.post("/qr-acceso-control/scan", {
        codigo_qr: value
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

  const permitirAcceso = async () => {
    if (!result) return;

    try {
      const resp = await api.post("/qr-acceso-control/permitir", {
        id_qr: result.id_qr
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
    <div className="max-w-xl mx-auto mt-8 px-4">
      <div className="bg-white/95 rounded-2xl shadow-2xl border border-slate-100 p-6 md:p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Modulo de control
          </p>
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            Control de acceso QR
          </h2>
          <p className="text-xs text-slate-500 text-center max-w-sm">
            Escanea el codigo QR del usuario para validar si puede ingresar al espacio deportivo.
          </p>
        </div>

        <div className="w-full flex justify-center mb-6">
          <div className="relative w-full max-w-xs md:max-w-sm aspect-square rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-3 rounded-xl border border-dashed border-slate-500/60 pointer-events-none" />
            {scanning && canUseCamera && cameraConstraints ? (
              <QrScanner
                delay={500}
                constraints={cameraConstraints}
                onScan={(data) => {
                  if (data) handleScan(data.text || data);
                }}
                onError={(err) => console.log("qr-error", err)}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 text-sm gap-1">
                <span className="text-lg">📷</span>
                <span>Camara no disponible</span>
                <span className="text-[11px] text-slate-400 mt-1 px-4 text-center">
                  Revisa permisos del navegador o selecciona otro dispositivo.
                </span>
              </div>
            )}
          </div>
        </div>

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3 mb-3">
            <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm">
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {successMsg}
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2 mb-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold">
                  QR
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {confirmed ? "Acceso permitido" : "Acceso listo para confirmar"}
                </p>
              </div>
              <span
                className={
                  "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium " +
                  (confirmed
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700")
                }
              >
                {confirmed ? "Confirmado" : "Pendiente"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
              <p className="col-span-2 flex items-center justify-between">
                <span className="text-slate-500">ID reserva</span>
                <span className="font-medium">#{result.id_reserva}</span>
              </p>

              {/* nuevo bloque para cliente */}
              <p className="col-span-2 flex items-center justify-between">
                <span className="text-slate-500">Cliente</span>
                <span className="font-medium">
                  {(result.cliente_nombre || "") + " " + (result.cliente_apellido || "")}
                </span>
              </p>

              <p className="col-span-2 flex items-center justify-between mt-1">
                <span className="text-slate-500">Cupos usados</span>
                <span className="font-semibold text-slate-900">
                  {result.accesos_usados} / {result.cupo_total}
                </span>
              </p>
            </div>

            {!confirmed && (
              <button
                onClick={permitirAcceso}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Permitir acceso
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-3 mb-3">
            <div className="mt-0.5 h-7 w-7 flex items-center justify-center rounded-full bg-rose-100 text-rose-700 text-sm">
              !
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-800">
                Acceso denegado
              </p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="mt-4">
          {!scanning && (
            <button
              onClick={() => {
                setResult(null);
                setErrorMsg("");
                setSuccessMsg("");
                setConfirmed(false);
                setScanning(true);
              }}
              className="w-full inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-950 transition-colors"
            >
              Escanear de nuevo
            </button>
          )}
          {scanning && (
            <p className="text-[11px] text-slate-500 text-center mt-3">
              Apunta la camara al codigo QR para iniciar la lectura.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QR_AccesoEncargado;
