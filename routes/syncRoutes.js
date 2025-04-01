const express = require("express");
const { syncData } = require("../controllers/syncController");

const router = express.Router();

router.get("/", syncData);

module.exports = router;