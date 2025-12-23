const { pool } = require('../config/database');

// Crear empleado
const crearEmpleado = async (req, res) => {
  try {
    const { rfc_empleado, nombre, apellido_paterno, apellido_materno, puesto } = req.body;

    // Validar campos obligatorios
    if (!rfc_empleado) {
      return res.status(400).json({ 
        success: false, 
        message: 'El RFC del empleado es obligatorio' 
      });
    }

    if (!nombre || !apellido_paterno || !puesto) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre, apellido paterno y puesto son obligatorios' 
      });
    }

    // Verificar que el RFC no esté duplicado
    const [rfcExiste] = await pool.query(
      'SELECT rfc_empleado FROM empleados WHERE rfc_empleado = ?',
      [rfc_empleado]
    );

    if (rfcExiste.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'El RFC ya está registrado' 
      });
    }

    // Insertar empleado
    await pool.query(
      `INSERT INTO empleados (rfc_empleado, nombre, apellido_paterno, apellido_materno, puesto) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        rfc_empleado,
        nombre,
        apellido_paterno,
        apellido_materno || null,
        puesto
      ]
    );

    // Obtener el empleado creado
    const [empleadoCreado] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) as nombre_completo
       FROM empleados 
       WHERE rfc_empleado = ?`,
      [rfc_empleado]
    );

    res.status(201).json({
      success: true,
      message: 'Empleado registrado exitosamente',
      data: empleadoCreado[0]
    });

  } catch (error) {
    console.error('Error al crear empleado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar empleado',
      error: error.message 
    });
  }
};

// Obtener todos los empleados
const obtenerEmpleados = async (req, res) => {
  try {
    const [empleados] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) as nombre_completo
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

// Obtener empleado por RFC
const obtenerEmpleadoPorRFC = async (req, res) => {
  try {
    const { rfc } = req.params;

    const [empleado] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) as nombre_completo
       FROM empleados 
       WHERE rfc_empleado = ?`,
      [rfc]
    );

    if (empleado.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Empleado encontrado',
      data: empleado[0]
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

// Buscar empleados por nombre o RFC
const buscarEmpleados = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({ 
        success: false, 
        message: 'El parámetro de búsqueda es obligatorio' 
      });
    }

    const [empleados] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) as nombre_completo
       FROM empleados 
       WHERE rfc_empleado LIKE ?
       OR nombre LIKE ? 
       OR apellido_paterno LIKE ? 
       OR apellido_materno LIKE ?
       OR CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) LIKE ?
       ORDER BY nombre, apellido_paterno`,
      [
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`
      ]
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${empleados.length} empleado(s)`,
      data: empleados,
      total: empleados.length
    });

  } catch (error) {
    console.error('Error al buscar empleados:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al buscar empleados',
      error: error.message 
    });
  }
};

// Actualizar empleado
const actualizarEmpleado = async (req, res) => {
  try {
    const { rfc } = req.params;
    const { nombre, apellido_paterno, apellido_materno, puesto } = req.body;

    // Verificar que el empleado existe
    const [empleadoExiste] = await pool.query(
      'SELECT * FROM empleados WHERE rfc_empleado = ?',
      [rfc]
    );

    if (empleadoExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }

    // Actualizar empleado
    await pool.query(
      `UPDATE empleados 
       SET nombre = ?, 
           apellido_paterno = ?, 
           apellido_materno = ?, 
           puesto = ?
       WHERE rfc_empleado = ?`,
      [
        nombre || empleadoExiste[0].nombre,
        apellido_paterno || empleadoExiste[0].apellido_paterno,
        apellido_materno !== undefined ? apellido_materno : empleadoExiste[0].apellido_materno,
        puesto || empleadoExiste[0].puesto,
        rfc
      ]
    );

    // Obtener empleado actualizado
    const [empleadoActualizado] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) as nombre_completo
       FROM empleados 
       WHERE rfc_empleado = ?`,
      [rfc]
    );

    res.status(200).json({
      success: true,
      message: 'Empleado actualizado exitosamente',
      data: empleadoActualizado[0]
    });

  } catch (error) {
    console.error('Error al actualizar empleado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar empleado',
      error: error.message 
    });
  }
};

// Eliminar empleado
const eliminarEmpleado = async (req, res) => {
  try {
    const { rfc } = req.params;

    // Verificar que el empleado existe
    const [empleadoExiste] = await pool.query(
      `SELECT *, 
              CONCAT(nombre, ' ', apellido_paterno, ' ', IFNULL(apellido_materno, '')) as nombre_completo
       FROM empleados 
       WHERE rfc_empleado = ?`,
      [rfc]
    );

    if (empleadoExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }

    // Verificar si el empleado está asignado a servicios
    const [serviciosAsignados] = await pool.query(
      'SELECT COUNT(*) as total FROM servicio_empleados WHERE rfc_empleado = ?',
      [rfc]
    );

    if (serviciosAsignados[0].total > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `No se puede eliminar el empleado porque está asignado a ${serviciosAsignados[0].total} servicio(s)` 
      });
    }

    // Eliminar empleado
    await pool.query('DELETE FROM empleados WHERE rfc_empleado = ?', [rfc]);

    res.status(200).json({
      success: true,
      message: 'Empleado eliminado exitosamente',
      data: empleadoExiste[0]
    });

  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar empleado',
      error: error.message 
    });
  }
};

module.exports = {
  crearEmpleado,
  obtenerEmpleados,
  obtenerEmpleadoPorRFC,
  buscarEmpleados,
  actualizarEmpleado,
  eliminarEmpleado
};