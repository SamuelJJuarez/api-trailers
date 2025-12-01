const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de empleados requieren autenticación
router.use(authenticateToken);

// Rutas de consulta de empleados
router.get('/', empleadosController.obtenerEmpleados);
router.get('/nombre/:nombre', empleadosController.obtenerEmpleadoPorNombre);

module.exports = router;