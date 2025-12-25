import React from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Stethoscope, Beaker, ShieldCheck } from 'lucide-react';

const LoginCard = ({ icon, title, onClick }) => (
  <Card className="w-full max-w-sm text-center transform hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={onClick}>
    <CardHeader>
      <div className="flex justify-center items-center mb-4">{icon}</div>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Button variant="outline" className="w-full">Proceed to Login</Button>
    </CardContent>
  </Card>
);

const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto flex flex-col items-center justify-center py-12 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Collaborative AI Portal</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-12">
          Securely access our Federated Learning network. Choose your role below to begin contributing to medical intelligence.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <LoginCard
            icon={<User size={48} className="text-primary" />}
            title="Patient Login"
            onClick={() => navigate("/patient_login")}
          />
          <LoginCard
            icon={<Stethoscope size={48} className="text-primary" />}
            title="Doctor Login"
            onClick={() => navigate("/doctor_login")}
          />
          <LoginCard
            icon={<Beaker size={48} className="text-primary" />}
            title="Diagnostic Login"
            onClick={() => navigate("/diagnostic_login")}
          />
          <LoginCard
            icon={<ShieldCheck size={48} className="text-primary" />}
            title="Admin & Researcher"
            onClick={() => navigate("/admin_login")}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
