import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle, ArrowLeft } from 'lucide-react';

function ViewPatientList() {
  const { hhNumber } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);

        console.log("📋 Fetching patient list for doctor HH Number:", hhNumber);
        const response = await client.get(`/profile/doctor/${hhNumber}/patients`);
        console.log("✅ Patient list fetched:", response.data);

        if (response.data.patients) {
          setPatients(response.data.patients);
        } else {
          setPatients([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch patient list:", err);

        let errorMsg = "Unable to load patient list.";

        if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.response?.status === 404) {
          errorMsg = "Doctor profile not found. Please check the HH Number.";
        } else if (err.message.includes("network")) {
          errorMsg = "Network error. Please check your connection and try again.";
        }

        setError(errorMsg);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user, hhNumber]);

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Patients</h1>
            <p className="text-muted-foreground">A list of patients who have granted you access to their records.</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/doctor/${hhNumber}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        {loading && <div className="text-center">Loading patient list...</div>}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Patient Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patients.length > 0 ? (
                  patients.map((patient, index) => (
                    <div key={patient.patient_hh_number || index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{patient.full_name || 'Patient'}</h3>
                        <div className="text-sm text-muted-foreground space-y-1 mt-1">
                          <p>HH Number: {patient.patient_hh_number}</p>
                          {patient.blood_group && <p>Blood Group: {patient.blood_group}</p>}
                          {patient.gender && <p>Gender: {patient.gender}</p>}
                          {patient.email && <p>Email: {patient.email}</p>}
                          <p className="text-xs">Access granted: {new Date(patient.granted_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/records/patient/${patient.patient_hh_number}/all`)}
                      >
                        View Records
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground mb-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Patients Yet</h3>
                    <p className="text-muted-foreground">
                      No patients have granted you access to their records yet.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Patients can grant you access from their dashboard.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ViewPatientList;
