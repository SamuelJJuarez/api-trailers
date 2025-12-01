const express = require('express');
const router = express.Router();
const trailersController = require('../controllers/trailersController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de trailers requieren autenticación
router.use(authenticateToken);

// CRUD de trailers
router.post('/', trailersController.crearTrailer);
router.get('/', trailersController.obtenerTrailers);
router.get('/buscar', trailersController.buscarTrailers);
router.get('/cliente/:id_cliente', trailersController.obtenerTrailersPorCliente);
router.get('/:num_serie', trailersController.obtenerTrailerPorNumSerie);
router.put('/:num_serie', trailersController.actualizarTrailer);
router.delete('/:num_serie', trailersController.eliminarTrailer);

module.exports = router;