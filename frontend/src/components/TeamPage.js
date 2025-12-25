import React from "react";
import NavBar from "./NavBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Linkedin } from 'lucide-react';

const teamMembers = [
  {
    name: "Kaysan Shaikh",
    role: "Team Leader & Lead Developer",
    contribution: "Kaysan leads the end-to-end development of HealthLedger AI, architecting the integration between blockchain security and the Federated Learning framework. He oversees the entire system lifecycle.",
    linkedin: "https://www.linkedin.com/in/kaysanshaikh/",
  },
  {
    name: "Shivam Prajapati",
    role: "Development Associate",
    contribution: "Shivam works closely with the lead developer to implement and optimize core platform features, ensuring smooth performance across the decentralized network.",
    linkedin: "#",
  },
  {
    name: "Priyanka Sawant",
    role: "Research & Documentation Lead",
    contribution: "Priyanka spearheads the research division, managing the complex documentation and medical compliance standards required for advanced AI in healthcare.",
    linkedin: "#",
  },
  {
    name: "Tanmayee Salgaonkar",
    role: "Research Specialist",
    contribution: "Tanmayee focuses on synthesizing clinical research and contributing to the technical documentation that defines our Federated Learning models.",
    linkedin: "#",
  },
  {
    name: "Sharan Sherigar",
    role: "Research Associate",
    contribution: "Sharan supports the team in researching emerging medical AI trends and assisting in the formal documentation of the project's architecture.",
    linkedin: "#",
  },
];

const TeamMemberCard = ({ member }) => (
  <Card>
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
);

const TeamPage = () => {
  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Our Team</h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">
            The dedicated individuals behind HealthLedger AI.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.name} member={member} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamPage;
