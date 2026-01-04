import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBar_Logout from "./NavBar_Logout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { FileText, AlertTriangle, CheckCircle, ArrowLeft, Upload, File, X } from 'lucide-react';
import client from "../api/client";

function DiagnosticForm() {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patientHHNumber: "",
    testName: "",
    testType: "",
    results: "",
    notes: ""
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length === 0) return;

    // Validate max 5 files
    if (selectedFiles.length > 5) {
      setError("You can upload a maximum of 5 files at once");
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    // Validate each file
    for (const file of selectedFiles) {
      // Validate file size (1MB)
      if (file.size > 1 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 1MB limit`);
        setFiles([]);
        return;
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" has invalid type. Only PDF, DOC, DOCX, JPG, and PNG are allowed.`);
        setFiles([]);
        return;
      }
    }

    setFiles(selectedFiles);
    setError("");
    setUploadedFiles([]); // Reset uploaded files when new files are selected
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);

    // Reset file input if no files left
    if (updatedFiles.length === 0) {
      const fileInput = document.getElementById('fileUpload');
      if (fileInput) fileInput.value = '';
    }

    // Also remove from uploaded files if it was uploaded
    const updatedUploadedFiles = uploadedFiles.filter((_, index) => index !== indexToRemove);
    setUploadedFiles(updatedUploadedFiles);
  };

  const handleFileUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file to upload");
      return [];
    }

    if (!formData.patientHHNumber) {
      setError("Please enter Patient HH Number before uploading files");
      return [];
    }

    try {
      setUploading(true);
      setError("");
      const uploadedResults = [];

      console.log(`📤 Uploading ${files.length} file(s) to IPFS...`);

      // Upload each file
      for (const file of files) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('patientHHNumber', formData.patientHHNumber);
        uploadFormData.append('recordType', 'diagnostic-report');
        uploadFormData.append('description', `${formData.testName} - ${formData.testType}`);
        uploadFormData.append('uploaderHHNumber', hhNumber);
        uploadFormData.append('skipRecordCreation', 'true'); // Don't create record yet

        console.log("📤 Uploading:", file.name);

        const response = await client.post('/records/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        uploadedResults.push({
          fileName: file.name,
          cid: response.data.ipfs.cid,
          url: response.data.ipfs.url,
          fileType: response.data.metadata.fileType,
          fileSize: response.data.metadata.fileSize
        });

        console.log("✅ File uploaded:", file.name, response.data.ipfs.cid);
      }

      setUploadedFiles(uploadedResults);
      return uploadedResults;
    } catch (err) {
      console.error("❌ File upload failed:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      let errorMessage = "Failed to upload files to IPFS";

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message.includes('Network Error')) {
        errorMessage = "Cannot connect to server. Please make sure the backend server is running on port 5001.";
      } else if (err.response?.status === 404) {
        errorMessage = "Upload endpoint not found. Please check server configuration.";
      }

      setError(errorMessage);
      return [];
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      let uploadResults = uploadedFiles;

      // If files are selected but not uploaded yet, upload them first
      if (files.length > 0 && uploadedFiles.length === 0) {
        uploadResults = await handleFileUpload();
        if (uploadResults.length === 0) {
          setLoading(false);
          return; // Upload failed, don't proceed
        }
      }

      // Use the first file's CID for the diagnostic report
      const ipfsCID = uploadResults.length > 0 ? uploadResults[0].cid : "";

      // Include file metadata if files were uploaded
      const fileMetadata = uploadResults.length > 0 ? {
        fileName: uploadResults[0].fileName,
        fileType: uploadResults[0].fileType,
        fileSize: uploadResults[0].fileSize
      } : {};

      console.log("📋 Creating diagnostic report:", formData);
      await client.post("/records/diagnostic", {
        ...formData,
        ipfsCID: ipfsCID,
        diagnosticHHNumber: hhNumber,
        ...fileMetadata
      });

      let successMsg = "Diagnostic report created successfully!";
      if (uploadResults.length > 0) {
        successMsg += ` ${uploadResults.length} file(s) uploaded to IPFS.`;
      }
      setSuccess(successMsg);

      // Reset form
      setFormData({
        patientHHNumber: "",
        testName: "",
        testType: "",
        results: "",
        notes: ""
      });
      setFiles([]);
      setUploadedFiles([]);

      // Reset file input
      const fileInput = document.getElementById('fileUpload');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error("❌ Failed to create report:", err);
      setError(err.response?.data?.error || "Failed to create diagnostic report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <NavBar_Logout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Diagnostic Report</h1>
            <p className="text-muted-foreground">Submit test results for a patient</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/diagnostic/${hhNumber}`)}>
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
              <FileText className="h-6 w-6" />
              Report Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="patientHHNumber">Patient HH Number *</Label>
                  <Input
                    id="patientHHNumber"
                    name="patientHHNumber"
                    type="text"
                    placeholder="123456"
                    value={formData.patientHHNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name *</Label>
                  <Input
                    id="testName"
                    name="testName"
                    type="text"
                    placeholder="Blood Test, X-Ray, etc."
                    value={formData.testName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="testType">Test Type *</Label>
                  <Input
                    id="testType"
                    name="testType"
                    type="text"
                    placeholder="Laboratory, Imaging, etc."
                    value={formData.testType}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="fileUpload">Upload Report Files (Optional)</Label>
                  <div className="space-y-2">
                    <Input
                      id="fileUpload"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      disabled={uploading || loading}
                      multiple
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 1MB each, up to 5 files)
                    </p>
                    {!formData.patientHHNumber && files.length > 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Please enter Patient HH Number before uploading files
                      </p>
                    )}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        {files.map((file, index) => {
                          const isUploaded = uploadedFiles.some(uf => uf.fileName === file.name);
                          return (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded border">
                              <File className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">{file.name}</span>
                              <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</span>
                              {isUploaded && (
                                <span className="ml-auto text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Uploaded
                                </span>
                              )}
                              {!isUploaded && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="ml-auto h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Remove file"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {files.length > 0 && uploadedFiles.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFileUpload}
                        disabled={uploading || loading || !formData.patientHHNumber}
                        className="w-full md:w-auto"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? `Uploading ${files.length} file(s)...` : `Upload ${files.length} File(s) Now`}
                      </Button>
                    )}
                    {uploadedFiles.length > 0 && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        {uploadedFiles.length} file(s) uploaded successfully to IPFS
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="results">Test Results *</Label>
                <Textarea
                  id="results"
                  name="results"
                  placeholder="Enter detailed test results..."
                  value={formData.results}
                  onChange={handleChange}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional observations or recommendations..."
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating Report..." : "Create Report"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/diagnostic/${hhNumber}`)}
                  className="flex-1"
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
}

export default DiagnosticForm;
