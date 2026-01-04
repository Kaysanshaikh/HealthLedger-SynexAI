# 🌐 HealthLedger API Documentation

## Base URL
```
http://localhost:5001/api
```

---

## 📋 Table of Contents

1. [Registration Endpoints](#registration-endpoints)
2. [Search Endpoints](#search-endpoints)
3. [Profile Endpoints](#profile-endpoints)
4. [Record Endpoints](#record-endpoints)
5. [User Endpoints](#user-endpoints)

---

## 🔐 Registration Endpoints

### Register Patient

**POST** `/api/register/patient`

Register a new patient on blockchain and database.

**Request Body:**
```json
{
  "name": "John Doe",
  "dob": "1990-01-01",
  "gender": "Male",
  "bloodGroup": "O+",
  "homeAddress": "123 Main Street, City",
  "email": "john@example.com",
  "hhNumber": 123456789,
  "walletAddress": "0x1234567890abcdef",
  "phoneNumber": "+1234567890",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "+0987654321",
  "allergies": "Penicillin",
  "chronicConditions": "None"
}
```

**Response:**
```json
{
  "message": "Patient registered successfully",
  "user": {
    "id": 1,
    "wallet": "0x1234567890abcdef",
    "email": "john@example.com",
    "role": "patient"
  },
  "profile": {
    "name": "John Doe",
    "hhNumber": 123456789,
    "bloodGroup": "O+"
  },
  "txHash": "0xabc123..."
}
```

---

### Register Doctor

**POST** `/api/register/doctor`

Register a new doctor on blockchain and database.

**Request Body:**
```json
{
  "name": "Dr. Smith",
  "specialization": "Cardiology",
  "hospital": "City Hospital",
  "email": "drsmith@example.com",
  "hhNumber": 987654321,
  "walletAddress": "0xabcdef1234567890",
  "phoneNumber": "+1234567890",
  "licenseNumber": "MED12345",
  "yearsOfExperience": 10
}
```

**Response:**
```json
{
  "message": "Doctor registered successfully",
  "user": {
    "id": 2,
    "wallet": "0xabcdef1234567890",
    "email": "drsmith@example.com",
    "role": "doctor"
  },
  "profile": {
    "name": "Dr. Smith",
    "hhNumber": 987654321,
    "specialization": "Cardiology",
    "hospital": "City Hospital"
  },
  "txHash": "0xdef456..."
}
```

---

### Register Diagnostic Center

**POST** `/api/register/diagnostic`

Register a new diagnostic center on blockchain and database.

**Request Body:**
```json
{
  "name": "City Diagnostics",
  "location": "Downtown, City",
  "email": "info@citydiagnostics.com",
  "hhNumber": 555666777,
  "walletAddress": "0x9876543210fedcba",
  "phoneNumber": "+1234567890",
  "servicesOffered": "Blood Tests, X-Ray, MRI",
  "accreditation": "NABL Certified"
}
```

**Response:**
```json
{
  "message": "Diagnostic center registered successfully",
  "user": {
    "id": 3,
    "wallet": "0x9876543210fedcba",
    "email": "info@citydiagnostics.com",
    "role": "diagnostic"
  },
  "profile": {
    "name": "City Diagnostics",
    "hhNumber": 555666777,
    "location": "Downtown, City"
  },
  "txHash": "0xghi789..."
}
```

---

## 🔍 Search Endpoints

### Search Records

**GET** `/api/search/records?q={query}&wallet={wallet}&limit={limit}`

Search medical records using full-text search.

**Query Parameters:**
- `q` (required): Search query
- `wallet` (optional): Filter by patient wallet
- `limit` (optional): Max results (default: 50)

**Example:**
```
GET /api/search/records?q=blood test&wallet=0x1234567890abcdef&limit=10
```

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "record_id": "patient-123456789-1729378815",
      "patient_wallet": "0x1234567890abcdef",
      "patient_hh_number": 123456789,
      "creator_wallet": "0xabcdef1234567890",
      "ipfs_cid": "QmXYZ123...",
      "record_type": "diagnostic",
      "metadata": {
        "testName": "Blood Test",
        "testType": "CBC",
        "results": "Normal"
      },
      "created_at": "2025-10-20T02:30:15.000Z",
      "blockchain_tx_hash": "0xabc123..."
    }
  ],
  "count": 1,
  "query": "blood test"
}
```

---

### Get Patient Records

**GET** `/api/search/patient/{wallet}?limit={limit}`

Get all records for a specific patient.

**Example:**
```
GET /api/search/patient/0x1234567890abcdef?limit=20
```

**Response:**
```json
{
  "records": [
    {
      "record_id": "patient-123456789-1729378815",
      "ipfs_cid": "QmXYZ123...",
      "record_type": "diagnostic",
      "created_at": "2025-10-20T02:30:15.000Z"
    }
  ],
  "count": 1,
  "patientWallet": "0x1234567890abcdef"
}
```

---

## 👤 Profile Endpoints

### Get User by Wallet

**GET** `/api/profile/user/{wallet}`

Get user information by wallet address.

**Example:**
```
GET /api/profile/user/0x1234567890abcdef
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "wallet_address": "0x1234567890abcdef",
    "email": "john@example.com",
    "role": "patient",
    "hh_number": 123456789,
    "is_active": true,
    "created_at": "2025-10-20T02:30:15.000Z"
  }
}
```

---

### Get Patient Profile

**GET** `/api/profile/patient/{hhNumber}`

Get patient profile by HH number.

**Example:**
```
GET /api/profile/patient/123456789
```

**Response:**
```json
{
  "profile": {
    "id": 1,
    "hh_number": 123456789,
    "full_name": "John Doe",
    "date_of_birth": "1990-01-01",
    "gender": "Male",
    "blood_group": "O+",
    "home_address": "123 Main Street",
    "phone_number": "+1234567890",
    "wallet_address": "0x1234567890abcdef",
    "email": "john@example.com"
  }
}
```

---

### Get Doctor Profile

**GET** `/api/profile/doctor/{hhNumber}`

Get doctor profile by HH number.

**Example:**
```
GET /api/profile/doctor/987654321
```

**Response:**
```json
{
  "profile": {
    "id": 2,
    "hh_number": 987654321,
    "full_name": "Dr. Smith",
    "specialization": "Cardiology",
    "hospital": "City Hospital",
    "license_number": "MED12345",
    "years_of_experience": 10,
    "wallet_address": "0xabcdef1234567890"
  }
}
```

---

### Get Notifications

**GET** `/api/profile/notifications/{wallet}?unread={true/false}&limit={limit}`

Get notifications for a user.

**Query Parameters:**
- `unread` (optional): Filter unread only (true/false)
- `limit` (optional): Max results (default: 50)

**Example:**
```
GET /api/profile/notifications/0x1234567890abcdef?unread=true
```

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "user_wallet": "0x1234567890abcdef",
      "title": "New Medical Record",
      "message": "A new diagnostic report has been added",
      "type": "record_created",
      "is_read": false,
      "related_record_id": "patient-123456789-1729378815",
      "created_at": "2025-10-20T02:30:15.000Z"
    }
  ],
  "count": 1
}
```

