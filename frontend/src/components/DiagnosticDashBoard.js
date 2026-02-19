import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, FilePlus, FileText } from 'lucide-react';
import client from "../api/client";
import FLManager from "./FLManager";

const DiagnosticDashBoard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [centerName, setCenterName] = useState("");

  useEffect(() => {
    const fetchCenterName = async () => {
      if (user?.hhNumber) {
        try {
          const response = await client.get(`/profile/diagnostic/${user.hhNumber}`);
          const profile = response.data.profile || response.data;
          const centerName = profile.center_name || profile.name || 'Diagnostic Center';
          setCenterName(centerName);
        } catch (error) {
          console.error("Failed to fetch center name:", error);
          setCenterName("Diagnostic Center");
        }
      }
    };
    fetchCenterName();
  }, [user]);

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const { hhNumber } = user;

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Diagnostic Center Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {centerName || 'Diagnostic Center'}</p>
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
              <p className="text-muted-foreground">View and manage your center's information and wallet details.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/diagnostic/${hhNumber}/viewdiagnosticprofile`)}>View Profile</Button>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <FilePlus className="h-8 w-8 text-primary" />
                <CardTitle>Create Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">Upload a new diagnostic report for a patient.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/diagnostic/${hhNumber}/diagnosticform`)}>Create Report</Button>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>My Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">View all diagnostic reports created by your center.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/diagnostic/${hhNumber}/reports`)}>View My Reports</Button>
            </div>
          </Card>

        </div>

        <FLManager />
      </div>
    </div>
  );
};

export default DiagnosticDashBoard;
