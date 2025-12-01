const { pool } = require('../config/database');

// Crear herramienta
const crearHerramienta = async (req, res) => {
  try {
    const { nombre, marca, cantidad_total } = req.body;

    // Validar campo obligatorio
    if (!nombre) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de la herramienta es obligatorio' 
      });
    }

    // Verificar que el nombre no esté duplicado
    const [nombreExiste] = await pool.query(
      'SELECT id_herramienta FROM herramientas WHERE nombre = ?',
      [nombre]
    );

    if (nombreExiste.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Ya existe una herramienta con ese nombre' 
      });
    }

    // Validar que cantidad_total sea un número positivo
    if (cantidad_total && (isNaN(cantidad_total) || cantidad_total < 1)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La cantidad total debe ser un número mayor a 0' 
      });
    }

    // Insertar herramienta
    const [result] = await pool.query(
      `INSERT INTO herramientas (nombre, marca, cantidad_total) 
       VALUES (?, ?, ?)`,
      [
        nombre,
        marca || null,
        cantidad_total || 1
      ]
    );

    // Obtener la herramienta creada
    const [herramientaCreada] = await pool.query(
      'SELECT * FROM herramientas WHERE id_herramienta = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Herramienta registrada exitosamente',
      data: herramientaCreada[0]
    });

  } catch (error) {
    console.error('Error al crear herramienta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar herramienta',
      error: error.message 
    });
  }
};

// Obtener todas las herramientas
const obtenerHerramientas = async (req, res) => {
  try {
    const [herramientas] = await pool.query(
      'SELECT * FROM herramientas ORDER BY nombre'
    );

    res.status(200).json({
      success: true,
      message: 'Herramientas obtenidas exitosamente',
      data: herramientas,
      total: herramientas.length
    });

  } catch (error) {
    console.error('Error al obtener herramientas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener herramientas',
      error: error.message 
    });
  }
};

// Obtener herramienta por ID
const obtenerHerramientaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [herramienta] = await pool.query(
      'SELECT * FROM herramientas WHERE id_herramienta = ?',
      [id]
    );

    if (herramienta.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Herramienta no encontrada' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Herramienta encontrada',
      data: herramienta[0]
    });

  } catch (error) {
    console.error('Error al obtener herramienta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener herramienta',
      error: error.message 
    });
  }
};

// Obtener herramienta por nombre
const obtenerHerramientaPorNombre = async (req, res) => {
  try {
    const { nombre } = req.params;

    const [herramienta] = await pool.query(
      'SELECT * FROM herramientas WHERE nombre = ?',
      [nombre]
    );

    if (herramienta.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Herramienta no encontrada' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Herramienta encontrada',
      data: herramienta[0]
    });

  } catch (error) {
    console.error('Error al obtener herramienta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener herramienta',
      error: error.message 
    });
  }
};

// Buscar herramientas por nombre o marca
const buscarHerramientas = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({ 
        success: false, 
        message: 'El parámetro de búsqueda es obligatorio' 
      });
    }

    const [herramientas] = await pool.query(
      `SELECT * FROM herramientas 
       WHERE nombre LIKE ? 
       OR marca LIKE ?
       ORDER BY nombre`,
      [
        `%${busqueda}%`,
        `%${busqueda}%`
      ]
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${herramientas.length} herramienta(s)`,
      data: herramientas,
      total: herramientas.length
    });

  } catch (error) {
    console.error('Error al buscar herramientas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al buscar herramientas',
      error: error.message 
    });
  }
};

// Actualizar herramienta
const actualizarHerramienta = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, marca, cantidad_total } = req.body;

    // Verificar que la herramienta existe
    const [herramientaExiste] = await pool.query(
      'SELECT * FROM herramientas WHERE id_herramienta = ?',
      [id]
    );

    if (herramientaExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Herramienta no encontrada' 
      });
    }

    // Si se está actualizando el nombre, verificar que no esté duplicado
    if (nombre && nombre !== herramientaExiste[0].nombre) {
      const [nombreExiste] = await pool.query(
        'SELECT id_herramienta FROM herramientas WHERE nombre = ? AND id_herramienta != ?',
        [nombre, id]
      );
      if (nombreExiste.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Ya existe otra herramienta con ese nombre' 
        });
      }
    }

    // Validar cantidad_total si se proporciona
    if (cantidad_total !== undefined && (isNaN(cantidad_total) || cantidad_total < 1)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La cantidad total debe ser un número mayor a 0' 
      });
    }

    // Actualizar herramienta
    await pool.query(
      `UPDATE herramientas 
       SET nombre = ?, 
           marca = ?, 
           cantidad_total = ?
       WHERE id_herramienta = ?`,
      [
        nombre || herramientaExiste[0].nombre,
        marca !== undefined ? marca : herramientaExiste[0].marca,
        cantidad_total !== undefined ? cantidad_total : herramientaExiste[0].cantidad_total,
        id
      ]
    );

    // Obtener herramienta actualizada
    const [herramientaActualizada] = await pool.query(
      'SELECT * FROM herramientas WHERE id_herramienta = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Herramienta actualizada exitosamente',
      data: herramientaActualizada[0]
    });

  } catch (error) {
    console.error('Error al actualizar herramienta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar herramienta',
      error: error.message 
    });
  }
};

// Eliminar herramienta
const eliminarHerramienta = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la herramienta existe
    const [herramientaExiste] = await pool.query(
      'SELECT * FROM herramientas WHERE id_herramienta = ?',
      [id]
    );

    if (herramientaExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Herramienta no encontrada' 
      });
    }

    // Verificar si la herramienta tiene asignaciones en servicios
    const [asignacionesActivas] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM servicio_herramientas 
       WHERE id_herramienta = ? AND fecha_devolucion IS NULL`,
      [id]
    );

    if (asignacionesActivas[0].total > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `No se puede eliminar la herramienta porque tiene ${asignacionesActivas[0].total} asignación(es) activa(s) en servicios` 
      });
    }

    // Eliminar herramienta
    await pool.query('DELETE FROM herramientas WHERE id_herramienta = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Herramienta eliminada exitosamente',
      data: herramientaExiste[0]
    });

  } catch (error) {
    console.error('Error al eliminar herramienta:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar herramienta',
      error: error.message 
    });
  }
};

// Obtener disponibilidad de herramientas
const obtenerDisponibilidad = async (req, res) => {
  try {
    const [herramientas] = await pool.query(
      `SELECT 
        h.id_herramienta,
        h.nombre,
        h.marca,
        h.cantidad_total,
        COUNT(sh.id_herramienta) as cantidad_prestada,
        (h.cantidad_total - COUNT(sh.id_herramienta)) as cantidad_disponible
       FROM herramientas h
       LEFT JOIN servicio_herramientas sh ON h.id_herramienta = sh.id_herramienta 
         AND sh.fecha_devolucion IS NULL
       GROUP BY h.id_herramienta
       ORDER BY h.nombre`
    );

    res.status(200).json({
      success: true,
      message: 'Disponibilidad de herramientas obtenida exitosamente',
      data: herramientas,
      total: herramientas.length
    });

  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener disponibilidad de herramientas',
      error: error.message 
    });
  }
};

module.exports = {
  crearHerramienta,
  obtenerHerramientas,
  obtenerHerramientaPorId,
  obtenerHerramientaPorNombre,
  buscarHerramientas,
  actualizarHerramienta,
  eliminarHerramienta,
  obtenerDisponibilidad
};