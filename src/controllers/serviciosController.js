const { pool } = require('../config/database');

// Función auxiliar para generar ID de servicio
const generarIdServicio = (numSerieTrailer) => {
  const prefijo = 'SRV';

  // Tomar los primeros 4 dígitos del número de serie
  const digitosSerie = numSerieTrailer.substring(0, 4).toUpperCase();

  // Generar 3 letras aleatorias (A-Z)
  const letras = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');

  return `${prefijo}${digitosSerie}${letras}`;
};

// Crear servicio con empleados, refacciones y herramientas
const crearServicio = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      num_serie_trailer,
      fecha_entrega_estimada,
      tipo_servicio,
      descripcion,
      estado_servicio,
      empleados,           // Array de RFCs: ["RFC1", "RFC2"]
      refacciones,         // Array: [{id_refaccion, cantidad_usada, precio_unitario_cobrado}]
      herramientas         // Array de IDs: [1, 2, 3]
    } = req.body;

    // Validar campos obligatorios
    if (!num_serie_trailer || !tipo_servicio || !descripcion) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'El número de serie del trailer, tipo de servicio y descripción son obligatorios'
      });
    }

    // Verificar que el trailer existe
    const [trailerExiste] = await connection.query(
      `SELECT t.*, c.nombre, c.apellido_paterno, c.apellido_materno 
       FROM trailers t
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE t.num_serie = ?`,
      [num_serie_trailer]
    );

    if (trailerExiste.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'El trailer especificado no existe'
      });
    }

    // Generar ID único para el servicio
    let id_servicio;
    let idExiste = true;

    while (idExiste) {
      id_servicio = generarIdServicio(num_serie_trailer);
      const [existe] = await connection.query(
        'SELECT id_servicio FROM servicios WHERE id_servicio = ?',
        [id_servicio]
      );
      idExiste = existe.length > 0;
    }

    // Insertar servicio
    await connection.query(
      `INSERT INTO servicios (id_servicio, num_serie_trailer, fecha_entrega_estimada, tipo_servicio, descripcion, estado_servicio) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_servicio,
        num_serie_trailer,
        fecha_entrega_estimada || null,
        tipo_servicio,
        descripcion,
        estado_servicio || 'Pendiente'
      ]
    );

    // Asignar empleados al servicio
    if (empleados && Array.isArray(empleados) && empleados.length > 0) {
      for (const rfc_empleado of empleados) {
        // Verificar que el empleado existe
        const [empleadoExiste] = await connection.query(
          'SELECT rfc_empleado FROM empleados WHERE rfc_empleado = ?',
          [rfc_empleado]
        );

        if (empleadoExiste.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `El empleado con RFC ${rfc_empleado} no existe`
          });
        }

        await connection.query(
          'INSERT INTO servicio_empleados (id_servicio, rfc_empleado) VALUES (?, ?)',
          [id_servicio, rfc_empleado]
        );
      }
    }

    // Asignar refacciones al servicio
    if (refacciones && Array.isArray(refacciones) && refacciones.length > 0) {
      for (const refaccion of refacciones) {
        const { id_refaccion, cantidad_usada, precio_unitario_cobrado } = refaccion;

        if (!id_refaccion || !cantidad_usada) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Cada refacción debe tener id_refaccion y cantidad_usada'
          });
        }

        // Verificar que la refacción existe y hay suficiente stock
        const [refaccionExiste] = await connection.query(
          'SELECT * FROM refacciones WHERE id_refaccion = ?',
          [id_refaccion]
        );

        if (refaccionExiste.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `La refacción ${id_refaccion} no existe`
          });
        }

        if (refaccionExiste[0].cantidad_stock < cantidad_usada) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `No hay suficiente stock de la refacción ${id_refaccion}. Disponible: ${refaccionExiste[0].cantidad_stock}, Solicitado: ${cantidad_usada}`
          });
        }

        // Descontar del stock
        await connection.query(
          'UPDATE refacciones SET cantidad_stock = cantidad_stock - ? WHERE id_refaccion = ?',
          [cantidad_usada, id_refaccion]
        );

        // Registrar refacción usada
        await connection.query(
          'INSERT INTO servicio_refacciones (id_servicio, id_refaccion, cantidad_usada, precio_unitario_cobrado) VALUES (?, ?, ?, ?)',
          [id_servicio, id_refaccion, cantidad_usada, precio_unitario_cobrado || refaccionExiste[0].precio_venta]
        );
      }
    }

    // Asignar herramientas al servicio
    if (herramientas && Array.isArray(herramientas) && herramientas.length > 0) {
      for (const id_herramienta of herramientas) {
        // Verificar que la herramienta existe
        const [herramientaExiste] = await connection.query(
          'SELECT * FROM herramientas WHERE id_herramienta = ?',
          [id_herramienta]
        );

        if (herramientaExiste.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: `La herramienta con ID ${id_herramienta} no existe`
          });
        }

        // Verificar disponibilidad (contando solo las que están Ocupadas)
        const [ocupadas] = await connection.query(
          'SELECT COUNT(*) as total FROM servicio_herramientas WHERE id_herramienta = ? AND estado = "Ocupada"',
          [id_herramienta]
        );

        const disponibles = herramientaExiste[0].cantidad_total - ocupadas[0].total;

        if (disponibles <= 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `No hay unidades disponibles de la herramienta "${herramientaExiste[0].nombre}"`
          });
        }

        // Insertar con estado 'Ocupada' por defecto
        await connection.query(
          'INSERT INTO servicio_herramientas (id_servicio, id_herramienta, estado) VALUES (?, ?, "Ocupada")',
          [id_servicio, id_herramienta]
        );
      }
    }

    await connection.commit();

    // Obtener el servicio completo creado
    const [servicioCreado] = await connection.query(
      `SELECT s.*,
              t.placa, t.marca as trailer_marca, t.modelo as trailer_modelo,
              c.nombre as cliente_nombre, c.apellido_paterno as cliente_apellido_paterno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM servicios s
       INNER JOIN trailers t ON s.num_serie_trailer = t.num_serie
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE s.id_servicio = ?`,
      [id_servicio]
    );

    res.status(201).json({
      success: true,
      message: 'Servicio registrado exitosamente',
      data: servicioCreado[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar servicio',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Obtener todos los servicios con información relacionada
const obtenerServicios = async (req, res) => {
  try {
    const [servicios] = await pool.query(
      `SELECT s.*,
          t.placa, t.marca as trailer_marca, t.modelo as trailer_modelo,
          t.id_cliente, -- <--- AGREGAR ESTA LÍNEA
          c.nombre as cliente_nombre, c.apellido_paterno as cliente_apellido_paterno,
          CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
   FROM servicios s
   INNER JOIN trailers t ON s.num_serie_trailer = t.num_serie
   INNER JOIN clientes c ON t.id_cliente = c.id_cliente
   ORDER BY s.fecha_registro DESC`
    );

    res.status(200).json({
      success: true,
      message: 'Servicios obtenidos exitosamente',
      data: servicios,
      total: servicios.length
    });

  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicios',
      error: error.message
    });
  }
};

// Obtener servicio por ID con todos los detalles
const obtenerServicioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información básica del servicio
    const [servicio] = await pool.query(
      `SELECT s.*,
          t.placa, t.marca as trailer_marca, t.modelo as trailer_modelo,
          t.id_cliente, -- <--- AGREGAR ESTA LÍNEA
          c.nombre as cliente_nombre, c.apellido_paterno as cliente_apellido_paterno,
          CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
   FROM servicios s
   INNER JOIN trailers t ON s.num_serie_trailer = t.num_serie
   INNER JOIN clientes c ON t.id_cliente = c.id_cliente
   WHERE s.id_servicio = ?`,
      [id]
    );

    if (servicio.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Obtener empleados asignados
    const [empleados] = await pool.query(
      `SELECT e.rfc_empleado, e.nombre, e.apellido_paterno, e.apellido_materno, e.puesto,
              CONCAT(e.nombre, ' ', e.apellido_paterno, ' ', IFNULL(e.apellido_materno, '')) as nombre_completo
       FROM servicio_empleados se
       INNER JOIN empleados e ON se.rfc_empleado = e.rfc_empleado
       WHERE se.id_servicio = ?`,
      [id]
    );

    // Obtener refacciones usadas
    const [refacciones] = await pool.query(
      `SELECT sr.*, r.nombre as refaccion_nombre
       FROM servicio_refacciones sr
       INNER JOIN refacciones r ON sr.id_refaccion = r.id_refaccion
       WHERE sr.id_servicio = ?`,
      [id]
    );

    // Obtener herramientas asignadas
    const [herramientas] = await pool.query(
      `SELECT sh.*, h.nombre as herramienta_nombre, h.marca
       FROM servicio_herramientas sh
       INNER JOIN herramientas h ON sh.id_herramienta = h.id_herramienta
       WHERE sh.id_servicio = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Servicio encontrado',
      data: {
        ...servicio[0],
        empleados,
        refacciones,
        herramientas
      }
    });

  } catch (error) {
    console.error('Error al obtener servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener servicio',
      error: error.message
    });
  }
};

