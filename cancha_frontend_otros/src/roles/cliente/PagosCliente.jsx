import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const PagosCliente = ({ idReserva, saldoPendienteInicial }) => {
  const [pagos, setPagos] = useState([]);
  const [saldoPendiente, setSaldoPendiente] = useState(
    Number(saldoPendienteInicial || 0)
  );

  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("transferencia");

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("default");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const backendLimit = 1000;
  const pageSize = 10;
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSaldoPendiente(Number(saldoPendienteInicial || 0));
  }, [saldoPendienteInicial]);

  const fetchPagos = async (search = "", filtro = "default") => {
    if (!idReserva) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let resp;

      if (search) {
        resp = await api.get("/pago/buscar", {
          params: {
            q: search,
            limit: backendLimit,
            offset: 0
          }
        });
      } else if (filtro !== "default") {
        resp = await api.get("/pago/filtro", {
          params: {
            tipo: filtro,
            limit: backendLimit,
            offset: 0
          }
        });
      } else {
        resp = await api.get("/pago/datos-especificos", {
          params: {
            limit: backendLimit,
            offset: 0
          }
        });
      }

      if (!resp.data?.exito) {
        const msg = resp.data?.mensaje || "No se pudieron cargar los pagos";
        setError(msg);
        setPagos([]);
        setTotal(0);
      } else {
        const datos = resp.data?.datos || {};
        const todos = datos.pagos || [];
        const filtrados = todos.filter(
          (p) => p.id_reserva === Number(idReserva)
        );
        setPagos(filtrados);
        setTotal(filtrados.length);
        setCurrentPage(1);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error de conexion al cargar pagos";
      setError(msg);
      setPagos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (idReserva) {
      fetchPagos(searchTerm, filter);
    }
  }, [idReserva, filter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPagos(searchTerm, filter);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleMontoChange = (e) => {
    const value = e.target.value;
    if (value === "") {
      setMonto("");
      return;
    }
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) {
      setMonto("");
      return;
    }
    if (saldoPendiente > 0 && n > saldoPendiente) {
      setMonto(String(saldoPendiente));
    } else {
      setMonto(value);
    }
  };

  const handleCrearPago = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!idReserva) {
      setError("No se encontro la reserva");
      return;
    }

    const n = Number(monto);
    if (!n || Number.isNaN(n) || n <= 0) {
      setError("El monto debe ser un numero positivo");
      return;
    }

    if (saldoPendiente > 0 && n > saldoPendiente) {
      setError("El monto no puede ser mayor al saldo pendiente");
      return;
    }

    try {
      setSaving(true);
      const body = {
        id_reserva: idReserva,
        monto: n,
        metodo_pago: metodo
      };
      const resp = await api.post("/pago", body);
      if (!resp.data?.exito || !resp.data?.datos?.pago) {
        const msg = resp.data?.mensaje || "No se pudo registrar el pago";
        setError(msg);
      } else {
        const nuevoSaldo =
          saldoPendiente > 0
            ? Math.max(0, saldoPendiente - n)
            : saldoPendiente;
        setSaldoPendiente(nuevoSaldo);
        setMonto("");
        setSuccess("Pago registrado");
        fetchPagos(searchTerm, filter);
      }
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        err.message ||
        "Error al registrar el pago";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pagosPagina = pagos.slice(start, end);

  return (
    <div className="border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 md:p-6 bg-[#FFFFFF] shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F2634]">
            Pagos de la reserva
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Registra pagos y revisa el historial asociado a esta reserva.
          </p>
        </div>

        <div className="bg-[#F1F5F9] rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-right">
          <p className="text-xs sm:text-sm text-[#64748B] leading-tight">
            Saldo pendiente
          </p>
          <p className="text-lg sm:text-xl font-semibold text-[#0F2634]">
            Bs. {saldoPendiente}
          </p>
        </div>
      </div>

      <div className="w-full rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-4 sm:px-4 sm:py-5">
        <form
          onSubmit={handleCrearPago}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-end"
        >
          <div className="w-full">
            <label className="block text-xs sm:text-sm text-[#64748B] mb-1">
              Monto a pagar
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              max={saldoPendiente > 0 ? saldoPendiente : undefined}
              value={monto}
              onChange={handleMontoChange}
              className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#0F2634] focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] outline-none bg-white"
              placeholder={
                saldoPendiente > 0
                  ? `Hasta Bs. ${saldoPendiente}`
                  : "Sin saldo pendiente"
              }
              disabled={saldoPendiente <= 0}
            />
          </div>

          <div className="w-full">
            <label className="block text-xs sm:text-sm text-[#64748B] mb-1">
              Metodo de pago
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value)}
              className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#0F2634] focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] outline-none bg-white"
            >
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="efectivo">Efectivo</option>
              <option value="QR">QR</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || saldoPendiente <= 0}
            className={
              "w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white mt-1 md:mt-0 transition-all " +
              (saving || saldoPendiente <= 0
                ? "bg-[#94A3B8] cursor-not-allowed"
                : "bg-[#01CD6C] hover:bg-[#00b359] shadow-md hover:shadow-lg")
            }
          >
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
        </form>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <form
          onSubmit={handleSearchSubmit}
          className="w-full flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, cancha o metodo de pago"
            className="flex-1 border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#23475F] focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] outline-none"
          />
          <div className="flex gap-2 sm:w-auto">
            <select
              value={filter}
              onChange={handleFilterChange}
              className="w-full sm:w-40 border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#23475F] focus:ring-2 focus:ring-[#01CD6C] focus:border-[#01CD6C] outline-none bg-white"
            >
              <option value="default">Sin filtro</option>
              <option value="fecha">Ordenar por fecha</option>
              <option value="monto">Ordenar por monto</option>
              <option value="metodo">Ordenar por metodo</option>
            </select>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#01CD6C] text-white text-sm font-semibold hover:bg-[#00b359] transition-all"
            >
              Buscar
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="mb-2 text-xs sm:text-sm text-[#23475F]">
          Cargando pagos...
        </div>
      )}

      {error && (
        <div className="mb-3 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}

      {pagos.length === 0 && !loading && !error && (
        <div className="text-center text-[#64748B] py-6 text-sm">
          No se registraron pagos para esta reserva
        </div>
      )}

      {pagos.length > 0 && (
        <div className="mt-2 space-y-3">
          <div className="sm:hidden flex flex-col gap-3">
            {pagosPagina.map((p) => (
              <div
                key={p.id_pago}
                className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#64748B]">
                      Fecha de pago
                    </span>
                    <span className="text-sm font-semibold text-[#0F2634]">
                      {p.fecha_pago
                        ? String(p.fecha_pago).substring(0, 10)
                        : "-"}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#0F2634]">
                    Bs. {p.monto}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span>Metodo</span>
                  <span className="px-2 py-1 rounded-full bg-[#F1F5F9] text-[#0F2634] text-[11px] font-medium">
                    {p.metodo_pago}
                  </span>
                </div>

                <div className="pt-1">
                  <Link
                    to={`/comprobante-pago/${p.id_pago}`}
                    className="w-full inline-flex items-center justify-center px-3 py-2 rounded-full bg-[#0F2634] text-white text-xs font-semibold hover:bg-[#01CD6C] transition-all"
                  >
                    Ver comprobante
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F1F5F9] text-[#0F2634]">
                    <th className="px-3 sm:px-4 py-2 text-left">Fecha</th>
                    <th className="px-3 sm:px-4 py-2 text-left">Monto</th>
                    <th className="px-3 sm:px-4 py-2 text-left">Metodo</th>
                    <th className="px-3 sm:px-4 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagosPagina.map((p) => (
                    <tr
                      key={p.id_pago}
                      className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    >
                      <td className="px-3 sm:px-4 py-2">
                        {p.fecha_pago
                          ? String(p.fecha_pago).substring(0, 10)
                          : "-"}
                      </td>
                      <td className="px-3 sm:px-4 py-2">Bs. {p.monto}</td>
                      <td className="px-3 sm:px-4 py-2">{p.metodo_pago}</td>
                      <td className="px-3 sm:px-4 py-2">
                        <Link
                          to={`/comprobante-pago/${p.id_pago}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-[#0F2634] text-white text-[11px] sm:text-xs font-semibold hover:bg-[#01CD6C] transition-all"
                        >
                          Comprobante
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap justify-center mt-4 gap-2">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={
              "px-3 py-1 rounded-md text-xs sm:text-sm " +
              (currentPage === 1
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-[#23475F] text-white hover:bg-[#01CD6C]")
            }
          >
            Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={
                "px-3 py-1 rounded-md text-xs sm:text-sm " +
                (p === currentPage
                  ? "bg-[#01CD6C] text-white"
                  : "bg-[#E2E8F0] text-[#0F2634] hover:bg-[#CBD5E1]")
              }
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={
              "px-3 py-1 rounded-md text-xs sm:text-sm " +
              (currentPage === totalPages
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-[#23475F] text-white hover:bg-[#01CD6C]")
            }
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default PagosCliente;