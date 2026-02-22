const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const artifactPath = path.join(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "HealthLedger.sol",
  "HealthLedger.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const provider = new ethers.JsonRpcProvider((process.env.POLYGON_AMOY_RPC || "").trim());
const wallet = new ethers.Wallet((process.env.PRIVATE_KEY || "").trim(), provider);
const contract = new ethers.Contract((process.env.CONTRACT_ADDRESS || "").trim(), artifact.abi, wallet);

const toRecordId = (recordId) =>
  recordId.startsWith("0x") && recordId.length === 66 ? recordId : ethers.id(recordId);

exports.createRecord = (recordId, patient, cid, meta) =>
  contract.createRecord(toRecordId(recordId), patient, cid, meta);

exports.getRecord = async (recordId) => {
  const data = await contract.getRecord(toRecordId(recordId));
  return {
    recordId,
    patient: data[0],
    createdBy: data[1],
    cid: data[2],
    meta: data[3],
    createdAt: Number(data[4]),
  };
};

exports.updateRecord = (recordId, cid, meta) =>
  contract.updateRecord(toRecordId(recordId), cid, meta);

exports.grantAccess = (recordId, address) =>
  contract.grantAccess(toRecordId(recordId), address);

exports.revokeAccess = (recordId, address) =>
  contract.revokeAccess(toRecordId(recordId), address);

exports.hasAccess = (recordId, address) => contract.hasAccess(toRecordId(recordId), address);

exports.getDoctorRole = () => contract.DOCTOR_ROLE();

exports.hasDoctorRole = async (address) => {
  const doctorRole = await exports.getDoctorRole();
  return contract.hasRole(doctorRole, address);
};

exports.getPatient = async (hhNumber) => {
  const data = await contract.getPatient(Number(hhNumber));
  return {
    name: data[0],
    dob: Number(data[1]),
    gender: data[2],
    bloodGroup: data[3],
    homeAddress: data[4],
    email: data[5],
    walletAddress: data[6],
  };
};

exports.getDoctor = async (hhNumber) => {
  const data = await contract.getDoctor(Number(hhNumber));
  return {
    name: data[0],
    specialization: data[1],
    hospital: data[2],
    email: data[3],
    walletAddress: data[4],
  };
};

exports.getDiagnostic = async (hhNumber) => {
  const data = await contract.getDiagnostic(Number(hhNumber));
  return {
    name: data[0],
    location: data[1],
    email: data[2],
    walletAddress: data[3],
  };
};

exports.registerPatient = (name, dob, gender, bloodGroup, homeAddress, email, hhNumber, walletAddress) => {
  const dobTimestamp = Math.floor(new Date(dob).getTime() / 1000);
  return contract.registerPatient(name, dobTimestamp, gender, bloodGroup, homeAddress, email, Number(hhNumber), walletAddress);
}

exports.registerDoctor = (name, specialization, hospital, email, hhNumber, walletAddress) => {
  return contract.registerDoctor(name, specialization, hospital, email, Number(hhNumber), walletAddress);
}

exports.registerDiagnostic = (name, location, email, hhNumber, walletAddress) => {
  return contract.registerDiagnostic(name, location, email, Number(hhNumber), walletAddress);
}

exports.getDoctorPatients = (doctorAddress) => contract.getDoctorPatients(doctorAddress);
