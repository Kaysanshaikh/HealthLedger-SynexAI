import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import BurnerWalletManager from "./BurnerWalletManager";

const DoctorLogin = () => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [hhNumber, sethhNumber] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handlehhNumberChange = (e) => {
    const { value } = e.target;
    sethhNumber(value);
    if (value.length > 0 && !/^\d{6}$/.test(value)) {
      setValidationError("Please enter a valid 6-digit HH Number.");
    } else {
      setValidationError("");
    }
    clearError();
  };

  const handleLogin = async () => {
    if (validationError || !hhNumber) {
      setValidationError("Please enter a valid 6-digit HH Number.");
      return;
    }
    try {
      await login({ role: "doctor", hhNumber });
      navigate(`/doctor/${hhNumber}`);
    } catch (err) {
      // Error is handled by the useAuth hook
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Doctor Login</CardTitle>
            <CardDescription className="text-center">Enter your Health Hero Number to proceed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BurnerWalletManager />
            {error && (
              <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
                <p>{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="hhNumber">HH Number (6-digit pin)</Label>
              <Input
                id="hhNumber"
                name="hhNumber"
                type="text"
                placeholder="123456"
                value={hhNumber}
                onChange={handlehhNumberChange}
                required
              />
              {validationError && <p className="text-sm text-destructive mt-1">{validationError}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? "Connecting..." : "Connect Wallet & Login"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Cancel</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DoctorLogin;
