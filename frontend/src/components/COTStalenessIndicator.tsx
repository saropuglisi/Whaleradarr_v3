import React, { useEffect, useState } from 'react';
import { Activity, Clock, BarChart2, TrendingUp, AlertTriangle, ShieldCheck, ShieldAlert, Shield, HelpCircle, ChevronDown, ChevronUp, Info, Zap } from 'lucide-react';

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
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-3xl p-8 animate-pulse mb-8 overflow-hidden relative shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_2s_infinite]"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-8 shadow-lg">
                <div className="flex items-center gap-3 text-gray-500">
                    <AlertTriangle size={20} />
                    <span>COT Reliability Unavailable</span>
                </div>
            </div>
        );
    }

    const { reliability_pct, label, breakdown } = data;

    // Gradient Logic - Refined to match Red -> Yellow -> Green
    // Using a more structured color mapping
    const getVisuals = (pct: number) => {
        if (pct >= 80) return {
            color: 'text-emerald-500',
            barColor: 'bg-emerald-500',
            verdict: "Reliable: Market stable relative to report."
        };
        if (pct >= 55) return {
            color: 'text-amber-500', // Matches the ~55% range better
            barColor: 'bg-amber-500',
            verdict: "Partial: Some movement observed."
        };
        if (pct >= 30) return {
            color: 'text-orange-500',
            barColor: 'bg-orange-500',
            verdict: "Caution: Notable market shift detected."
        };
        return {
            color: 'text-rose-500',
            barColor: 'bg-rose-500',
            verdict: "Stale: Report likely outdated."
        };
    };

    const visuals = getVisuals(reliability_pct);

    return (
        <div className={`relative overflow-hidden bg-white/70 dark:bg-[#0A0A0A]/80 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[32px] p-8 md:p-10 mb-8 transition-all duration-700 shadow-sm hover:shadow-md`}>

            <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-16">

                {/* Visual Gauge Section */}
                <div className="flex flex-col items-center lg:items-start min-w-[240px]">
                    <div className="relative mb-6 group cursor-default">

                        {/* SVG Gauge - Enhanced Gradient */}
                        <svg className="w-40 h-40 transform -rotate-90 drop-shadow-lg">
                            {/* Track */}
                            <circle
                                cx="80" cy="80" r="72"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="transparent"
                                strokeLinecap="round"
                                className="text-gray-100 dark:text-gray-800"
                            />
                            {/* Gradient definition - Adjusted for circular progression */}
                            <defs>
                                <linearGradient id="gaugeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ef4444" />   {/* Red (Start) */}
                                    <stop offset="40%" stopColor="#f59e0b" />   {/* Orange/Amber */}
                                    <stop offset="70%" stopColor="#eab308" />   {/* Yellow */}
                                    <stop offset="100%" stopColor="#10b981" />  {/* Green (End) */}
                                </linearGradient>
                            </defs>
                            {/* Progress */}
                            <circle
                                cx="80" cy="80" r="72"
                                stroke="url(#gaugeGradient)"
                                strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={452.39}
                                strokeDashoffset={452.39 * (1 - reliability_pct / 100)}
                                strokeLinecap="round"
                                className="transition-all duration-[2000ms] cubic-bezier(0.34, 1.56, 0.64, 1)"
                            />
                        </svg>

                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-1">
                            <span className={`text-4xl font-black ${visuals.color} tracking-tighter drop-shadow-sm flex items-start gap-0.5`}>
                                {reliability_pct}
                                <span className="text-lg opacity-60 font-bold mt-1">%</span>
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Confidence</span>
                        </div>
                    </div>

                    <div className="text-center lg:text-left space-y-3">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center justify-center lg:justify-start gap-2">
                                <Zap size={18} className={visuals.color} fill="currentColor" fillOpacity={0.2} />
                                Staleness Engine
                            </h3>
                        </div>

                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5`}>
                            {label}
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="flex-1 w-full space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            icon={TrendingUp}
                            label="Price Dist."
                            value={breakdown.raw_price_disp.toFixed(2)}
                            unit="ATR"
                            staleness={breakdown.price_displacement}
                            delay={100}
                        />
                        <MetricCard
                            icon={Activity}
                            label="Volatility"
                            value={breakdown.raw_vol_spike.toFixed(2)}
                            unit="x"
                            staleness={breakdown.volatility_spike}
                            delay={200}
                        />
                        <MetricCard
                            icon={BarChart2}
                            label="Volume Z"
                            value={breakdown.raw_volume_z.toFixed(2)}
                            unit="σ"
                            staleness={breakdown.volume_anomaly}
                            delay={300}
                        />
                        <MetricCard
                            icon={Clock}
                            label="Age Factor"
                            value={breakdown.days_since.toString()}
                            unit="days"
                            staleness={breakdown.time_decay}
                            delay={400}
                        />
                    </div>

                    {/* Verdict Card - Replaced "System Status" Bar */}
                    <div className="p-5 rounded-2xl bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                        <div key={reliability_pct} className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className={`w-2 h-2 rounded-full ${visuals.barColor}`}></div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {visuals.verdict}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collapsible Glossary */}
            <div className="mt-8 border-t border-gray-100 dark:border-white/5 pt-6">
                <button
                    onClick={() => setShowGlossary(!showGlossary)}
                    className="group flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-[0.2em] transition-all duration-300"
                >
                    <Info size={12} className="group-hover:scale-110 transition-transform" />
                    <span>Calculations & Methodology</span>
                    <div className={`transition-transform duration-300 ${showGlossary ? 'rotate-180' : ''}`}>
                        <ChevronDown size={12} />
                    </div>
                </button>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-500 ease-in-out overflow-hidden ${showGlossary ? 'mt-6 opacity-100 max-h-[500px]' : 'mt-0 opacity-0 max-h-0'}`}>
                    <GlossaryItem
                        icon={TrendingUp} title="Price Displacement"
                        desc="Deviation from reference Tuesday close normalized by 14-period ATR. >1.0 indicates significant rebalancing pressure."
                        color="text-blue-500"
                    />
                    <GlossaryItem
                        icon={Activity} title="Volatility Spike"
                        desc="Ratio of short-term (5d) to long-term (20d) volatility. >1.2x signals structural market shifts."
                        color="text-amber-500"
                    />
                    <GlossaryItem
                        icon={BarChart2} title="Volume Anomaly"
                        desc="Z-Score of current volume vs 20d average. >+2.0σ suggests institutional activity not in report."
                        color="text-emerald-500"
                    />
                    <GlossaryItem
                        icon={Clock} title="Age Factor"
                        desc="Linear reliability decay based on days elapsed. Reliability hits minimum after 5 business days."
                        color="text-rose-500"
                    />
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner code
const MetricCard = ({ icon: Icon, label, value, unit, staleness, delay }: any) => {
    // Logic: High staleness (bad) -> Red. Low staleness (good) -> Green.
    // Staleness is 0 to 1. 0 is fresh, 1 is stale.
    const scoreColor = staleness > 0.6 ? "text-rose-500" : staleness > 0.3 ? "text-amber-500" : "text-emerald-500";
    const barColor = staleness > 0.6 ? "bg-rose-500" : staleness > 0.3 ? "bg-amber-500" : "bg-emerald-500";

    return (
        <div
            className={`group relative p-5 rounded-2xl border bg-white dark:bg-white/[0.02] border-gray-100 dark:border-white/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex justify-between items-start mb-3">
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                    {label}
                </span>
                <Icon size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>

            <div className="flex items-baseline gap-1 mb-3">
                <span className={`text-2xl font-black tracking-tight ${scoreColor}`}>
                    {value}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{unit}</span>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(staleness * 100, 100)}%` }}
                ></div>
            </div>
        </div>
    );
};

const GlossaryItem = ({ icon: Icon, title, desc, color }: any) => (
    <div className="p-4 rounded-xl bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 transition-colors">
        <h5 className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Icon size={12} className={color} /> {title}
        </h5>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
            {desc}
        </p>
    </div>
);

export default COTStalenessIndicator;
