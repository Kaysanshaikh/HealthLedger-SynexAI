import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { FileText, AlertTriangle, CheckCircle, ArrowLeft, Upload, File, X, Plus, Trash2, Activity } from 'lucide-react';
import client from "../api/client";

// Disease-specific metric presets for structured health data entry
const METRIC_PRESETS = {
  metabolic: [
    { name: 'Glucose', unit: 'mg/dL', placeholder: 'e.g., 120' },
    { name: 'BMI', unit: 'kg/m²', placeholder: 'e.g., 28.5' },
    { name: 'Insulin', unit: 'µU/mL', placeholder: 'e.g., 80' },
    { name: 'HbA1c', unit: '%', placeholder: 'e.g., 6.5' },
    { name: 'Blood Pressure', unit: 'mmHg', placeholder: 'e.g., 130' },
    { name: 'Skin Thickness', unit: 'mm', placeholder: 'e.g., 29' },
    { name: 'Age', unit: 'years', placeholder: 'e.g., 45' },
    { name: 'Pregnancies', unit: 'count', placeholder: 'e.g., 2' },
    { name: 'Diabetes Pedigree Function', unit: '', placeholder: 'e.g., 0.627' },
  ],
  cardiovascular: [
    { name: 'Cholesterol', unit: 'mg/dL', placeholder: 'e.g., 200' },
    { name: 'Resting Blood Pressure', unit: 'mmHg', placeholder: 'e.g., 140' },
    { name: 'Max Heart Rate', unit: 'bpm', placeholder: 'e.g., 150' },
    { name: 'Chest Pain Type', unit: '0-3', placeholder: '0=typical, 1=atypical, 2=non-anginal, 3=asymptomatic' },
    { name: 'ST Depression', unit: 'mm', placeholder: 'e.g., 2.3' },
    { name: 'Fasting Blood Sugar', unit: 'mg/dL', placeholder: 'e.g., 120' },
    { name: 'Resting ECG', unit: '0-2', placeholder: '0=normal, 1=ST-T wave abnormality, 2=LVH' },
    { name: 'Exercise Angina', unit: '0-1', placeholder: '0=no, 1=yes' },
    { name: 'Age', unit: 'years', placeholder: 'e.g., 55' },
    { name: 'Sex', unit: '0-1', placeholder: '0=female, 1=male' },
  ],
  genomics: [
    { name: 'Radius Mean', unit: '', placeholder: 'e.g., 17.99' },
    { name: 'Texture Mean', unit: '', placeholder: 'e.g., 10.38' },
    { name: 'Perimeter Mean', unit: '', placeholder: 'e.g., 122.8' },
    { name: 'Area Mean', unit: '', placeholder: 'e.g., 1001' },
    { name: 'Smoothness Mean', unit: '', placeholder: 'e.g., 0.1184' },
    { name: 'Compactness Mean', unit: '', placeholder: 'e.g., 0.2776' },
    { name: 'Concavity Mean', unit: '', placeholder: 'e.g., 0.3001' },
    { name: 'Symmetry Mean', unit: '', placeholder: 'e.g., 0.2419' },
    { name: 'Fractal Dimension Mean', unit: '', placeholder: 'e.g., 0.07871' },
  ],
  respiratory: [
    { name: 'FEV1', unit: 'L', placeholder: 'e.g., 3.5' },
    { name: 'FVC', unit: 'L', placeholder: 'e.g., 4.2' },
    { name: 'SpO2', unit: '%', placeholder: 'e.g., 98' },
    { name: 'Respiratory Rate', unit: 'breaths/min', placeholder: 'e.g., 16' },
    { name: 'Temperature', unit: '°C', placeholder: 'e.g., 37.2' },
    { name: 'Age', unit: 'years', placeholder: 'e.g., 50' },
  ],
  lifestyle: [
    { name: 'BMI', unit: 'kg/m²', placeholder: 'e.g., 28.5' },
    { name: 'Blood Pressure Systolic', unit: 'mmHg', placeholder: 'e.g., 130' },
    { name: 'Blood Pressure Diastolic', unit: 'mmHg', placeholder: 'e.g., 85' },
    { name: 'Heart Rate', unit: 'bpm', placeholder: 'e.g., 72' },
    { name: 'Age', unit: 'years', placeholder: 'e.g., 35' },
  ],
  other: []
};

