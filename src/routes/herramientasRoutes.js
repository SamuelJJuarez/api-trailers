const express = require('express');
const router = express.Router();
const herramientasController = require('../controllers/herramientasController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de herramientas requieren autenticación
router.use(authenticateToken);

// CRUD de herramientas
router.post('/', herramientasController.crearHerramienta);
router.get('/', herramientasController.obtenerHerramientas);
router.get('/disponibilidad', herramientasController.obtenerDisponibilidad);
router.get('/buscar', herramientasController.buscarHerramientas);
router.get('/nombre/:nombre', herramientasController.obtenerHerramientaPorNombre);
router.get('/:id', herramientasController.obtenerHerramientaPorId);
router.put('/:id', herramientasController.actualizarHerramienta);
router.delete('/:id', herramientasController.eliminarHerramienta);

module.exports = router;