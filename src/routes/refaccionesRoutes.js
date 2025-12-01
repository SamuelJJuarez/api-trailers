const express = require('express');
const router = express.Router();
const refaccionesController = require('../controllers/refaccionesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de refacciones requieren autenticación
router.use(authenticateToken);

// CRUD de refacciones
router.post('/', refaccionesController.crearRefaccion);
router.get('/', refaccionesController.obtenerRefacciones);
router.get('/stock-bajo', refaccionesController.obtenerRefaccionesStockBajo);
router.get('/buscar', refaccionesController.buscarRefacciones);
router.get('/proveedor/:id_proveedor', refaccionesController.obtenerRefaccionesPorProveedor);
router.get('/:id', refaccionesController.obtenerRefaccionPorId);
router.put('/:id', refaccionesController.actualizarRefaccion);
router.delete('/:id', refaccionesController.eliminarRefaccion);

module.exports = router;