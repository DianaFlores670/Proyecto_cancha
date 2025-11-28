/* eslint-disable no-undef */
import React from "react";
import { Link } from "react-router-dom";

const InicioModulos = ({ user, routes }) => {
  return (
    <div className="p-4 space-y-6 mb-10">

      {/* TARJETA DE BIENVENIDA */}
      <div className="bg-white border shadow-md rounded-xl p-5 flex items-start gap-4">
        <div className="bg-[#01CD6C]/20 text-[#01CD6C] p-3 rounded-full text-3xl">
          👋
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#23475F] leading-tight">
            Bienvenido, {user?.nombre || "Administrador"}
          </h2>
          <p className="text-[#23475F]/80 mt-1">
            Accede rápidamente a los módulos de tu panel administrativo.
          </p>
        </div>
      </div>

      {/* GRID DE MÓDULOS */}
      <div>
        <h3 className="text-lg font-semibold text-[#23475F] mb-3">
          Módulos disponibles
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

          {routes.map((item) => (
            <Link
              key={item.id}
              to={`/administrador/${item.path}`}
              className="bg-white shadow-md border rounded-xl p-5 flex flex-col items-center 
                         hover:bg-[#01CD6C]/10 hover:shadow-lg active:scale-95 transition-all"
            >
              <span className="text-4xl mb-2">{item.icon}</span>

              <span className="text-sm font-semibold text-[#23475F] text-center leading-tight">
                {item.label}
              </span>
            </Link>
          ))}

        </div>
      </div>

    </div>
  );
};

export default InicioModulos;
