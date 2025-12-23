const express = require('express');
const router = express.Router();
const serviciosController = require('../controllers/serviciosController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de servicios requieren autenticación
router.use(authenticateToken);

// CRUD de servicios
router.post('/', serviciosController.crearServicio);
router.get('/', serviciosController.obtenerServicios);
router.get('/buscar', serviciosController.buscarServicios);
router.get('/:id', serviciosController.obtenerServicioPorId);
router.put('/:id', serviciosController.actualizarServicio);
router.delete('/:id', serviciosController.eliminarServicio);

// Funciones adicionales
router.put('/:id_servicio/herramientas/:id_herramienta/devolver', serviciosController.devolverHerramienta);

module.exports = router;