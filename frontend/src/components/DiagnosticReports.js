import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client, { getBackendUrl } from '../api/client';
import NavBarLogout from "./NavBarLogout";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import { FileText, AlertTriangle, ArrowLeft, Eye } from 'lucide-react';

const ReportDetail = ({ label, value, isCid = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className={`mt-1 text-sm text-foreground sm:mt-0 sm:col-span-2 ${isCid ? 'break-all' : ''}`}>{value}</dd>
  </div>
);

function DiagnosticReports() {
  const { hhNumber } = useParams();
  const navigate = useNavigate();
  const { user, token: authToken } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) return;
      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        console.log("📋 Fetching diagnostic reports for center HH Number:", hhNumber);
        const response = await client.get(`/records/diagnostic/${hhNumber}/reports`);
        console.log("✅ Diagnostic reports fetched:", response.data);

        if (response.data.reports && response.data.reports.length > 0) {
          setReports(response.data.reports);
        } else {
          setMessage(response.data.message || "No reports created yet.");
          setReports([]);
        }
      } catch (err) {
        console.error("❌ Failed to fetch diagnostic reports:", err);

        // User-friendly error message
        let errorMsg = "Unable to load reports.";

        if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.message.includes("not found")) {
          errorMsg = "No reports found. You haven't created any reports yet.";
        } else if (err.message.includes("network")) {
          errorMsg = "Network error. Please check your connection and try again.";
        }

        setError(errorMsg);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user, hhNumber]);

  return (
    <div className="bg-background min-h-screen">
      <NavBarLogout />
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Diagnostic Reports</h1>
            <p className="text-muted-foreground">Reports created by your diagnostic center</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/diagnostic/${hhNumber}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        {loading && (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your reports...</p>
            </CardContent>
          </Card>
        )}

        {!loading && reports.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Found {reports.length} report(s)</p>
            {reports.map((report, index) => (
              <Card key={report.id || index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    {report.metadata?.testName || `Diagnostic Report #${index + 1}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <ReportDetail label="Record ID" value={report.record_id} />
                    <ReportDetail label="Patient HH Number" value={report.patient_hh_number} />
                    <ReportDetail label="Type" value={report.record_type || 'Diagnostic Report'} />

                    {/* Test Details */}
                    {report.metadata?.testName && (
                      <ReportDetail label="Test Name" value={report.metadata.testName} />
                    )}
                    {report.metadata?.testType && (
                      <ReportDetail label="Test Type" value={report.metadata.testType} />
                    )}
                    {report.metadata?.results && (
                      <div className="border-t pt-4">
                        <dt className="text-sm font-medium text-muted-foreground mb-2">Test Results</dt>
                        <dd className="text-sm text-foreground whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded">
                          {report.metadata.results}
                        </dd>
                      </div>
                    )}
                    {report.metadata?.notes && (
                      <div className="border-t pt-4">
                        <dt className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</dt>
                        <dd className="text-sm text-foreground whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded">
                          {report.metadata.notes}
                        </dd>
                      </div>
                    )}

                    {/* File Information */}
                    {report.metadata?.fileName && (
                      <ReportDetail label="Attached File" value={report.metadata.fileName} />
                    )}
                    {report.metadata?.fileSize && (
                      <ReportDetail label="File Size" value={`${(report.metadata.fileSize / 1024).toFixed(2)} KB`} />
                    )}

                    <ReportDetail label="IPFS CID" value={report.ipfs_cid} isCid={true} />
                    <ReportDetail label="Created At" value={new Date(report.created_at).toLocaleString()} />
                  </dl>


                  {report.ipfs_cid && report.ipfs_cid !== 'QmPlaceholder' && (
                    <div className="mt-6">
                      <Button
                        size="sm"
                        onClick={() => {
                          // 🚨 DIRECT NAVIGATION: Links for viewing files must hit the backend port (5001) directly
                          // to bypass the React Router and allow the server to stream the file or placeholder.
                          const backendUrl = getBackendUrl();
                          window.open(`${backendUrl}/records/file/${report.ipfs_cid}?token=${authToken}`, '_blank');
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && reports.length === 0 && !error && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4">
                {message || "You haven't created any diagnostic reports yet."}
              </p>
              <Button onClick={() => navigate(`/diagnostic/${hhNumber}/diagnosticform`)}>
                Create Your First Report
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && reports.length === 0 && error && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Unable to Load Reports</h3>
              <p className="text-muted-foreground mb-4">
                {error}
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
                <Button variant="outline" onClick={() => navigate(`/diagnostic/${hhNumber}/diagnosticform`)}>
                  Create New Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default DiagnosticReports;