// Buscar servicios por ID, tipo o descripción
const buscarServicios = async (req, res) => {
  try {
    const { busqueda } = req.query;

    if (!busqueda) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro de búsqueda es obligatorio'
      });
    }

    const [servicios] = await pool.query(
      `SELECT s.*,
              t.placa, t.marca as trailer_marca, t.modelo as trailer_modelo,
              c.nombre as cliente_nombre, c.apellido_paterno as cliente_apellido_paterno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM servicios s
       INNER JOIN trailers t ON s.num_serie_trailer = t.num_serie
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE s.id_servicio LIKE ?
       OR s.tipo_servicio LIKE ?
       OR s.descripcion LIKE ?
       OR t.placa LIKE ?
       ORDER BY s.fecha_registro DESC`,
      [
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`,
        `%${busqueda}%`
      ]
    );

    res.status(200).json({
      success: true,
      message: `Se encontraron ${servicios.length} servicio(s)`,
      data: servicios,
      total: servicios.length
    });

  } catch (error) {
    console.error('Error al buscar servicios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar servicios',
      error: error.message
    });
  }
};

// Actualizar servicio
const actualizarServicio = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { 
      fecha_entrega_estimada,
      tipo_servicio,
      descripcion,
      estado_servicio,
      empleados,    // Array de RFCs (Opcional)
      refacciones,  // Array de Objetos (Opcional)
      herramientas  // Array de IDs (Opcional)
    } = req.body;

    // 1. Verificar que el servicio existe
    const [servicioExiste] = await connection.query(
      'SELECT * FROM servicios WHERE id_servicio = ?',
      [id]
    );

    if (servicioExiste.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'Servicio no encontrado' 
      });
    }

    // 2. Validar estado_servicio si se proporciona
    const estadosValidos = ['Pendiente', 'En Proceso', 'Espera de Refacciones', 'Terminado', 'Entregado'];
    if (estado_servicio && !estadosValidos.includes(estado_servicio)) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `El estado del servicio debe ser uno de: ${estadosValidos.join(', ')}` 
      });
    }

    // 3. Determinar el estado que tendrán las herramientas
    // Usamos el estado nuevo si se envió, o conservamos el actual si no.
    const estadoFinalServicio = estado_servicio || servicioExiste[0].estado_servicio;
    let estadoHerramientas = 'Ocupada'; // Por defecto

    if (['Terminado', 'Entregado'].includes(estadoFinalServicio)) {
      estadoHerramientas = 'Libre';
    } else if (['Pendiente', 'En Proceso', 'Espera de Refacciones'].includes(estadoFinalServicio)) {
      estadoHerramientas = 'Ocupada';
    }

    // 4. Actualizar datos básicos del servicio
    await connection.query(
      `UPDATE servicios 
       SET fecha_entrega_estimada = ?,
           tipo_servicio = ?,
           descripcion = ?,
           estado_servicio = ?
       WHERE id_servicio = ?`,
      [
        fecha_entrega_estimada !== undefined ? fecha_entrega_estimada : servicioExiste[0].fecha_entrega_estimada,
        tipo_servicio || servicioExiste[0].tipo_servicio,
        descripcion || servicioExiste[0].descripcion,
        estado_servicio || servicioExiste[0].estado_servicio,
        id
      ]
    );

    // --- GESTIÓN DE RELACIONES ---

    // A. Actualizar Empleados (Si se envía la lista)
    if (empleados) {
      await connection.query('DELETE FROM servicio_empleados WHERE id_servicio = ?', [id]);
      for (const rfc of empleados) {
        await connection.query('INSERT INTO servicio_empleados (id_servicio, rfc_empleado) VALUES (?, ?)', [id, rfc]);
      }
    }

    // B. Actualizar Refacciones (Si se envía la lista)
    if (refacciones) {
      // 1. Devolver stock de las anteriores
      const [refaccionesViejas] = await connection.query('SELECT id_refaccion, cantidad_usada FROM servicio_refacciones WHERE id_servicio = ?', [id]);
      for (const oldRef of refaccionesViejas) {
        await connection.query('UPDATE refacciones SET cantidad_stock = cantidad_stock + ? WHERE id_refaccion = ?', [oldRef.cantidad_usada, oldRef.id_refaccion]);
      }

      // 2. Borrar asignaciones viejas
      await connection.query('DELETE FROM servicio_refacciones WHERE id_servicio = ?', [id]);

      // 3. Insertar nuevas y descontar stock
      for (const newRef of refacciones) {
        const [stockCheck] = await connection.query('SELECT cantidad_stock, precio_venta FROM refacciones WHERE id_refaccion = ?', [newRef.id_refaccion]);
        
        if (stockCheck.length === 0 || stockCheck[0].cantidad_stock < newRef.cantidad_usada) {
          throw new Error(`Stock insuficiente para la refacción ${newRef.id_refaccion}`);
        }

        await connection.query('UPDATE refacciones SET cantidad_stock = cantidad_stock - ? WHERE id_refaccion = ?', [newRef.cantidad_usada, newRef.id_refaccion]);
        
        await connection.query(
          'INSERT INTO servicio_refacciones (id_servicio, id_refaccion, cantidad_usada, precio_unitario_cobrado) VALUES (?, ?, ?, ?)',
          [id, newRef.id_refaccion, newRef.cantidad_usada, newRef.precio_unitario_cobrado || stockCheck[0].precio_venta]
        );
      }
    }

    // C. Actualizar Herramientas (CASO CRÍTICO)
    if (herramientas) {
      // CASO 1: Se está modificando la LISTA de herramientas
      // Borramos las anteriores (liberándolas de este servicio)
      await connection.query('DELETE FROM servicio_herramientas WHERE id_servicio = ?', [id]);
      
      // Insertamos las nuevas con el estado correcto calculado arriba
      for (const id_h of herramientas) {
        await connection.query(
          'INSERT INTO servicio_herramientas (id_servicio, id_herramienta, estado) VALUES (?, ?, ?)', 
          [id, id_h, estadoHerramientas]
        );
      }
    } else if (estado_servicio) {
      // CASO 2: NO se modificó la lista, pero SÍ cambió el estado del servicio
      // Actualizamos el estado de las herramientas existentes
      await connection.query(
        'UPDATE servicio_herramientas SET estado = ? WHERE id_servicio = ?',
        [estadoHerramientas, id]
      );
    }

    await connection.commit();

    // Obtener servicio actualizado para devolverlo al frontend
    const [servicioActualizado] = await connection.query(
      `SELECT s.*,
              t.placa, t.marca as trailer_marca, t.modelo as trailer_modelo,
              t.id_cliente,
              c.nombre as cliente_nombre, c.apellido_paterno as cliente_apellido_paterno,
              CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', c.apellido_materno) as cliente_nombre_completo
       FROM servicios s
       INNER JOIN trailers t ON s.num_serie_trailer = t.num_serie
       INNER JOIN clientes c ON t.id_cliente = c.id_cliente
       WHERE s.id_servicio = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Servicio actualizado exitosamente',
      data: servicioActualizado[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar servicio',
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Eliminar servicio
const eliminarServicio = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Verificar que el servicio existe
    const [servicioExiste] = await connection.query(
      'SELECT * FROM servicios WHERE id_servicio = ?',
      [id]
    );

    if (servicioExiste.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }

    // Devolver refacciones al stock antes de eliminar
    const [refaccionesUsadas] = await connection.query(
      'SELECT id_refaccion, cantidad_usada FROM servicio_refacciones WHERE id_servicio = ?',
      [id]
    );

    for (const refaccion of refaccionesUsadas) {
      await connection.query(
        'UPDATE refacciones SET cantidad_stock = cantidad_stock + ? WHERE id_refaccion = ?',
        [refaccion.cantidad_usada, refaccion.id_refaccion]
      );
    }

    // Las tablas intermedias se eliminarán automáticamente por CASCADE
    // Eliminar servicio
    await connection.query('DELETE FROM servicios WHERE id_servicio = ?', [id]);

    await connection.commit();

    res.status(200).json({
      success: true,
      message: 'Servicio eliminado exitosamente',
      data: servicioExiste[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar servicio',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Devolver herramienta (cambiar estado a Libre manualmente)
const devolverHerramienta = async (req, res) => {
  try {
    const { id_servicio, id_herramienta } = req.params;

    // Verificar que la asignación existe y está ocupada
    const [asignacion] = await pool.query(
      `SELECT * FROM servicio_herramientas 
       WHERE id_servicio = ? AND id_herramienta = ? AND estado = "Ocupada"`,
      [id_servicio, id_herramienta]
    );

    if (asignacion.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró la asignación de herramienta o ya está libre'
      });
    }

    // Actualizar estado a Libre
    await pool.query(
      'UPDATE servicio_herramientas SET estado = "Libre" WHERE id_servicio = ? AND id_herramienta = ?',
      [id_servicio, id_herramienta]
    );

    res.status(200).json({
      success: true,
      message: 'Herramienta marcada como libre exitosamente'
    });

  } catch (error) {
    console.error('Error al liberar herramienta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al liberar herramienta',
      error: error.message
    });
  }
};

module.exports = {
  crearServicio,
  obtenerServicios,
  obtenerServicioPorId,
  buscarServicios,
  actualizarServicio,
  eliminarServicio,
  devolverHerramienta
};