import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Shield, AlertTriangle, CheckCircle, UserCheck, ArrowLeft } from 'lucide-react';
import client from "../api/client";

const ManageAccess = () => {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const [doctorHHNumber, setDoctorHHNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [grantedDoctors, setGrantedDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const fetchGrantedDoctors = useCallback(async () => {
    try {
      setLoadingDoctors(true);
      console.log("📋 Fetching granted doctors for patient:", hhNumber);
      const response = await client.get(`/records/patient/${hhNumber}/granted-doctors`);
      setGrantedDoctors(response.data.doctors || []);
    } catch (err) {
      console.error("❌ Failed to fetch granted doctors:", err);
    } finally {
      setLoadingDoctors(false);
    }
  }, [hhNumber]);

  useEffect(() => {
    fetchGrantedDoctors();
  }, [fetchGrantedDoctors]);

  const handleGrantAccess = async () => {
    if (!doctorHHNumber) {
      setError("Please enter the doctor's HH Number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("🔐 Granting access to doctor HH:", doctorHHNumber);
      await client.post(`/records/patient/${hhNumber}/grant`, { doctorHHNumber });
      setSuccess(`Access granted successfully to Doctor (HH: ${doctorHHNumber})!`);
      setDoctorHHNumber("");
      setError("");
      fetchGrantedDoctors();
    } catch (err) {
      console.error("❌ Failed to grant access:", err);
      setError(err.response?.data?.error || "Failed to grant access. Please try again.");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!doctorHHNumber) {
      setError("Please enter the doctor's HH Number");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      console.log("🚫 Revoking access from doctor HH:", doctorHHNumber);
      await client.post(`/records/patient/${hhNumber}/revoke`, { doctorHHNumber });
      setSuccess(`Access revoked successfully from Doctor (HH: ${doctorHHNumber})!`);
      setDoctorHHNumber("");
      fetchGrantedDoctors();
    } catch (err) {
      console.error("❌ Failed to revoke access:", err);
      setError(err.response?.data?.error || "Failed to revoke access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeFromList = async (doctorHH) => {
    if (!window.confirm(`Are you sure you want to revoke access from Doctor (HH: ${doctorHH})?`)) {
      return;
    }

    try {
      setError("");
      await client.post(`/records/patient/${hhNumber}/revoke`, { doctorHHNumber: doctorHH });
      setSuccess(`Access revoked successfully from Doctor (HH: ${doctorHH})!`);
      fetchGrantedDoctors();
    } catch (err) {
      console.error("❌ Failed to revoke access:", err);
      setError(err.response?.data?.error || "Failed to revoke access. Please try again.");
      setSuccess("");
    }
  };

  const handleGrantFromList = async (doctorHH) => {
    try {
      setError("");
      await client.post(`/records/patient/${hhNumber}/grant`, { doctorHHNumber: doctorHH });
      setSuccess(`Access re-granted successfully to Doctor (HH: ${doctorHH})!`);
      fetchGrantedDoctors();
    } catch (err) {
      console.error("❌ Failed to grant access:", err);
      setError(err.response?.data?.error || "Failed to grant access. Please try again.");
      setSuccess("");
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Access</h1>
            <p className="text-muted-foreground">Control which doctors can view your medical records</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/patient/${hhNumber}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {grantedDoctors.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-6 w-6" />
                Access History ({grantedDoctors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDoctors ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-3">
                  {grantedDoctors.map((doctor, index) => (
                    <div key={doctor.doctor_hh_number || index} className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${doctor.is_active ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{doctor.full_name || 'Doctor'}</h4>
                          {doctor.is_active ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-full">Active</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded-full">Revoked</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1 mt-1">
                          <p>HH Number: {doctor.doctor_hh_number}</p>
                          {doctor.specialization && <p>Specialization: {doctor.specialization}</p>}
                          {doctor.hospital && <p>Hospital: {doctor.hospital}</p>}
                          <p className="text-xs">Access granted: {new Date(doctor.granted_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          })}</p>
                          {!doctor.is_active && doctor.revoked_at && (
                            <p className="text-xs text-red-600">Revoked: {new Date(doctor.revoked_at).toLocaleString('en-IN', {
                              timeZone: 'Asia/Kolkata',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}</p>
                          )}
                        </div>
                      </div>
                      {doctor.is_active ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeFromList(doctor.doctor_hh_number)}
                        >
                          Revoke Access
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGrantFromList(doctor.doctor_hh_number)}
                        >
                          Re-grant Access
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Grant or Revoke Doctor Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="doctorHHNumber">Doctor's Health Hero Number</Label>
              <Input
                id="doctorHHNumber"
                type="number"
                placeholder="e.g., 666666"
                value={doctorHHNumber}
                onChange={(e) => setDoctorHHNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter the HH Number of the doctor you want to grant or revoke access to
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleGrantAccess}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Processing..." : "Grant Access"}
              </Button>
              <Button
                onClick={handleRevokeAccess}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? "Processing..." : "Revoke Access"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageAccess;
