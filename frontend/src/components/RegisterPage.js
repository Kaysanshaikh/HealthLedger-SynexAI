import React from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Stethoscope, Beaker } from 'lucide-react';

const RegisterCard = ({ icon, title, onClick }) => (
  <Card
    className="w-full max-w-sm text-center transform hover:scale-105 transition-transform duration-300 cursor-pointer"
    onClick={(e) => {
      console.log(`Card clicked: ${title}`);
      onClick(e);
    }}
  >
    <CardHeader>
      <div className="flex justify-center items-center mb-4">{icon}</div>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Button
        variant="outline"
        className="w-full"
        onClick={(e) => {
          e.stopPropagation(); // Prevent duplicate calls if bubbling
          console.log(`Button clicked: ${title}`);
          onClick(e);
        }}
      >
        Proceed to Registration
      </Button>
    </CardContent>
  </Card>
);

const RegisterPage = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto flex flex-col items-center justify-center py-12 px-4">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Join HealthLedger</h1>
        <p className="text-muted-foreground mb-12">Choose your role to create a new account.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <RegisterCard
            icon={<User size={48} className="text-primary" />}
            title="Patient Registration"
            onClick={() => navigate("/patient_registration")}
          />
          <RegisterCard
            icon={<Stethoscope size={48} className="text-primary" />}
            title="Doctor Registration"
            onClick={() => navigate("/doctor_registration")}
          />
          <RegisterCard
            icon={<Beaker size={48} className="text-primary" />}
            title="Diagnostic Center Registration"
            onClick={() => navigate("/diagnostic_registration")}
          />
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
