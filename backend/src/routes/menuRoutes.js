const express = require("express");
const router = express.Router();
const { getMenu, getMenuAdmin } = require("../controllers/menuController");

// A rota /admin DEVE vir antes da rota /
router.get("/admin", getMenuAdmin);
router.get("/", getMenu);

module.exports = router;
