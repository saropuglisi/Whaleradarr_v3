import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SeasonalityChart from '../components/SeasonalityChart';
import FullReportsTable from '../components/FullReportsTable';
import AdvancedPriceChart from '../components/AdvancedPriceChart';
import SentimentGauge from '../components/SentimentGauge';
import SentimentGapHistoryChart from '../components/SentimentGapHistoryChart';
import COTOscillator from '../components/COTOscillator';
import PriceDistanceIndicator from '../components/PriceDistanceIndicator';
import HistoricalEdge from '../components/HistoricalEdge';
import COTStalenessIndicator from '../components/COTStalenessIndicator';
import SmartSignalCard from '../components/SmartSignalCard';
import OnboardingTutorial from '../components/OnboardingTutorial';
import VolumeAnalysisChart from '../components/VolumeAnalysisChart';


interface HistoricalReport {
    report_date: string;
    dealer_long: number;
    dealer_short: number;
    dealer_net: number;
    asset_mgr_long: number;
    asset_mgr_short: number;
    asset_mgr_net: number;
    lev_long: number;
    lev_short: number;
    lev_net: number;
    non_report_long: number;
    non_report_short: number;
    open_interest: number;
}

interface HistoricalAlert {
    id: number;
    report_date: string;
    alert_level: string;
    z_score: number | null;
    cot_index: number | null;
    price_context: string;
    confidence_score: number | null;
}

interface PriceHistory {
    report_date: string;
    open_price?: number;
    high_price?: number;
    low_price?: number;
    close_price: number;
    volume: number;
    reporting_vwap?: number;
}



interface ContractBasicDetail {
    id: number;
    contract_name: string;
    market_category: string;
    exchange?: string;
    yahoo_ticker: string;
    is_active?: boolean;
}

interface ContractHistoryData {
    historical_reports: HistoricalReport[];
    historical_alerts: HistoricalAlert[];
    price_history: PriceHistory[];
}

// Helper function to calculate sentiment gap
const calculateSentimentGap = (report: HistoricalReport): number => {
    const whaleTotal = Math.abs(report.asset_mgr_long || 0) + Math.abs(report.asset_mgr_short || 0);
    const retailTotal = Math.abs(report.non_report_long || 0) + Math.abs(report.non_report_short || 0);

    if (whaleTotal === 0 || retailTotal === 0) return 0;

    const whaleNet = (report.asset_mgr_long || 0) - (report.asset_mgr_short || 0);
    const retailNet = (report.non_report_long || 0) - (report.non_report_short || 0);

    const whalePct = (whaleNet / whaleTotal) * 100;
    const retailPct = (retailNet / retailTotal) * 100;

    return whalePct - retailPct;
};