const TEST_TYPE_OPTIONS = [
  { value: 'metabolic', label: '🧬 Metabolic (Diabetes markers)' },
  { value: 'cardiovascular', label: '❤️ Cardiovascular (Heart markers)' },
  { value: 'genomics', label: '🧪 Genomics (Cancer markers)' },
  { value: 'respiratory', label: '🫁 Respiratory (Lung markers)' },
  { value: 'lifestyle', label: '🏃 Lifestyle (General health)' },
  { value: 'other', label: '📋 Other' },
];

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
  const [healthMetrics, setHealthMetrics] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // When testType changes, auto-populate health metric presets
    if (name === 'testType' && value && METRIC_PRESETS[value]) {
      const presets = METRIC_PRESETS[value];
      if (presets.length > 0) {
        setHealthMetrics(presets.map(p => ({
          name: p.name,
          value: '',
          unit: p.unit,
          placeholder: p.placeholder
        })));
      } else {
        setHealthMetrics([]);
      }
    }
  };

  // Health metrics management
  const addMetric = () => {
    setHealthMetrics([...healthMetrics, { name: '', value: '', unit: '', placeholder: '' }]);
  };

  const removeMetric = (index) => {
    setHealthMetrics(healthMetrics.filter((_, i) => i !== index));
  };

  const updateMetric = (index, field, value) => {
    const updated = [...healthMetrics];
    updated[index] = { ...updated[index], [field]: value };
    setHealthMetrics(updated);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length === 0) return;

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

    for (const file of selectedFiles) {
      if (file.size > 1 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds 1MB limit`);
        setFiles([]);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`File "${file.name}" has invalid type. Only PDF, DOC, DOCX, JPG, and PNG are allowed.`);
        setFiles([]);
        return;
      }
    }

    setFiles(selectedFiles);
    setError("");
    setUploadedFiles([]);
  };

  const removeFile = (indexToRemove) => {
    const updatedFiles = files.filter((_, index) => index !== indexToRemove);
    setFiles(updatedFiles);
    if (updatedFiles.length === 0) {
      const fileInput = document.getElementById('fileUpload');
      if (fileInput) fileInput.value = '';
    }
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

      for (const file of files) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('patientHHNumber', formData.patientHHNumber);
        uploadFormData.append('recordType', 'diagnostic-report');
        uploadFormData.append('description', `${formData.testName} - ${formData.testType}`);
        uploadFormData.append('uploaderHHNumber', hhNumber);
        uploadFormData.append('skipRecordCreation', 'true');

        const response = await client.post('/records/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        uploadedResults.push({
          fileName: file.name,
          cid: response.data.ipfs.cid,
          url: response.data.ipfs.url,
          fileType: response.data.metadata.fileType,
          fileSize: response.data.metadata.fileSize
        });
      }

      setUploadedFiles(uploadedResults);
      return uploadedResults;
    } catch (err) {
      let errorMessage = "Failed to upload files to IPFS";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message.includes('Network Error')) {
        errorMessage = "Cannot connect to server. Please make sure the backend server is running.";
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

      if (files.length > 0 && uploadedFiles.length === 0) {
        uploadResults = await handleFileUpload();
        if (uploadResults.length === 0) {
          setLoading(false);
          return;
        }
      }

      const ipfsCID = uploadResults.length > 0 ? uploadResults[0].cid : "";
      const fileMetadata = uploadResults.length > 0 ? {
        fileName: uploadResults[0].fileName,
        fileType: uploadResults[0].fileType,
        fileSize: uploadResults[0].fileSize
      } : {};

      // Filter out empty metrics
      const validMetrics = healthMetrics.filter(m => m.name && m.value !== '' && m.value !== undefined);

      await client.post("/records/diagnostic", {
        ...formData,
        ipfsCID: ipfsCID,
        diagnosticHHNumber: hhNumber,
        healthMetrics: validMetrics,
        ...fileMetadata
      });

      let successMsg = "Diagnostic report created successfully!";
      if (uploadResults.length > 0) {
        successMsg += ` ${uploadResults.length} file(s) uploaded to IPFS.`;
      }
      if (validMetrics.length > 0) {
        successMsg += ` ${validMetrics.length} health metric(s) saved for ML training.`;
      }
      setSuccess(successMsg);

      // Reset form
      setFormData({ patientHHNumber: "", testName: "", testType: "", results: "", notes: "" });
      setHealthMetrics([]);
      setFiles([]);
      setUploadedFiles([]);
      const fileInput = document.getElementById('fileUpload');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      setError(err.response?.data?.error || "Failed to create diagnostic report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filledMetricsCount = healthMetrics.filter(m => m.name && m.value !== '' && m.value !== undefined).length;

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
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
                  <Label htmlFor="testType">Test Category *</Label>
                  <select
                    id="testType"
                    name="testType"
                    value={formData.testType}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border rounded-md bg-background text-sm"
                  >
                    <option value="">Select test category...</option>
                    {TEST_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    This categorization helps match records to relevant ML models for privacy-preserving research.
                  </p>
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
                                  <CheckCircle className="h-3 w-3" /> Uploaded
                                </span>
                              )}
                              {!isUploaded && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}
                                  className="ml-auto h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Remove file">
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {files.length > 0 && uploadedFiles.length === 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={handleFileUpload}
                        disabled={uploading || loading || !formData.patientHHNumber} className="w-full md:w-auto">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? `Uploading ${files.length} file(s)...` : `Upload ${files.length} File(s) Now`}
                      </Button>
                    )}
                    {uploadedFiles.length > 0 && (
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> {uploadedFiles.length} file(s) uploaded successfully to IPFS
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

              {/* Structured Health Metrics Section for ML Training */}
              {formData.testType && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Health Metrics for ML Training
                      {filledMetricsCount > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          {filledMetricsCount} values entered
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Enter structured numeric values below. These enable privacy-preserving machine learning — only anonymized numbers are used, never patient identity.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {healthMetrics.length === 0 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        <p>No metric presets for this category. Click "Add Metric" to enter custom values.</p>
                      </div>
                    )}

                    {healthMetrics.map((metric, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <Input
                            value={metric.name}
                            onChange={(e) => updateMetric(index, 'name', e.target.value)}
                            placeholder="Metric name"
                            className="text-sm"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            step="any"
                            value={metric.value}
                            onChange={(e) => updateMetric(index, 'value', e.target.value)}
                            placeholder={metric.placeholder || 'Value'}
                            className="text-sm"
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            value={metric.unit}
                            onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                            placeholder="Unit"
                            className="text-sm text-muted-foreground"
                          />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => removeMetric(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={addMetric} className="w-full border-dashed">
                      <Plus className="h-3 w-3 mr-1" /> Add Metric
                    </Button>
                  </CardContent>
                </Card>
              )}

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
                <Button type="button" variant="outline" onClick={() => navigate(`/diagnostic/${hhNumber}`)} className="flex-1">
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
