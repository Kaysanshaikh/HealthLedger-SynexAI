import React from "react";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Linkedin } from 'lucide-react';

const teamMembers = [
  {
    name: "Kaysan Shaikh",
    role: "Team Leader & Lead Developer",
    contribution: "Kaysan leads the end-to-end development of HealthLedger SynexAI, architecting the integration between blockchain security and the Federated Learning framework. He oversees the entire system lifecycle.",
    linkedin: "https://www.linkedin.com/in/kaysanshaikh/",
  },
  {
    name: "Shivam Prajapati",
    role: "Development Associate",
    contribution: "Shivam works closely with the lead developer to implement and optimize core platform features, ensuring smooth performance across the decentralized network.",
    linkedin: "https://www.linkedin.com/in/shivam-prajapati-78590b225/",
  },
  {
    name: "Priyanka Sawant",
    role: "Research & Documentation Lead",
    contribution: "Priyanka spearheads the research division, managing the complex documentation and medical compliance standards required for advanced AI in healthcare.",
    linkedin: "https://www.linkedin.com/in/priyanka-sawant-ba5409318/",
  },
  {
    name: "Tanmayee Salgaonkar",
    role: "Research Specialist",
    contribution: "Tanmayee focuses on synthesizing clinical research and contributing to the technical documentation that defines our Federated Learning models.",
    linkedin: "https://www.linkedin.com/in/tanmay-salgaonkar-939059210/",
  },
  {
    name: "Sharan Sherigar",
    role: "Research Associate",
    contribution: "Sharan supports the team in researching emerging medical AI trends and assisting in the formal documentation of the project's architecture.",
    linkedin: "https://www.linkedin.com/in/sharan-sherigar/",
  },
];

const TeamMemberCard = ({ member, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.1 * index }}
  >
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{member.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{member.role}</p>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{member.contribution}</p>
        <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">
          <Linkedin size={16} />
          View LinkedIn
        </a>
      </CardContent>
    </Card>
  </motion.div>
);

const TeamPage = () => {
  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-black tracking-tighter text-foreground pb-2 leading-tight"
          >
            Our Team
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto"
          >
            The dedicated individuals behind HealthLedger SynexAI.
          </motion.p>
        </header>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {teamMembers.map((member, index) => (
            <TeamMemberCard key={member.name} member={member} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