---

### Mark Notification as Read

**PUT** `/api/profile/notifications/{id}/read`

Mark a notification as read.

**Example:**
```
PUT /api/profile/notifications/1/read
```

**Response:**
```json
{
  "message": "Notification marked as read",
  "notification": {
    "id": 1,
    "is_read": true
  }
}
```

---

### Get Access Logs

**GET** `/api/profile/access-logs/{recordId}?limit={limit}`

Get access history for a record (compliance/audit).

**Example:**
```
GET /api/profile/access-logs/patient-123456789-1729378815?limit=100
```

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "record_id": "patient-123456789-1729378815",
      "accessor_wallet": "0xabcdef1234567890",
      "accessor_role": "doctor",
      "action": "view",
      "ip_address": "192.168.1.1",
      "accessed_at": "2025-10-20T02:30:15.000Z"
    }
  ],
  "count": 1,
  "recordId": "patient-123456789-1729378815"
}
```

---

## 📄 Record Endpoints

### Create Record

**POST** `/api/records`

Create a new medical record on blockchain and index in database.

**Authentication**: Required (JWT token)

**Request Body:**
```json
{
  "recordId": "patient-123456789-1729378815",
  "patient": "0x1234567890abcdef",
  "cid": "QmXYZ123...",
  "meta": "{\"testName\":\"Blood Test\",\"testType\":\"CBC\"}",
  "recordType": "diagnostic",
  "creatorWallet": "0xabcdef1234567890"
}
```

**Response:**
```json
{
  "txHash": "0xabc123...",
  "status": 1,
  "recordId": "patient-123456789-1729378815",
  "message": "Record created and indexed successfully"
}
```

---

### Get Record

**GET** `/api/records/{recordId}`

Get a medical record from blockchain.

**Example:**
```
GET /api/records/patient-123456789-1729378815
```

**Response:**
```json
{
  "record": {
    "patient": "0x1234567890abcdef",
    "createdBy": "0xabcdef1234567890",
    "cid": "QmXYZ123...",
    "meta": "{\"testName\":\"Blood Test\"}",
    "createdAt": 1729378815
  }
}
```

---

### Create Diagnostic Report

**POST** `/api/records/diagnostic`

Create a diagnostic report for a patient.

**Request Body:**
```json
{
  "patientHHNumber": 111111,
  "testName": "Blood Test",
  "testType": "Lab",
  "results": "All values within normal range",
  "notes": "Patient is healthy",
  "ipfsCID": "QmXYZ123...",
  "diagnosticHHNumber": 444444
}
```

**Response:**
```json
{
  "message": "Diagnostic report created successfully",
  "txHash": "0xabc123...",
  "recordId": "diagnostic-111111-1729567890",
  "status": 1
}
```

---

### Get Diagnostic Reports

**GET** `/api/records/diagnostic/:hhNumber/reports`

Get all reports created by a diagnostic center.

**Example:**
```
GET /api/records/diagnostic/444444/reports
```

**Response:**
```json
{
  "message": "Found 5 report(s)",
  "reports": [
    {
      "record_id": "diagnostic-111111-1729567890",
      "patient_hh_number": 111111,
      "record_type": "diagnostic-report",
      "metadata": {
        "testName": "Blood Test",
        "testType": "Lab",
        "results": "Normal"
      },
      "created_at": "2024-10-22T10:30:00.000Z"
    }
  ]
}
```

---

### Upload Medical File

**POST** `/api/records/upload`

Upload a medical file to IPFS and create a record.

**Request:** (multipart/form-data)
- `file`: File (PDF, DOC, DOCX, JPG, PNG, max 1MB)
- `patientHHNumber`: Patient's HH number
- `recordType`: Type of record (optional)
- `description`: File description (optional)
- `uploaderHHNumber`: Uploader's HH number (optional)

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "recordId": "record-111111-1729567890",
  "ipfs": {
    "cid": "QmXYZ123...",
    "url": "https://gateway.pinata.cloud/ipfs/QmXYZ123...",
    "size": 245678
  },
  "blockchain": {
    "txHash": "0xabc123...",
    "status": 1
  }
}
```

