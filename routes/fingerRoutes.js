const express = require("express");
const cors = require("cors");

const {
  enrollFingerprint,
  requestEnroll,
  processEnrollRequest,
  scanFingerprint
} = require("../controllers/fingerControllers");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/fingerprint/enroll", enrollFingerprint);
app.get("/api/fingerprint/request_enroll", requestEnroll);
app.post("/api/fingerprint/request_enroll", processEnrollRequest);
app.post("/api/fingerprint/scan", scanFingerprint);

module.exports = app;