import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Flame, Trash2, Key } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const BurnerWalletManager = () => {
    const { burnerWallet, generateBurnerWallet, clearBurnerWallet } = useAuth();

    // If we wanted to hide this in production, we could check an env var here:
    // if (process.env.REACT_APP_ENABLE_TEST_WALLETS !== 'true') return null;

    return (
        <Card className="w-full mb-6 border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-full text-orange-600">
                            <Flame size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-600 flex items-center gap-2">
                                Testing Mode: Local Burner Wallet
                            </h3>
                            {burnerWallet ? (
                                <p className="text-sm font-mono text-muted-foreground mt-1">
                                    Active: {burnerWallet.address.substring(0, 12)}...{burnerWallet.address.substring(38)}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Use MetaMask, or generate a temporary wallet to test.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {!burnerWallet ? (
                            <Button
                                onClick={generateBurnerWallet}
                                className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                <Key className="mr-2 h-4 w-4" />
                                Generate Burner Wallet
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={clearBurnerWallet}
                                className="w-full md:w-auto"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Wallet
                            </Button>
                        )}
                    </div>
                </div>

                {burnerWallet && (
                    <Alert className="mt-4 border-orange-200 bg-orange-50 text-orange-800">
                        <Flame className="h-4 w-4 text-orange-600" />
                        <AlertTitle>Burner Wallet Active</AlertTitle>
                        <AlertDescription className="text-xs">
                            This wallet is stored locally in your browser. All blockchain actions and logins will automatically use this address instead of waking up MetaMask. Do not use for real funds.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default BurnerWalletManager;
