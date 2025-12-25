const express = require("express");
const multer = require("multer");
const recordsController = require("../controllers/recordsController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Configure multer for file uploads (memory storage, max 1MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed.'));
    }
  }
});

// File upload routes
router.post("/upload", upload.single('file'), recordsController.uploadFile);
router.get("/file/:cid", recordsController.retrieveFile);
router.get("/file/:cid/url", recordsController.getFileUrl);

// Existing routes
router.post("/", authMiddleware, recordsController.create);
router.post("/diagnostic", recordsController.createDiagnosticReport);
router.post("/patient/:hhNumber/grant", recordsController.grantAccessByPatient);
router.post("/patient/:hhNumber/revoke", recordsController.revokeAccessByPatient);
router.get("/patient/:hhNumber/granted-doctors", recordsController.getGrantedDoctors);
router.get("/patient/:hhNumber/all", recordsController.getPatientRecords);
router.get("/diagnostic/:hhNumber/reports", recordsController.getDiagnosticReports);
router.get("/:recordId", recordsController.get);
router.patch("/:recordId", authMiddleware, recordsController.update);
router.post("/:recordId/access", authMiddleware, recordsController.grantAccess);
router.delete("/:recordId/access", authMiddleware, recordsController.revokeAccess);
router.get("/:recordId/access", recordsController.hasAccess);

// Demo Intelligence Suite
router.post("/seed-demo", recordsController.seedDemo);

module.exports = router;
