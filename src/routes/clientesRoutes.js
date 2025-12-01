const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Todas las rutas de clientes requieren autenticación
router.use(authenticateToken);

// CRUD de clientes
router.post('/', clientesController.crearCliente);
router.get('/', clientesController.obtenerClientes);
router.get('/buscar', clientesController.buscarClientes);
router.get('/:id', clientesController.obtenerClientePorId);
router.put('/:id', clientesController.actualizarCliente);
router.delete('/:id', clientesController.eliminarCliente);

module.exports = router;