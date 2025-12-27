const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios
const obtenerUsuarios = async (req, res) => {
  try {
    // No devolvemos la contraseña por seguridad
    const [usuarios] = await pool.query('SELECT id_usuario, nombre FROM usuarios ORDER BY nombre');
    res.json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
};

// Buscar usuarios
const buscarUsuarios = async (req, res) => {
  try {
    const { busqueda } = req.query;
    if (!busqueda) return obtenerUsuarios(req, res);

    const [usuarios] = await pool.query(
      'SELECT id_usuario, nombre FROM usuarios WHERE nombre LIKE ? ORDER BY nombre',
      [`%${busqueda}%`]
    );
    res.json({ success: true, data: usuarios });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al buscar usuarios', error: error.message });
  }
};

// Crear usuario (Admin)
const crearUsuario = async (req, res) => {
  try {
    const { nombre, contraseña } = req.body;

    if (!nombre || !contraseña) {
      return res.status(400).json({ success: false, message: 'Nombre y contraseña obligatorios' });
    }

    // Verificar duplicados
    const [existe] = await pool.query('SELECT id_usuario FROM usuarios WHERE nombre = ?', [nombre]);
    if (existe.length > 0) {
      return res.status(409).json({ success: false, message: 'El usuario ya existe' });
    }

    // Encriptar
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    await pool.query('INSERT INTO usuarios (nombre, contraseña) VALUES (?, ?)', [nombre, hashedPassword]);
    res.status(201).json({ success: true, message: 'Usuario creado exitosamente' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear usuario', error: error.message });
  }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contraseña } = req.body; // Contraseña es opcional aquí

    // Si manda contraseña, la encriptamos. Si no, solo actualizamos el nombre.
    if (contraseña) {
      const hashedPassword = await bcrypt.hash(contraseña, 10);
      await pool.query('UPDATE usuarios SET nombre = ?, contraseña = ? WHERE id_usuario = ?', [nombre, hashedPassword, id]);
    } else {
      await pool.query('UPDATE usuarios SET nombre = ? WHERE id_usuario = ?', [nombre, id]);
    }

    res.json({ success: true, message: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    // Evitar que el administrador se borre a sí mismo (opcional pero recomendado)
    // Podrías validar aquí si el ID corresponde al 'Administrador'

    await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario', error: error.message });
  }
};

module.exports = { obtenerUsuarios, buscarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario };