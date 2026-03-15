const express = require("express");
const router = express.Router();
const registerController = require("../controllers/registerController");

router.post("/patient", registerController.registerPatient);
router.post("/doctor", registerController.registerDoctor);
router.post("/diagnostic", registerController.registerDiagnostic);
router.get("/suggest-hh", registerController.suggestHHNumber);

module.exports = router;
