const mysql = require("mysql2/promise");

const dbConfig = {
    host: "localhost",
    user: "root",
    password: "naruto14",
    database: "iotapp_saves",
};

const getConnection = async () => {
    return await mysql.createConnection(dbConfig);
};

module.exports = { dbConfig, getConnection };