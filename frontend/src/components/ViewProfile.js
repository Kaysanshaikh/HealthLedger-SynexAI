import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBarLogout from "./NavBarLogout";
import client from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { User, AlertTriangle, ArrowLeft } from 'lucide-react';

const ProfileDetail = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-sm text-foreground sm:mt-0">{value}</dd>
  </div>
);

const ViewProfile = () => {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const [patientDetails, setPatientDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatientProfile = async () => {
      try {
        setLoading(true);
        console.log("Fetching patient profile for HH:", hhNumber);
        const response = await client.get(`/users/patient/${hhNumber}`);
        console.log("Profile response:", response.data);
        setPatientDetails(response.data.patient);
      } catch (err) {
        console.error("Profile fetch error:", err);
        console.error("Error response:", err.response?.data);
        setError(err.response?.data?.error || "Failed to fetch patient profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientProfile();
  }, [hhNumber]);

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <Button variant="outline" onClick={() => navigate(`/patient/${hhNumber}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        {loading && <div className="text-center">Loading profile...</div>}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {patientDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <ProfileDetail label="Name" value={patientDetails.name} />
                <ProfileDetail label="Date of Birth" value={new Date(patientDetails.dob * 1000).toLocaleDateString()} />
                <ProfileDetail label="Gender" value={patientDetails.gender} />
                <ProfileDetail label="Blood Group" value={patientDetails.bloodGroup} />
                <ProfileDetail label="Home Address" value={patientDetails.homeAddress} />
                <ProfileDetail label="Phone Number" value={patientDetails.phoneNumber} />
                <ProfileDetail label="Email" value={patientDetails.email} />
                {patientDetails.emergencyContactName && (
                  <>
                    <ProfileDetail label="Emergency Contact" value={patientDetails.emergencyContactName} />
                    <ProfileDetail label="Emergency Phone" value={patientDetails.emergencyContactPhone} />
                  </>
                )}
                {patientDetails.allergies && <ProfileDetail label="Allergies" value={patientDetails.allergies} />}
                {patientDetails.chronicConditions && <ProfileDetail label="Chronic Conditions" value={patientDetails.chronicConditions} />}
                <ProfileDetail label="Wallet Address" value={patientDetails.walletAddress} />
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewProfile;
