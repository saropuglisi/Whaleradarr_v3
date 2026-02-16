import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart3, AlertCircle } from 'lucide-react';

interface EdgeAnalysis {
    threshold: number;
    forward_weeks: number;
    lookback_years: number;
    sample_size: number;
    win_rate: number;
    avg_return: number;
    max_return: number;
    min_return: number;
    median_return: number;
    win_avg: number;
    loss_avg: number;
}

interface HistoricalEdgeProps {
    contractId: number;
    currentSentimentGap?: number;
}

const HistoricalEdge: React.FC<HistoricalEdgeProps> = ({ contractId, currentSentimentGap }) => {
    const [data, setData] = useState<EdgeAnalysis[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEdgeData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:8000/api/v1/contracts/${contractId}/historical-edge`);
                if (!response.ok) {
                    throw new Error('Failed to fetch historical edge data');
                }
                const result = await response.json();
                setData(result.analyses || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                console.error('Historical Edge fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEdgeData();
    }, [contractId]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Historical Edge</h3>
                <p className="text-sm text-gray-500">Loading backtest statistics...</p>
            </div>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Historical Edge</h3>
                <p className="text-sm text-gray-500">Unable to calculate historical edge statistics.</p>
            </div>
        );
    }

    // Find which threshold the current gap exceeds (if any)
    const activeThreshold = currentSentimentGap
        ? data.find(d => Math.abs(currentSentimentGap) >= d.threshold)
        : null;

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 size={24} className="text-blue-500" />
                        Historical Edge
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Backtest results for sentiment gap signals (Last 5 years)
                    </p>
                </div>
            </div>

            {/* Active Signal Box */}
            {activeThreshold && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                                📊 Active Signal Detected
                            </p>
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                When Sentiment Gap {'>'}  {activeThreshold.threshold}% in the past <strong>{activeThreshold.lookback_years} years</strong>,
                                the price moved in the signal direction over the next <strong>{activeThreshold.forward_weeks} weeks</strong> in{' '}
                                <strong className="text-lg">{activeThreshold.win_rate}%</strong> of cases
                                ({activeThreshold.sample_size} occurrences).
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                                Average return: <strong>{activeThreshold.avg_return > 0 ? '+' : ''}{activeThreshold.avg_return}%</strong>
                                {' • '}
                                Median: <strong>{activeThreshold.median_return > 0 ? '+' : ''}{activeThreshold.median_return}%</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.map((analysis) => {
                    const isActive = activeThreshold?.threshold === analysis.threshold;
                    const winRateColor = analysis.win_rate >= 60 ? 'text-green-600 dark:text-green-400' :
                        analysis.win_rate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400';

                    return (
                        <div
                            key={analysis.threshold}
                            className={`p-4 rounded-lg border-2 transition-all ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                                    : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                                }`}
                        >
                            <div className="text-center mb-3">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                                    Gap {'>'} {analysis.threshold}%
                                </div>
                                <div className={`text-3xl font-bold ${winRateColor}`}>
                                    {analysis.win_rate}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Win Rate
                                </div>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Sample Size:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{analysis.sample_size}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Avg Return:</span>
                                    <span className={`font-semibold ${analysis.avg_return > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {analysis.avg_return > 0 ? '+' : ''}{analysis.avg_return}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Best:</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                        +{analysis.max_return}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Worst:</span>
                                    <span className="font-semibold text-red-600 dark:text-red-400">
                                        {analysis.min_return}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Interpretation */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">How to use:</span> Historical Edge shows the probability and expected return
                    when sentiment gap signals trigger. Higher thresholds typically have better win rates but occur less frequently.
                    Use this to validate current signals against historical performance.
                </p>
            </div>
        </div>
    );
};

export default HistoricalEdge;
