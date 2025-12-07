const mysql = require('mysql2');
require('dotenv').config();

// Crear el pool de conexiones
const pool = mysql.createPool({
  host: br8403njqzikmkiuxsyl-mysql.services.clever-cloud.com,
  user: uakvssuyht1s1qno,
  password: wklsB1No6Ftt5p8sMoaJ,
  database: br8403njqzikmkiuxsyl,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Convertir a promesas para usar async/await
const promisePool = pool.promise();

// Función para verificar la conexión
const testConnection = async () => {
  try {
    const [rows] = await promisePool.query('SELECT 1');
    console.log('Conexión exitosa a la base de datos MySQL');
    return true;
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error.message);
    return false;
  }
};

module.exports = {
  pool: promisePool,
  testConnection
};