import React from "react";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Users, ShieldCheck, Network, Zap, Globe, Activity } from 'lucide-react';

const SectionCard = ({ icon, title, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true }}
    className="h-full"
  >
    <Card className="h-full bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          {icon}
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground leading-relaxed">
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const AboutUs = () => {
  return (
    <div className="bg-background min-h-screen selection:bg-primary/20">
      <NavBar />

      {/* Hero Header */}
      <div className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-6 backdrop-blur-md"
          >
            <Zap size={14} className="fill-current" />
            <span>Connecting Global Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-7xl font-black tracking-tighter mb-6 pb-2 leading-tight"
          >
            The Future of HealthLedger SynexAI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground mt-2 max-w-3xl mx-auto leading-relaxed"
          >
            HealthLedger SynexAI (Synapse + Nexus + AI) is more than a platform. It's a decentralized nervous system for global healthcare intelligence, where data remains private but knowledge flows freely.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto p-4 md:p-8 relative">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">

          <SectionCard icon={<Users className="h-6 w-6" />} title="The Synex Vision">
            <p className="mb-4">
              We are a collective of medical experts and blockchain engineers dedicated to solving the greatest bottleneck in AI: <strong>The Data Silo.</strong>
            </p>
            <p>
              By combining high-speed blockchain architecture with advanced federated learning, we've built a "Synapse" for hospitals to communicate without ever exchanging a single patient record.
            </p>
          </SectionCard>

          <SectionCard icon={<ShieldCheck className="h-6 w-6" />} title="Trust Through Cryptography" delay={0.1}>
            <p className="mb-4">
              Security is not an add-on; it's our foundation. We use Zero-Knowledge Proofs (ZKP) to ensure the mathematical integrity of every training round.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>On-chain verifiability for every model update.</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Encrypted gradients with multi-node aggregation.</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Secure storage on the Synex-IPFS network.</span>
              </li>
            </ul>
          </SectionCard>

          <SectionCard icon={<Network className="h-6 w-6" />} title="The Nexus Infrastructure" delay={0.2}>
            <p className="mb-4">
              Our Nexus architecture bridges three critical healthcare pillars into one unified experience:
            </p>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-muted/30 border border-primary/5">
                <span className="font-bold text-primary block mb-1">Collaborative Nodes</span>
                Institutions join the network as training nodes, contributing compute power instead of raw data.
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-primary/5">
                <span className="font-bold text-primary block mb-1">Patient Sovereignty</span>
                Patients own their "Identity Hash" and control access via private keys, not centralized databases.
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<Activity className="h-6 w-6" />} title="Synchronized Learning" delay={0.3}>
            <p className="mb-4">
              Every participant in SynexAI accelerates the global learning curve for life-saving disease detection:
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-center p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="text-2xl font-bold text-primary">0%</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Data Leakage</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Verified Results</div>
              </div>
            </div>
          </SectionCard>

        </div>

        {/* Global Connection Visualization Hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-24 p-12 rounded-[3rem] bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent border border-primary/20 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe size={300} className="animate-spin-slow" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 relative z-10">Ready to join the network?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto relative z-10">Be part of the decentralized revolution in medical intelligence with HealthLedger SynexAI. Secure your node and start contributing to global breakthroughs.</p>
          <footer className="relative z-10">
            <p className="text-muted-foreground">Inquiries & Partnerships: <a href="mailto:support@healthledgersynexai.com" className="text-primary font-semibold hover:underline">support@healthledgersynexai.com</a></p>
          </footer>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutUs;
