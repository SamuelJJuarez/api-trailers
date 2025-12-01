const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedoresController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de proveedores requieren autenticación
router.use(authenticateToken);

// Rutas de consulta de proveedores
router.get('/', proveedoresController.obtenerProveedores);
router.get('/nombre/:nombre', proveedoresController.obtenerProveedorPorNombre);

module.exports = router;