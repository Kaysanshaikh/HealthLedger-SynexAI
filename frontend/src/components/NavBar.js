import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import { Menu, X } from "lucide-react";
import logo from "./logo_oval.png";

const NavBar = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-background shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <img
            className="h-10 w-24 cursor-pointer rounded-full object-cover border border-primary/20 shadow-sm"
            src={logo}
            alt="Logo"
            onClick={() => navigate("/")}
          />
          <span
            className="text-xl font-semibold cursor-pointer"
            onClick={() => navigate("/")}
          >
            HealthLedger SynexAI
          </span>
        </div>

        {/* Navigation Links - Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          <Button variant="ghost" onClick={() => navigate("/")}>Home</Button>
          <Button variant="ghost" onClick={() => navigate("/AboutPage")}>About Us</Button>
          <Button variant="ghost" onClick={() => navigate("/team")}>Our Team</Button>
          <Button variant="ghost" onClick={() => navigate("/register")}>Register</Button>
        </nav>

        {/* Right side controls - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <Button onClick={() => navigate("/login")}>Login</Button>
          <ModeToggle />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-t">
          <nav className="container mx-auto flex flex-col gap-2 py-4 px-4">
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation("/")}>
              Home
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation("/AboutPage")}>
              About Us
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation("/team")}>
              Our Team
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => handleNavigation("/register")}>
              Register
            </Button>
            <Button className="w-full" onClick={() => handleNavigation("/login")}>
              Login
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default NavBar;
