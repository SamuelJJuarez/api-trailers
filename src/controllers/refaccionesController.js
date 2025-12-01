const { pool } = require('../config/database');

// Función auxiliar para generar ID de refacción
const generarIdRefaccion = (nombre) => {
  const prefijo = 'RF';
  
  // Tomar las primeras 4 letras del nombre (sin espacios, en mayúsculas)
  const nombreLimpio = nombre.replace(/\s+/g, '').toUpperCase();
  const letrasNombre = nombreLimpio.substring(0, 4).padEnd(4, 'X'); // Si tiene menos de 4 letras, rellena con X
  
  // Generar 4 números aleatorios (1000-9999)
  const numeros = Math.floor(Math.random() * 9000) + 1000;
  
  return `${prefijo}${letrasNombre}${numeros}`;
};

// Crear refacción
const crearRefaccion = async (req, res) => {
  try {
    const { 
      nombre, 
      id_proveedor, 
      cantidad_stock, 
      stock_minimo, 
      precio_compra, 
      precio_venta 
    } = req.body;

    // Validar campo obligatorio
    if (!nombre) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de la refacción es obligatorio' 
      });
    }

    // Si se proporciona id_proveedor, verificar que existe
    if (id_proveedor) {
      const [proveedorExiste] = await pool.query(
        'SELECT id_proveedor, nombre_empresa FROM proveedores WHERE id_proveedor = ?',
        [id_proveedor]
      );

      if (proveedorExiste.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'El proveedor especificado no existe' 
        });
      }
    }

    // Validar precios si se proporcionan
    if (precio_compra && (isNaN(precio_compra) || precio_compra < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El precio de compra debe ser un número positivo' 
      });
    }

    if (precio_venta && (isNaN(precio_venta) || precio_venta < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El precio de venta debe ser un número positivo' 
      });
    }

    // Validar cantidades si se proporcionan
    if (cantidad_stock && (isNaN(cantidad_stock) || cantidad_stock < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La cantidad en stock debe ser un número positivo' 
      });
    }

    if (stock_minimo && (isNaN(stock_minimo) || stock_minimo < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El stock mínimo debe ser un número positivo' 
      });
    }

    // Generar ID único para la refacción
    let id_refaccion;
    let idExiste = true;

    // Verificar que el ID sea único
    while (idExiste) {
      id_refaccion = generarIdRefaccion(nombre);
      const [existe] = await pool.query(
        'SELECT id_refaccion FROM refacciones WHERE id_refaccion = ?',
        [id_refaccion]
      );
      idExiste = existe.length > 0;
    }

    // Insertar refacción
    await pool.query(
      `INSERT INTO refacciones (id_refaccion, nombre, id_proveedor, cantidad_stock, stock_minimo, precio_compra, precio_venta) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_refaccion,
        nombre,
        id_proveedor || null,
        cantidad_stock !== undefined ? cantidad_stock : 0,
        stock_minimo !== undefined ? stock_minimo : 5,
        precio_compra || null,
        precio_venta || null
      ]
    );

    // Obtener la refacción creada con información del proveedor
    const [refaccionCreada] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.id_refaccion = ?`,
      [id_refaccion]
    );

    res.status(201).json({
      success: true,
      message: 'Refacción registrada exitosamente',
      data: refaccionCreada[0]
    });

  } catch (error) {
    console.error('Error al crear refacción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar refacción',
      error: error.message 
    });
  }
};

