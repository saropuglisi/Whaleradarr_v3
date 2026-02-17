import React, { useEffect, useState } from 'react';
import { Activity, Clock, BarChart2, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert, Shield, HelpCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface COTStalenessIndicatorProps {
    contractId: number;
}

interface StalenessData {
    reliability_pct: number;
    label: string;
    breakdown: {
        price_displacement: number;
        volatility_spike: number;
        volume_anomaly: number;
        time_decay: number;
        raw_price_disp: number;
        raw_vol_spike: number;
        raw_vol_spike_ratio?: number;
        raw_volume_z: number;
        days_since: number;
        cot_date: string;
        current_price: number;
        reference_price?: number;
    };
    error?: string;
}

const COTStalenessIndicator: React.FC<COTStalenessIndicatorProps> = ({ contractId }) => {
    const [data, setData] = useState<StalenessData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showGlossary, setShowGlossary] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:8000/api/v1/analysis/staleness/${contractId}`);
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Staleness analysis not available");
                    throw new Error("Failed to fetch staleness data");
                }
                const result = await res.json();
                if (result.error) {
                    throw new Error(result.error);
                }
                setData(result);
            } catch (err) {
                console.error(err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        if (contractId) {
            fetchData();
        }
    }, [contractId]);

    if (loading) {
        return (
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-8 animate-pulse mb-8 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-[shimmer_2s_infinite]"></div>
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                    <div className="flex-1 space-y-4">
                        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 text-gray-500">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                        <HelpCircle size={20} className="text-gray-400" />
                    </div>
                    <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">COT Reliability Unavailable</span>
                        <p className="text-xs text-gray-500">{error || "Connection error"}</p>
                    </div>
                </div>
            </div>
        );
    }

    const { reliability_pct, label, breakdown } = data;

    const getVisuals = (pct: number) => {
        if (pct >= 80) return {
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            glow: 'shadow-[0_0_40px_rgba(16,185,129,0.1)]',
            gradient: 'from-emerald-500 to-teal-400',
            icon: ShieldCheck,
            verdict: "Reliable: Market conditions are stable relative to the report date. COT data is likely still valid."
        };
        if (pct >= 55) return {
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            glow: 'shadow-[0_0_40px_rgba(245,158,11,0.1)]',
            gradient: 'from-amber-500 to-orange-400',
            icon: Shield,
            verdict: "Partial: Some market movement observed. Use standard confirmation signals before acting."
        };
        if (pct >= 30) return {
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            glow: 'shadow-[0_0_40px_rgba(249,115,22,0.1)]',
            gradient: 'from-orange-500 to-red-400',
            icon: AlertTriangle,
            verdict: "Caution: Notable market movement detected. Institutional positioning may be shifting."
        };
        return {
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/30',
            glow: 'shadow-[0_0_40px_rgba(244,63,94,0.1)]',
            gradient: 'from-rose-500 to-red-600',
            icon: ShieldAlert,
            verdict: "Stale: Significant volatility and movement detected. Report data likely no longer representative."
        };
    };

    const visuals = getVisuals(reliability_pct);
    const StatusIcon = visuals.icon;

    return (
        <div className={`group relative bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-8 mb-8 transition-all duration-500 hover:border-white/20 ${visuals.glow}`}>
            <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-br ${visuals.gradient} opacity-[0.05] blur-[120px] pointer-events-none rounded-full`}></div>

            <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12">
                <div className="flex flex-col items-center lg:items-start gap-6 min-w-[280px]">
                    <div className="relative group/score pointer-events-none sm:pointer-events-auto">
                        <div className={`absolute inset-0 bg-gradient-to-br ${visuals.gradient} opacity-20 blur-2xl rounded-full scale-0 group-hover/score:scale-150 transition-transform duration-700`}></div>
                        <svg className="w-32 h-32 transform -rotate-90 drop-shadow-sm">
                            <circle
                                cx="64" cy="64" r="58"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                className="text-gray-100 dark:text-gray-800/40"
                            />
                            <circle
                                cx="64" cy="64" r="58"
                                stroke="url(#gradient-rel-indicator-en)"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={364.42}
                                strokeDashoffset={364.42 * (1 - reliability_pct / 100)}
                                strokeLinecap="round"
                                className="transition-all duration-[1500ms] cubic-bezier(0.34, 1.56, 0.64, 1)"
                            />
                            <defs>
                                <linearGradient id="gradient-rel-indicator-en" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={reliability_pct >= 55 ? "#10b981" : "#f43f5e"} />
                                    <stop offset="100%" stopColor={reliability_pct >= 55 ? "#34d399" : "#fb7185"} />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-black ${visuals.color} tracking-tighter leading-none`}>
                                {reliability_pct}%
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Reliability</span>
                        </div>
                    </div>

                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2.5 mb-2">
                            <StatusIcon size={24} className={visuals.color} />
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                Analysis Engine
                            </h3>
                        </div>
                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] ${visuals.bg} ${visuals.color} border ${visuals.border} mb-4 backdrop-blur-md`}>
                            {label}
                        </div>
                        <div className="flex items-center justify-center lg:justify-start gap-2.5 text-gray-500/80 dark:text-gray-400/80">
                            <Clock size={16} />
                            <span className="text-sm font-semibold tracking-tight">Report Date: {breakdown.cot_date}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full flex flex-col">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                        <DataTile
                            icon={TrendingUp}
                            label="Price Dist."
                            value={breakdown.raw_price_disp.toFixed(2)}
                            unit="ATR"
                            staleness={breakdown.price_displacement}
                            visuals={visuals}
                        />
                        <DataTile
                            icon={Activity}
                            label="Volatility"
                            value={breakdown.raw_vol_spike.toFixed(2)}
                            unit="x"
                            staleness={breakdown.volatility_spike}
                            visuals={visuals}
                        />
                        <DataTile
                            icon={BarChart2}
                            label="Volume Z"
                            value={breakdown.raw_volume_z.toFixed(2)}
                            unit="σ"
                            staleness={breakdown.volume_anomaly}
                            visuals={visuals}
                        />
                        <DataTile
                            icon={Clock}
                            label="Staleness"
                            value={breakdown.days_since.toString()}
                            unit="days"
                            staleness={breakdown.time_decay}
                            visuals={visuals}
                        />
                    </div>

                    <div className="mt-8 p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row items-center gap-6 transition-all duration-500 group/verdict hover:bg-white/60 dark:hover:bg-white/[0.06]">
                        <div className={`p-4 rounded-xl shadow-lg transition-transform duration-500 group-hover/verdict:rotate-[360deg] ${visuals.bg} ${visuals.color}`}>
                            <StatusIcon size={28} />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Market Insight</h4>
                            <p className="text-base text-gray-700 dark:text-gray-300 font-bold leading-relaxed">
                                {visuals.verdict}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t border-gray-100 dark:border-white/10 pt-4">
                <button
                    onClick={() => setShowGlossary(!showGlossary)}
                    className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-widest transition-colors"
                >
                    <Info size={14} />
                    <span>Glossary & Methodology</span>
                    {showGlossary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showGlossary && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-white/[0.02] p-6 rounded-2xl border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <h5 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <TrendingUp size={12} className="text-blue-500" /> Price Displacement
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Measures how much the price has moved away from the reference Tuesday close (when the COT data was recorded).
                                The value is normalized by the **14-period ATR**. If above 1.0, it indicates a significant move that may have forced institutional "whales" to rebalance.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Activity size={12} className="text-amber-500" /> Volatility Spike
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Ratio between short-term (5-day) and long-term (20-day) volatility.
                                A value above 1.2x signals an abnormal increase in volatility, typical of institutional events that shift market context.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <BarChart2 size={12} className="text-emerald-500" /> Volume Anomaly
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Z-Score of current volume relative to the 20-day average.
                                A value above **+2.0σ** indicates exceptional volume, suggesting strong institutional activity not yet captured by the latest COT report.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Clock size={12} className="text-rose-500" /> Age Factor (Time Decay)
                            </h5>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                Linear decay based on days elapsed since the reference Tuesday.
                                Every report naturally ages; after 5 business days, temporal reliability reaches its minimum even in the absence of price movement.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface TileProps {
    icon: React.ElementType;
    label: string;
    value: string;
    unit: string;
    staleness: number;
    visuals: any;
}

const DataTile: React.FC<TileProps> = ({ icon: Icon, label, value, unit, staleness, visuals }) => {
    const isHigh = staleness > 0.6;

    return (
        <div className={`group/tile relative p-5 rounded-2xl border transition-all duration-500 hover:-translate-y-2 ${isHigh
                ? "bg-rose-500/5 border-rose-500/20 shadow-rose-500/5"
                : "bg-white/40 dark:bg-white/[0.03] border-gray-200/50 dark:border-white/5 hover:border-white/30 shadow-sm"
            }`}>
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${isHigh ? "from-rose-500 to-red-600" : "from-blue-500 to-indigo-500"} transition-all duration-[2s] rounded-b-2xl`}
                style={{ width: `${staleness * 100}%` }}></div>

            <div className="flex items-center gap-2.5 mb-3">
                <div className={`p-1.5 rounded-lg transition-colors duration-300 ${isHigh ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500 group-hover/tile:bg-blue-500 group-hover/tile:text-white"}`}>
                    <Icon size={14} />
                </div>
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tracking-tighter ${isHigh ? "text-rose-500" : "text-gray-900 dark:text-white"}`}>
                    {value}
                </span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{unit}</span>
            </div>
        </div>
    );
};

export default COTStalenessIndicator;