const ContractDetail: React.FC = () => {
    const { id: contractId } = useParams<{ id: string }>();
    const [data, setData] = useState<ContractBasicDetail | null>(null);
    const [historyData, setHistoryData] = useState<ContractHistoryData | null>(null);
    const [allContracts, setAllContracts] = useState<{ id: number; contract_name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stalenessData, setStalenessData] = useState<any>(null);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        // Check if tutorial has been completed
        const completed = localStorage.getItem('whaleradarr_onboarding_completed');
        if (!completed) {
            // Small delay to ensure loading is done
            setTimeout(() => setShowTutorial(true), 1500);
        }
    }, []);

    useEffect(() => {
        const fetchCriticalData = async () => {
            if (!contractId) return;
            try {
                setLoading(true);
                setError(null);

                // 1. Fetch All Contracts (for correlation selector)
                const contractsRes = await fetch('http://localhost:8000/api/v1/contracts/');
                if (contractsRes.ok) {
                    const contracts = await contractsRes.json();
                    setAllContracts(contracts.map((c: any) => ({ id: c.id, contract_name: c.contract_name })));
                }

                // 2. Fetch Contract Detail
                const detailRes = await fetch(`http://localhost:8000/api/v1/contracts/${contractId}`);
                if (!detailRes.ok) throw new Error('Failed to fetch contract detail');
                const detail: ContractBasicDetail = await detailRes.json();
                setData(detail);

                // 3. Fetch History
                const historyRes = await fetch(`http://localhost:8000/api/v1/contracts/${contractId}/history?weeks_back=500`);
                if (!historyRes.ok) throw new Error('Failed to fetch contract history');
                const history: ContractHistoryData = await historyRes.json();
                setHistoryData(history);

                // 4. Fetch Staleness Data (New)
                const stalenessRes = await fetch(`http://localhost:8000/api/v1/analysis/staleness/${contractId}`);
                if (stalenessRes.ok) {
                    const staleness = await stalenessRes.json();
                    setStalenessData(staleness);
                }

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCriticalData();
    }, [contractId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Activity className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading contract details...</p>
                </div>
            </div>
        );
    }

    if (error || !data || !historyData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">Error: {error || 'No data found'}</p>
                    <Link to="/" className="text-blue-500 hover:underline">← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    // Prepare chart data (reverse to show chronologically)
    const chartData = [...historyData.historical_reports].reverse().map(report => ({
        date: new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dealer: report.dealer_net,
        assetMgr: report.asset_mgr_net,
        leveraged: report.lev_net,
    }));



    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mb-4">
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            {data.contract_name}
                        </h1>
                        <button
                            onClick={() => setShowTutorial(true)}
                            className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            <HelpCircle size={14} className="inline mr-1 -mt-0.5" /> Tutorial
                        </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Historical COT Positions & Price Analysis
                    </p>
                </div>

                {/* Smart Signal Indicator */}
                {historyData && (
                    <div id="smart-signal-card">
                        <SmartSignalCard
                            reports={historyData.historical_reports}
                            alerts={historyData.historical_alerts}
                            priceHistory={historyData.price_history}
                            stalenessData={stalenessData}
                        />
                    </div>
                )}

                {/* Market Context Header - Premium Style */}
                <div className="relative group overflow-hidden bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-white/10 p-8 mb-10 shadow-2xl shadow-gray-200/50 dark:shadow-black/50 transition-all hover:border-gray-300 dark:hover:border-white/20">

                    {/* Subtle Background Gradients */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-stretch justify-between gap-8 md:gap-12">

                        {/* 1. Price & Ticker Section */}
                        <div className="flex flex-col justify-center">
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Current Price</span>
                            </div>
                            <div className="flex items-baseline gap-4">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter drop-shadow-sm">
                                    {historyData.price_history.length > 0
                                        ? historyData.price_history[0].close_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        : 'N/A'}
                                </span>
                                {historyData.price_history.length > 1 && (
                                    (() => {
                                        const current = historyData.price_history[0].close_price;
                                        const prev = historyData.price_history[1].close_price;
                                        const change = current - prev;
                                        const pct = (change / prev) * 100;
                                        const isUp = change >= 0;

                                        return (
                                            <div className="flex flex-col items-start -translate-y-1">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                    <span className="text-lg font-bold tracking-tight leading-none">
                                                        {isUp ? '+' : ''}{change.toFixed(2)}
                                                    </span>
                                                    <span className="text-xs font-bold opacity-80 leading-none">
                                                        ({isUp ? '+' : ''}{pct.toFixed(2)}%)
                                                    </span>
                                                </div>

                                                {/* Price Change since Last COT */}
                                                {(() => {
                                                    if (historyData.historical_reports.length === 0) return null;
                                                    const reportDate = new Date(historyData.historical_reports[0].report_date).toDateString();
                                                    const cotPriceEntry = historyData.price_history.find(p =>
                                                        new Date(p.report_date).toDateString() === reportDate
                                                    );

                                                    if (cotPriceEntry) {
                                                        const cotPrice = cotPriceEntry.close_price;
                                                        const diff = current - cotPrice;
                                                        const diffPct = (diff / cotPrice) * 100;
                                                        const isDiffUp = diff >= 0;

                                                        return (
                                                            <div className="flex items-center gap-1.5 mt-2 ml-1">
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Since Last COT</span>
                                                                <span className={`text-[10px] font-black tracking-wide ${isDiffUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    {isDiffUp ? '▲' : '▼'} {Math.abs(diffPct).toFixed(2)}%
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            <div className="flex items-center gap-3 mt-4">
                                <a
                                    href={`https://www.tradingview.com/symbols/${data.yahoo_ticker.replace('=F', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-300"
                                >
                                    <span className="text-xs font-black text-gray-700 dark:text-gray-300 tracking-wide">
                                        {data.yahoo_ticker}
                                    </span>
                                    <div className="bg-white dark:bg-white/10 rounded-full p-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <Activity size={10} className="text-blue-500" />
                                    </div>
                                </a>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {data.market_category || 'Futures'} • {data.exchange || 'CME'}
                                </span>
                            </div>
                        </div>

                        {/* Visual Separator */}
                        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>

                        {/* 2. Report Status (Enhanced Staleness) */}
                        <div className="flex flex-col justify-center min-w-[200px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                Report Status
                                <div className="relative flex items-center justify-center w-2 h-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gray-400"></span>
                                </div>
                            </span>

                            {(() => {
                                if (historyData.historical_reports.length === 0) return null;
                                const reportDateStr = historyData.historical_reports[0].report_date;
                                const reportDate = new Date(reportDateStr);
                                const diffTime = Math.abs(new Date().getTime() - reportDate.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                let dotColor = "bg-emerald-500";
                                let shadowColor = "shadow-emerald-500/50";
                                let ringColor = "border-emerald-500/20";
                                let statusText = "Fresh Data";

                                if (diffDays > 7) {
                                    dotColor = "bg-rose-500";
                                    shadowColor = "shadow-rose-500/50";
                                    ringColor = "border-rose-500/20";
                                    statusText = "Stale Data";
                                }
                                else if (diffDays > 4) {
                                    dotColor = "bg-amber-500";
                                    shadowColor = "shadow-amber-500/50";
                                    ringColor = "border-amber-500/20";
                                    statusText = "Aging Data";
                                }

                                return (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className="relative flex items-center justify-center w-4 h-4">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
                                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor} ${shadowColor} shadow-lg`}></span>
                                            </div>
                                            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                                {reportDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-7">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${ringColor} ${dotColor.replace('bg-', 'text-')} bg-opacity-10 uppercase tracking-wider`}>
                                                {statusText}
                                            </span>
                                            <span className="text-[11px] font-medium text-gray-400">
                                                ({diffDays}d ago)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-7 mt-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                Next Report: <span className="text-gray-900 dark:text-white">
                                                    {(() => {
                                                        const d = new Date();
                                                        const day = d.getDay();
                                                        const diff = (5 - day + 7) % 7 || 7; // Next Friday
                                                        d.setDate(d.getDate() + diff);
                                                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                    })()}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Visual Separator */}
                        <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>

                        {/* 3. Sentiment Badge (Enhanced) */}
                        <div className="flex flex-col justify-center min-w-[220px]">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Market Bias</span>
                            {(() => {
                                const report = historyData.historical_reports[0];
                                if (!report) return null;
                                const gap = calculateSentimentGap(report);
                                const confidence = stalenessData?.reliability_pct || 0;
                                const isStale = confidence < 30;

                                let label = "NEUTRAL";
                                // Default styles
                                let gradient = "from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10";
                                let text = "text-gray-600 dark:text-gray-300";
                                let border = "border-gray-200 dark:border-white/10";
                                let glow = "";

                                if (gap > 20) {
                                    label = "EXTREME BULLISH";
                                    gradient = "from-emerald-500/10 to-emerald-500/20";
                                    text = "text-emerald-600 dark:text-emerald-400";
                                    border = "border-emerald-500/20";
                                    glow = "shadow-[0_0_20px_rgba(16,185,129,0.15)]";
                                }
                                else if (gap > 5) {
                                    label = "BULLISH";
                                    gradient = "from-emerald-500/5 to-emerald-500/10";
                                    text = "text-emerald-600 dark:text-emerald-400";
                                    border = "border-emerald-500/20";
                                }
                                else if (gap < -20) {
                                    label = "EXTREME BEARISH";
                                    gradient = "from-rose-500/10 to-rose-500/20";
                                    text = "text-rose-600 dark:text-rose-400";
                                    border = "border-rose-500/20";
                                    glow = "shadow-[0_0_20px_rgba(244,63,94,0.15)]";
                                }
                                else if (gap < -5) {
                                    label = "BEARISH";
                                    gradient = "from-rose-500/5 to-rose-500/10";
                                    text = "text-rose-600 dark:text-rose-400";
                                    border = "border-rose-500/20";
                                }

                                if (isStale) {
                                    gradient = "from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10";
                                    text = "text-gray-400";
                                    border = "border-gray-200 dark:border-white/5";
                                    glow = "";
                                    label += " (STALE)";
                                }

                                return (
                                    <div className="flex flex-col items-start gap-2">
                                        <div className={`relative px-5 py-3 rounded-xl border bg-gradient-to-br ${gradient} ${border} ${glow} transition-all duration-300 group-hover:scale-[1.02]`}>
                                            <span className={`text-sm font-black tracking-widest ${text}`}>
                                                {label}
                                            </span>
                                        </div>
                                        {stalenessData && (
                                            <div className="flex items-center gap-1.5 pl-1">
                                                <div className="h-1 w-12 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${confidence > 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                        style={{ width: `${confidence}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                                    Confidence: {confidence}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* COT Staleness Indicator */}
                <div id="staleness-card">
                    <COTStalenessIndicator contractId={Number(contractId)} />
                </div>

                {/* COT Positions Chart */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Net Positions Over Time
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                            <XAxis
                                dataKey="date"
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#F3F4F6'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="dealer"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                name="Dealer Net"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="assetMgr"
                                stroke="#10B981"
                                strokeWidth={2}
                                name="Asset Manager Net"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="leveraged"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                name="Leveraged Funds Net"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Volume & Market Structure Chart (Replaces old Price/VWAP) */}
                <VolumeAnalysisChart
                    prices={historyData.price_history}
                    reports={historyData.historical_reports}
                    contractName={data.contract_name}
                />

                {/* Recent Alerts Table */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Recent Alerts
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-300">
                                <tr key="header-row">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Level</th>
                                    <th className="px-6 py-4">Z-Score</th>
                                    <th className="px-6 py-4">Context</th>
                                    <th className="px-6 py-4">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {historyData.historical_alerts.slice(0, 10).map((alert) => (
                                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                                            {new Date(alert.report_date).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${alert.alert_level === 'High' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                                                alert.alert_level === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                                    'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                                                }`}>
                                                {alert.alert_level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                                            {alert.z_score?.toFixed(2) || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {alert.price_context || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-semibold">
                                            {alert.confidence_score?.toFixed(0)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Advanced Price & COT Analysis */}
                <AdvancedPriceChart
                    reports={historyData.historical_reports}
                    prices={historyData.price_history}
                    contractName={data.contract_name}
                    currentContractId={data.id}
                    allContracts={allContracts}
                />

                {/* Seasonality Chart */}
                <SeasonalityChart contractId={data.id} />

                {/* Sentiment Gap Analysis */}
                <SentimentGauge reports={historyData.historical_reports} />

                {/* Sentiment Gap Historical Chart */}
                <SentimentGapHistoryChart reports={historyData.historical_reports} />

                {/* Historical Edge Backtest */}
                <HistoricalEdge
                    contractId={data.id}
                    currentSentimentGap={historyData.historical_reports.length > 0 ? calculateSentimentGap(historyData.historical_reports[0]) : undefined}
                />

                {/* COT Index Oscillator */}
                <COTOscillator reports={historyData.historical_reports} />

                {/* Price Distance from VWAP */}
                <PriceDistanceIndicator priceHistory={historyData.price_history} />

                {/* Full Historical Reports */}
                <FullReportsTable contractId={data.id} />
            </div>

            {/* Onboarding Tutorial */}
            {showTutorial && <OnboardingTutorial onClose={() => setShowTutorial(false)} />}
        </div>
    );
};

export default ContractDetail;
