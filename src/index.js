const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const trailersRoutes = require('./routes/trailersRoutes');
const herramientasRoutes = require('./routes/herramientasRoutes');
const refaccionesRoutes = require('./routes/refaccionesRoutes');
const proveedoresRoutes = require('./routes/proveedoresRoutes');
const empleadosRoutes = require('./routes/empleadosRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'API del Taller de Trailers funcionando correctamente',
    version: '1.0.0'
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/trailers', trailersRoutes);
app.use('/api/herramientas', herramientasRoutes);
app.use('/api/refacciones', refaccionesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/empleados', empleadosRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Ruta no encontrada' 
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Error interno del servidor',
    error: err.message 
  });
});

// Iniciar servidor
const startServer = async () => {
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.error('❌ No se pudo conectar a la base de datos. Verifica tu configuración.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📚 Documentación de rutas:`);
    console.log(`\n   AUTH:`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
    console.log(`\n   CLIENTES:`);
    console.log(`   - POST   http://localhost:${PORT}/api/clientes`);
    console.log(`   - GET    http://localhost:${PORT}/api/clientes`);
    console.log(`   - GET    http://localhost:${PORT}/api/clientes/buscar?busqueda=texto`);
    console.log(`\n   TRAILERS:`);
    console.log(`   - POST   http://localhost:${PORT}/api/trailers`);
    console.log(`   - GET    http://localhost:${PORT}/api/trailers`);
    console.log(`   - GET    http://localhost:${PORT}/api/trailers/buscar?busqueda=texto`);
    console.log(`\n   HERRAMIENTAS:`);
    console.log(`   - POST   http://localhost:${PORT}/api/herramientas`);
    console.log(`   - GET    http://localhost:${PORT}/api/herramientas`);
    console.log(`   - GET    http://localhost:${PORT}/api/herramientas/disponibilidad`);
    console.log(`\n   REFACCIONES:`);
    console.log(`   - POST   http://localhost:${PORT}/api/refacciones`);
    console.log(`   - GET    http://localhost:${PORT}/api/refacciones`);
    console.log(`   - GET    http://localhost:${PORT}/api/refacciones/stock-bajo`);
    console.log(`\n   PROVEEDORES:`);
    console.log(`   - GET    http://localhost:${PORT}/api/proveedores`);
    console.log(`   - GET    http://localhost:${PORT}/api/proveedores/nombre/:nombre`);
    console.log(`\n   EMPLEADOS:`);
    console.log(`   - GET    http://localhost:${PORT}/api/empleados`);
    console.log(`   - GET    http://localhost:${PORT}/api/empleados/nombre/:nombre\n`);
  });
};

startServer();