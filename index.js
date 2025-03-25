const express = require("express");
const mysql = require('mysql2/promise');
const axios = require('axios');
const cors = require('cors'); // Importar cors

const app = express();
const PORT = 8080;

// Habilitar CORS
app.use(cors());

// Configuración de la conexión a la base de datos
const dbConfig = {
    host: 'mysql-tanukistyles.alwaysdata.net',
    user: '368585',
    password: '46154774',
    database: 'tanukistyles_iotapp',
};

// Función para sincronizar los datos de la API con la base de datos
const syncData = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Obtener datos de la API
        const response = await axios.get('https://moriahmkt.com/iotapp/test/');
        const parcelas = response.data.parcelas;

        // Obtener todas las parcelas existentes en la base de datos
        const [dbParcelas] = await connection.execute(`SELECT * FROM parcelas`);

        // Identificar parcelas eliminadas (presentes en la BD pero no en la API)
        const apiParcelasIds = parcelas.map((parcela) => parcela.id);
        const parcelasEliminadas = dbParcelas.filter(
            (parcela) => !apiParcelasIds.includes(parcela.id_parcela)
        );

        // Registrar parcelas eliminadas en la tabla parcelas_borradas si no están ya registradas
        for (const parcelaEliminada of parcelasEliminadas) {
            const [exists] = await connection.execute(
                `SELECT * FROM parcelas_borradas WHERE id_parcela_id = ?`,
                [parcelaEliminada.id_parcela]
            );

            if (exists.length === 0) {
                await connection.execute(
                    `INSERT INTO parcelas_borradas (id_parcela_id, fecha_eliminado) VALUES (?, ?)`,
                    [parcelaEliminada.id_parcela, new Date()]
                );
            }
        }

        // Sincronizar parcelas existentes o nuevas
        for (const parcela of parcelas) {
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

// Endpoint para obtener los datos de las parcelas y sensores
app.get('/parcelas', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [parcelas] = await connection.execute(`
            SELECT 
                p.id_parcela AS id,
                p.nombre,
                p.ubicacion,
                p.responsable,
                p.tipo_cultivo,
                ds.humedad,
                ds.temperatura,
                ds.lluvia,
                ds.sol,
                ds.fecha_registro,
                ds.hora_registro
            FROM parcelas p
            LEFT JOIN datos_sensores ds ON p.id_parcela = ds.id_parcela_id
            ORDER BY ds.fecha_registro DESC, ds.hora_registro DESC
        `);

        await connection.end();

        res.json(parcelas);
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        res.status(500).send('Error al obtener los datos.');
    }
});
// Endpoint para obtener los datos de una parcela específica por ID
app.get('/parcelas/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la parcela desde los parámetros de la URL
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [parcela] = await connection.execute(`
            SELECT 
                p.id_parcela AS id,
                p.nombre,
                p.ubicacion,
                p.responsable,
                p.tipo_cultivo,
                ds.humedad,
                ds.temperatura,
                ds.lluvia,
                ds.sol,
                ds.fecha_registro,
                ds.hora_registro
            FROM parcelas p
            LEFT JOIN datos_sensores ds ON p.id_parcela = ds.id_parcela_id
            WHERE p.id_parcela = ?
            ORDER BY ds.fecha_registro DESC, ds.hora_registro DESC
            LIMIT 1
        `, [id]);

        await connection.end();

        if (parcela.length === 0) {
            res.status(404).send('Parcela no encontrada.');
        } else {
            res.json(parcela[0]); // Devolver la parcela encontrada
        }
    } catch (error) {
        console.error('Error al obtener la parcela:', error);
        res.status(500).send('Error al obtener la parcela.');
    }
});
// Endpoint para obtener datos de los sensores por hora
app.get('/sensores/:id_parcela/por-hora', async (req, res) => {
    const { id_parcela } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [datosPorHora] = await connection.execute(`
            SELECT 
                p.nombre AS parcela,
                d.fecha_registro AS fecha,
                d.hora_registro AS hora,
                d.humedad,
                d.temperatura,
                d.lluvia,
                d.sol
            FROM parcelas p
            JOIN datos_sensores d ON p.id_parcela = d.id_parcela_id
            WHERE p.id_parcela = ?
            ORDER BY d.fecha_registro DESC, d.hora_registro DESC
        `, [id_parcela]);

        await connection.end();

        res.json(datosPorHora);
    } catch (error) {
        console.error('Error al obtener los datos por hora:', error);
        res.status(500).send('Error al obtener los datos por hora.');
    }
});

// Endpoint para obtener datos de los sensores por día de una parcela específica
app.get('/sensores/:id_parcela/por-dia', async (req, res) => {
    const { id_parcela } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [datosPorDia] = await connection.execute(`
            SELECT 
                p.nombre AS parcela,
                DATE_FORMAT(d.fecha_registro, '%Y-%m-%d') AS fecha,
                AVG(d.humedad) AS humedad,
                AVG(d.temperatura) AS temperatura,
                AVG(d.lluvia) AS lluvia,
                AVG(d.sol) AS sol
            FROM parcelas p
            JOIN datos_sensores d ON p.id_parcela = d.id_parcela_id
            WHERE p.id_parcela = ?
            GROUP BY p.nombre, fecha
            ORDER BY fecha DESC
        `, [id_parcela]);

        await connection.end();

        res.json(datosPorDia);
    } catch (error) {
        console.error('Error al obtener los datos por día:', error);
        res.status(500).send('Error al obtener los datos por día.');
    }
});

// Endpoint para obtener todos los datos de los sensores de una parcela específica
app.get('/sensores/:id_parcela/todos', async (req, res) => {
    const { id_parcela } = req.params;
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [todosLosDatos] = await connection.execute(`
            SELECT 
                p.nombre AS parcela,
                d.fecha_registro AS fecha,
                d.hora_registro AS hora,
                d.humedad,
                d.temperatura,
                d.lluvia,
                d.sol
            FROM parcelas p
            JOIN datos_sensores d ON p.id_parcela = d.id_parcela_id
            WHERE p.id_parcela = ?
            ORDER BY d.fecha_registro DESC, d.hora_registro DESC
        `, [id_parcela]);

        await connection.end();

        res.json(todosLosDatos);
    } catch (error) {
        console.error('Error al obtener todos los datos de los sensores:', error);
        res.status(500).send('Error al obtener todos los datos de los sensores.');
    }
});

// Endpoint para obtener los datos de las parcelas borradas
app.get('/parcelas-borradas', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [parcelasBorradas] = await connection.execute(`
            SELECT 
                pb.id_parcela_id AS id,
                p.nombre,
                p.ubicacion,
                p.responsable,
                p.tipo_cultivo,
                pb.fecha_eliminado
            FROM parcelas_borradas pb
            JOIN parcelas p ON pb.id_parcela_id = p.id_parcela
            ORDER BY pb.fecha_eliminado DESC
        `);

        await connection.end();

        res.json(parcelasBorradas);
    } catch (error) {
        console.error('Error al obtener las parcelas borradas:', error);
        res.status(500).send('Error al obtener las parcelas borradas.');
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});