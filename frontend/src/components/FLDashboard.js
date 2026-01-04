import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBarLogout from './NavBar_Logout';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useAuth } from '../context/AuthContext';
import { Brain, Users, TrendingUp, Shield, Plus, Minus, RefreshCw, Activity, Trash2 } from 'lucide-react';

const API_URL = '/api/fl';

function FLDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newModel, setNewModel] = useState({
        disease: 'diabetes',
        modelType: 'logistic_regression'
    });
    const [trainingModels, setTrainingModels] = useState({});
    const [activeRounds, setActiveRounds] = useState({});
    const [globalStats, setGlobalStats] = useState({
        totalModels: 0,
        totalParticipants: 3,
        avgAccuracy: 0,
        network: 'Polygon Amoy'
    });
    const [showSimulationModal, setShowSimulationModal] = useState(false);
    const [simSettings, setSimSettings] = useState({
        baseAccuracy: 0.85,
        variance: 0.05,
        minSamples: 100,
        maxSamples: 500
    });

    useEffect(() => {
        const saved = localStorage.getItem('fl_sim_settings');
        if (saved) {
            try {
                setSimSettings(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse sim settings");
            }
        }
    }, []);

    const handleSaveSimSettings = (e) => {
        e.preventDefault();
        localStorage.setItem('fl_sim_settings', JSON.stringify(simSettings));
        setShowSimulationModal(false);
        alert("✅ Simulation settings updated!\nThese will now be used for all future synthetic training rounds.");
    };

    useEffect(() => {
        fetchModels();
    }, []);

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
                    console.log(`No active round for model ${model.model_id}`);
                }
            }
            setActiveRounds(roundsMap);

            // Fetch global FL stats
            const statsRes = await axios.get(`${API_URL}/stats`);
            if (statsRes.data.success) {
                setGlobalStats(statsRes.data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch models:', err);
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
            const errorMsg = err.response?.data?.error || "Model creation failed. Check console for details.";
            alert(`❌ ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInitiateRound = async (modelId) => {
        try {
            setTrainingModels(prev => ({ ...prev, [modelId]: true }));
            console.log(`🚀 Initiating training round for model ${modelId}`);

            // Start a new round on blockchain and DB
            const startRes = await axios.post(`${API_URL}/rounds/start`, { modelId });
            const roundId = startRes.data.roundId;

            console.log(`✅ Round ${roundId} initiated successfully`);
            alert(`✅ Success!\n\nTraining Round ID ${roundId} (Model Round ${startRes.data.round.roundNumber}) successfully initiated!\n\nParticipants can now contribute to this round.`);

            await fetchModels(); // This will also refresh active rounds
        } catch (err) {
            console.error('Round initiation failed:', err);
            const errorMsg = err.response?.data?.error || err.message;
            alert(`❌ Failed to Initiate Round\n\n${errorMsg}`);
        } finally {
            setTrainingModels(prev => ({ ...prev, [modelId]: false }));
        }
    };

    const handleCompleteRound = async (modelId, roundId, roundNumber) => {
        if (!window.confirm(`Are you sure you want to complete Round ID ${roundId} (Model Round ${roundNumber})?\n\nThis will finalize the round and aggregate all contributions.`)) {
            return;
        }

        try {
            setTrainingModels(prev => ({ ...prev, [modelId]: true }));
            console.log(`🏁 Completing round ${roundId}...`);

            await axios.post(`${API_URL}/rounds/complete`, { roundId });

            alert(`✅ Success!\n\nRound ID ${roundId} (Model Round ${roundNumber}) has been completed and models have been aggregated.`);
            await fetchModels(); // Refresh to show updated status
        } catch (err) {
            console.error('Complete round failed:', err);
            const errorMsg = err.response?.data?.error || err.message;
            alert(`❌ Failed to Complete Round\n\n${errorMsg}`);
        } finally {
            setTrainingModels(prev => ({ ...prev, [modelId]: false }));
        }
    };

    const handleDeleteModel = async (modelId) => {
        if (!window.confirm("Are you sure you want to delete this model? This will remove it from the research network.")) return;

        try {
            setLoading(true);
            await axios.delete(`${API_URL}/models/${modelId}`);
            alert("✅ Model deleted successfully.");
            await fetchModels();
        } catch (err) {
            console.error('Failed to delete model:', err);
            const errorMsg = err.response?.data?.error || err.message;
            alert(`❌ Deletion Failed\n\n${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background min-h-screen">
            <NavBarLogout />
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Brain className="h-8 w-8 text-primary" />
                        Federated Learning Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Privacy-Preserving Collaborative ML for Healthcare
                    </p>
                </header>

                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Models</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{globalStats.totalModels || models.length}</div>
                            <p className="text-xs text-muted-foreground">Active FL models</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Participants</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{globalStats.totalParticipants}</div>
                            <p className="text-xs text-muted-foreground">Registered institutions</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{(globalStats.avgAccuracy || 0).toFixed(2)}%</div>
                            <p className="text-xs text-muted-foreground">Global model performance</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Network</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{globalStats.network.split(' ')[0]}</div>
                            <p className="text-xs text-muted-foreground">{globalStats.network.split(' ').slice(1).join(' ')} Testnet</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mb-8">
                    <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                        {showCreateForm ? <Minus className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {showCreateForm ? 'Cancel' : 'Create New Model'}
                    </Button>
                    <Button variant="outline" onClick={fetchModels}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                {/* Create Model Form */}
                {showCreateForm && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>Create New FL Model</CardTitle>
                            <CardDescription>Configure a new federated learning model for disease prediction</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateModel} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Disease Type</label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={newModel.disease}
                                        onChange={(e) => setNewModel({ ...newModel, disease: e.target.value })}
                                    >
                                        <option value="diabetes">Diabetes</option>
                                        <option value="cvd">Cardiovascular Disease</option>
                                        <option value="cancer">Cancer</option>
                                        <option value="pneumonia">Pneumonia</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Model Type</label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={newModel.modelType}
                                        onChange={(e) => setNewModel({ ...newModel, modelType: e.target.value })}
                                    >
                                        <option value="logistic_regression">Logistic Regression</option>
                                        <option value="neural_network">Neural Network</option>
                                        <option value="random_forest">Random Forest</option>
                                        <option value="cnn">CNN</option>
                                    </select>
                                </div>
                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Creating Model...
                                        </div>
                                    ) : 'Create Model'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Dashboard Operations Console */}
                <div className="mb-8 p-4 bg-muted/30 rounded-lg border border-dashed flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Activity className="h-5 w-5 text-primary animate-pulse" />
                        <div>
                            <p className="text-sm font-medium">Auto-Training Service</p>
                            <p className="text-xs text-muted-foreground">Service status: <span className="text-green-500">Online</span></p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowSimulationModal(true)}>
                        <TrendingUp className="h-3.5 w-3.5 mr-2" />
                        Configure Simulation
                    </Button>
                </div>

                {/* Simulation Settings Modal */}
                {showSimulationModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md border-primary/20 shadow-2xl animate-in zoom-in-95 duration-200">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Activity className="h-5 w-5" />
                                        <CardTitle>Simulation Research Settings</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setShowSimulationModal(false)}>
                                        <Activity className="h-4 w-4 rotate-45" /> {/* Close icon via rotation */}
                                    </Button>
                                </div>
                                <CardDescription>Adjust global parameters for synthetic training rounds</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveSimSettings} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Base Accuracy</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                className="w-full p-2 border rounded-md bg-background"
                                                value={simSettings.baseAccuracy}
                                                onChange={(e) => setSimSettings({ ...simSettings, baseAccuracy: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Variance (±)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="0.5"
                                                className="w-full p-2 border rounded-md bg-background"
                                                value={simSettings.variance}
                                                onChange={(e) => setSimSettings({ ...simSettings, variance: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Min Samples</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded-md bg-background"
                                                value={simSettings.minSamples}
                                                onChange={(e) => setSimSettings({ ...simSettings, minSamples: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Max Samples</label>
                                            <input
                                                type="number"
                                                className="w-full p-2 border rounded-md bg-background"
                                                value={simSettings.maxSamples}
                                                onChange={(e) => setSimSettings({ ...simSettings, maxSamples: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-primary/5 p-3 rounded-md border border-primary/10">
                                        <p className="text-xs text-muted-foreground">
                                            <strong>Note:</strong> These settings only apply when real medical records are <strong>not</strong> selected.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSimulationModal(false)}>Cancel</Button>
                                        <Button type="submit" className="flex-1">Save Research Params</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* FL Models Grid */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Active Research Models</h2>
                            <p className="text-muted-foreground">Monitor and manage global health intelligence models.</p>
                        </div>
                        <Button onClick={fetchModels} variant="ghost" size="sm">
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh System
                        </Button>
                    </div>
                    {loading && <p className="text-center text-muted-foreground py-8">Loading models...</p>}

                    {!loading && models.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No FL models yet. Create your first model!</p>
                            </CardContent>
                        </Card>
                    )}

                    {!loading && models.length > 0 && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {models.map((model, index) => (
                                <Card key={index} className="flex flex-col">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="capitalize text-xl flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                {model.disease}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-md bg-primary/10 text-primary border border-primary/20">
                                                    {model.model_type.replace('_', ' ')}
                                                </span>
                                                {user?.role === 'admin' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                        onClick={() => handleDeleteModel(model.model_id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Global Accuracy</p>
                                                <p className="text-lg font-bold">
                                                    {model.accuracy !== null ? `${(parseFloat(model.accuracy) * 100).toFixed(1)}%` : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Current Round</p>
                                                <p className="text-lg font-bold">{activeRounds[model.model_id]?.round_number || model.current_round || 0}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-border">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Model ID</p>
                                            <p className="text-[11px] font-mono truncate bg-muted/50 p-1.5 rounded">{model.model_id}</p>
                                        </div>
                                    </CardContent>
                                    <div className="p-6 pt-0 flex gap-2">
                                        <Button variant="outline" className="flex-1" onClick={() => alert(`Details for model ${model.model_id}`)}>View Details</Button>
                                        {activeRounds[model.model_id] ? (
                                            <div className="flex-1 space-y-2">
                                                <Button
                                                    className="w-full"
                                                    variant="secondary"
                                                    disabled
                                                >
                                                    Round ID {activeRounds[model.model_id].round_id} (Model Round {activeRounds[model.model_id].round_number}) Active
                                                </Button>
                                                <p className="text-xs text-center text-muted-foreground">
                                                    Status: {activeRounds[model.model_id].status}
                                                </p>
                                                <Button
                                                    className="w-full"
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={trainingModels[model.model_id]}
                                                    onClick={() => handleCompleteRound(model.model_id, activeRounds[model.model_id].round_id, activeRounds[model.model_id].round_number)}
                                                >
                                                    {trainingModels[model.model_id] ? 'Completing...' : 'Complete Round'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                className="flex-1"
                                                disabled={loading || trainingModels[model.model_id]}
                                                onClick={() => handleInitiateRound(model.model_id)}
                                            >
                                                {trainingModels[model.model_id] ? 'Initiating...' : 'Initiate Round'}
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Privacy Features */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Privacy & Security Features
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                Zero-Knowledge Proofs for gradient privacy
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                Byzantine-robust aggregation (Krum)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                Encrypted model storage on IPFS
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400">✓</span>
                                On-chain proof verification
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default FLDashboard;
