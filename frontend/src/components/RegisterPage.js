import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Stethoscope, Beaker } from 'lucide-react';

const RegisterCard = ({ icon, title, onClick, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 * index }}
    className="w-full flex justify-center"
  >
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
            e.stopPropagation();
            console.log(`Button clicked: ${title}`);
            onClick(e);
          }}
        >
          Proceed to Registration
        </Button>
      </CardContent>
    </Card>
  </motion.div>
);

const RegisterPage = () => {
  const navigate = useNavigate();
  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto flex flex-col items-center justify-center py-12 px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-foreground pb-2 leading-tight"
        >
          Join HealthLedger SynexAI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground mb-12 text-center"
        >
          Choose your role to create a new account.
        </motion.p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          <RegisterCard
            index={0}
            icon={<User size={48} className="text-primary" />}
            title="Patient Registration"
            onClick={() => navigate("/patient_registration")}
          />
          <RegisterCard
            index={1}
            icon={<Stethoscope size={48} className="text-primary" />}
            title="Doctor Registration"
            onClick={() => navigate("/doctor_registration")}
          />
          <RegisterCard
            index={2}
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
