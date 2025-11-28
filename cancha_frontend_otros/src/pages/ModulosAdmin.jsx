/* eslint-disable no-undef */
import React from "react";
import { Link } from "react-router-dom";

const ModulosAdmin = ({ routes }) => {
  return (
    <div className="p-4 grid grid-cols-2 gap-4">
      {routes.map((item) => (
        <Link
          key={item.id}
          to={`/administrador/${item.path}`}
          className="bg-white shadow-md border rounded-xl p-4 flex flex-col items-center hover:bg-[#01CD6C]/10 transition-all"
        >
          <span className="text-3xl">{item.icon}</span>
          <span className="text-sm font-semibold text-[#23475F] mt-2">
            {item.label}
          </span>
        </Link>
      ))}
    </div>
  );
};

export default ModulosAdmin;
