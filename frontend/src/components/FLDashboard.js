import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import NavBarLogout from './NavBar_Logout';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useAuth } from '../context/AuthContext';
import { Brain, Users, TrendingUp, Shield, Plus, Minus, RefreshCw, Activity, Trash2, AlertCircle, CheckCircle2, X, BarChart2, LineChart as LineChartIcon } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

const API_URL = '/fl';

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
    const [notification, setNotification] = useState(null);

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

        if (errorMsg.includes('Already submitted')) return 'This round already has a contribution from this participant.';
        if (errorMsg.includes('insufficient funds')) return 'Insufficient funds in wallet for gas fees.';
        if (errorMsg.includes('user rejected')) return 'Transaction was rejected in wallet.';
        if (errorMsg.includes('execution reverted')) {
            const match = errorMsg.match(/execution reverted: "([^"]+)"/) || errorMsg.match(/execution reverted: ([^,]+)/);
            if (match && match[1]) return match[1].trim();
        }

        return errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg;
    };
    const [trainingModels, setTrainingModels] = useState({});
    const [activeRounds, setActiveRounds] = useState({});
    const [selectedModelForMetrics, setSelectedModelForMetrics] = useState(null);
    const [modelMetrics, setModelMetrics] = useState([]);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [globalStats, setGlobalStats] = useState({
        totalModels: 0,
        totalParticipants: 3,
        avgAccuracy: 0,
        network: 'Polygon Amoy'
    });

    const fetchModelMetrics = async (modelId) => {
        try {
            setMetricsLoading(true);
            const res = await client.get(`${API_URL}/metrics/${modelId}`);
            if (res.data.success) {
                // Formatting data for Recharts
                const formatted = res.data.metrics.map(m => ({
                    round: `R${m.round_number}`,
                    accuracy: parseFloat(m.avg_accuracy) * 100,
                    loss: parseFloat(m.avg_loss),
                    participants: parseInt(m.contributions)
                }));
                setModelMetrics(formatted);
            }
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
        } finally {
            setMetricsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedModelForMetrics) {
            fetchModelMetrics(selectedModelForMetrics);
        }
    }, [selectedModelForMetrics]);




    useEffect(() => {
        fetchModels();
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (selectedModelForMetrics) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedModelForMetrics]);

    const fetchModels = async () => {
        try {
            setLoading(true);
            const response = await client.get(`${API_URL}/models`);
            const modelsList = response.data.models || [];
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
                    console.log(`No active round for model ${model.model_id}`);
                }
            }
            setActiveRounds(roundsMap);

            // Fetch global FL stats
            const statsRes = await client.get(`${API_URL}/stats`);
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
            await client.post(`${API_URL}/models`, newModel);
            setShowCreateForm(false);
            setNewModel({ disease: 'diabetes', modelType: 'logistic_regression' });
            await fetchModels();
        } catch (err) {
            console.error('Failed to create model:', err);
            const errorMsg = err.response?.data?.error || "Model creation failed. Check console for details.";
            showNotification('error', '❌ Model creation failed', parseBlockchainError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleInitiateRound = async (modelId) => {
        try {
            setTrainingModels(prev => ({ ...prev, [modelId]: true }));
            console.log(`🚀 Initiating training round for model ${modelId}`);

            // Start a new round on blockchain and DB
            const startRes = await client.post(`${API_URL}/rounds/start`, { modelId });
            const roundId = startRes.data.roundId;

            console.log(`✅ Round ${roundId} initiated successfully`);
            showNotification('success', '✅ Success!', `Round ID ${roundId} successfully initiated!`);

            await fetchModels(); // This will also refresh active rounds
        } catch (err) {
            console.error('Round initiation failed:', err);
            const errorMsg = err.response?.data?.error || err.message;
            showNotification('error', '❌ Initiation Failed', parseBlockchainError(err));
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

            await client.post(`${API_URL}/rounds/complete`, { roundId });

            showNotification('success', '✅ Success!', `Round ${roundId} has been completed and aggregated.`);
            await fetchModels(); // Refresh to show updated status
        } catch (err) {
            console.error('Complete round failed:', err);
            const errorMsg = err.response?.data?.error || err.message;
            showNotification('error', '❌ Round Failed', parseBlockchainError(err));
        } finally {
            setTrainingModels(prev => ({ ...prev, [modelId]: false }));
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
                                    <CardContent className="flex flex-col gap-3 pt-0">
                                        <Button variant="outline" className="w-full text-xs" onClick={() => setSelectedModelForMetrics(model.model_id)}>
                                            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                                            System Insights
                                        </Button>

                                        {activeRounds[model.model_id] ? (
                                            <div className="space-y-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10 shadow-inner">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <Activity className="h-3 w-3 text-primary animate-pulse" />
                                                        <span className="text-[10px] font-bold uppercase tracking-tight text-primary">Training Live</span>
                                                    </div>
                                                    <span className="px-1.5 py-0.5 rounded-md bg-white/50 text-[9px] font-mono border">
                                                        ID:{activeRounds[model.model_id].round_id}
                                                    </span>
                                                </div>

                                                <div className="bg-white/80 dark:bg-black/20 p-2 rounded-md border border-border/50 text-center">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Active Round</p>
                                                    <p className="text-sm font-bold">Round {activeRounds[model.model_id].round_number}</p>
                                                </div>

                                                <Button
                                                    className="w-full font-bold shadow-lg"
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={trainingModels[model.model_id]}
                                                    onClick={() => handleCompleteRound(model.model_id, activeRounds[model.model_id].round_id, activeRounds[model.model_id].round_number)}
                                                >
                                                    {trainingModels[model.model_id] ? (
                                                        <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Aggregating...</>
                                                    ) : (
                                                        'Complete Round'
                                                    )}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                className="w-full font-bold shadow-md h-10"
                                                disabled={loading || trainingModels[model.model_id]}
                                                onClick={() => handleInitiateRound(model.model_id)}
                                            >
                                                {trainingModels[model.model_id] ? (
                                                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Starting...</>
                                                ) : (
                                                    'Initiate Round 1'
                                                )}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Model Insights Visualization Modal */}
                    {selectedModelForMetrics && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                            <div
                                className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-card/95 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <header className="sticky top-0 z-10 -mt-2 -mx-2 mb-6 p-2 bg-card/80 backdrop-blur-sm border-b border-border/50 flex items-center justify-between rounded-t-xl">
                                    <div className="pl-2">
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-primary" />
                                            Model Performance Insights
                                        </h3>
                                        <p className="text-sm text-muted-foreground">Historical training metrics for <span className="text-primary font-semibold uppercase">{models.find(m => m.model_id === selectedModelForMetrics)?.disease}</span> research model</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        onClick={() => setSelectedModelForMetrics(null)}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </header>

                                {metricsLoading ? (
                                    <div className="flex flex-col h-[400px] items-center justify-center space-y-4">
                                        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-muted-foreground animate-pulse text-sm font-medium">Synchronizing Research Data...</p>
                                    </div>
                                ) : modelMetrics.length > 0 ? (
                                    <div className="grid gap-8 lg:grid-cols-2">
                                        {/* Learning Curve */}
                                        <Card className="p-6 bg-muted/20 border-border/50 shadow-sm transition-all hover:shadow-md">
                                            <CardHeader className="px-0 pt-0 pb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                                                        <LineChartIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">Learning Curve</CardTitle>
                                                        <CardDescription>Accuracy and Loss trends across rounds</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-0">
                                                <div className="h-[350px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={modelMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                            <XAxis
                                                                dataKey="round"
                                                                stroke="#666"
                                                                fontSize={11}
                                                                tickLine={false}
                                                                axisLine={false}
                                                            />
                                                            <YAxis
                                                                yAxisId="left"
                                                                domain={[0, 100]}
                                                                stroke="#666"
                                                                fontSize={11}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { fill: '#888', fontSize: '10px', fontWeight: 'bold' } }}
                                                            />
                                                            <YAxis
                                                                yAxisId="right"
                                                                orientation="right"
                                                                stroke="#666"
                                                                fontSize={11}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                label={{ value: 'Loss Index', angle: 90, position: 'insideRight', style: { fill: '#888', fontSize: '10px', fontWeight: 'bold' } }}
                                                            />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: 'rgba(26, 26, 26, 0.95)', border: '1px solid #333', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                                itemStyle={{ fontSize: '12px' }}
                                                            />
                                                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                                                            <Line
                                                                yAxisId="left"
                                                                type="monotone"
                                                                dataKey="accuracy"
                                                                stroke="#10b981"
                                                                strokeWidth={4}
                                                                name="Accuracy %"
                                                                dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
                                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                            />
                                                            <Line
                                                                yAxisId="right"
                                                                type="monotone"
                                                                dataKey="loss"
                                                                stroke="#ef4444"
                                                                strokeWidth={3}
                                                                name="Model Loss"
                                                                strokeDasharray="4 4"
                                                                dot={false}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Network Participation */}
                                        <Card className="p-6 bg-muted/20 border-border/50 shadow-sm transition-all hover:shadow-md">
                                            <CardHeader className="px-0 pt-0 pb-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">Network Participation</CardTitle>
                                                        <CardDescription>Collaborative growth and engagement</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="px-0">
                                                <div className="h-[350px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={modelMetrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                            <XAxis dataKey="round" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                                            <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                                                            <Tooltip
                                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                                contentStyle={{ backgroundColor: 'rgba(26, 26, 26, 0.95)', border: '1px solid #333', borderRadius: '12px' }}
                                                            />
                                                            <Bar
                                                                dataKey="participants"
                                                                fill="url(#barGradient)"
                                                                name="Total Nodes"
                                                                radius={[6, 6, 0, 0]}
                                                            />
                                                            <defs>
                                                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
                                                                </linearGradient>
                                                            </defs>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-[400px] items-center justify-center border rounded-2xl bg-muted/10 border-dashed border-border/50">
                                        <div className="p-4 rounded-full bg-muted/20 mb-6">
                                            <Brain className="h-16 w-16 text-muted-foreground opacity-30" />
                                        </div>
                                        <p className="text-xl font-bold tracking-tight">Data Not Yet Available</p>
                                        <p className="text-sm text-muted-foreground max-w-sm text-center mt-2 leading-relaxed">
                                            Historical training metrics will be automatically generated and displayed here once the first research round is completed for this model.
                                        </p>
                                        <Button variant="outline" className="mt-8 px-8" onClick={() => setSelectedModelForMetrics(null)}>
                                            Back to Dashboard
                                        </Button>
                                    </div>
                                )}

                                <footer className="mt-8 pt-6 border-t border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">
                                        <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> ZK-Verified</span>
                                        <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3" /> Real-time Nodes</span>
                                        <span className="flex items-center gap-1.5"><BarChart2 className="h-3 w-3" /> High Integrity</span>
                                    </div>
                                </footer>
                            </div>
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
