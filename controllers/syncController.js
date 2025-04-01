const mysql = require("mysql2/promise");
const axios = require("axios");
const { dbConfig } = require("../models/dbConfig");

const syncData = async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Obtener datos de la API
        const response = await axios.get("https://moriahmkt.com/iotapp/updated/");
        const parcelas = response.data.parcelas;
        const sensoresGenerales = response.data.sensores;

        // Obtener todas las parcelas borradas de la base de datos
        const [parcelasBorradas] = await connection.execute(
            `SELECT id_parcela_id FROM parcelas_borradas`
        );

        // Identificar parcelas que reaparecieron en la API
        const parcelasReaparecidas = parcelasBorradas.filter((parcelaBorrada) =>
            parcelas.some((parcela) => parcela.id === parcelaBorrada.id_parcela_id)
        );

        // Eliminar parcelas reaparecidas de la tabla parcelas_borradas
        for (const parcelaReaparecida of parcelasReaparecidas) {
            await connection.execute(
                `DELETE FROM parcelas_borradas WHERE id_parcela_id = ?`,
                [parcelaReaparecida.id_parcela_id]
            );
        }

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
                `SELECT COUNT(*) AS count FROM parcelas_borradas WHERE id_parcela_id = ?`,
                [parcelaEliminada.id_parcela]
            );

            if (exists[0].count === 0) {
                await connection.execute(
                    `INSERT IGNORE INTO parcelas_borradas (id_parcela_id, fecha_eliminado) VALUES (?, ?)`,
                    [parcelaEliminada.id_parcela, new Date()]
                );
            }
        }

        // Sincronizar datos de sensores generales
        if (sensoresGenerales) {
            const now = new Date();
            const fecha = now.toISOString().split("T")[0];
            const hora = now.toTimeString().split(" ")[0];

            await connection.execute(
                `INSERT INTO sensores (fecha_registro, hora_registro, humedad, temperatura, lluvia, sol) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    fecha,
                    hora,
                    sensoresGenerales.humedad,
                    sensoresGenerales.temperatura,
                    sensoresGenerales.lluvia,
                    sensoresGenerales.sol,
                ]
            );
        }

        // Sincronizar parcelas existentes o nuevas
        for (const parcela of parcelas) {
            const [rows] = await connection.execute(
                `SELECT * FROM parcelas WHERE id_parcela = ?`,
                [parcela.id]
            );

            if (rows.length === 0) {
                await connection.execute(
                    `INSERT INTO parcelas (id_parcela, nombre, ubicacion, responsable, tipo_cultivo) 
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    nombre = VALUES(nombre), 
                    ubicacion = VALUES(ubicacion), 
                    responsable = VALUES(responsable), 
                    tipo_cultivo = VALUES(tipo_cultivo)`,
                    [
                        parcela.id,
                        parcela.nombre,
                        `${parcela.latitud}, ${parcela.longitud}`,
                        parcela.responsable,
                        parcela.tipo_cultivo,
                    ]
                );
            }

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
                const fecha = now.toISOString().split("T")[0];
                const hora = now.toTimeString().split(" ")[0];

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
        console.log("Sincronización completada.");
        res.send("Sincronización completada.");
    } catch (error) {
        console.error("Error al sincronizar los datos:", error);
        res.status(500).send("Error al sincronizar los datos.");
    }
};

module.exports = { syncData };