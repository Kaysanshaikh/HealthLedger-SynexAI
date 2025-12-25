import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NavBar_Logout from "./NavBar_Logout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, FileText, Shield, Brain } from 'lucide-react';
import client from "../api/client";
import FLManager from "./FLManager";

const PatientDashBoard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patientName, setPatientName] = useState("");

  useEffect(() => {
    const fetchPatientName = async () => {
      if (user?.hhNumber) {
        try {
          const response = await client.get(`/users/patient/${user.hhNumber}`);
          setPatientName(response.data.patient.name || `Patient`);
        } catch (error) {
          console.error("Failed to fetch patient name:", error);
          setPatientName("Patient");
        }
      }
    };
    fetchPatientName();
  }, [user]);

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const { hhNumber } = user;

  return (
    <div className="bg-background min-h-screen">
      <NavBar_Logout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Patient Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {patientName || 'Patient'}</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <User className="h-8 w-8 text-primary" />
                <CardTitle>My Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">View and manage your personal information and wallet details.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/patient/${hhNumber}/viewprofile`)}>View Profile</Button>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>My Records</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">Access your secure medical records stored on the blockchain.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/patient/${hhNumber}/viewrecords`)}>View Records</Button>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Shield className="h-8 w-8 text-primary" />
                <CardTitle>Manage Access</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">Control which doctors and specialists can view your health data.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/patient/${hhNumber}/manageaccess`)}>Manage Access</Button>
            </div>
          </Card>

        </div>

        <FLManager />
      </div>
    </div>
  );
};

export default PatientDashBoard;
