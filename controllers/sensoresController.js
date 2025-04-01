const { getConnection } = require("../models/dbConfig");
const mysql = require("mysql2/promise");
const { dbConfig } = require("../models/dbConfig");

const getSensoresPorHora = async (req, res) => {
    const { id_parcela } = req.params;
    try {
        const connection = await getConnection();
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
        console.error("Error al obtener los datos por hora:", error);
        res.status(500).send("Error al obtener los datos por hora.");
    }
};

const getSensoresPorDia = async (req, res) => {
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
}


const getPorcentajeHumedad = async (req, res) => {
    const { id_parcela } = req.params; // Obtener el ID de la parcela desde los parámetros de la URL
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Obtener la suma total de humedad y el número total de registros para la parcela específica
        const [result] = await connection.execute(`
            SELECT 
                SUM(humedad) AS total_humedad,
                COUNT(*) AS total_registros
            FROM datos_sensores
            WHERE id_parcela_id = ?
        `, [id_parcela]);

        await connection.end();

        const totalHumedad = result[0].total_humedad;
        const totalRegistros = result[0].total_registros;

        // Calcular el porcentaje de humedad total para la parcela
        const porcentajeHumedad = totalRegistros ? (totalHumedad / totalRegistros).toFixed(2) : 0;

        res.json({ porcentaje_humedad: porcentajeHumedad });
    } catch (error) {
        console.error('Error al obtener el porcentaje de humedad de la parcela:', error);
        res.status(500).send('Error al obtener el porcentaje de humedad de la parcela.');
    }
};

//sensores generales dia
const getSensoresGeneralesPorDia = async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [datosPorDia] = await connection.execute(`
            SELECT 
                DATE_FORMAT(fecha_registro, '%Y-%m-%d') AS fecha,
                AVG(humedad) AS humedad,
                AVG(temperatura) AS temperatura,
                AVG(lluvia) AS lluvia,
                AVG(sol) AS sol
            FROM sensores
            GROUP BY fecha
            ORDER BY fecha DESC
        `);

        await connection.end();

        res.json(datosPorDia);
    } catch (error) {
        console.error('Error al obtener los datos de los sensores generales por día:', error);
        res.status(500).send('Error al obtener los datos de los sensores generales por día.');
    }
};

//sensores generales porcentaje de humedad
const getSensoresGeneralesHumedad = async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Obtener la suma total de humedad y el número total de registros
        const [result] = await connection.execute(`
            SELECT 
                SUM(humedad) AS total_humedad,
                COUNT(*) AS total_registros
            FROM sensores
        `);

        await connection.end();

        const totalHumedad = result[0].total_humedad;
        const totalRegistros = result[0].total_registros;

        // Calcular el porcentaje de humedad total
        const porcentajeHumedad = totalRegistros ? (totalHumedad / totalRegistros).toFixed(2) : 0;

        res.json({ porcentaje_humedad: porcentajeHumedad });
    } catch (error) {
        console.error('Error al obtener el porcentaje de humedad:', error);
        res.status(500).send('Error al obtener el porcentaje de humedad.');
    }
};

// Endpoint para obtener datos de los sensores generales por hora
const getSensoresGeneralesPorHora = async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [datosPorHora] = await connection.execute(`
            SELECT 
                DATE_FORMAT(fecha_registro, '%Y-%m-%d') AS fecha,
                hora_registro AS hora,
                AVG(humedad) AS humedad,
                AVG(temperatura) AS temperatura,
                AVG(lluvia) AS lluvia,
                AVG(sol) AS sol
            FROM sensores
            GROUP BY fecha, hora
            ORDER BY fecha DESC, hora DESC
        `);

        await connection.end();

        res.json(datosPorHora);
    } catch (error) {
        console.error('Error al obtener los datos de los sensores generales por hora:', error);
        res.status(500).send('Error al obtener los datos de los sensores generales por hora.');
    }
};

module.exports = { getSensoresPorHora, getSensoresPorDia, getPorcentajeHumedad, getSensoresGeneralesPorDia, getSensoresGeneralesHumedad, getSensoresGeneralesPorHora };