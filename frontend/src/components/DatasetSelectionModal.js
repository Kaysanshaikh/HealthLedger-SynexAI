import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { X, Database, FileText, RefreshCw, Activity, CheckCircle, AlertCircle, Zap } from 'lucide-react';

const API_URL = '/fl';

const DATA_SOURCE_OPTIONS = [
    { id: 'kaggle', label: 'Kaggle Datasets', icon: Database, description: 'Pre-curated research datasets' },
    { id: 'medical_records', label: 'Medical Records', icon: FileText, description: 'Anonymized patient data' },
    { id: 'combined', label: 'Combined', icon: Zap, description: 'Merge both sources' },
];

const TRAINING_STEPS = ['Preparing data', 'Loading dataset', 'Training model', 'Evaluating', 'Training complete'];

function DatasetSelectionModal({ modelId, disease, onClose, onTrainingComplete }) {
    const [dataSource, setDataSource] = useState('kaggle');
    const [sampleCount, setSampleCount] = useState(null);
    const [datasetInfo, setDatasetInfo] = useState(null);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const [training, setTraining] = useState(false);
    const [trainingResult, setTrainingResult] = useState(null);
    const [trainingError, setTrainingError] = useState(null);
    const [progress, setProgress] = useState({ status: null, progress: 0, step: '' });

    // Fetch dataset info on mount
    useEffect(() => {
        const fetchDatasetInfo = async () => {
            try {
                setLoadingInfo(true);
                const res = await client.get(`${API_URL}/datasets/${disease}`);
                setDatasetInfo(res.data);

                // Set default sample count to total rows if available
                if (res.data.kaggleDatasets?.[0]?.rows) {
                    setSampleCount(res.data.kaggleDatasets[0].rows);
                }
            } catch (err) {
                console.error('Failed to fetch dataset info:', err);
            } finally {
                setLoadingInfo(false);
            }
        };
        fetchDatasetInfo();
    }, [disease]);

    // Poll training status
    useEffect(() => {
        if (!training) return;
        const interval = setInterval(async () => {
            try {
                const res = await client.get(`${API_URL}/training/status/${modelId}`);
                if (res.data.status) {
                    setProgress({
                        status: res.data.status,
                        progress: res.data.progress || 0,
                        step: res.data.step || ''
                    });
                    if (res.data.status === 'completed' || res.data.status === 'failed') {
                        clearInterval(interval);
                    }
                }
            } catch (err) {
                // Silently fail polling
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [training, modelId]);

    const handleStartTraining = useCallback(async () => {
        try {
            setTraining(true);
            setTrainingError(null);
            setProgress({ status: 'preparing', progress: 5, step: 'Starting...' });

            // First check for active round
            const activeRes = await client.get(`${API_URL}/rounds/active/${modelId}`);
            const activeRound = activeRes.data.activeRound;

            if (!activeRound) {
                setTrainingError('No active training round. Please initiate a round first.');
                setTraining(false);
                return;
            }

            // Start training
            const trainRes = await client.post(`${API_URL}/rounds/train`, {
                modelId,
                dataSource,
                sampleCount: sampleCount || undefined
            });

            if (!trainRes.data.success) {
                throw new Error(trainRes.data.error || 'Training failed');
            }

            const { modelWeights, metrics } = trainRes.data;

            setProgress({ status: 'submitting', progress: 90, step: 'Submitting to blockchain...' });

            // Submit contribution
            await client.post(`${API_URL}/rounds/submit`, {
                roundId: activeRound.round_id,
                modelWeights,
                trainingMetrics: metrics
            });

            setTrainingResult(metrics);
            setProgress({ status: 'completed', progress: 100, step: 'Training complete' });

            if (onTrainingComplete) onTrainingComplete(metrics);
        } catch (err) {
            console.error('Training failed:', err);
            setTrainingError(err.response?.data?.error || err.message || 'Training failed');
            setProgress({ status: 'failed', progress: 0, step: 'Training failed' });
        } finally {
            setTraining(false);
        }
    }, [modelId, dataSource, sampleCount, onTrainingComplete]);

    const kaggle = datasetInfo?.kaggleDatasets?.[0];
    const medical = datasetInfo?.medicalRecords;
    const maxSamples = kaggle?.rows || 1000;

    const progressStepIndex = TRAINING_STEPS.findIndex(s => progress.step?.includes(s));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-card shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 p-6 pb-4 bg-card/95 backdrop-blur-sm border-b border-border/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Train Model: <span className="uppercase text-primary">{disease}</span>
                        </h3>
                        <p className="text-sm text-muted-foreground">Select data source and configure training</p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose} disabled={training}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Training Result */}
                    {trainingResult && (
                        <Card className="border-green-500/30 bg-green-500/5">
                            <CardContent className="py-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle className="h-6 w-6 text-green-500" />
                                    <h4 className="font-bold text-green-700 dark:text-green-400">Training Complete!</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-background rounded-lg border">
                                        <p className="text-2xl font-bold text-primary">{(trainingResult.accuracy * 100).toFixed(1)}%</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Accuracy</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-lg border">
                                        <p className="text-2xl font-bold">{trainingResult.loss?.toFixed(4)}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Loss</p>
                                    </div>
                                    <div className="text-center p-3 bg-background rounded-lg border">
                                        <p className="text-2xl font-bold">{trainingResult.samplesTrained}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Samples</p>
                                    </div>
                                </div>
                                <Button className="w-full mt-4" onClick={onClose}>Done</Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Training Error */}
                    {trainingError && !trainingResult && (
                        <Card className="border-red-500/30 bg-red-500/5">
                            <CardContent className="py-4 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-red-700 dark:text-red-400">Training Failed</p>
                                    <p className="text-sm text-red-600 dark:text-red-300">{trainingError}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Training Progress */}
                    {training && !trainingResult && (
                        <Card className="border-primary/30 bg-primary/5">
                            <CardContent className="py-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-sm font-semibold">{progress.step}</span>
                                    </div>
                                    <span className="text-sm font-bold text-primary">{progress.progress}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-primary to-primary/70 h-3 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${progress.progress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between">
                                    {TRAINING_STEPS.map((step, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1">
                                            <div className={`h-2 w-2 rounded-full ${i <= progressStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                                            <span className={`text-[8px] ${i <= progressStepIndex ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                                {step.split(' ').slice(-1)[0]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Dataset Selection (hide during/after training) */}
                    {!training && !trainingResult && (
                        <>
                            {/* Loading */}
                            {loadingInfo && (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}

                            {!loadingInfo && (
                                <>
                                    {/* Data Source Selection */}
                                    <div>
                                        <p className="text-sm font-semibold mb-3">Data Source</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {DATA_SOURCE_OPTIONS.map(opt => {
                                                const Icon = opt.icon;
                                                const isDisabled = opt.id === 'medical_records' && (!medical?.totalRecords || medical.totalRecords === 0);
                                                const isCombinedDisabled = opt.id === 'combined' && (!medical?.totalRecords || medical.totalRecords === 0);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => !isDisabled && !isCombinedDisabled && setDataSource(opt.id)}
                                                        disabled={isDisabled || isCombinedDisabled}
                                                        className={`p-4 rounded-xl border-2 text-left transition-all ${dataSource === opt.id
                                                                ? 'border-primary bg-primary/5 shadow-md'
                                                                : isDisabled || isCombinedDisabled
                                                                    ? 'border-muted bg-muted/20 opacity-50 cursor-not-allowed'
                                                                    : 'border-border hover:border-primary/40 cursor-pointer'
                                                            }`}
                                                    >
                                                        <Icon className={`h-5 w-5 mb-2 ${dataSource === opt.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                                        <p className="text-sm font-semibold">{opt.label}</p>
                                                        <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Dataset Details */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Kaggle Info */}
                                        <Card className={`${dataSource === 'kaggle' || dataSource === 'combined' ? 'border-primary/30' : ''}`}>
                                            <CardHeader className="py-3 px-4">
                                                <CardTitle className="text-sm flex items-center gap-1.5">
                                                    <Database className="h-3.5 w-3.5" /> Kaggle Dataset
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4">
                                                {kaggle ? (
                                                    <div className="space-y-1 text-xs">
                                                        <p><span className="text-muted-foreground">File:</span> <span className="font-mono">{kaggle.file}</span></p>
                                                        <p><span className="text-muted-foreground">Rows:</span> <span className="font-bold">{kaggle.rows.toLocaleString()}</span></p>
                                                        <p><span className="text-muted-foreground">Features:</span> {kaggle.columns}</p>
                                                        <p><span className="text-muted-foreground">Size:</span> {kaggle.sizeKB} KB</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">No Kaggle dataset found</p>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Medical Records Info */}
                                        <Card className={`${dataSource === 'medical_records' || dataSource === 'combined' ? 'border-primary/30' : ''}`}>
                                            <CardHeader className="py-3 px-4">
                                                <CardTitle className="text-sm flex items-center gap-1.5">
                                                    <FileText className="h-3.5 w-3.5" /> Medical Records
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4">
                                                {medical?.totalRecords > 0 ? (
                                                    <div className="space-y-1 text-xs">
                                                        <p><span className="text-muted-foreground">Records:</span> <span className="font-bold">{medical.totalRecords}</span></p>
                                                        <p><span className="text-muted-foreground">Patients:</span> {medical.patientsContributing}</p>
                                                        <p><span className="text-muted-foreground">Completeness:</span> {medical.featureCompleteness}%</p>
                                                        <p><span className="text-muted-foreground">Features/record:</span> {medical.avgFeaturesPerRecord}</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-muted-foreground space-y-1">
                                                        <p>No medical records yet</p>
                                                        <p className="text-[10px]">Submit diagnostic reports with health metrics to enable this option.</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Sample Count Slider */}
                                    {(dataSource === 'kaggle' || dataSource === 'combined') && kaggle && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold">Sample Count</p>
                                                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{sampleCount || maxSamples}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={10}
                                                max={maxSamples}
                                                value={sampleCount || maxSamples}
                                                onChange={(e) => setSampleCount(parseInt(e.target.value))}
                                                className="w-full accent-primary"
                                            />
                                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                                <span>10</span>
                                                <span>{maxSamples} (all)</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Privacy Notice */}
                                    <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                                        <p className="text-[10px] text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                            <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                            <span><strong>Privacy-Preserving:</strong> Only anonymized numerical features are used. No patient names, IDs, or addresses are sent to the ML model.</span>
                                        </p>
                                    </div>

                                    {/* Start Training Button */}
                                    <Button
                                        className="w-full h-12 font-bold text-md rounded-xl shadow-lg bg-gradient-to-r from-primary to-primary/80 transition-all active:scale-95"
                                        onClick={handleStartTraining}
                                        disabled={training || (dataSource === 'kaggle' && !kaggle)}
                                    >
                                        <Zap className="mr-2 h-5 w-5 fill-current" />
                                        Start Training on {DATA_SOURCE_OPTIONS.find(o => o.id === dataSource)?.label}
                                    </Button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DatasetSelectionModal;
