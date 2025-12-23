const express = require('express');
const router = express.Router();
const empleadosController = require('../controllers/empleadosController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de empleados requieren autenticación
router.use(authenticateToken);

// CRUD de empleados
router.post('/', empleadosController.crearEmpleado);
router.get('/', empleadosController.obtenerEmpleados);
router.get('/buscar', empleadosController.buscarEmpleados);
router.get('/:rfc', empleadosController.obtenerEmpleadoPorRFC);
router.put('/:rfc', empleadosController.actualizarEmpleado);
router.delete('/:rfc', empleadosController.eliminarEmpleado);

module.exports = router;