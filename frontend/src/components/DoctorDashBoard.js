import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Users, Brain } from 'lucide-react';
import client from "../api/client";

const DoctorDashBoardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [doctorName, setDoctorName] = useState("");

  useEffect(() => {
    const fetchDoctorName = async () => {
      if (user?.hhNumber) {
        try {
          const response = await client.get(`/profile/doctor/${user.hhNumber}`);
          const profile = response.data.profile || response.data;
          const name = profile.full_name || profile.name || 'Doctor';
          setDoctorName(name);
        } catch (error) {
          console.error("Failed to fetch doctor name:", error);
          setDoctorName("Doctor");
        }
      }
    };
    fetchDoctorName();
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
          <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {doctorName || 'Doctor'}</p>
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
              <p className="text-muted-foreground">View and manage your professional information and wallet details.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/doctor/${hhNumber}/viewdoctorprofile`)}>View Profile</Button>
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <CardTitle>My Patients</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">Access the list of patients who have granted you access to their records.</p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button className="w-full" onClick={() => navigate(`/doctor/${hhNumber}/patientlist`)}>View Patient List</Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default DoctorDashBoardPage;
