const { pool } = require('../config/database');

// Crear trailer
const crearTrailer = async (req, res) => {
  try {
    const { 
      num_serie, 
      placa, 
      marca, 
      modelo, 
      anio, 
      tipo_trailer, 
      tamaño,
      id_cliente 
    } = req.body;

    // Validar campos obligatorios
    if (!num_serie || !placa || !tipo_trailer || !id_cliente) {
      return res.status(400).json({ 
        success: false, 
        message: 'El número de serie, placa, tipo de trailer y cliente son obligatorios' 
      });
    }

    // Validar que el tipo de trailer sea válido
    if (!['Flotilla', 'Individual'].includes(tipo_trailer)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El tipo de trailer debe ser "Flotilla" o "Individual"' 
      });
    }

    // Verificar que el cliente existe
    const [clienteExiste] = await pool.query(
      'SELECT id_cliente, nombre, apellido_paterno, apellido_materno FROM clientes WHERE id_cliente = ?',
      [id_cliente]
    );

    if (clienteExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'El cliente especificado no existe' 
      });
    }

    // Verificar que el número de serie no esté duplicado
    const [numSerieExiste] = await pool.query(
      'SELECT num_serie FROM trailers WHERE num_serie = ?',
      [num_serie]
    );

    if (numSerieExiste.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'El número de serie ya está registrado' 
      });
    }

    // Verificar que la placa no esté duplicada
    const [placaExiste] = await pool.query(
      'SELECT placa FROM trailers WHERE placa = ?',
      [placa]
    );

    if (placaExiste.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'La placa ya está registrada' 
      });
    }

    // Insertar trailer
    await pool.query(
      `INSERT INTO trailers (num_serie, placa, marca, modelo, anio, tipo_trailer, tamaño, id_cliente) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        num_serie, 
        placa, 
        marca || null, 
        modelo || null, 
        anio || null, 
        tipo_trailer, 
        tamaño || null,
        id_cliente
      ]
    );

    // Obtener el trailer creado con información del cliente
    const [trailerCreado] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.num_serie = ?`,
      [num_serie]
    );

    res.status(201).json({
      success: true,
      message: 'Trailer registrado exitosamente',
      data: trailerCreado[0]
    });

  } catch (error) {
    console.error('Error al crear trailer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al registrar trailer',
      error: error.message 
    });
  }
};

// Obtener todos los trailers con información del cliente
const obtenerTrailers = async (req, res) => {
  try {
    const [trailers] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       ORDER BY t.num_serie`
    );

    res.status(200).json({
      success: true,
      message: 'Trailers obtenidos exitosamente',
      data: trailers,
      total: trailers.length
    });

  } catch (error) {
    console.error('Error al obtener trailers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener trailers',
      error: error.message 
    });
  }
};

// Obtener trailer por número de serie
const obtenerTrailerPorNumSerie = async (req, res) => {
  try {
    const { num_serie } = req.params;

    const [trailer] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.num_serie = ?`,
      [num_serie]
    );

    if (trailer.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trailer no encontrado' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trailer encontrado',
      data: trailer[0]
    });

  } catch (error) {
    console.error('Error al obtener trailer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener trailer',
      error: error.message 
    });
  }
};

// Buscar trailers por placa o número de serie
const buscarTrailers = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({ 
        success: false, 
        message: 'El parámetro de búsqueda es obligatorio' 
      });
    }

    const [trailers] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.num_serie LIKE ? 
       OR t.placa LIKE ?
       OR t.marca LIKE ?
       OR t.modelo LIKE ?
       ORDER BY t.num_serie`,
      [
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`
      ]
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${trailers.length} trailer(s)`,
      data: trailers,
      total: trailers.length
    });

  } catch (error) {
    console.error('Error al buscar trailers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al buscar trailers',
      error: error.message 
    });
  }
};

// Obtener trailers por cliente
const obtenerTrailersPorCliente = async (req, res) => {
  try {
    const { id_cliente } = req.params;

    // Verificar que el cliente existe
    const [clienteExiste] = await pool.query(
      'SELECT id_cliente, nombre, apellido_paterno, apellido_materno FROM clientes WHERE id_cliente = ?',
      [id_cliente]
    );

    if (clienteExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }

    const [trailers] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.id_cliente = ?
       ORDER BY t.num_serie`,
      [id_cliente]
    );

    res.status(200).json({
      success: true,
      message: `Trailers del cliente ${clienteExiste[0].nombre} ${clienteExiste[0].apellido_paterno}`,
      data: trailers,
      total: trailers.length
    });

  } catch (error) {
    console.error('Error al obtener trailers por cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener trailers',
      error: error.message 
    });
  }
};

