const { getConnection } = require("../models/dbConfig");
const mysql = require("mysql2/promise");
const { dbConfig } = require("../models/dbConfig");
const axios = require("axios");

const getParcelas = async (req, res) => {
    try {
        // Obtener las parcelas vigentes desde la API
        const response = await axios.get("https://moriahmkt.com/iotapp/updated/");
        const apiParcelasIds = response.data.parcelas.map(parcela => parcela.id);

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
            LEFT JOIN (
                SELECT 
                    id_parcela_id,
                    humedad,
                    temperatura,
                    lluvia,
                    sol,
                    fecha_registro,
                    hora_registro
                FROM datos_sensores
                WHERE (id_parcela_id, CONCAT(fecha_registro, ' ', hora_registro)) IN (
                    SELECT 
                        id_parcela_id,
                        MAX(CONCAT(fecha_registro, ' ', hora_registro)) AS max_fecha_hora
                    FROM datos_sensores
                    GROUP BY id_parcela_id
                )
            ) ds
            ON ds.id_parcela_id = p.id_parcela
            WHERE p.id_parcela IN (${apiParcelasIds.join(",")}) -- Filtrar solo las parcelas vigentes
            ORDER BY ds.fecha_registro DESC, ds.hora_registro DESC
        `);

        await connection.end();

        // Transformar los datos al formato solicitado
        const formattedParcelas = parcelas.map(parcela => {
            // Extraer latitud y longitud de la columna 'ubicacion'
            let latitud = null;
            let longitud = null;
            if (parcela.ubicacion) {
                const coords = parcela.ubicacion.split(',');
                latitud = parseFloat(coords[0]?.trim()) || null;
                longitud = parseFloat(coords[1]?.trim()) || null;
            }

            return {
                id: parcela.id,
                nombre: parcela.nombre,
                ubicacion: parcela.ubicacion,
                responsable: parcela.responsable,
                tipo_cultivo: parcela.tipo_cultivo,
                ultimo_riego: `${parcela.fecha_registro} ${parcela.hora_registro}`,
                sensor: {
                    humedad: parcela.humedad !== null && !isNaN(parcela.humedad) ? parseFloat(parseFloat(parcela.humedad).toFixed(1)) : null,
                    temperatura: parcela.temperatura !== null && !isNaN(parcela.temperatura) ? parseFloat(parseFloat(parcela.temperatura).toFixed(1)) : null,
                    lluvia: parcela.lluvia !== null && !isNaN(parcela.lluvia) ? parseFloat(parseFloat(parcela.lluvia).toFixed(1)) : null,
                    sol: parcela.sol !== null && !isNaN(parcela.sol) ? parseFloat(parcela.sol) : null,
                },
                latitud,
                longitud,
            };
        });

        res.json({ parcelas: formattedParcelas });
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