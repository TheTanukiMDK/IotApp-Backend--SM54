const express = require("express");
const cors = require("cors");
const parcelasRoutes = require("./routes/parcelasRoutes");
const sensoresRoutes = require("./routes/sensoresRoutes");
const parcelasBorradasRoutes = require("./routes/parcelasBorradasRoutes");
const syncRoutes = require("./routes/syncRoutes");
const sensoresGeneralesRoutes = require("./routes/sensoresGeneralesRoutes");

const app = express();
const PORT = 8080;

// Habilitar CORS
app.use(cors());

// Rutas
app.use("/sync", syncRoutes); 
app.use("/parcelas", parcelasRoutes); 
app.use("/parcelas-borradas", parcelasBorradasRoutes); 
app.use("/sensores", sensoresRoutes); 
app.use("/sensores-generales", sensoresGeneralesRoutes); 
// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});