import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";

// Phone number validation for multiple countries
const isValidPhoneNumber = (phone) => {
  const cleanPhone = phone.replace(/[\s-]/g, '');

  // Common country code patterns
  const phonePatterns = [
    /^\+91[6-9]\d{9}$/,        // India: +91 followed by 10 digits starting with 6-9
    /^\+1[2-9]\d{9}$/,         // USA/Canada: +1 followed by 10 digits
    /^\+44[1-9]\d{8,9}$/,      // UK: +44 followed by 9-10 digits
    /^\+86[1-9]\d{9,10}$/,     // China: +86 followed by 10-11 digits
    /^\+81[1-9]\d{8,9}$/,      // Japan: +81 followed by 9-10 digits
    /^\+49[1-9]\d{9,11}$/,     // Germany: +49 followed by 10-12 digits
    /^\+33[1-9]\d{8}$/,        // France: +33 followed by 9 digits
    /^\+39[0-9]\d{8,9}$/,      // Italy: +39 followed by 9-10 digits
    /^\+7[0-9]\d{9}$/,         // Russia: +7 followed by 10 digits
    /^\+55[1-9]\d{9,10}$/,     // Brazil: +55 followed by 10-11 digits
    /^\+61[2-9]\d{8}$/,        // Australia: +61 followed by 9 digits
    /^\+971[0-9]\d{7,8}$/,     // UAE: +971 followed by 8-9 digits
    /^\+966[0-9]\d{7,8}$/,     // Saudi Arabia: +966 followed by 8-9 digits
    /^\+65[6-9]\d{7}$/,        // Singapore: +65 followed by 8 digits
    /^\+60[1-9]\d{7,9}$/,      // Malaysia: +60 followed by 8-10 digits
  ];

  return phonePatterns.some(pattern => pattern.test(cleanPhone));
};

const PatientRegistry = () => {
  const navigate = useNavigate();
  const { getWalletAddress } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    homeAddress: "",
    email: "",
    hhNumber: "",
    walletAddress: "",
    phoneNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    allergies: "",
    chronicConditions: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get wallet address on component mount
  useEffect(() => {
    const fetchWalletAddress = async () => {
      try {
        const address = await getWalletAddress();
        setFormData(prev => ({ ...prev, walletAddress: address }));
      } catch (err) {
        setError("Please connect your MetaMask wallet");
      }
    };
    fetchWalletAddress();
  }, [getWalletAddress]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const errors = [];

    // Name validation
    if (!formData.name.trim()) {
      errors.push("Full name is required");
    } else if (formData.name.trim().length < 2) {
      errors.push("Full name must be at least 2 characters");
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      errors.push("Full name can only contain letters and spaces");
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push("Please enter a valid email address");
    }

    // Phone number validation (International format with country codes)
    if (!formData.phoneNumber.trim()) {
      errors.push("Phone number is required");
    } else if (!isValidPhoneNumber(formData.phoneNumber)) {
      errors.push("Please enter a valid phone number with country code (e.g., +91 9876543210, +1 2345678901, +44 7123456789)");
    }

    // Emergency contact phone validation
    if (!formData.emergencyContactPhone.trim()) {
      errors.push("Emergency contact phone is required");
    } else if (!isValidPhoneNumber(formData.emergencyContactPhone)) {
      errors.push("Please enter a valid emergency contact phone number with country code");
    }

    // HH Number validation
    if (!formData.hhNumber.trim()) {
      errors.push("HH Number is required");
    } else if (!/^\d{6}$/.test(formData.hhNumber)) {
      errors.push("HH Number must be exactly 6 digits");
    }

    // Required field validation
    if (!formData.dob) errors.push("Date of birth is required");
    if (!formData.gender) errors.push("Gender is required");
    if (!formData.bloodGroup) errors.push("Blood group is required");
    if (!formData.homeAddress.trim()) errors.push("Home address is required");
    if (!formData.emergencyContactName.trim()) errors.push("Emergency contact name is required");

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      setLoading(false);
      return;
    }

    console.log("Submitting patient registration:", formData);

    try {
      const response = await client.post("/register/patient", formData);
      console.log("Registration successful:", response.data);
      alert("Patient registered successfully!");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);

      // Handle different error types
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Validation errors
        setError(err.response.data.errors.join(', '));
      } else {
        // User-friendly error message
        const errorMessage = err.response?.data?.error || "Registration failed. Please try again.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("PatientRegistry mounted");
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <NavBar />
      <div className="container mx-auto py-12 px-4 flex flex-col items-center justify-start">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Patient Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Registration Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" type="text" placeholder="John Doe" required onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input id="dob" name="dob" type="date" required onChange={handleChange} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select name="gender" onValueChange={(value) => handleSelectChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group *</Label>
                <Select name="bloodGroup" onValueChange={(value) => handleSelectChange("bloodGroup", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="homeAddress">Home Address *</Label>
                <Input id="homeAddress" name="homeAddress" type="text" placeholder="123 Main St, Anytown, USA" required onChange={handleChange} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="patient@healthledgersynexai.com" required onChange={handleChange} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="hhNumber">HH Number (6-digit) *</Label>
                <Input id="hhNumber" name="hhNumber" type="text" placeholder="123456" required onChange={handleChange} pattern="[0-9]{6}" maxLength="6" minLength="6" title="Please enter exactly 6 digits" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+91 9876543210 or +1 2345678901"
                  required
                  onChange={handleChange}
                  pattern="^\+[1-9][\d\s\-]{7,15}$"
                  title="Please enter a valid phone number with country code (e.g., +91 9876543210, +1 2345678901)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                <Input id="emergencyContactName" name="emergencyContactName" type="text" placeholder="Jane Doe" required onChange={handleChange} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone *</Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  placeholder="+91 9876543210 or +1 2345678901"
                  required
                  onChange={handleChange}
                  pattern="^\+[1-9][\d\s\-]{7,15}$"
                  title="Please enter a valid phone number with country code (e.g., +91 9876543210, +1 2345678901)"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input id="allergies" name="allergies" type="text" placeholder="Peanuts, Penicillin, etc." onChange={handleChange} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                <Input id="chronicConditions" name="chronicConditions" type="text" placeholder="Diabetes, Hypertension, etc." onChange={handleChange} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="walletAddress">Wallet Address *</Label>
                <Input id="walletAddress" name="walletAddress" type="text" value={formData.walletAddress} placeholder="Your wallet address" required onChange={handleChange} readOnly />
              </div>
              <div className="md:col-span-2 flex justify-center space-x-4 mt-4">
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? "Registering..." : "Register"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/register")} className="w-full md:w-auto">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div >
  );
};

export default PatientRegistry;