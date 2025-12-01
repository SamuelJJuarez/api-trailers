const { pool } = require('../config/database');

// Obtener todos los empleados
const obtenerEmpleados = async (req, res) => {
  try {
    const [empleados] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) as nombre_completo
       FROM empleados 
       ORDER BY nombre, apellido_paterno`
    );

    res.status(200).json({
      success: true,
      message: 'Empleados obtenidos exitosamente',
      data: empleados,
      total: empleados.length
    });

  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener empleados',
      error: error.message 
    });
  }
};

// Obtener RFC de empleado por nombre
const obtenerEmpleadoPorNombre = async (req, res) => {
  try {
    const { nombre } = req.params;

    const [empleados] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) as nombre_completo
       FROM empleados 
       WHERE nombre LIKE ? 
       OR apellido_paterno LIKE ? 
       OR apellido_materno LIKE ?
       OR CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) LIKE ?`,
      [
        `%${nombre}%`,
        `%${nombre}%`,
        `%${nombre}%`,
        `%${nombre}%`
      ]
    );

    if (empleados.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }

    // Si hay múltiples resultados, devolver todos
    if (empleados.length > 1) {
      return res.status(200).json({
        success: true,
        message: `Se encontraron ${empleados.length} empleados`,
        data: empleados,
        total: empleados.length
      });
    }

    // Si hay solo uno, devolver ese
    res.status(200).json({
      success: true,
      message: 'Empleado encontrado',
      data: empleados[0]
    });

  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener empleado',
      error: error.message 
    });
  }
};

module.exports = {
  obtenerEmpleados,
  obtenerEmpleadoPorNombre
};