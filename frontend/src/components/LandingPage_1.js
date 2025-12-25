import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { ShieldCheck, Brain, Activity, Globe, Zap } from 'lucide-react';

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-card p-6 rounded-lg shadow-md text-center flex flex-col items-center">
    <div className="flex-shrink-0">{icon}</div>
    <h3 className="text-xl font-semibold text-primary mt-4 mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground">
      <NavBar />

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden text-center">
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium"
          >
            <Brain size={16} />
            <span>Next-Generation Privacy-Preserving AI</span>
          </motion.div>
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-primary via-foreground/80 to-foreground bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Empowering Healthcare <br /> with Federated AI
          </motion.h1>
          <motion.p
            className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            HealthLedger AI combines Blockchain security with Zero-Knowledge Federated Learning to enable medical breakthroughs without ever compromising patient privacy.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Button size="lg" className="h-12 px-8 text-md" onClick={() => navigate("/login")}>
              Get Started with FL
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-md" onClick={() => navigate("/AboutPage")}>
              Learn How It Works
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FL Focus Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-center">The Power of Collaboration</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Our platform enables a new era of medical research where data stays private, but intelligence is shared globally.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Brain size={48} className="text-primary" />}
              title="ZK-Federated Learning"
              description="Train advanced AI models across multiple institutions. Your local patient data never leaves your infrastructure."
            />
            <FeatureCard
              icon={<ShieldCheck size={48} className="text-primary" />}
              title="Zero-Knowledge Proofs"
              description="Verify model contributions mathematically without revealing the underlying data, ensuring 100% integrity."
            />
            <FeatureCard
              icon={<Zap size={48} className="text-primary" />}
              title="Incentivized Research"
              description="Earn rewards for contributing high-quality local training to global disease research models."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">A Simple, Secure Process</h2>
          <div className="flex flex-col md:flex-row items-start justify-center gap-12 max-w-5xl mx-auto">
            <motion.div
              className="flex-1 flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="bg-primary/10 text-primary rounded-full w-20 h-20 flex items-center justify-center mb-6 border-2 border-primary/20">
                <Brain size={40} />
              </div>
              <h3 className="text-2xl font-semibold mb-2">1. Model Initiation</h3>
              <p className="text-muted-foreground">Researchers propose a medical model (e.g., Diabetes Prediction) on the blockchain network.</p>
            </motion.div>
            <motion.div
              className="flex-1 flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="bg-primary/10 text-primary rounded-full w-20 h-20 flex items-center justify-center mb-6 border-2 border-primary/20">
                <Globe size={40} />
              </div>
              <h3 className="text-2xl font-semibold mb-2">2. Collaborative Training</h3>
              <p className="text-muted-foreground">Institutions download global model parameters and train locally on their own private medical data.</p>
            </motion.div>
            <motion.div
              className="flex-1 flex flex-col items-center"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="bg-primary/10 text-primary rounded-full w-20 h-20 flex items-center justify-center mb-6 border-2 border-primary/20">
                <Activity size={40} />
              </div>
              <h3 className="text-2xl font-semibold mb-2">3. Global Intelligence</h3>
              <p className="text-muted-foreground">Encrypted updates are aggregated on-chain to create powerful models without ever exposing raw patient data.</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
