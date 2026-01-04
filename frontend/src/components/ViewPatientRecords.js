import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import NavBar_Logout from "./NavBar_Logout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { FileText, User, Calendar, AlertTriangle, ArrowLeft } from 'lucide-react';

const RecordDetail = ({ label, value, isCid = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className={`mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2 ${isCid ? 'break-all' : ''}`}>{value}</dd>
  </div>
);

function ViewPatientRecords() {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        console.log("📋 Fetching medical records for HH Number:", hhNumber);
        const response = await client.get(`/records/patient/${hhNumber}/all`);
        console.log("✅ Medical records fetched:", response.data);

        if (response.data.records && response.data.records.length > 0) {
          setRecords(response.data.records);
        } else {
          setMessage(response.data.message || "No medical records found yet.");
          setRecords([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch medical records:", err);

        // User-friendly error message
        let errorMsg = "Unable to load medical records.";

        if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.message.includes("not found")) {
          errorMsg = "No medical records found. You may not have any records yet.";
        } else if (err.message.includes("network")) {
          errorMsg = "Network error. Please check your connection and try again.";
        }

        setError(errorMsg);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [user, hhNumber]);

  return (
    <div className="bg-background min-h-screen">
      <NavBar_Logout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
            <p className="text-muted-foreground">Viewing records for Health Hero Number: {hhNumber}</p>
          </div>
          <Button variant="outline" onClick={() => {
            // Navigate back to the correct dashboard based on user role
            if (user?.role === 'doctor') {
              navigate(`/doctor/${user.hhNumber}`);
            } else if (user?.role === 'patient') {
              navigate(`/patient/${user.hhNumber}`);
            } else {
              navigate('/dashboard');
            }
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        {loading && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your medical records...</p>
            </CardContent>
          </Card>
        )}

        {!loading && records.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Found {records.length} medical record(s)</p>
            {records.map((record, index) => (
              <Card key={record.id || index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    {record.metadata?.testName || `Medical Record #${index + 1}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <RecordDetail label="Record ID" value={record.record_id} />
                    <RecordDetail label="Type" value={record.record_type || 'General'} />

                    {/* Test Details */}
                    {record.metadata?.testName && (
                      <RecordDetail label="Test Name" value={record.metadata.testName} />
                    )}
                    {record.metadata?.testType && (
                      <RecordDetail label="Test Type" value={record.metadata.testType} />
                    )}
                    {record.metadata?.results && (
                      <div className="border-t pt-4">
                        <dt className="text-sm font-medium text-muted-foreground mb-2">Test Results</dt>
                        <dd className="text-sm text-foreground whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded">
                          {record.metadata.results}
                        </dd>
                      </div>
                    )}
                    {record.metadata?.notes && (
                      <div className="border-t pt-4">
                        <dt className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</dt>
                        <dd className="text-sm text-foreground whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded">
                          {record.metadata.notes}
                        </dd>
                      </div>
                    )}

                    {/* File Information */}
                    {record.metadata?.fileName && (
                      <RecordDetail label="Attached File" value={record.metadata.fileName} />
                    )}
                    {record.metadata?.fileSize && (
                      <RecordDetail label="File Size" value={`${(record.metadata.fileSize / 1024).toFixed(2)} KB`} />
                    )}
                  </dl>


                  {/* Only show View Document button if there's a valid IPFS CID (not placeholder) */}
                  {record.ipfs_cid && record.ipfs_cid !== 'QmPlaceholder' && (
                    <div className="mt-6">
                      <Button
                        size="sm"
                        onClick={() => {
                          // 🚨 DIRECT NAVIGATION: Links for viewing files must hit the backend port (5001) directly
                          // to bypass the React Router and allow the server to stream the file or placeholder.
                          const backendUrl = 'http://localhost:5001/api';
                          window.open(`${backendUrl}/records/file/${record.ipfs_cid}`, '_blank');
                        }}
                      >
                        View Document
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && records.length === 0 && !error && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Medical Records Found</h3>
              <p className="text-muted-foreground mb-4">
                {message || "You don't have any medical records in the system yet."}
              </p>
              <p className="text-sm text-muted-foreground">
                Medical records will appear here once they are created by healthcare providers.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && records.length === 0 && error && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Records</h3>
              <p className="text-muted-foreground mb-4">
                {error}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                This could mean:
              </p>
              <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-2 mb-6">
                <li>• You haven't registered as a patient yet</li>
                <li>• No medical records have been created for you</li>
                <li>• There's a connection issue with the server</li>
              </ul>
              <div className="flex justify-center">
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ViewPatientRecords;
