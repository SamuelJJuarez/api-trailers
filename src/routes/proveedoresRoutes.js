const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedoresController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de proveedores requieren autenticación
router.use(authenticateToken);

// CRUD de proveedores
router.post('/', proveedoresController.crearProveedor);
router.get('/', proveedoresController.obtenerProveedores);
router.get('/buscar', proveedoresController.buscarProveedores);
router.get('/:id', proveedoresController.obtenerProveedorPorId);
router.put('/:id', proveedoresController.actualizarProveedor);
router.delete('/:id', proveedoresController.eliminarProveedor);

module.exports = router;