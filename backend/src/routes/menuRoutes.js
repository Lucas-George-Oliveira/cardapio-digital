const express = require("express");
const router = express.Router();
const { getMenu } = require("../controllers/menuController");

router.get("/", getMenu);

module.exports = router;