---

### Get Patient Records by HH Number

**GET** `/api/records/patient/:hhNumber/all`

Get all medical records for a patient by their HH number.

**Example:**
```
GET /api/records/patient/111111/all
```

**Response:**
```json
{
  "records": [
    {
      "record_id": "diagnostic-111111-1729567890",
      "patient_hh_number": 111111,
      "ipfs_cid": "QmXYZ123...",
      "record_type": "diagnostic-report",
      "metadata": {
        "testName": "Blood Test"
      },
      "created_at": "2024-10-22T10:30:00.000Z"
    }
  ],
  "count": 1,
  "patient": {
    "hhNumber": 111111,
    "walletAddress": "0x1234567890abcdef"
  }
}
```

---

### Grant Access to Doctor

**POST** `/api/records/patient/:hhNumber/grant`

Patient grants access to a doctor.

**Request Body:**
```json
{
  "doctorHHNumber": 222222
}
```

**Response:**
```json
{
  "message": "Access granted successfully",
  "success": true
}
```

---

### Revoke Doctor Access

**POST** `/api/records/patient/:hhNumber/revoke`

Patient revokes access from a doctor.

**Request Body:**
```json
{
  "doctorHHNumber": 222222
}
```

**Response:**
```json
{
  "message": "Access revoked successfully",
  "success": true
}
```

