import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBarLogout from "./NavBarLogout";
import client from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Building2, AlertTriangle, ArrowLeft } from 'lucide-react';

const ProfileDetail = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 text-sm text-foreground sm:mt-0">{value}</dd>
  </div>
);

const ViewDiagnosticProfile = () => {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const [diagnosticDetails, setDiagnosticDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDiagnosticProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔬 Fetching diagnostic profile for HH Number:", hhNumber);

        const response = await client.get(`/profile/diagnostic/${hhNumber}`);

        if (response.data.profile) {
          setDiagnosticDetails(response.data.profile);
          console.log("✅ Diagnostic profile fetched:", response.data.profile);
        } else {
          setError("Diagnostic profile not found.");
        }
      } catch (err) {
        console.error("❌ Failed to fetch diagnostic profile:", err);

        let errorMsg = "Unable to load diagnostic profile.";

        if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.response?.status === 404) {
          errorMsg = "Diagnostic profile not found. Please check the HH Number.";
        } else if (err.message.includes("network")) {
          errorMsg = "Network error. Please check your connection and try again.";
        }

        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnosticProfile();
  }, [hhNumber]);

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Diagnostic Center Profile</h1>
          <Button variant="outline" onClick={() => navigate(`/diagnostic/${hhNumber}`)}>
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

        {diagnosticDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Facility Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <ProfileDetail label="Center Name" value={diagnosticDetails.center_name || diagnosticDetails.name || 'N/A'} />
                <ProfileDetail label="Location" value={diagnosticDetails.location || 'N/A'} />
                <ProfileDetail label="Email" value={diagnosticDetails.email || 'N/A'} />
                <ProfileDetail label="Phone Number" value={diagnosticDetails.phone_number || diagnosticDetails.phoneNumber || 'N/A'} />
                <ProfileDetail label="Services Offered" value={diagnosticDetails.services_offered || diagnosticDetails.servicesOffered || 'N/A'} />
                <ProfileDetail label="Accreditation" value={diagnosticDetails.accreditation || 'N/A'} />
                <ProfileDetail label="Wallet Address" value={diagnosticDetails.wallet_address || diagnosticDetails.walletAddress || 'N/A'} />
                <ProfileDetail label="HH Number" value={diagnosticDetails.hh_number || diagnosticDetails.hhNumber || hhNumber} />
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewDiagnosticProfile;
