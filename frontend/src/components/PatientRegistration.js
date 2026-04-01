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
import BurnerWalletManager from "./BurnerWalletManager";

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
  const { getWalletAddress, burnerWallet } = useAuth();
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
  const [fieldErrors, setFieldErrors] = useState({});
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
  }, [getWalletAddress, burnerWallet]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    const errors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      errors.name = "Full name can only contain letters and spaces";
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone number validation (International format with country codes)
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (!isValidPhoneNumber(formData.phoneNumber)) {
      errors.phoneNumber = "Please enter a valid phone number with country code";
    }

    // Emergency contact phone validation
    if (!formData.emergencyContactPhone.trim()) {
      errors.emergencyContactPhone = "Emergency contact phone is required";
    } else if (!isValidPhoneNumber(formData.emergencyContactPhone)) {
      errors.emergencyContactPhone = "Please enter a valid emergency contact phone number";
    }

    // HH Number validation
    if (!formData.hhNumber.trim()) {
      errors.hhNumber = "HH Number is required";
    } else if (!/^\d{6}$/.test(formData.hhNumber)) {
      errors.hhNumber = "HH Number must be exactly 6 digits";
    }

    // Required field validation
    if (!formData.dob) errors.dob = "Date of birth is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.bloodGroup) errors.bloodGroup = "Blood group is required";
    if (!formData.homeAddress.trim()) errors.homeAddress = "Home address is required";
    if (!formData.emergencyContactName.trim()) errors.emergencyContactName = "Emergency contact name is required";

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Client-side validation
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const msg = Object.values(validationErrors).join(', ');
      setError(msg);
      alert("⚠️ Validation Error:\n\n" + msg);
      setLoading(false);
      return;
    }
    setFieldErrors({});

    console.log("Submitting patient registration:", formData);

    try {
      const response = await client.post("/register/patient", formData);
      console.log("Registration successful:", response.data);
      alert("✅ Patient registered successfully!");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);

      // Handle different error types
      let errorMessage = "Registration failed. Please try again.";
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        // Validation errors
        errorMessage = err.response.data.errors.join(', ');
      } else {
        // User-friendly error message
        errorMessage = err.response?.data?.error || err.message || "Registration failed. Please try again.";
      }
      
      setError(errorMessage);
      alert("❌ Registration Error:\n\n" + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestHH = async () => {
    try {
      const response = await client.get("/register/suggest-hh");
      if (response.data.success) {
        setFormData(prev => ({ ...prev, hhNumber: response.data.hhNumber }));
      }
    } catch (err) {
      console.error("Failed to fetch HH suggestion:", err);
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
            <BurnerWalletManager />

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Registration Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className={fieldErrors.name ? "text-destructive" : ""}>Full Name *</Label>
                <Input 
                  id="name" name="name" type="text" placeholder="John Doe" required onChange={handleChange} 
                  className={fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.name && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className={fieldErrors.dob ? "text-destructive" : ""}>Date of Birth *</Label>
                <Input 
                  id="dob" name="dob" type="date" required onChange={handleChange} max={new Date().toISOString().split('T')[0]} 
                  className={fieldErrors.dob ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.dob && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.dob}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className={fieldErrors.gender ? "text-destructive" : ""}>Gender *</Label>
                <Select name="gender" onValueChange={(value) => { handleSelectChange("gender", value); setFieldErrors(prev => ({ ...prev, gender: null })); }}>
                  <SelectTrigger className={fieldErrors.gender ? "border-destructive focus-visible:ring-destructive" : ""}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.gender && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.gender}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup" className={fieldErrors.bloodGroup ? "text-destructive" : ""}>Blood Group *</Label>
                <Select name="bloodGroup" onValueChange={(value) => { handleSelectChange("bloodGroup", value); setFieldErrors(prev => ({ ...prev, bloodGroup: null })); }}>
                  <SelectTrigger className={fieldErrors.bloodGroup ? "border-destructive focus-visible:ring-destructive" : ""}>
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
                {fieldErrors.bloodGroup && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.bloodGroup}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="homeAddress" className={fieldErrors.homeAddress ? "text-destructive" : ""}>Home Address *</Label>
                <Input 
                  id="homeAddress" name="homeAddress" type="text" placeholder="123 Main St, Anytown, USA" required onChange={handleChange} 
                  className={fieldErrors.homeAddress ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.homeAddress && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.homeAddress}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="email" className={fieldErrors.email ? "text-destructive" : ""}>Email *</Label>
                <Input 
                  id="email" name="email" type="email" placeholder="patient@healthledgersynexai.com" required onChange={handleChange} 
                  className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.email && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.email}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="hhNumber" className={fieldErrors.hhNumber ? "text-destructive" : ""}>HH Number (6-digit) *</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="hhNumber" 
                    name="hhNumber" 
                    type="text" 
                    placeholder="123456" 
                    required 
                    value={formData.hhNumber}
                    onChange={handleChange} 
                    className={`flex-1 ${fieldErrors.hhNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <Button type="button" variant="outline" onClick={handleSuggestHH}>
                    Suggest
                  </Button>
                </div>
                {fieldErrors.hhNumber && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.hhNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className={fieldErrors.phoneNumber ? "text-destructive" : ""}>Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="+91 9876543210"
                  required
                  onChange={handleChange}
                  className={fieldErrors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.phoneNumber && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.phoneNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName" className={fieldErrors.emergencyContactName ? "text-destructive" : ""}>Emergency Contact Name *</Label>
                <Input 
                  id="emergencyContactName" name="emergencyContactName" type="text" placeholder="Jane Doe" required onChange={handleChange} 
                  className={fieldErrors.emergencyContactName ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.emergencyContactName && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.emergencyContactName}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="emergencyContactPhone" className={fieldErrors.emergencyContactPhone ? "text-destructive" : ""}>Emergency Contact Phone *</Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  placeholder="+91 9876543210"
                  required
                  onChange={handleChange}
                  className={fieldErrors.emergencyContactPhone ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.emergencyContactPhone && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.emergencyContactPhone}</p>}
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