// Obtener todas las refacciones con información del proveedor
const obtenerRefacciones = async (req, res) => {
  try {
    const [refacciones] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre,
              CASE 
                WHEN r.cantidad_stock <= r.stock_minimo THEN 'Bajo'
                WHEN r.cantidad_stock <= (r.stock_minimo * 2) THEN 'Medio'
                ELSE 'Suficiente'
              END as estado_stock
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       ORDER BY r.nombre`
    );

    res.status(200).json({
      success: true,
      message: 'Refacciones obtenidas exitosamente',
      data: refacciones,
      total: refacciones.length
    });

  } catch (error) {
    console.error('Error al obtener refacciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener refacciones',
      error: error.message 
    });
  }
};

// Obtener refacción por ID
const obtenerRefaccionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [refaccion] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre,
              p.telefono as proveedor_telefono,
              p.correo as proveedor_correo,
              CASE 
                WHEN r.cantidad_stock <= r.stock_minimo THEN 'Bajo'
                WHEN r.cantidad_stock <= (r.stock_minimo * 2) THEN 'Medio'
                ELSE 'Suficiente'
              END as estado_stock
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.id_refaccion = ?`,
      [id]
    );

    if (refaccion.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Refacción no encontrada' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Refacción encontrada',
      data: refaccion[0]
    });

  } catch (error) {
    console.error('Error al obtener refacción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener refacción',
      error: error.message 
    });
  }
};

// Buscar refacciones por nombre o proveedor
const buscarRefacciones = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({ 
        success: false, 
        message: 'El parámetro de búsqueda es obligatorio' 
      });
    }

    const [refacciones] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre,
              CASE 
                WHEN r.cantidad_stock <= r.stock_minimo THEN 'Bajo'
                WHEN r.cantidad_stock <= (r.stock_minimo * 2) THEN 'Medio'
                ELSE 'Suficiente'
              END as estado_stock
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.id_refaccion LIKE ? 
       OR r.nombre LIKE ?
       OR p.nombre_empresa LIKE ?
       ORDER BY r.nombre`,
      [
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`
      ]
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${refacciones.length} refacción(es)`,
      data: refacciones,
      total: refacciones.length
    });

  } catch (error) {
    console.error('Error al buscar refacciones:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al buscar refacciones',
      error: error.message 
    });
  }
};

// Obtener refacciones por proveedor
const obtenerRefaccionesPorProveedor = async (req, res) => {
  try {
    const { id_proveedor } = req.params;

    // Verificar que el proveedor existe
    const [proveedorExiste] = await pool.query(
      'SELECT id_proveedor, nombre_empresa FROM proveedores WHERE id_proveedor = ?',
      [id_proveedor]
    );

    if (proveedorExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proveedor no encontrado' 
      });
    }

    const [refacciones] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre,
              CASE 
                WHEN r.cantidad_stock <= r.stock_minimo THEN 'Bajo'
                WHEN r.cantidad_stock <= (r.stock_minimo * 2) THEN 'Medio'
                ELSE 'Suficiente'
              END as estado_stock
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.id_proveedor = ?
       ORDER BY r.nombre`,
      [id_proveedor]
    );

    res.status(200).json({
      success: true,
      message: `Refacciones del proveedor ${proveedorExiste[0].nombre_empresa}`,
      data: refacciones,
      total: refacciones.length
    });

  } catch (error) {
    console.error('Error al obtener refacciones por proveedor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener refacciones',
      error: error.message 
    });
  }
};

// Obtener refacciones con stock bajo
const obtenerRefaccionesStockBajo = async (req, res) => {
  try {
    const [refacciones] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre,
              p.telefono as proveedor_telefono,
              p.correo as proveedor_correo,
              'Bajo' as estado_stock
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.cantidad_stock <= r.stock_minimo
       ORDER BY r.cantidad_stock ASC, r.nombre`
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${refacciones.length} refacción(es) con stock bajo`,
      data: refacciones,
      total: refacciones.length
    });

  } catch (error) {
    console.error('Error al obtener refacciones con stock bajo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener refacciones con stock bajo',
      error: error.message 
    });
  }
};

