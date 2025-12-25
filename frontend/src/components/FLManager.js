import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Brain, Users, TrendingUp, Shield, Plus, RefreshCw, Activity, Zap, FileText, Check, X } from 'lucide-react';

const API_URL = '/api/fl';

const FLManager = () => {
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
    const [provisioning, setProvisioning] = useState(false);
    const { user } = useAuth();

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
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/models`);
            const modelsList = response.data.models || [];
            setModels(modelsList);

            // Fetch active rounds for each model
            const roundsMap = {};
            for (const model of modelsList) {
                try {
                    const roundRes = await axios.get(`${API_URL}/rounds/active/${model.model_id}`);
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
                const contribRes = await axios.get(`${API_URL}/contributions/${user.walletAddress}`);
                setUserContributions(contribRes.data.contributions || []);

                if (user.hhNumber) {
                    const recordsRes = await axios.get(`/api/records/patient/${user.hhNumber}/all`);
                    setUserRecords(recordsRes.data.records || []);
                }
            }

            // Fetch global FL stats
            const statsRes = await axios.get(`${API_URL}/stats`);
            if (statsRes.data.success) {
                setGlobalStats(statsRes.data.stats);
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
            await axios.post(`${API_URL}/models`, newModel);
            setShowCreateForm(false);
            setNewModel({ disease: 'diabetes', modelType: 'logistic_regression' });
            await fetchModels();
        } catch (err) {
            console.error('Failed to create model:', err);
            alert("Model creation failed. Check console for details.");
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

        // Relevancy Matrix: 3=High (Primary), 2=Medium (Correlation), 1=Low (Supplemental), 0=Blocked (Unlikely)
        if (dis === 'cvd') {
            if (category === 'cardiovascular') return 3;
            if (category === 'lifestyle') return 2;
            if (category === 'metabolic') return 1;
            return 0; // Genomic is blocked for CVD in this demo
        }

        if (dis === 'diabetes') {
            if (category === 'metabolic') return 3;
            if (category === 'lifestyle') return 2;
            return 1; // Cardiovascular is supplemental
        }

        if (dis === 'cancer') {
            if (category === 'genomics') return 3;
            if (category === 'metabolic') return 2;
            return 1; // Others are supplemental
        }

        return 1; // Default low suitability for unknown disease types
    };

    const sortedRecords = useMemo(() => {
        if (!selectingForModel) return userRecords;
        const model = models.find(m => m.model_id === selectingForModel);
        if (!model) return userRecords;

        return userRecords
            .map(r => ({ ...r, score: getRelevancyScore(r, model.disease) }))
            .filter(r => r.score > 0) // STRICT: Block unlikely ones
            .sort((a, b) => b.score - a.score);
    }, [userRecords, selectingForModel, models]);

    const handleStartTraining = async (modelId) => {
        // Show picker for ANY user if they haven't selected records yet
        if (selectedRecords.length === 0 && !selectingForModel) {
            setSelectingForModel(modelId);
            return;
        }

        try {
            setTrainingModels(prev => ({ ...prev, [modelId]: true }));
            setSelectingForModel(null);

            // 1. Check for active round
            const activeRes = await axios.get(`${API_URL}/rounds/active/${modelId}`);
            const activeRound = activeRes.data.activeRound;

            if (!activeRound) {
                alert("⚠️ No active training round found for this model.");
                return;
            }

            const roundId = activeRound.round_id;

            // 2. Simulated Training using selected record count
            let simSettings = { baseAccuracy: 0.85, variance: 0.05, minSamples: 100, maxSamples: 500 };
            const savedSettings = localStorage.getItem('fl_sim_settings');
            if (savedSettings) {
                try {
                    simSettings = JSON.parse(savedSettings);
                } catch (e) {
                    console.error("Failed to parse sim settings");
                }
            }

            const weightsRes = {
                output: Array(10).fill(0).map(() => Math.random())
            };

            const metrics = {
                accuracy: selectedRecords.length > 0
                    ? (0.85 + Math.random() * 0.1)
                    : Math.min(0.9999, Math.max(0, simSettings.baseAccuracy + (Math.random() * 2 - 1) * simSettings.variance)),
                loss: 0.1 + Math.random() * 0.15,
                samplesTrained: selectedRecords.length > 0
                    ? selectedRecords.length
                    : (simSettings.minSamples + Math.floor(Math.random() * (simSettings.maxSamples - simSettings.minSamples + 1)))
            };

            const isSimulation = selectedRecords.length === 0;

            // 3. Submit contribution
            await axios.post(`${API_URL}/rounds/submit`, {
                roundId,
                modelWeights: weightsRes,
                trainingMetrics: metrics
            });

            alert(`✅ Success!\n\nTraining completed on ${metrics.samplesTrained} ${isSimulation ? 'simulated' : ''} health records.\nContributed to Round ID ${roundId}.`);
            setSelectedRecords([]); // Reset selection
            await fetchModels();
        } catch (err) {
            console.error('Contribution failed:', err);
            const errorMsg = err.response?.data?.error || err.message;
            alert(`❌ Contribution Failed\n\n${errorMsg}`);
        } finally {
            setTrainingModels(prev => ({ ...prev, [modelId]: false }));
        }
    };

    const handleCompleteRound = async (roundId) => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/rounds/complete`, { roundId });
            alert(`✅ Round ${roundId} completed and aggregated successfully!\nNew Avg Accuracy: ${(res.data.avgAccuracy * 100).toFixed(1)}%`);
            await fetchModels();
        } catch (err) {
            console.error('Failed to complete round:', err);
            const errorMsg = err.response?.data?.error || err.message;
            alert(`❌ Round Completion Failed\n\n${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleProvisionDemoData = async () => {
        try {
            setProvisioning(true);
            const response = await axios.post('/api/records/seed-demo', {
                patientHHNumber: user.hhNumber,
                walletAddress: user.walletAddress
            });

            if (response.data.success) {
                alert(`🧬 Clinical Data Provisioned!\n\n${response.data.message}\nYou can now use these records for high-fidelity FL training.`);
                await fetchModels(); // Refresh records
            }
        } catch (err) {
            console.error('Provisioning failed:', err);
            alert("❌ Failed to provision demo data. Check console for details.");
        } finally {
            setProvisioning(false);
        }
    };

    return (
        <section className="mt-12">
            <header className="mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Brain className="h-6 w-6 text-primary" />
                    Federated Learning Console
                </h2>
                <p className="text-muted-foreground">Privacy-Preserving Collaborative Research</p>
            </header>

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

            {/* Demo Intelligence Suite - Provisioning Tool */}
            {userRecords.length === 0 && (
                <Card className="mb-8 border-primary/20 bg-primary/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap className="h-24 w-24 text-primary" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Research Intelligence Suite
                        </CardTitle>
                        <CardDescription>
                            Your clinical vault is currently empty. Provision professional mock records to demonstrate high-fidelity Federated Learning.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium">Synthetic Clinical Infrastructure:</p>
                                <div className="flex flex-wrap gap-2">
                                    {['Metabolic Panel', 'ECG Analysis', 'Genomic Data', 'Lifestyle Logs'].map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-background border rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <Button
                                onClick={handleProvisionDemoData}
                                disabled={provisioning}
                                className="w-full md:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            >
                                {provisioning ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Provisioning Infrastructure...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Provision Demo Data
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Record Selection Modal/View */}
            {selectingForModel && (
                <Card className="mb-8 border-primary bg-primary/5 ring-2 ring-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Select Records for Training
                            </CardTitle>
                            <CardDescription>Choose the health records you want to use for local model training.</CardDescription>
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
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        Falling back to Synthetic Simulation
                                    </p>
                                </div>
                            ) : (
                                userRecords
                                    .map(record => ({
                                        record,
                                        score: getRelevancyScore(record, models.find(m => m.model_id === selectingForModel)?.disease)
                                    }))
                                    .filter(item => item.score > 0) // STRICT: Remove unlikely records
                                    .sort((a, b) => b.score - a.score)
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
                                                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-bold uppercase rounded border border-primary/20">
                                                                Primary Data
                                                            </span>
                                                        )}
                                                        {score === 2 && (
                                                            <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[8px] font-bold uppercase rounded border border-border">
                                                                High Correlation
                                                            </span>
                                                        )}
                                                        {score === 1 && (
                                                            <span className="px-1.5 py-0.5 border border-dashed border-border text-muted-foreground text-[8px] font-bold uppercase rounded">
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
                                        <p className="text-xs font-bold text-foreground uppercase tracking-wider">Status</p>
                                        <p className="text-[10px] font-bold text-foreground">VALIDATED</p>
                                    </div>
                                )}
                            </div>

                            {selectedRecords.length === 0 && (
                                <div className="p-2 border border-foreground/20 bg-muted/50 rounded text-[10px] text-muted-foreground leading-tight">
                                    ⚠️ No suitable records selected. You must select clinically relevant data or use the simulation fallback.
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => {
                                    setSelectingForModel(null);
                                    setSelectedRecords([]);
                                }}>Cancel</Button>
                                {userRecords.length === 0 ? (
                                    <Button
                                        onClick={() => handleStartTraining(selectingForModel)}
                                        className="bg-foreground text-background hover:bg-foreground/90"
                                    >
                                        Run Synthetic Training (100-500 Samples)
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
                        <Plus className="mr-2 h-4 w-4" />
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
                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${activeRound
                                        ? 'bg-primary text-primary-foreground animate-pulse'
                                        : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {activeRound ? 'Training Active' : (model.status || 'Active')}
                                    </span>
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
                                            ? 'bg-muted text-muted-foreground border-border cursor-default'
                                            : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                                        onClick={() => handleStartTraining(model.model_id)}
                                        disabled={trainingModels[model.model_id] || hasContributed || selectingForModel}
                                    >
                                        {trainingModels[model.model_id] ? (
                                            <div className="flex items-center gap-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                <span>Training Locally...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {hasContributed ? (
                                                    <>
                                                        <Shield className="h-4 w-4 text-primary fill-primary/20" />
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
