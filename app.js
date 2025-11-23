const express = require('express');
const path = require('path');
const cors = require('cors');

const usuarioRoutes = require('./cancha_backend/api/admin/usuario');
const administradorRoutes = require('./cancha_backend/api/admin/administrador');
const admin_esp_depRoutes = require('./cancha_backend/api/admin/admin_esp_dep');
const clienteRoutes = require('./cancha_backend/api/admin/cliente');
const deportistaRoutes = require('./cancha_backend/api/admin/deportista');
const encargadoRoutes = require('./cancha_backend/api/admin/encargado');
const espacio_deportivoRoutes = require('./cancha_backend/api/admin/espacio_deportivo');
const canchaRoutes = require('./cancha_backend/api/admin/cancha');
const disciplinaRoutes = require('./cancha_backend/api/admin/disciplina');
const reservaRoutes = require('./cancha_backend/api/admin/reserva');
const pagoRoutes = require('./cancha_backend/api/admin/pago');
const qr_reservaRoutes = require('./cancha_backend/api/admin/qr_reserva');
const controlRoutes = require('./cancha_backend/api/admin/control');
const reporte_incidenciaRoutes = require('./cancha_backend/api/admin/reporte_incidencia');
const resenaRoutes = require('./cancha_backend/api/admin/resena');
const empresaRoutes = require('./cancha_backend/api/admin/empresa');
const reserva_horarioRoutes = require('./cancha_backend/api/admin/reserva_horario');
const se_practicaRoutes = require('./cancha_backend/api/admin/se_practica');
const participa_enRoutes = require('./cancha_backend/api/admin/participa_en');
const solicitud_admin_esp_depRoutes = require('./cancha_backend/api/admin/solicitud_admin');
const solicitud_encargadoRoutes = require('./cancha_backend/api/admin/solicitud_encargado');
const solicitud_controlRoutes = require('./cancha_backend/api/admin/solicitud_control');

// rutas casuales
const registroRoutes = require('./cancha_backend/api/casual/registro');
const espacio_deportivo_casualRoutes = require('./cancha_backend/api/casual/espacio-deportivo-casual');
const cancha_espacio_casualRoutes = require('./cancha_backend/api/casual/cancha-espacio-casual');
const cancha_casualRoutes = require('./cancha_backend/api/casual/cancha-casual');
const resena_casualRoutes = require('./cancha_backend/api/casual/resena-publica');

// rutas según roles ya definidos
const espacio_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/espacio_admin');
const cancha_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/cancha_admin');
const reserva_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/reserva_admin');
const reserva_horario_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/reserva_horario_admin');
const resena_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/resena_admin');
const dashboard_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/dashboard_admin');
const pago_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/pago_admin');
const reporte_incidencia_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/reporte_incidencia_admin');
const encargado_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/encargado_admin');
const control_adminRoutes = require('./cancha_backend/api/roles/admin_esp_dep/control_admin');

const espacio_encargadoRoutes = require('./cancha_backend/api/roles/encargado/espacio_encargado');
const cancha_encargadoRoutes = require('./cancha_backend/api/roles/encargado/cancha_encargado');
const reserva_encargadoRoutes = require('./cancha_backend/api/roles/encargado/reserva_encargado');
const reporte_incidencia_encargadoRoutes = require('./cancha_backend/api/roles/encargado/reporte_incidencia_encargado');

const qr_acceso_controlRoutes = require('./cancha_backend/api/roles/control/qr_acceso_control');

const unirse_reservaRoutes = require('./cancha_backend/api/roles/deportista/unirse_reserva');
const reserva_deportistaRoutes = require('./cancha_backend/api/roles/deportista/reserva_deportista');

const resena_clienteRoutes = require('./cancha_backend/api/roles/cliente/resena_cliente');
const reserva_clienteRoutes = require('./cancha_backend/api/roles/cliente/reserva_cliente');

const x_imagenRoutes = require('./cancha_backend/api/x_imagen');

const app = express();


// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para manejar multipart/form-data
app.use('/Uploads', express.static(path.join(__dirname, 'Uploads')));





// Servir frontend
app.use(express.static(path.join(__dirname, 'cancha_frontend_otros')));
// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'cancha_frontend_otros', 'index.html'));
});





// Rutas
try {
  app.use('/usuario', usuarioRoutes);
  app.use('/administrador', administradorRoutes);
  app.use('/admin_esp_dep', admin_esp_depRoutes);
  app.use('/cliente', clienteRoutes);
  app.use('/deportista', deportistaRoutes);
  app.use('/encargado', encargadoRoutes);
  app.use('/espacio_deportivo', espacio_deportivoRoutes);
  app.use('/cancha', canchaRoutes);
  app.use('/disciplina', disciplinaRoutes);
  app.use('/reserva', reservaRoutes);
  app.use('/pago', pagoRoutes);
  app.use('/qr-reserva', qr_reservaRoutes);
  app.use('/control', controlRoutes);
  app.use('/reporte_incidencia', reporte_incidenciaRoutes);
  app.use('/resena', resenaRoutes);
  app.use('/empresa', empresaRoutes);
  app.use('/reserva-horario', reserva_horarioRoutes);
  app.use('/se_practica', se_practicaRoutes);
  app.use('/participa_en', participa_enRoutes);
  app.use('/solicitud-encargado', solicitud_encargadoRoutes);
  app.use('/solicitud-control', solicitud_controlRoutes);

  // rutas casuales
  app.use('/espacio-deportivo-casual', espacio_deportivo_casualRoutes);
  app.use('/cancha-espacio-casual', cancha_espacio_casualRoutes);
  app.use('/cancha-casual', cancha_casualRoutes);
  app.use('/resena-casual', resena_casualRoutes);
  app.use('/registro', registroRoutes);

  // ubicacion según roles ya definidos
  app.use('/espacio-admin', espacio_adminRoutes);
  app.use('/cancha-admin', cancha_adminRoutes);
  app.use('/reserva-admin', reserva_adminRoutes);
  app.use('/reserva-horario-admin', reserva_horario_adminRoutes);
  app.use('/resena-admin', resena_adminRoutes);
  app.use('/dashboard-admin', dashboard_adminRoutes);
  app.use('/pago-admin', pago_adminRoutes);
  app.use('/resena-cliente', resena_clienteRoutes);
  app.use('/reserva-cliente', reserva_clienteRoutes);
  app.use('/solicitud-admin-esp-dep', solicitud_admin_esp_depRoutes);
  app.use('/reporte-incidencia-admin', reporte_incidencia_adminRoutes);
  app.use('/encargado-admin', encargado_adminRoutes);
  app.use('/control-admin', control_adminRoutes);

  app.use('/espacio-encargado', espacio_encargadoRoutes);
  app.use('/cancha-encargado', cancha_encargadoRoutes);
  app.use('/reserva-encargado', reserva_encargadoRoutes);
  app.use('/reporte-incidencia-encargado', reporte_incidencia_encargadoRoutes);

  app.use('/qr-acceso-control', qr_acceso_controlRoutes);

  app.use('/reserva-encargado', reserva_encargadoRoutes);

  app.use('/unirse-reserva', unirse_reservaRoutes);
  app.use('/reserva-deportista', reserva_deportistaRoutes);

  app.use('/x_imagen', x_imagenRoutes)

} catch (err) {
  console.error('Error al cargar las rutas:', err);
  process.exit(1); // Termina el proceso si hay un error en las rutas
}

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});

// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en el puerto ${PORT}`);
// });

module.exports = app;