// Actualizar refacción
const actualizarRefaccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      id_proveedor, 
      cantidad_stock, 
      stock_minimo, 
      precio_compra, 
      precio_venta 
    } = req.body;

    // Verificar que la refacción existe
    const [refaccionExiste] = await pool.query(
      'SELECT * FROM refacciones WHERE id_refaccion = ?',
      [id]
    );

    if (refaccionExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Refacción no encontrada' 
      });
    }

    // Si se está actualizando el proveedor, verificar que existe
    if (id_proveedor && id_proveedor !== refaccionExiste[0].id_proveedor) {
      const [proveedorExiste] = await pool.query(
        'SELECT id_proveedor FROM proveedores WHERE id_proveedor = ?',
        [id_proveedor]
      );
      if (proveedorExiste.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'El proveedor especificado no existe' 
        });
      }
    }

    // Validar precios si se proporcionan
    if (precio_compra !== undefined && (isNaN(precio_compra) || precio_compra < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El precio de compra debe ser un número positivo' 
      });
    }

    if (precio_venta !== undefined && (isNaN(precio_venta) || precio_venta < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El precio de venta debe ser un número positivo' 
      });
    }

    // Validar cantidades si se proporcionan
    if (cantidad_stock !== undefined && (isNaN(cantidad_stock) || cantidad_stock < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'La cantidad en stock debe ser un número positivo' 
      });
    }

    if (stock_minimo !== undefined && (isNaN(stock_minimo) || stock_minimo < 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El stock mínimo debe ser un número positivo' 
      });
    }

    // Actualizar refacción
    await pool.query(
      `UPDATE refacciones 
       SET nombre = ?, 
           id_proveedor = ?, 
           cantidad_stock = ?, 
           stock_minimo = ?, 
           precio_compra = ?, 
           precio_venta = ?
       WHERE id_refaccion = ?`,
      [
        nombre || refaccionExiste[0].nombre,
        id_proveedor !== undefined ? id_proveedor : refaccionExiste[0].id_proveedor,
        cantidad_stock !== undefined ? cantidad_stock : refaccionExiste[0].cantidad_stock,
        stock_minimo !== undefined ? stock_minimo : refaccionExiste[0].stock_minimo,
        precio_compra !== undefined ? precio_compra : refaccionExiste[0].precio_compra,
        precio_venta !== undefined ? precio_venta : refaccionExiste[0].precio_venta,
        id
      ]
    );

    // Obtener refacción actualizada con información del proveedor
    const [refaccionActualizada] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre,
              CASE 
                WHEN r.cantidad_stock <= r.stock_minimo THEN 'Bajo'
                WHEN r.cantidad_stock <= (r.stock_minimo * 2) THEN 'Medio'
                ELSE 'Suficiente'
              END as estado_stock
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.id_refaccion = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Refacción actualizada exitosamente',
      data: refaccionActualizada[0]
    });

  } catch (error) {
    console.error('Error al actualizar refacción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar refacción',
      error: error.message 
    });
  }
};

// Eliminar refacción
const eliminarRefaccion = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la refacción existe
    const [refaccionExiste] = await pool.query(
      `SELECT r.*, 
              p.nombre_empresa as proveedor_nombre
       FROM refacciones r
       LEFT JOIN proveedores p ON r.id_proveedor = p.id_proveedor
       WHERE r.id_refaccion = ?`,
      [id]
    );

    if (refaccionExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Refacción no encontrada' 
      });
    }

    // Verificar si la refacción ha sido usada en servicios
    const [usosEnServicios] = await pool.query(
      'SELECT COUNT(*) as total FROM servicio_refacciones WHERE id_refaccion = ?',
      [id]
    );

    if (usosEnServicios[0].total > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `No se puede eliminar la refacción porque ha sido usada en ${usosEnServicios[0].total} servicio(s)` 
      });
    }

    // Eliminar refacción
    await pool.query('DELETE FROM refacciones WHERE id_refaccion = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Refacción eliminada exitosamente',
      data: refaccionExiste[0]
    });

  } catch (error) {
    console.error('Error al eliminar refacción:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar refacción',
      error: error.message 
    });
  }
};

module.exports = {
  crearRefaccion,
  obtenerRefacciones,
  obtenerRefaccionPorId,
  buscarRefacciones,
  obtenerRefaccionesPorProveedor,
  obtenerRefaccionesStockBajo,
  actualizarRefaccion,
  eliminarRefaccion
};