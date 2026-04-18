import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { User, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import client from "../api/client";
import { useToast } from "../context/ToastContext";

const UpdateProfile = () => {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const { show: showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    homeAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    chronicConditions: ''
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await client.get(`/users/patient/${hhNumber}`);
      const profile = response.data.patient;

      setProfileData(profile);
      setFormData({
        phoneNumber: profile.phoneNumber || '',
        homeAddress: profile.homeAddress || '',
        emergencyContactName: profile.emergencyContactName || '',
        emergencyContactPhone: profile.emergencyContactPhone || '',
        allergies: profile.allergies || '',
        chronicConditions: profile.chronicConditions || ''
      });
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [hhNumber]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
    setSuccess("");
    setFieldErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const validateForm = () => {
    const errors = {};
    const phonePattern = /^\+?[1-9]\d{1,14}$/;

    if (formData.phoneNumber && !phonePattern.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    if (formData.emergencyContactPhone && !phonePattern.test(formData.emergencyContactPhone.replace(/[\s-]/g, ''))) {
      errors.emergencyContactPhone = "Please enter a valid emergency contact phone number";
    }

    if (!formData.homeAddress.trim()) {
      errors.homeAddress = "Home address is required";
    }

    if (!formData.emergencyContactName.trim()) {
      errors.emergencyContactName = "Emergency contact name is required";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      const msg = Object.values(validationErrors).join(', ');
      setError(msg);
      showToast(msg, 'warning');
      setSaving(false);
      return;
    }
    setFieldErrors({});

    try {
      await client.put(`/profile/patient/${hhNumber}`, formData);
      setSuccess("Profile updated successfully!");
      showToast('Profile updated successfully!', 'success');

      // Redirect to profile view After 1 second (faster now because of alert)
      setTimeout(() => {
        navigate(`/patient/${hhNumber}`);
      }, 1000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      const msg = err.response?.data?.error || "Failed to update profile. Please try again.";
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <NavBarLogout />
        <div className="container mx-auto p-4 md:p-8">
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Update Profile</h1>
            <p className="text-muted-foreground">Update your personal information</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/patient/${hhNumber}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profileData && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">Basic Information (Cannot be changed)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{profileData.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{profileData.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Blood Group:</span>
                    <span className="ml-2 font-medium">{profileData.bloodGroup}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <span className="ml-2 font-medium">{profileData.gender}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className={fieldErrors.phoneNumber ? "text-destructive" : ""}>Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className={fieldErrors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.phoneNumber && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.phoneNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName" className={fieldErrors.emergencyContactName ? "text-destructive" : ""}>Emergency Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    placeholder="Emergency contact person"
                    className={fieldErrors.emergencyContactName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.emergencyContactName && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.emergencyContactName}</p>}
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone" className={fieldErrors.emergencyContactPhone ? "text-destructive" : ""}>Emergency Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className={fieldErrors.emergencyContactPhone ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.emergencyContactPhone && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.emergencyContactPhone}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeAddress" className={fieldErrors.homeAddress ? "text-destructive" : ""}>Home Address</Label>
                <Textarea
                  id="homeAddress"
                  name="homeAddress"
                  value={formData.homeAddress}
                  onChange={handleChange}
                  placeholder="Enter your complete home address"
                  rows="3"
                  className={fieldErrors.homeAddress ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.homeAddress && <p className="text-[10px] font-medium text-destructive mt-1">{fieldErrors.homeAddress}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="List any allergies (e.g., Penicillin, Peanuts)"
                  rows="2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chronicConditions">Chronic Conditions</Label>
                <Textarea
                  id="chronicConditions"
                  name="chronicConditions"
                  value={formData.chronicConditions}
                  onChange={handleChange}
                  placeholder="List any chronic conditions (e.g., Diabetes, Hypertension)"
                  rows="2"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/patient/${hhNumber}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdateProfile;
