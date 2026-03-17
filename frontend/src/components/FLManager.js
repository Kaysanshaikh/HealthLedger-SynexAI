import React, { useState, useEffect, useMemo, useCallback } from 'react';
import client from '../api/client';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Brain, Users, TrendingUp, Shield, Plus, Minus, RefreshCw, Activity, Zap, X, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import DatasetSelectionModal from './DatasetSelectionModal';

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
    const [activeRounds, setActiveRounds] = useState({});
    const [userContributions, setUserContributions] = useState([]);
    const [trainingModalModel, setTrainingModalModel] = useState(null); // { modelId, disease }
    const [globalStats, setGlobalStats] = useState({
        totalModels: 0,
        totalParticipants: 0,
        avgAccuracy: 0,
        network: 'Polygon Amoy'
    });
    const [notification, setNotification] = useState(null);
    const [isParticipant, setIsParticipant] = useState(false);
    const [participantData, setParticipantData] = useState(null);
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

    const fetchModels = useCallback(async () => {
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
                        setParticipantData(participantRes.data.participant);
                    } else {
                        setIsParticipant(false);
                        setParticipantData(null);
                    }
                } catch (err) {
                    setIsParticipant(false);
                    setParticipantData(null);
                }
            }
        } catch (err) {
            console.error('Failed to fetch models or records:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const handleCreateModel = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await client.post(`${API_URL}/models`, newModel);
            setShowCreateForm(false);
            
            const disease = newModel.disease;
            const modelType = newModel.modelType;
            
            setNewModel({ disease: 'diabetes', modelType: 'logistic_regression' });
            
            if (res.data.async) {
                showNotification('success', '⏳ Processing', res.data.message || 'Transaction submitted to blockchain. It will appear shortly.');
                
                // Optimistic UI: Add a placeholder model
                const tempModel = {
                    model_id: `pending-${Date.now()}`,
                    disease: disease,
                    model_type: modelType,
                    status: 'creating',
                    accuracy: null,
                    current_round: 0,
                    isOptimistic: true
                };
                setModels(prev => [tempModel, ...prev]);

                // Auto-refresh logic
                const pollForModel = async (retryCount = 0) => {
                    if (retryCount > 10) return; // Stop after 10 retries (~2 mins total)
                    await new Promise(resolve => setTimeout(resolve, 5000 + (retryCount * 2000)));
                    await fetchModels();
                    
                    setModels(currentModels => {
                        const exists = currentModels.some(m => !m.isOptimistic && m.disease.toLowerCase() === disease.toLowerCase() && m.model_type.toLowerCase() === modelType.toLowerCase());
                        if (!exists) pollForModel(retryCount + 1);
                        return currentModels;
                    });
                };
                pollForModel();
            } else {
                await fetchModels();
                showNotification('success', '✅ Success!', 'Model created successfully.');
            }
        } catch (err) {
            console.error('Failed to create model:', err);
            showNotification('error', '❌ Loading Failed', parseBlockchainError(err));
        } finally {
            setLoading(false);
        }
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

    // handleOpenTrainingModal opens the DatasetSelectionModal
    const handleOpenTrainingModal = (modelId) => {
        const model = models.find(m => m.model_id === modelId);
        if (model) {
            setTrainingModalModel({ modelId: model.model_id, disease: model.disease });
        }
    };

    const handleCompleteRound = async (roundId) => {
        try {
            setLoading(true);
            await client.post(`${API_URL}/rounds/complete`, { roundId });
            showNotification('success', '✅ Success!', `Round ${roundId} completed and aggregated successfully!`);
            await fetchModels();
        } catch (err) {
            console.error('Failed to complete round:', err);
            showNotification('error', '❌ Round Completion Failed', parseBlockchainError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteModel = async (modelId) => {
        if (!window.confirm("Are you sure you want to delete this model? This will remove it from the research network.")) return;

        const originalModels = [...models];
        
        try {
            // Remove immediately from UI
            setModels(prev => prev.filter(m => m.model_id !== modelId));
            
            const res = await client.delete(`${API_URL}/models/${modelId}`);
            
            if (res.data.async) {
                showNotification('success', '⏳ Processing', res.data.message || "Model deletion processing.");
                // Sync after a while to make sure everything is consistent
                setTimeout(() => fetchModels(), 10000);
            } else {
                showNotification('success', '✅ Success!', "Model deleted successfully.");
            }
        } catch (err) {
            console.error('Failed to delete model:', err);
            showNotification('error', '❌ Deletion Failed', parseBlockchainError(err));
            // Rollback on failure
            setModels(originalModels);
        }
    };


    // Reputation Tier Logic
    const reputationTier = useMemo(() => {
        if (!participantData) return null;
        const rewards = parseFloat(participantData.total_rewards || participantData.totalRewards) || 0;
        
        if (rewards >= 500) return { 
            name: 'Gold Research Partner', 
            color: 'text-amber-500', 
            bg: 'bg-amber-500/10', 
            border: 'border-amber-500/30',
            fill: 'fill-amber-500/20'
        };
        if (rewards >= 100) return { 
            name: 'Silver Research Partner', 
            color: 'text-slate-400', 
            bg: 'bg-slate-400/10', 
            border: 'border-slate-400/30',
            fill: 'fill-slate-400/20'
        };
        return { 
            name: 'Bronze Research Partner', 
            color: 'text-orange-400', 
            bg: 'bg-orange-400/10', 
            border: 'border-orange-400/30',
            fill: 'fill-orange-400/20'
        };
    }, [participantData]);
    
    // Calculate pending contributions (exists in localStorage/DB but not yet reflected in total_contributions)
    const pendingContributions = useMemo(() => {
        if (!userContributions.length) return 0;
        const verifiedCount = parseInt(participantData?.total_contributions || 0);
        return Math.max(0, userContributions.length - verifiedCount);
    }, [userContributions, participantData]);

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
            
            {/* Rewards & Reputation Section (Phase 3) */}
            {isParticipant && participantData && (
                <div className="grid gap-4 md:grid-cols-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-primary/10 bg-primary/5 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                            <Zap className="h-32 w-32 text-primary" />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5 text-primary" />
                                <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">Contribution Incentives</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <div className="text-4xl font-black text-primary tracking-tighter drop-shadow-sm">
                                    {(parseFloat(participantData.total_rewards || participantData.totalRewards) || 0).toFixed(2)}
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground uppercase opacity-70">FL Credits</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/80 mt-1 font-mono uppercase tracking-widest flex items-center gap-2">
                                <span className="opacity-90">Proof of Contribution Verified: {participantData.total_contributions || 0} Rounds</span>
                                {pendingContributions > 0 && (
                                    <span className="flex items-center gap-1 text-amber-500 font-bold animate-pulse">
                                        <RefreshCw className="h-2 w-2 animate-spin" />
                                        {pendingContributions} Pending Verification
                                    </span>
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className={`border ${reputationTier?.border} ${reputationTier?.bg} relative overflow-hidden group`}>
                         <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                            <Shield className={`h-32 w-32 ${reputationTier?.color}`} />
                        </div>
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Shield className={`h-3.5 w-3.5 ${reputationTier?.color}`} />
                                <CardTitle className={`text-[10px] font-bold uppercase tracking-[0.2em] ${reputationTier?.color}`}>Network Reputation</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-xl font-black ${reputationTier?.color} uppercase tracking-tight`}>
                                {reputationTier?.name}
                            </div>
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
                                        {reputationTier?.name === 'Gold Research Partner' 
                                            ? 'Eminent Tier Status' 
                                            : `Progress to Next Tier`}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground opacity-90">
                                        {reputationTier?.name === 'Gold Research Partner' 
                                            ? 'MAX' 
                                            : `${Math.max(0, (parseFloat(participantData.total_rewards || participantData.totalRewards) >= 100 ? 500 : 100) - (parseFloat(participantData.total_rewards || participantData.totalRewards) || 0)).toFixed(0)} pts left`}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10 backdrop-blur-sm">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-in-out ${reputationTier?.color?.replace('text-', 'bg-')} shadow-[0_0_8px_rgba(0,0,0,0.2)]`} 
                                        style={{ width: `${Math.min(100, ((parseFloat(participantData.total_rewards || participantData.totalRewards) || 0) / (parseFloat(participantData.total_rewards || participantData.totalRewards) >= 100 ? 500 : 100)) * 100)}%` }} 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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



            {/* Dataset Selection & Training Modal */}
            {trainingModalModel && (
                <DatasetSelectionModal
                    modelId={trainingModalModel.modelId}
                    disease={trainingModalModel.disease}
                    onClose={() => {
                        setTrainingModalModel(null);
                        fetchModels();
                    }}
                    onTrainingComplete={() => {
                        fetchModels();
                    }}
                />
            )}

            {user?.role === 'admin' && (
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
                                <option value="pneumonia">Pneumonia</option>
                            </select>
                            <select
                                className="p-2 border rounded-md bg-background"
                                value={newModel.modelType}
                                onChange={(e) => setNewModel({ ...newModel, modelType: e.target.value })}
                            >
                                <option value="logistic_regression">Logistic Regression</option>
                                <option value="neural_network">Neural Network</option>
                                <option value="random_forest">Random Forest</option>
                                <option value="cnn">CNN</option>
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
                                        <Activity className={`h-4 w-4 ${activeRound ? 'text-primary animate-pulse' : (model.isOptimistic ? 'text-amber-500 animate-spin' : 'text-muted-foreground')}`} />
                                        {model.disease}
                                        {model.isOptimistic && (
                                            <span className="text-[10px] font-bold text-amber-500 animate-pulse">Syncing...</span>
                                        )}
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
                                <p className="text-xs font-mono text-muted-foreground">{model.model_type}</p>
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
                                        onClick={() => handleOpenTrainingModal(model.model_id)}
                                        disabled={hasContributed || (!isParticipant && user?.role !== 'admin')}
                                    >
                                        {!isParticipant && user?.role !== 'admin' ? (
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
                            {model.isOptimistic && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10 pointer-events-none">
                                    <div className="bg-background/90 border border-amber-500/30 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                                        <RefreshCw className="h-3 w-3 text-amber-500 animate-spin" />
                                        <span className="text-[10px] font-bold text-amber-500">Syncing Node...</span>
                                    </div>
                                </div>
                            )}
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
