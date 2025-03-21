const express = require("express");
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
const PORT = 8080;

// Configuración de la conexión a la base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'iotapp_saves',
};

// Función para sincronizar los datos de la API con la base de datos
const syncData = async () => {
    try {
        // Conexión a la base de datos
        const connection = await mysql.createConnection(dbConfig);

        // Obtener datos de la API
        const response = await axios.get('https://moriahmkt.com/iotapp/');
        const parcelas = response.data.parcelas;

        for (const parcela of parcelas) {
            // Verificar si la parcela ya existe
            const [rows] = await connection.execute(
                `SELECT * FROM parcelas WHERE id_parcela = ?`,
                [parcela.id]
            );

            if (rows.length === 0) {
                // Insertar nueva parcela
                await connection.execute(
                    `INSERT INTO parcelas (id_parcela, nombre, ubicacion, responsable, tipo_cultivo) VALUES (?, ?, ?, ?, ?)`,
                    [
                        parcela.id,
                        parcela.nombre,
                        `${parcela.latitud}, ${parcela.longitud}`,
                        parcela.responsable,
                        parcela.tipo_cultivo,
                    ]
                );
            }

            // Verificar si los datos del sensor han cambiado
            const [sensorRows] = await connection.execute(
                `SELECT * FROM datos_sensores WHERE id_parcela_id = ? ORDER BY fecha_registro DESC, hora_registro DESC LIMIT 1`,
                [parcela.id]
            );

            const latestSensorData = sensorRows[0];
            const hasChanged =
                !latestSensorData ||
                latestSensorData.humedad !== parcela.sensor.humedad ||
                latestSensorData.temperatura !== parcela.sensor.temperatura ||
                latestSensorData.lluvia !== parcela.sensor.lluvia ||
                latestSensorData.sol !== parcela.sensor.sol;

            if (hasChanged) {
                // Insertar nuevos datos del sensor
                const now = new Date();
                const fecha = now.toISOString().split('T')[0];
                const hora = now.toTimeString().split(' ')[0];

                await connection.execute(
                    `INSERT INTO datos_sensores (id_parcela_id, fecha_registro, hora_registro, humedad, temperatura, lluvia, sol) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        parcela.id,
                        fecha,
                        hora,
                        parcela.sensor.humedad,
                        parcela.sensor.temperatura,
                        parcela.sensor.lluvia,
                        parcela.sensor.sol,
                    ]
                );
            }
        }

        await connection.end();
        console.log('Sincronización completada.');
    } catch (error) {
        console.error('Error al sincronizar los datos:', error);
    }
};

// Endpoint para iniciar la sincronización
app.get('/sync', async (req, res) => {
    await syncData();
    res.send('Sincronización completada.');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});