import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import { Menu, X } from "lucide-react";
import logo from "./logo_clean.svg";

const NavBarLogout = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    // Clear any stored auth data
    localStorage.clear();
    setIsMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="bg-background shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <img
            className="h-10 w-10 cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 filter drop-shadow-md"
            src={logo}
            alt="Logo"
            onClick={() => navigate("/")}
          />
          <span
            className="text-lg md:text-xl font-bold tracking-tight cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70"
            onClick={() => navigate("/")}
          >
            HealthLedger <span className="font-extrabold text-primary">SynexAI</span>
          </span>
        </div>

        {/* Right side controls - Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <Button onClick={handleLogout}>Logout</Button>
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
            <Button className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default NavBarLogout;
