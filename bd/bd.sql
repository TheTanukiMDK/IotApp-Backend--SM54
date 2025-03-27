CREATE DATABASE iotapp;
USE iotapp; 

CREATE TABLE parcelas (
    id_parcela INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    ubicacion VARCHAR(110) NOT NULL,
    responsable VARCHAR(50) NOT NULL,
    tipo_cultivo VARCHAR(50) NOT NULL
);

CREATE TABLE datos_sensores (
    id_datos_sensores INT AUTO_INCREMENT PRIMARY KEY,
    id_parcela_id INT NOT NULL,
    fecha_registro DATE NOT NULL,
    hora_registro TIME NOT NULL,
    humedad DECIMAL(10,2) NOT NULL,
    temperatura DECIMAL(10,2) NOT NULL,
    lluvia DECIMAL(10,2) NOT NULL,
    sol DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_parcela_id) REFERENCES parcelas(id_parcela) ON DELETE CASCADE
);

CREATE TABLE parcelas_borradas(
    id_parcela_borrada INT AUTO_INCREMENT PRIMARY KEY,
    id_parcela_id INT NOT NULL,
    fecha_eliminado DATETIME NOT NULL,
    FOREIGN KEY (id_parcela_id) REFERENCES parcelas(id_parcela) ON DELETE CASCADE
)

CREATE TABLE sensores(
    id_sensores INT AUTO_INCREMENT PRIMARY KEY,
    fecha_registro DATE NOT NULL,
    hora_registro TIME NOT NULL,    
    humedad DECIMAL(10,2) NOT NULL,
    temperatura DECIMAL(10,2) NOT NULL,
    lluvia DECIMAL(10,2) NOT NULL,
    sol DECIMAL(10,2) NOT NULL
)