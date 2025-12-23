const { pool } = require('../config/database');

// Función auxiliar para generar ID de proveedor
const generarIdProveedor = (nombreEmpresa) => {
  const prefijo = 'PROV';
  
  // Tomar las primeras 3 letras del nombre (sin espacios, en mayúsculas)
  const nombreLimpio = nombreEmpresa.replace(/\s+/g, '').toUpperCase();
  const letrasNombre = nombreLimpio.substring(0, 3).padEnd(3, 'X'); // Si tiene menos de 3 letras, rellena con X
  
  // Generar 3 números aleatorios (100-999)
  const numeros = Math.floor(Math.random() * 900) + 100;
  
  return `${prefijo}${letrasNombre}${numeros}`;
};

// Crear proveedor
const crearProveedor = async (req, res) => {
  try {
    const { nombre_empresa, telefono, correo, direccion } = req.body;

    // Validar campo obligatorio
    if (!nombre_empresa) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de la empresa es obligatorio' 
      });
    }

    // Generar ID único para el proveedor
    let id_proveedor;
    let idExiste = true;

    // Verificar que el ID sea único
    while (idExiste) {
      id_proveedor = generarIdProveedor(nombre_empresa);
      const [existe] = await pool.query(
        'SELECT id_proveedor FROM proveedores WHERE id_proveedor = ?',
        [id_proveedor]
      );
      idExiste = existe.length > 0;
    }

    // Insertar proveedor
    await pool.query(
      `INSERT INTO proveedores (id_proveedor, nombre_empresa, telefono, correo, direccion) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        id_proveedor,
        nombre_empresa,
        telefono || null,
        correo || null,
        direccion || null
      ]
    );

    // Obtener el proveedor creado
    const [proveedorCreado] = await pool.query(
      'SELECT * FROM proveedores WHERE id_proveedor = ?',
      [id_proveedor]
    );

    res.status(201).json({
      success: true,
      message: 'Proveedor registrado exitosamente',
      data: proveedorCreado[0]
    });

  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar proveedor',
      error: error.message 
    });
  }
};

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

// Obtener proveedor por ID
const obtenerProveedorPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [proveedor] = await pool.query(
      'SELECT * FROM proveedores WHERE id_proveedor = ?',
      [id]
    );

    if (proveedor.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proveedor no encontrado' 
      });
    }

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

// Buscar proveedores por nombre o ID
const buscarProveedores = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({ 
        success: false, 
        message: 'El parámetro de búsqueda es obligatorio' 
      });
    }

    const [proveedores] = await pool.query(
      `SELECT * FROM proveedores 
       WHERE id_proveedor LIKE ? 
       OR nombre_empresa LIKE ?
       ORDER BY nombre_empresa`,
      [
        `%${busqueda}%`,
        `%${busqueda}%`
      ]
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${proveedores.length} proveedor(es)`,
      data: proveedores,
      total: proveedores.length
    });

  } catch (error) {
    console.error('Error al buscar proveedores:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al buscar proveedores',
      error: error.message 
    });
  }
};

// Actualizar proveedor
const actualizarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_empresa, telefono, correo, direccion } = req.body;

    // Verificar que el proveedor existe
    const [proveedorExiste] = await pool.query(
      'SELECT * FROM proveedores WHERE id_proveedor = ?',
      [id]
    );

    if (proveedorExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proveedor no encontrado' 
      });
    }

    // Actualizar proveedor
    await pool.query(
      `UPDATE proveedores 
       SET nombre_empresa = ?, 
           telefono = ?, 
           correo = ?, 
           direccion = ?
       WHERE id_proveedor = ?`,
      [
        nombre_empresa || proveedorExiste[0].nombre_empresa,
        telefono !== undefined ? telefono : proveedorExiste[0].telefono,
        correo !== undefined ? correo : proveedorExiste[0].correo,
        direccion !== undefined ? direccion : proveedorExiste[0].direccion,
        id
      ]
    );

    // Obtener proveedor actualizado
    const [proveedorActualizado] = await pool.query(
      'SELECT * FROM proveedores WHERE id_proveedor = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Proveedor actualizado exitosamente',
      data: proveedorActualizado[0]
    });

  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar proveedor',
      error: error.message 
    });
  }
};

// Eliminar proveedor
const eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el proveedor existe
    const [proveedorExiste] = await pool.query(
      'SELECT * FROM proveedores WHERE id_proveedor = ?',
      [id]
    );

    if (proveedorExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proveedor no encontrado' 
      });
    }

    // Verificar si el proveedor tiene refacciones asociadas
    const [refaccionesAsociadas] = await pool.query(
      'SELECT COUNT(*) as total FROM refacciones WHERE id_proveedor = ?',
      [id]
    );

    if (refaccionesAsociadas[0].total > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `No se puede eliminar el proveedor porque tiene ${refaccionesAsociadas[0].total} refacción(es) asociada(s)` 
      });
    }

    // Eliminar proveedor
    await pool.query('DELETE FROM proveedores WHERE id_proveedor = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Proveedor eliminado exitosamente',
      data: proveedorExiste[0]
    });

  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar proveedor',
      error: error.message 
    });
  }
};

module.exports = {
  crearProveedor,
  obtenerProveedores,
  obtenerProveedorPorId,
  buscarProveedores,
  actualizarProveedor,
  eliminarProveedor
};