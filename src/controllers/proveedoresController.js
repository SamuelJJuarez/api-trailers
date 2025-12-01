const { pool } = require('../config/database');

// Obtener todos los proveedores
const obtenerProveedores = async (req, res) => {
  try {
    const [proveedores] = await pool.query(
      'SELECT * FROM proveedores ORDER BY nombre_empresa'
    );

    res.status(200).json({
      success: true,
      message: 'Proveedores obtenidos exitosamente',
      data: proveedores,
      total: proveedores.length
    });

  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener proveedores',
      error: error.message 
    });
  }
};

// Obtener ID de proveedor por nombre de empresa
const obtenerProveedorPorNombre = async (req, res) => {
  try {
    const { nombre } = req.params;

    const [proveedor] = await pool.query(
      'SELECT * FROM proveedores WHERE nombre_empresa LIKE ?',
      [`%${nombre}%`]
    );

    if (proveedor.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proveedor no encontrado' 
      });
    }

    // Si hay múltiples resultados, devolver todos
    if (proveedor.length > 1) {
      return res.status(200).json({
        success: true,
        message: `Se encontraron ${proveedor.length} proveedores`,
        data: proveedor,
        total: proveedor.length
      });
    }

    // Si hay solo uno, devolver ese
    res.status(200).json({
      success: true,
      message: 'Proveedor encontrado',
      data: proveedor[0]
    });

  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener proveedor',
      error: error.message 
    });
  }
};

module.exports = {
  obtenerProveedores,
  obtenerProveedorPorNombre
};