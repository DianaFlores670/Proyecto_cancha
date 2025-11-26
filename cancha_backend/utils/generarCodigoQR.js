const crypto = require("crypto");

function generarCodigoQR(id_reserva) {
  const payload = {
    rid: id_reserva,                 // id de reserva
    ts: Date.now(),                  // timestamp
    nonce: crypto.randomBytes(8).toString("hex"), // aleatorio seguro
    v: 1                              // version
  };

  return Buffer
    .from(JSON.stringify(payload))
    .toString("base64");
}

module.exports = generarCodigoQR;
