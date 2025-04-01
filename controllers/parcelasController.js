const { getConnection } = require("../models/dbConfig");
const mysql = require("mysql2/promise");
const { dbConfig } = require("../models/dbConfig");

const getParcelas = async (req, res) => {
    try {
        const connection = await getConnection();
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
        console.error("Error al obtener los datos:", error);
        res.status(500).send("Error al obtener los datos.");
    }
};

const getParcelaById = async (req, res) => {
    const { id } = req.params;
    try {
        const connection = await getConnection();
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
            res.status(404).send("Parcela no encontrada.");
        } else {
            res.json(parcela[0]);
        }
    } catch (error) {
        console.error("Error al obtener la parcela:", error);
        res.status(500).send("Error al obtener la parcela.");
    }
};

const getParcelasBorradas = async (req, res) => {
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
};
module.exports = { getParcelas, getParcelaById, getParcelasBorradas };