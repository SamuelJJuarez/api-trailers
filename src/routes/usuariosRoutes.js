const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Proteger todas las rutas

router.get('/', usuariosController.obtenerUsuarios);
router.get('/buscar', usuariosController.buscarUsuarios);
router.post('/', usuariosController.crearUsuario);
router.put('/:id', usuariosController.actualizarUsuario);
router.delete('/:id', usuariosController.eliminarUsuario);

module.exports = router;