// Actualizar trailer
const actualizarTrailer = async (req, res) => {
  try {
    const { num_serie } = req.params;
    const { 
      placa, 
      marca, 
      modelo, 
      anio, 
      tipo_trailer, 
      tamaño,
      id_cliente 
    } = req.body;

    // Verificar que el trailer existe
    const [trailerExiste] = await pool.query(
      'SELECT * FROM trailers WHERE num_serie = ?',
      [num_serie]
    );

    if (trailerExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trailer no encontrado' 
      });
    }

    // Si se está actualizando la placa, verificar que no esté duplicada
    if (placa && placa !== trailerExiste[0].placa) {
      const [placaExiste] = await pool.query(
        'SELECT placa FROM trailers WHERE placa = ? AND num_serie != ?',
        [placa, num_serie]
      );
      if (placaExiste.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'La placa ya está registrada en otro trailer' 
        });
      }
    }

    // Si se está actualizando el cliente, verificar que existe
    if (id_cliente && id_cliente !== trailerExiste[0].id_cliente) {
      const [clienteExiste] = await pool.query(
        'SELECT id_cliente FROM clientes WHERE id_cliente = ?',
        [id_cliente]
      );
      if (clienteExiste.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'El cliente especificado no existe' 
        });
      }
    }

    // Validar tipo_trailer si se proporciona
    if (tipo_trailer && !['Flotilla', 'Individual'].includes(tipo_trailer)) {
      return res.status(400).json({ 
        success: false, 
        message: 'El tipo de trailer debe ser "Flotilla" o "Individual"' 
      });
    }

    // Actualizar trailer
    await pool.query(
      `UPDATE trailers 
       SET placa = ?, 
           marca = ?, 
           modelo = ?, 
           anio = ?, 
           tipo_trailer = ?, 
           tamaño = ?,
           id_cliente = ?
       WHERE num_serie = ?`,
      [
        placa || trailerExiste[0].placa,
        marca !== undefined ? marca : trailerExiste[0].marca,
        modelo !== undefined ? modelo : trailerExiste[0].modelo,
        anio !== undefined ? anio : trailerExiste[0].anio,
        tipo_trailer || trailerExiste[0].tipo_trailer,
        tamaño !== undefined ? tamaño : trailerExiste[0].tamaño,
        id_cliente || trailerExiste[0].id_cliente,
        num_serie
      ]
    );

    // Obtener trailer actualizado con información del cliente
    const [trailerActualizado] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.num_serie = ?`,
      [num_serie]
    );

    res.status(200).json({
      success: true,
      message: 'Trailer actualizado exitosamente',
      data: trailerActualizado[0]
    });

  } catch (error) {
    console.error('Error al actualizar trailer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar trailer',
      error: error.message 
    });
  }
};

// Eliminar trailer
const eliminarTrailer = async (req, res) => {
  try {
    const { num_serie } = req.params;

    // Verificar que el trailer existe
    const [trailerExiste] = await pool.query(
      `SELECT t.*, 
              c.nombre as cliente_nombre, 
              c.apellido_paterno as cliente_apellido_paterno, 
              c.apellido_materno as cliente_apellido_materno
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.num_serie = ?`,
      [num_serie]
    );

    if (trailerExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trailer no encontrado' 
      });
    }

    // Verificar si el trailer tiene servicios asociados
    const [serviciosAsociados] = await pool.query(
      'SELECT COUNT(*) as total FROM servicios WHERE num_serie_trailer = ?',
      [num_serie]
    );

    if (serviciosAsociados[0].total > 0) {
      return res.status(409).json({ 
        success: false, 
        message: `No se puede eliminar el trailer porque tiene ${serviciosAsociados[0].total} servicio(s) asociado(s)` 
      });
    }

    // Eliminar trailer
    await pool.query('DELETE FROM trailers WHERE num_serie = ?', [num_serie]);

    res.status(200).json({
      success: true,
      message: 'Trailer eliminado exitosamente',
      data: trailerExiste[0]
    });

  } catch (error) {
    console.error('Error al eliminar trailer:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar trailer',
      error: error.message 
    });
  }
};

module.exports = {
  crearTrailer,
  obtenerTrailers,
  obtenerTrailerPorNumSerie,
  buscarTrailers,
  obtenerTrailersPorCliente,
  actualizarTrailer,
  eliminarTrailer
};