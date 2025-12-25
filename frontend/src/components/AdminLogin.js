import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NavBar from "./NavBar";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ShieldCheck, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);

        try {
            // Admin uses wallet-only authentication (no HH number needed)
            const result = await login({ role: "admin", hhNumber: 999999 });
            if (result?.user) {
                navigate(`/fl-dashboard`);
            }
        } catch (err) {
            setError(err.message || "Admin login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background min-h-screen">
            <NavBar />
            <div className="container mx-auto flex flex-col items-center justify-center py-12 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <ShieldCheck size={48} className="text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Admin Login</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-center text-muted-foreground">
                            Connect your MetaMask wallet to access the Federated Learning Dashboard.
                        </p>

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
                                <AlertCircle size={16} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            {loading ? "Connecting..." : "Connect Wallet & Login"}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            Only registered admin wallets can access this portal.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminLogin;
