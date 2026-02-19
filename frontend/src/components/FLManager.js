import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Brain, Users, TrendingUp, Shield, Plus, Minus, RefreshCw, Activity, Zap, FileText, Check, X, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

const API_URL = '/fl';

const FLManager = () => {
    const { user } = useAuth();
    console.log('🏁 FLManager component mounted/updated, user:', {
        role: user?.role,
        hhNumber: user?.hhNumber,
        wallet: user?.walletAddress
    });



    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newModel, setNewModel] = useState({
        disease: 'diabetes',
        modelType: 'logistic_regression'
    });
    const [trainingModels, setTrainingModels] = useState({});
    const [activeRounds, setActiveRounds] = useState({});
    const [userContributions, setUserContributions] = useState([]);
    const [userRecords, setUserRecords] = useState([]);
    const [selectingForModel, setSelectingForModel] = useState(null);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [globalStats, setGlobalStats] = useState({
        totalModels: 0,
        totalParticipants: 3,
        avgAccuracy: 0,
        network: 'Polygon Amoy'
    });
    const [notification, setNotification] = useState(null);
    const [isParticipant, setIsParticipant] = useState(false);
    const [registering, setRegistering] = useState(false);

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotification = (type, title, message) => {
        setNotification({ type, title, message });
    };

    const parseBlockchainError = (err) => {
        // 1. Check if backend provided a specialized error message first
        if (err.response?.data?.error) {
            const serverError = err.response.data.error;
            // If it's a long ethers dump from the backend, try to extract the reason
            if (serverError.includes('execution reverted:')) {
                const match = serverError.match(/execution reverted: "([^"]+)"/) || serverError.match(/execution reverted: ([^,]+)/);
                if (match && match[1]) return match[1].trim();
            }
            return serverError;
        }

        // 2. Fallback to generic err message
        const errorMsg = err.message || '';

        if (errorMsg.includes('Already submitted')) return 'You have already contributed to this training round.';
        if (errorMsg.includes('insufficient funds')) return 'Insufficient funds in wallet for gas fees.';
        if (errorMsg.includes('user rejected')) return 'Transaction was rejected in wallet.';
        if (errorMsg.includes('execution reverted')) {
            const match = errorMsg.match(/execution reverted: "([^"]+)"/) || errorMsg.match(/execution reverted: ([^,]+)/);
            if (match && match[1]) return match[1].trim();
        }

        return errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg;
    };


    const stats = useMemo(() => {
        return {
            avgAccuracy: globalStats.avgAccuracy ? globalStats.avgAccuracy.toFixed(1) : '0.0',
            networkNodes: globalStats.totalParticipants || 3
        };
    }, [globalStats]);

    useEffect(() => {
        fetchModels();
    }, [user?.walletAddress]); // Refetch when user changes

    const fetchModels = async () => {
        console.log('🔄 fetchModels triggered for user:', user?.walletAddress);
        try {
            setLoading(true);
            const response = await client.get(`${API_URL}/models`);
            console.log('📦 Models response:', response.data);
            const modelsList = response.data.models || [];
            console.log(`✅ Loaded ${modelsList.length} models`);
            setModels(modelsList);

            // Fetch active rounds for each model
            const roundsMap = {};
            for (const model of modelsList) {
                try {
                    const roundRes = await client.get(`${API_URL}/rounds/active/${model.model_id}`);
                    if (roundRes.data.activeRound) {
                        roundsMap[model.model_id] = roundRes.data.activeRound;
                    }
                } catch (err) {
                    // Silently fail if no active round
                }
            }
            setActiveRounds(roundsMap);

            // Fetch user contributions and records
            if (user?.walletAddress) {
                console.log('👤 Fetching data for user:', {
                    role: user.role,
                    hhNumber: user.hhNumber,
                    walletAddress: user.walletAddress
                });

                const contribRes = await client.get(`${API_URL}/contributions/${user.walletAddress}`);
                setUserContributions(contribRes.data.contributions || []);

                // Fetch records based on user role
                // Note: Only patients and diagnostic centers can contribute their own records to FL
                // Doctors can view patient records but don't own them for FL contribution
                try {
                    let recordsRes;
                    if (user.role === 'patient' && user.hhNumber) {
                        console.log('📋 Fetching patient records...');
                        recordsRes = await client.get(`/records/patient/${user.hhNumber}/all`);
                    } else if (user.role === 'diagnostic' && user.hhNumber) {
                        console.log('📋 Fetching diagnostic center records...');
                        recordsRes = await client.get(`/records/diagnostic/${user.hhNumber}/reports`);
                    } else if (user.role === 'doctor') {
                        console.log('ℹ️ Doctors cannot contribute to FL training (records belong to patients)');
                        setUserRecords([]);
                        return; // Skip the rest of record fetching
                    } else {
                        console.warn('⚠️ User role or hhNumber not found:', { role: user.role, hhNumber: user.hhNumber });
                    }

                    if (recordsRes) {
                        const records = recordsRes.data.records || recordsRes.data.reports || [];
                        console.log(`✅ Fetched ${records.length} records for FL training`);
                        setUserRecords(records);
                    } else {
                        console.warn('⚠️ No records endpoint available for this user type');
                        setUserRecords([]);
                    }
                } catch (recordErr) {
                    console.error('❌ Failed to fetch records:', recordErr);
                    console.error('Error details:', {
                        message: recordErr.message,
                        response: recordErr.response?.data,
                        status: recordErr.response?.status
                    });
                    setUserRecords([]);
                }
            }

            // Fetch global FL stats
            const statsRes = await client.get(`${API_URL}/stats`);
            if (statsRes.data.success) {
                setGlobalStats(statsRes.data.stats);
            }

            // Check if user is a registered FL participant
            if (user?.walletAddress) {
                try {
                    const participantRes = await client.get(`${API_URL}/participants/${user.walletAddress}`);
                    if (participantRes.data.success && participantRes.data.participant?.isActive) {
                        setIsParticipant(true);
                    } else {
                        setIsParticipant(false);
                    }
                } catch (err) {
                    setIsParticipant(false);
                }
            }
        } catch (err) {
            console.error('Failed to fetch models or records:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateModel = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await client.post(`${API_URL}/models`, newModel);
            setShowCreateForm(false);
            setNewModel({ disease: 'diabetes', modelType: 'logistic_regression' });
            await fetchModels();
        } catch (err) {
            console.error('Failed to create model:', err);
            const errorMsg = err.response?.data?.error || "Model creation failed. Check console for details.";
            showNotification('error', '❌ Loading Failed', parseBlockchainError(err));
        } finally {
            setLoading(false);
        }
    };

    const toggleRecordSelection = (recordId) => {
        if (selectedRecords.includes(recordId)) {
            setSelectedRecords(selectedRecords.filter(id => id !== recordId));
        } else {
            setSelectedRecords([...selectedRecords, recordId]);
        }
    };

    const handleSelectAll = () => {
        const visibleRecordIds = sortedRecords.map(r => r.record_id);
        const allSelected = visibleRecordIds.length > 0 &&
            visibleRecordIds.every(id => selectedRecords.includes(id));

        if (allSelected) {
            setSelectedRecords(selectedRecords.filter(id => !visibleRecordIds.includes(id)));
        } else {
            const newSelection = [...new Set([...selectedRecords, ...visibleRecordIds])];
            setSelectedRecords(newSelection);
        }
    };

    const getRelevancyScore = (record, disease) => {
        const category = (record.metadata?.testType || '').toLowerCase();
        const dis = (disease || '').toLowerCase();

        // Relevancy Matrix: 3=High (Primary), 2=Medium (Correlation), 1=Low (Supplemental)
        if (dis === 'cvd') {
            if (category === 'cardiovascular') return 3;
            if (category === 'lifestyle') return 2;
            if (category === 'metabolic') return 1;
            return 1; // Allow other types as supplemental
        }

        if (dis === 'diabetes') {
            if (category === 'metabolic') return 3;
            if (category === 'lifestyle') return 2;
            return 1; // Allow other types as supplemental
        }

        if (dis === 'cancer') {
            if (category === 'genomics') return 3;
            if (category === 'metabolic') return 2;
            return 1; // Allow other types as supplemental
        }

        if (dis === 'pneumonia') {
            if (category === 'respiratory') return 3;
            if (category === 'lifestyle') return 2;
            if (category === 'cardiovascular') return 1;
            return 1; // Allow other types as supplemental
        }

        return 1; // Default: allow all records as supplemental data
    };

    const handleRegister = async () => {
        if (!user?.walletAddress) return;
        try {
            setRegistering(true);
            const institutionName = user.institutionName || (user.role === 'patient' ? `Patient ${user.hhNumber}` : `Diagnostic Center ${user.hhNumber}`);
            await client.post(`${API_URL}/participants/register`, {
                walletAddress: user.walletAddress,
                institutionName
            });
            showNotification('success', '✅ Registered!', 'You are now a registered Federated Learning participant.');
            setIsParticipant(true);
            await fetchModels();
        } catch (err) {
            console.error('Registration failed:', err);
            showNotification('error', '❌ Registration Failed', parseBlockchainError(err));
        } finally {
            setRegistering(false);
        }
    };

    const sortedRecords = useMemo(() => {
        if (!selectingForModel) return userRecords;
        const model = models.find(m => m.model_id === selectingForModel);
        if (!model) return userRecords;

        return userRecords
            .map(r => ({ ...r, score: getRelevancyScore(r, model.disease) }))
            .sort((a, b) => b.score - a.score); // Sort by relevancy, but allow all records
    }, [userRecords, selectingForModel, models]);

    const handleStartTraining = async (modelId) => {
        console.log('🎯 handleStartTraining called with modelId:', modelId);
        console.log('📊 Current state:', {
            selectedRecords: selectedRecords.length,
            selectingForModel,
            userHHNumber: user?.hhNumber,
            userRole: user?.role
        });

        // Show picker for ANY user if they haven't selected records yet
        if (selectedRecords.length === 0 && !selectingForModel) {
            console.log('📋 Opening record selection modal...');
            setSelectingForModel(modelId);
            return;
        }

        try {
            setTrainingModels(prev => ({ ...prev, [modelId]: true }));
            setSelectingForModel(null);

            console.log('🔍 Checking for active round...');
            // 1. Check for active round
            const activeRes = await client.get(`${API_URL}/rounds/active/${modelId}`);
            const activeRound = activeRes.data.activeRound;
            console.log('✅ Active round response:', activeRound);

            if (!activeRound) {
                showNotification('error', '⚠️ No Active Round', "No active training round found for this model.");
                return;
            }

            const roundId = activeRound.round_id;
            console.log(`🚀 Starting REAL training for round ${roundId} with ${selectedRecords.length} records...`);

            // 2. Local Training (on Kaggle data via Backend)
            console.log(`🧠 Invoking Python ML backend for ${modelId}...`);
            const trainRes = await client.post(`${API_URL}/rounds/train`, {
                modelId,
                samples: selectedRecords.length
            });

            if (!trainRes.data.success) {
                throw new Error(trainRes.data.error || "Training failed");
            }

            const { modelWeights, metrics } = trainRes.data;

            console.log('📤 Submitting contribution...', { roundId, metrics });
            // 3. Submit contribution
            await client.post(`${API_URL}/rounds/submit`, {
                roundId,
                modelWeights,
                trainingMetrics: metrics
            });

            console.log('✅ Contribution successful!');
            showNotification('success', '✅ Success!', `Training completed on real Kaggle datasets with ${metrics.accuracy.toFixed(2)} accuracy.`);
            setSelectedRecords([]); // Reset selection
            await fetchModels();
        } catch (err) {
            console.error('❌ Contribution failed:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            const errorMsg = err.response?.data?.error || err.message;
            showNotification('error', '❌ Contribution Failed', parseBlockchainError(err));
        } finally {
            setTrainingModels(prev => ({ ...prev, [modelId]: false }));
        }
    };

    const handleCompleteRound = async (roundId) => {
        try {
            setLoading(true);
            const res = await client.post(`${API_URL}/rounds/complete`, { roundId });
            showNotification('success', '✅ Success!', `Round ${roundId} completed and aggregated successfully!`);
            await fetchModels();
        } catch (err) {
            console.error('Failed to complete round:', err);
            const errorMsg = err.response?.data?.error || err.message;
            showNotification('error', '❌ Round Completion Failed', parseBlockchainError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteModel = async (modelId) => {
        if (!window.confirm("Are you sure you want to delete this model? This will remove it from the research network.")) return;

        try {
            setLoading(true);
            await client.delete(`${API_URL}/models/${modelId}`);
            showNotification('success', '✅ Success!', "Model deleted successfully.");
            await fetchModels();
        } catch (err) {
            console.error('Failed to delete model:', err);
            const errorMsg = err.response?.data?.error || err.message;
            showNotification('error', '❌ Deletion Failed', parseBlockchainError(err));
        } finally {
            setLoading(false);
        }
    };


    // Safety check: Doctors shouldn't see or access the FL Console
    if (user?.role === 'doctor') {
        return null;
    }

    return (
        <section className="mt-12">
            <header className="mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Brain className="h-6 w-6 text-primary" />
                    Federated Learning Console
                </h2>
                <p className="text-muted-foreground">Privacy-Preserving Collaborative Research</p>
            </header>

            {/* Inline Notifications */}
            {notification && (
                <Alert
                    variant={notification.type === 'error' ? 'destructive' : 'default'}
                    className={`mb-6 border-l-4 ${notification.type === 'error' ? 'border-l-destructive' : 'border-l-primary'} animate-in fade-in slide-in-from-top-4 duration-300`}
                >
                    <div className="flex items-center gap-3">
                        {notification.type === 'error' ? (
                            <AlertCircle className="h-5 w-5" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                        <div>
                            <AlertTitle className="font-bold">{notification.title}</AlertTitle>
                            <AlertDescription className="text-sm opacity-90">
                                {notification.message}
                            </AlertDescription>
                        </div>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-auto p-1 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </Alert>
            )}

            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Models</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{models.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network Nodes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.networkNodes}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgAccuracy}%</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Security</CardTitle>
                        <Shield className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">ZK-SNARK</div>
                    </CardContent>
                </Card>
            </div>

            {/* Registration Callout for Participants */}
            {!isParticipant && user?.role !== 'admin' && (
                <Alert className="mb-8 border-primary/50 bg-primary/5">
                    <Shield className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-bold">Research Registration Required</AlertTitle>
                    <AlertDescription className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
                        <p className="text-sm">
                            To contribute to research models and earn rewards, you must register your wallet as a researcher on the HealthLedger network.
                        </p>
                        <Button
                            onClick={handleRegister}
                            disabled={registering}
                            className="whitespace-nowrap shadow-lg shadow-primary/20"
                        >
                            {registering ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Register as Researcher
                        </Button>
                    </AlertDescription>
                </Alert>
            )}



            {/* Record Selection Modal/View */}
            {selectingForModel && (
                <Card className="mb-8 border-primary bg-primary/5 ring-2 ring-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Select Records for Training: {models.find(m => m.model_id === selectingForModel)?.disease.toUpperCase()}
                            </CardTitle>
                            <CardDescription>Choose the health records you want to use for local model training.</CardDescription>

                            {/* Disease-Specific Guidance */}
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">📊 Best Record Types for This Model:</p>
                                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                                    {(() => {
                                        const disease = models.find(m => m.model_id === selectingForModel)?.disease?.toLowerCase();
                                        if (disease === 'cvd') return '🔴 Cardiovascular tests are most valuable. Lifestyle and metabolic data also helps.';
                                        if (disease === 'diabetes') return '🟢 Metabolic tests (glucose, HbA1c) are most valuable. Lifestyle data also helps.';
                                        if (disease === 'cancer') return '🟣 Genomic tests are most valuable. Metabolic data also helps.';
                                        if (disease === 'pneumonia') return '🫁 Respiratory tests (lung function, X-rays) are most valuable. Lifestyle data also helps.';
                                        return '📋 All clinical records can contribute to this model.';
                                    })()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {userRecords.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectAll}
                                    className="h-7 text-[9px] font-bold uppercase tracking-wider border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                                >
                                    {sortedRecords.length > 0 && sortedRecords.every(r => selectedRecords.includes(r.record_id))
                                        ? 'Deselect All'
                                        : 'Select All Valid'}
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectingForModel(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 bg-background/50 p-4 rounded-lg border">
                            {userRecords.length === 0 ? (
                                <div className="text-center py-6 space-y-2">
                                    <Activity className="h-10 w-10 text-muted-foreground mx-auto opacity-20" />
                                    <p className="text-sm text-muted-foreground">No health records found in your vault.</p>
                                </div>
                            ) : (
                                userRecords
                                    .map(record => ({
                                        record,
                                        score: getRelevancyScore(record, models.find(m => m.model_id === selectingForModel)?.disease)
                                    }))
                                    .sort((a, b) => b.score - a.score) // Sort by relevancy, show all records
                                    .map(({ record, score }) => (
                                        <div
                                            key={record.record_id}
                                            onClick={() => toggleRecordSelection(record.record_id)}
                                            className={`p-3 rounded-md border cursor-pointer transition-all flex items-center justify-between ${selectedRecords.includes(record.record_id)
                                                ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                                                : 'bg-background hover:bg-muted/50 border-border'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${selectedRecords.includes(record.record_id) ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium">{record.metadata?.testName || 'Medical Record'}</p>
                                                        {score === 3 && (
                                                            <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 text-[8px] font-bold uppercase rounded border border-yellow-500/20">
                                                                Primary Data
                                                            </span>
                                                        )}
                                                        {score === 2 && (
                                                            <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 text-[8px] font-bold uppercase rounded border border-blue-500/20">
                                                                High Correlation
                                                            </span>
                                                        )}
                                                        {score === 1 && (
                                                            <span className="px-1.5 py-0.5 bg-gray-500/10 text-gray-500 text-[8px] font-bold uppercase rounded border border-gray-500/20">
                                                                Supplemental
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">{record.record_type} • {record.metadata?.testType}</p>
                                                </div>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedRecords.includes(record.record_id) ? 'bg-primary border-primary' : 'border-muted'}`}>
                                                {selectedRecords.includes(record.record_id) && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Clinical Impact</p>
                                    <p className="text-sm font-mono">{selectedRecords.length} records × research weight</p>
                                </div>
                                {selectedRecords.length > 0 && (
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Status</p>
                                        <p className="text-[10px] font-bold text-green-600">VALIDATED DATA</p>
                                    </div>
                                )}
                            </div>

                            {selectedRecords.length === 0 && (
                                <div className="p-2 border border-yellow-500/20 bg-yellow-500/5 rounded text-[10px] text-yellow-700 leading-tight">
                                    ⚠️ No records selected. Select at least one clinical record to begin training.
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => {
                                    setSelectingForModel(null);
                                    setSelectedRecords([]);
                                }}>Cancel</Button>
                                {userRecords.length === 0 ? (
                                    <Button
                                        disabled
                                        variant="outline"
                                        className="cursor-not-allowed opacity-50"
                                    >
                                        No clinical data available
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={selectedRecords.length === 0}
                                        onClick={() => handleStartTraining(selectingForModel)}
                                    >
                                        Start Training with {selectedRecords.length} Records
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {user?.role === 'admin' && !selectingForModel && (
                <div className="flex gap-4 mb-6">
                    <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                        {showCreateForm ? <Minus className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {showCreateForm ? 'Cancel' : 'Propose New Model'}
                    </Button>
                    <Button variant="outline" size="icon" onClick={fetchModels}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            )}

            {showCreateForm && (
                <Card className="mb-8 border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Propose FL Model</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateModel} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select
                                className="p-2 border rounded-md bg-background"
                                value={newModel.disease}
                                onChange={(e) => setNewModel({ ...newModel, disease: e.target.value })}
                            >
                                <option value="diabetes">Diabetes</option>
                                <option value="cvd">Cardiovascular</option>
                                <option value="cancer">Cancer</option>
                            </select>
                            <select
                                className="p-2 border rounded-md bg-background"
                                value={newModel.modelType}
                                onChange={(e) => setNewModel({ ...newModel, modelType: e.target.value })}
                            >
                                <option value="logistic_regression">Logistic Regression</option>
                                <option value="neural_network">Neural Network</option>
                            </select>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Creating...' : 'Create'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {models.map((model, index) => {
                    const activeRound = activeRounds[model.model_id];
                    const hasContributed = activeRound && userContributions.some(c => c.round_id === activeRound.round_id);

                    return (
                        <Card key={index} className="hover:shadow-lg transition-all duration-300 border-primary/10 group">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="capitalize text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                                        <Activity className={`h-4 w-4 ${activeRound ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                                        {model.disease}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${activeRound
                                            ? 'bg-primary text-primary-foreground animate-pulse'
                                            : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {activeRound ? 'Training Active' : (model.status || 'Active')}
                                        </span>
                                        {user?.role === 'admin' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() => handleDeleteModel(model.model_id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <CardDescription className="text-xs font-mono">{model.model_type}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <p>ID: {model.model_id?.substring(0, 12)}...</p>
                                    {model.accuracy !== null && (
                                        <p className="text-primary font-medium">Global Accuracy: {(parseFloat(model.accuracy) * 100).toFixed(1)}%</p>
                                    )}
                                </div>
                            </CardContent>
                            <div className="p-4 pt-0">
                                {activeRound ? (
                                    <Button
                                        className={`w-full shadow-lg transition-all ${hasContributed
                                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50 cursor-default'
                                            : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                                        onClick={() => handleStartTraining(model.model_id)}
                                        disabled={trainingModels[model.model_id] || hasContributed || selectingForModel || (!isParticipant && user?.role !== 'admin')}
                                    >
                                        {trainingModels[model.model_id] ? (
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                <span>Training Locally...</span>
                                            </div>
                                        ) : !isParticipant && user?.role !== 'admin' ? (
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <span>Register to Contribute</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {hasContributed ? (
                                                    <>
                                                        <Shield className="h-4 w-4 text-green-500 fill-green-500/20" />
                                                        <span>Already Contributed</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="h-4 w-4 fill-current" />
                                                        <span>Contribute to Round {activeRound.round_number}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full text-muted-foreground"
                                        variant="outline"
                                        disabled
                                    >
                                        Waiting for next round...
                                    </Button>
                                )}

                                {/* Admin Controls */}
                                {user?.role === 'admin' && activeRound && (
                                    <Button
                                        variant="secondary"
                                        className="w-full mt-2 border-primary/20 hover:bg-primary/10"
                                        onClick={() => handleCompleteRound(activeRound.round_id)}
                                        disabled={loading}
                                    >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Complete & Aggregate Round
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Privacy Shield Section */}
            <div className="mt-12 p-8 rounded-xl bg-gradient-to-br from-primary/10 via-background to-background border border-primary/20">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="p-4 bg-primary/20 rounded-full">
                        <Shield className="h-16 w-16 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-2">Privacy is Built-In</h3>
                        <p className="text-muted-foreground max-w-2xl">
                            When you contribute to a training round, your raw data never leaves your device.
                            Our system generates encrypted model updates and Zero-Knowledge Proofs to verify
                            participation without compromising patient confidentiality.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FLManager;