---

### Get Granted Doctors

**GET** `/api/records/patient/:hhNumber/granted-doctors`

Get list of doctors who have access to patient's records.

**Example:**
```
GET /api/records/patient/111111/granted-doctors
```

**Response:**
```json
{
  "doctors": [
    {
      "doctor_hh_number": 222222,
      "full_name": "Dr. Smith",
      "specialization": "Cardiology",
      "hospital": "City Hospital",
      "is_active": true,
      "granted_at": "2024-10-22T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 🔧 Frontend Integration Examples

### Register Patient (React/JavaScript)

```javascript
const registerPatient = async (patientData) => {
  try {
    const response = await fetch('http://localhost:5001/api/register/patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Patient registered:', data);
      return data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

// Usage
const patient = {
  name: "John Doe",
  dob: "1990-01-01",
  gender: "Male",
  bloodGroup: "O+",
  homeAddress: "123 Main St",
  email: "john@example.com",
  hhNumber: 123456789,
  walletAddress: "0x1234...",
  phoneNumber: "+1234567890"
};

registerPatient(patient);
```

---

### Search Records (React/JavaScript)

```javascript
const searchRecords = async (query, walletAddress) => {
  try {
    const url = new URL('http://localhost:5001/api/search/records');
    url.searchParams.append('q', query);
    if (walletAddress) {
      url.searchParams.append('wallet', walletAddress);
    }

    const response = await fetch(url);
    const data = await response.json();

    console.log('Search results:', data.results);
    return data.results;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
};

// Usage
searchRecords('blood test', '0x1234...');
```

---

### Get User Profile (React/JavaScript)

```javascript
const getUserProfile = async (walletAddress) => {
  try {
    const response = await fetch(`http://localhost:5001/api/profile/user/${walletAddress}`);
    const data = await response.json();

    if (response.ok) {
      console.log('User profile:', data.user);
      return data.user;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Failed to get profile:', error);
    throw error;
  }
};

// Usage
getUserProfile('0x1234...');
```

---

### Get Notifications (React/JavaScript)

```javascript
const getNotifications = async (walletAddress, unreadOnly = false) => {
  try {
    const url = new URL(`http://localhost:5001/api/profile/notifications/${walletAddress}`);
    if (unreadOnly) {
      url.searchParams.append('unread', 'true');
    }

    const response = await fetch(url);
    const data = await response.json();

    console.log('Notifications:', data.notifications);
    return data.notifications;
  } catch (error) {
    console.error('Failed to get notifications:', error);
    throw error;
  }
};

// Usage
getNotifications('0x1234...', true); // Get unread only
```

---

## 🚀 Testing the API

### Using cURL

```bash
# Register a patient
curl -X POST http://localhost:5001/api/register/patient \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "dob": "1990-01-01",
    "gender": "Male",
    "bloodGroup": "O+",
    "homeAddress": "123 Main St",
    "email": "john@example.com",
    "hhNumber": 123456789,
    "walletAddress": "0x1234567890abcdef"
  }'

# Search records
curl "http://localhost:5001/api/search/records?q=blood%20test"

# Get user profile
curl http://localhost:5001/api/profile/user/0x1234567890abcdef

# Get notifications
curl "http://localhost:5001/api/profile/notifications/0x1234567890abcdef?unread=true"
```

---

## 📊 Database Integration

All API endpoints automatically:
- ✅ Store data in Neon Postgres database
- ✅ Index records for fast search
- ✅ Log access for compliance
- ✅ Create notifications for users
- ✅ Maintain audit trail

---

## 🔐 Security Notes

1. **CORS**: Currently set to allow all origins (`*`) - restrict in production
2. **Authentication**: Add JWT middleware for protected routes
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: All inputs are validated before processing
5. **SQL Injection**: Using parameterized queries to prevent SQL injection

---

## 📞 Support

For issues or questions:
- Check `DATABASE_QUICK_REFERENCE.md` for code examples
- Check `DATABASE_TESTING_GUIDE.md` for testing
- Check `INTEGRATION_COMPLETE.md` for architecture

---

**API is ready to use!** 🚀
