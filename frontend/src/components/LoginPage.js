import React from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Stethoscope, Beaker, ShieldCheck } from 'lucide-react';
import BurnerWalletManager from "./BurnerWalletManager";

const LoginCard = ({ icon, title, onClick, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 * index }}
    className="w-full flex justify-center"
  >
    <Card className="w-full max-w-sm text-center transform hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex justify-center items-center mb-4">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full">Proceed to Login</Button>
      </CardContent>
    </Card>
  </motion.div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto flex flex-col items-center justify-center py-12 px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-foreground pb-2 leading-tight"
        >
          Collaborative Portal
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground text-lg max-w-2xl mb-12"
        >
          Securely access our Federated Learning network. Choose your role below to begin contributing to medical intelligence.
        </motion.p>
        <div className="w-full max-w-2xl mb-8">
          <BurnerWalletManager />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
          <LoginCard
            index={0}
            icon={<User size={48} className="text-primary" />}
            title="Patient Login"
            onClick={() => navigate("/patient_login")}
          />
          <LoginCard
            index={1}
            icon={<Stethoscope size={48} className="text-primary" />}
            title="Doctor Login"
            onClick={() => navigate("/doctor_login")}
          />
          <LoginCard
            index={2}
            icon={<Beaker size={48} className="text-primary" />}
            title="Diagnostic Login"
            onClick={() => navigate("/diagnostic_login")}
          />
          <LoginCard
            index={3}
            icon={<ShieldCheck size={48} className="text-primary" />}
            title="Admin Login"
            onClick={() => navigate("/admin_login")}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
