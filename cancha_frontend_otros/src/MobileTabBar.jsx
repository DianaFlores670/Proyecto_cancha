/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React from "react";
import { Link, useLocation } from "react-router-dom";

const MobileTabBar = ({ user, onLogout, panelBasePath = "administrador" }) => {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname.startsWith(`/${panelBasePath}/${path}`);

  const esAdmin = user?.roles?.some(
    (r) => String(r.rol).toUpperCase() === "ADMINISTRADOR"
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 md:hidden flex justify-around py-2">
      <Link
        to={`/${panelBasePath}/perfil`}
        className={`flex flex-col items-center ${
          isActive("perfil") ? "text-[#01CD6C]" : "text-[#23475F]"
        } hover:text-[#01CD6C]`}
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 12a4 4 0 100-8 4 4 0 000 8zm6 8a6 6 0 00-12 0"
          />
        </svg>
        <span className="text-xs font-semibold">Perfil</span>
      </Link>

      <Link
        to={`/${panelBasePath}/inicio`}
        className={`flex flex-col items-center ${
          isActive("inicio") ? "text-[#01CD6C]" : "text-[#23475F]"
        } hover:text-[#01CD6C]`}
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2 7-7 7 7 2 2M5 10v10h4V14h6v6h4V10"
          />
        </svg>
        <span className="text-xs font-semibold">Inicio</span>
      </Link>

      {!esAdmin && (
        <Link
          to="/"
          className="flex flex-col items-center text-[#23475F] hover:text-[#01CD6C] transition-all"
        >
          <svg
            className="w-6 h-6 mb-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 4h18l-1 7H4L3 4z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 11v9h14v-9"
            />
          </svg>
          <span className="text-xs font-semibold">Vista Cliente</span>
        </Link>
      )}

      <button
        onClick={onLogout}
        className="flex flex-col items-center text-[#A31621] hover:text-[#D7263D]"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4-4-4M3 12h18"
          />
        </svg>
        <span className="text-xs font-semibold">Salir</span>
      </button>
    </nav>
  );
};

export default MobileTabBar;