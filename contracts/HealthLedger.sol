// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title HealthLedger - Simple on-chain registry mapping record IDs to IPFS CIDs with ACL
contract HealthLedger is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PATIENT_ROLE = keccak256("PATIENT_ROLE");
    bytes32 public constant DIAGNOSTIC_ROLE = keccak256("DIAGNOSTIC_ROLE");

    struct Record {
        address patient;
        address createdBy;
        string cid;
        string meta;
        uint256 createdAt;
    }

    struct Patient {
        string name;
        uint256 dob;
        string gender;
        string bloodGroup;
        string homeAddress;
        string email;
        address walletAddress;
    }

    struct Doctor {
        string name;
        string specialization;
        string hospital;
        string email;
        address walletAddress;
    }

    struct Diagnostic {
        string name;
        string location;
        string email;
        address walletAddress;
    }

    mapping(bytes32 => Record) private records;
    mapping(bytes32 => mapping(address => bool)) private access;
    mapping(address => bytes32[]) private doctorPatients;
    mapping(uint256 => Patient) private patients;
    mapping(uint256 => Doctor) private doctors;
    mapping(uint256 => Diagnostic) private diagnostics;

    event RecordCreated(bytes32 indexed recordId, address indexed patient, address indexed createdBy, string cid);
    event AccessGranted(bytes32 indexed recordId, address indexed grantee, address indexed granter);
    event AccessRevoked(bytes32 indexed recordId, address indexed grantee, address indexed revoker);
    event RecordUpdated(bytes32 indexed recordId, string newCid, string newMeta, address indexed updater);

    constructor(address admin) {
        require(admin != address(0), "admin required");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // ---------- Modifiers ----------
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not admin");
        _;
    }

    modifier onlyDoctorOrAdmin() {
        require(hasRole(DOCTOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not doctor/admin");
        _;
    }

    // ---------- Write functions ----------

    /// @notice Create a new record id => CID for a patient.
    /// @dev Anyone with DOCTOR_ROLE or ADMIN_ROLE can create. Patients may self-create by setting patient=msg.sender.
    function createRecord(bytes32 recordId, address patient, string calldata cid, string calldata meta) external onlyDoctorOrAdmin {
        require(patient != address(0), "patient required");
        require(records[recordId].createdAt == 0, "exists");
        records[recordId] = Record({
            patient: patient,
            createdBy: msg.sender,
            cid: cid,
            meta: meta,
            createdAt: block.timestamp
        });
        // by default: patient, creator, and admins have access
        access[recordId][patient] = true;
        access[recordId][msg.sender] = true;
        emit RecordCreated(recordId, patient, msg.sender, cid);
    }

    /// @notice Update CID and/or meta for a record
    /// @dev Only admins, or the patient, or creator who currently has access may update
    function updateRecord(bytes32 recordId, string calldata newCid, string calldata newMeta) external {
        Record storage r = records[recordId];
        require(r.createdAt != 0, "not found");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            msg.sender == r.patient || access[recordId][msg.sender],
            "no permission"
        );
        r.cid = newCid;
        r.meta = newMeta;
        emit RecordUpdated(recordId, newCid, newMeta, msg.sender);
    }

    /// @notice Grant access to an address for a record. Only patient or admin can grant.
    function grantAccess(bytes32 recordId, address grantee) external {
        Record storage r = records[recordId];
        require(r.createdAt != 0, "not found");
        require(grantee != address(0), "bad grantee");
        require(msg.sender == r.patient || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not owner/admin");
        
        if (hasRole(DOCTOR_ROLE, grantee)) {
            doctorPatients[grantee].push(recordId);
        }

        access[recordId][grantee] = true;
        emit AccessGranted(recordId, grantee, msg.sender);
    }

    /// @notice Revoke access to an address for a record. Only patient or admin can revoke.
    function revokeAccess(bytes32 recordId, address grantee) external {
        Record storage r = records[recordId];
        require(r.createdAt != 0, "not found");
        require(msg.sender == r.patient || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not owner/admin");
        access[recordId][grantee] = false;
        emit AccessRevoked(recordId, grantee, msg.sender);
    }

    /// @notice Assign DOCTOR role. Only admin can call.
    function addDoctor(address account) external onlyAdmin {
        _grantRole(DOCTOR_ROLE, account);
    }

    /// @notice Remove DOCTOR role. Only admin can call.
    function removeDoctor(address account) external onlyAdmin {
        _revokeRole(DOCTOR_ROLE, account);
    }

    function registerPatient(string calldata name, uint256 dob, string calldata gender, string calldata bloodGroup, string calldata homeAddress, string calldata email, uint256 hhNumber, address walletAddress) external {
        require(msg.sender == walletAddress || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Can only register yourself or be an admin");
        require(patients[hhNumber].walletAddress == address(0), "HH Number already registered");
        patients[hhNumber] = Patient(name, dob, gender, bloodGroup, homeAddress, email, walletAddress);
        _grantRole(PATIENT_ROLE, walletAddress);
    }

    function registerDoctor(string calldata name, string calldata specialization, string calldata hospital, string calldata email, uint256 hhNumber, address walletAddress) external {
        require(msg.sender == walletAddress || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Can only register yourself or be an admin");
        require(doctors[hhNumber].walletAddress == address(0), "HH Number already registered");
        doctors[hhNumber] = Doctor(name, specialization, hospital, email, walletAddress);
        _grantRole(DOCTOR_ROLE, walletAddress);
    }

    function registerDiagnostic(string calldata name, string calldata location, string calldata email, uint256 hhNumber, address walletAddress) external {
        require(msg.sender == walletAddress || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Can only register yourself or be an admin");
        require(diagnostics[hhNumber].walletAddress == address(0), "HH Number already registered");
        diagnostics[hhNumber] = Diagnostic(name, location, email, walletAddress);
        _grantRole(DIAGNOSTIC_ROLE, walletAddress);
    }

    // ---------- Read functions ----------

    function getRecord(bytes32 recordId)
        external
        view
        returns (address patient, address createdBy, string memory cid, string memory meta, uint256 createdAt)
    {
        Record storage r = records[recordId];
        require(r.createdAt != 0, "not found");
        require(
            hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            msg.sender == r.patient || access[recordId][msg.sender],
            "no access"
        );
        return (r.patient, r.createdBy, r.cid, r.meta, r.createdAt);
    }

    function hasAccess(bytes32 recordId, address account) external view returns (bool) {
        Record storage r = records[recordId];
        if (r.createdAt == 0) return false;
        if (account == r.patient) return true;
        if (hasRole(ADMIN_ROLE, account) || hasRole(DEFAULT_ADMIN_ROLE, account)) return true;
        return access[recordId][account];
    }

    function getDoctorPatients(address doctor) external view onlyDoctorOrAdmin returns (bytes32[] memory) {
        require(doctor != address(0), "doctor required");
        require(msg.sender == doctor || hasRole(ADMIN_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not authorized");
        return doctorPatients[doctor];
    }

    function getPatient(uint256 hhNumber) external view returns (string memory, uint256, string memory, string memory, string memory, string memory, address) {
        Patient storage p = patients[hhNumber];
        return (p.name, p.dob, p.gender, p.bloodGroup, p.homeAddress, p.email, p.walletAddress);
    }

    function getDoctor(uint256 hhNumber) external view returns (string memory, string memory, string memory, string memory, address) {
        Doctor storage d = doctors[hhNumber];
        return (d.name, d.specialization, d.hospital, d.email, d.walletAddress);
    }

    function getDiagnostic(uint256 hhNumber) external view returns (string memory, string memory, string memory, address) {
        Diagnostic storage diag = diagnostics[hhNumber];
        return (diag.name, diag.location, diag.email, diag.walletAddress);
    }
}
