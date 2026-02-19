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

const ViewDoctorProfile = () => {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const [doctorDetails, setDoctorDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("📋 Fetching doctor profile for HH Number:", hhNumber);

        // Try the profile API endpoint
        const response = await client.get(`/profile/doctor/${hhNumber}`);

        if (response.data.profile) {
          setDoctorDetails(response.data.profile);
          console.log("✅ Doctor profile fetched:", response.data.profile);
        } else {
          setError("Doctor profile not found.");
        }
      } catch (err) {
        console.error("❌ Failed to fetch doctor profile:", err);

        // User-friendly error message
        let errorMsg = "Unable to load doctor profile.";

        if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.response?.status === 404) {
          errorMsg = "Doctor profile not found. Please check the HH Number.";
        } else if (err.message.includes("network")) {
          errorMsg = "Network error. Please check your connection and try again.";
        }

        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorProfile();
  }, [hhNumber]);

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Doctor Profile</h1>
          <Button variant="outline" onClick={() => navigate(`/doctor/${hhNumber}`)}>
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

        {doctorDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6" />
                Professional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                <ProfileDetail label="Name" value={doctorDetails.name || doctorDetails.full_name} />
                <ProfileDetail label="Specialization" value={doctorDetails.specialization} />
                <ProfileDetail label="Hospital/Clinic" value={doctorDetails.hospital} />
                <ProfileDetail label="License Number" value={doctorDetails.licenseNumber || doctorDetails.license_number} />
                <ProfileDetail label="Phone Number" value={doctorDetails.phoneNumber || doctorDetails.phone_number} />
                <ProfileDetail label="Years of Experience" value={doctorDetails.yearsOfExperience || doctorDetails.years_of_experience || 0} />
                <ProfileDetail label="Email" value={doctorDetails.email} />
                <ProfileDetail label="HH Number" value={doctorDetails.hhNumber || doctorDetails.hh_number || hhNumber} />
                <ProfileDetail label="Wallet Address" value={doctorDetails.walletAddress || doctorDetails.wallet_address} />
              </dl>
            </CardContent>
          </Card>
        )}

        {!loading && !doctorDetails && !error && (
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
              <p className="text-muted-foreground">
                No doctor profile found for HH Number: {hhNumber}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ViewDoctorProfile;
