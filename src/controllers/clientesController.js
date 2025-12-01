const { pool } = require('../config/database');

// Función auxiliar para generar ID de cliente
const generarIdCliente = (nombre, apellidoPaterno, apellidoMaterno) => {
  const prefijo = 'CL';
  
  // Tomar las primeras 2 letras de cada campo (en mayúsculas)
  const letrasNombre = nombre.substring(0, 2).toUpperCase();
  const letrasPaterno = apellidoPaterno.substring(0, 2).toUpperCase();
  const letrasMaterno = apellidoMaterno.substring(0, 2).toUpperCase();
  
  // Generar 2 números aleatorios (10-99)
  const numeros = Math.floor(Math.random() * 90) + 10;
  
  return `${prefijo}${letrasNombre}${letrasPaterno}${letrasMaterno}${numeros}`;
};

// Crear cliente
const crearCliente = async (req, res) => {
  try {
    const { 
      nombre, 
      apellido_paterno, 
      apellido_materno, 
      rfc, 
      correo, 
      telefono, 
      tipo_cliente 
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !apellido_paterno || !apellido_materno) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre y ambos apellidos son obligatorios' 
      });
    }

    // Generar ID único para el cliente
    let id_cliente;
    let idExiste = true;

    // Verificar que el ID sea único
    while (idExiste) {
      id_cliente = generarIdCliente(nombre, apellido_paterno, apellido_materno);
      const [existe] = await pool.query(
        'SELECT id_cliente FROM clientes WHERE id_cliente = ?',
        [id_cliente]
      );
      idExiste = existe.length > 0;
    }

    // Si se proporciona RFC, verificar que no esté duplicado
    if (rfc) {
      const [rfcExiste] = await pool.query(
        'SELECT id_cliente FROM clientes WHERE rfc = ?',
        [rfc]
      );
      if (rfcExiste.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'El RFC ya está registrado' 
        });
      }
    }

    // Insertar cliente
    await pool.query(
      `INSERT INTO clientes (id_cliente, nombre, apellido_paterno, apellido_materno, rfc, correo, telefono, tipo_cliente) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_cliente, 
        nombre, 
        apellido_paterno, 
        apellido_materno, 
        rfc || null, 
        correo || null, 
        telefono || null, 
        tipo_cliente || 'Particular'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        id_cliente,
        nombre,
        apellido_paterno,
        apellido_materno,
        rfc,
        correo,
        telefono,
        tipo_cliente: tipo_cliente || 'Particular'
      }
    });

  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar cliente',
      error: error.message 
    });
  }
};

// Obtener todos los clientes
const obtenerClientes = async (req, res) => {
  try {
    const [clientes] = await pool.query('SELECT * FROM clientes ORDER BY nombre');

    res.status(200).json({
      success: true,
      message: 'Clientes obtenidos exitosamente',
      data: clientes,
      total: clientes.length
    });

  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener clientes',
      error: error.message 
    });
  }
};

// Obtener cliente por ID
const obtenerClientePorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [cliente] = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente = ?',
      [id]
    );

    if (cliente.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cliente encontrado',
      data: cliente[0]
    });

  } catch (error) {
    console.error('Error al obtener cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener cliente',
      error: error.message 
    });
  }
};

// Buscar clientes por nombre o ID
const buscarClientes = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({ 
        success: false, 
        message: 'El parámetro de búsqueda es obligatorio' 
      });
    }

    const [clientes] = await pool.query(
      `SELECT * FROM clientes 
       WHERE id_cliente LIKE ? 
       OR nombre LIKE ? 
       OR apellido_paterno LIKE ? 
       OR apellido_materno LIKE ?
       OR CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) LIKE ?
       ORDER BY nombre`,
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
      message: `Se encontraron ${clientes.length} cliente(s)`,
      data: clientes,
      total: clientes.length
    });

  } catch (error) {
    console.error('Error al buscar clientes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al buscar clientes',
      error: error.message 
    });
  }
};

// Actualizar cliente
const actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      apellido_paterno, 
      apellido_materno, 
      rfc, 
      correo, 
      telefono, 
      tipo_cliente 
    } = req.body;

    // Verificar que el cliente existe
    const [clienteExiste] = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente = ?',
      [id]
    );

    if (clienteExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }

    // Si se está actualizando el RFC, verificar que no esté duplicado
    if (rfc && rfc !== clienteExiste[0].rfc) {
      const [rfcExiste] = await pool.query(
        'SELECT id_cliente FROM clientes WHERE rfc = ? AND id_cliente != ?',
        [rfc, id]
      );
      if (rfcExiste.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'El RFC ya está registrado en otro cliente' 
        });
      }
    }

    // Actualizar cliente
    await pool.query(
      `UPDATE clientes 
       SET nombre = ?, 
           apellido_paterno = ?, 
           apellido_materno = ?, 
           rfc = ?, 
           correo = ?, 
           telefono = ?, 
           tipo_cliente = ?
       WHERE id_cliente = ?`,
      [
        nombre || clienteExiste[0].nombre,
        apellido_paterno || clienteExiste[0].apellido_paterno,
        apellido_materno || clienteExiste[0].apellido_materno,
        rfc || clienteExiste[0].rfc,
        correo || clienteExiste[0].correo,
        telefono || clienteExiste[0].telefono,
        tipo_cliente || clienteExiste[0].tipo_cliente,
        id
      ]
    );

    // Obtener cliente actualizado
    const [clienteActualizado] = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente = ?',
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: clienteActualizado[0]
    });

  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar cliente',
      error: error.message 
    });
  }
};

// Eliminar cliente
const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el cliente existe
    const [clienteExiste] = await pool.query(
      'SELECT * FROM clientes WHERE id_cliente = ?',
      [id]
    );

    if (clienteExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }

    // Verificar si el cliente tiene trailers asociados
    const [trailersAsociados] = await pool.query(
      'SELECT COUNT(*) as total FROM trailers WHERE id_cliente = ?',
      [id]
    );

    if (trailersAsociados[0].total > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `No se puede eliminar el cliente porque tiene ${trailersAsociados[0].total} trailer(s) asociado(s)` 
      });
    }

    // Eliminar cliente
    await pool.query('DELETE FROM clientes WHERE id_cliente = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Cliente eliminado exitosamente',
      data: clienteExiste[0]
    });

  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar cliente',
      error: error.message 
    });
  }
};

module.exports = {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  buscarClientes,
  actualizarCliente,
  eliminarCliente
};