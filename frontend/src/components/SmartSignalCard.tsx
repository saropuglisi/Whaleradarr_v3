import React, { useMemo, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Target, Zap, Clock, Info } from 'lucide-react';

interface SmartSignalProps {
    reports: any[];
    alerts: any[];
    priceHistory: any[];
    stalenessData: any;
}

const SmartSignalCard: React.FC<SmartSignalProps> = ({ reports, alerts, priceHistory, stalenessData }) => {
    const [showGlossary, setShowGlossary] = useState(false);

    // --- Logic Implementation ---

    // 1. Helper: Calculate Sentiment Gap
    const calculateGap = (report: any) => {
        if (!report) return 0;
        const whaleTotal = Math.abs(report.asset_mgr_long) + Math.abs(report.asset_mgr_short);
        const retailTotal = Math.abs(report.non_report_long) + Math.abs(report.non_report_short);
        if (whaleTotal === 0 || retailTotal === 0) return 0;
        const whaleNet = report.asset_mgr_long - report.asset_mgr_short;
        const retailNet = report.non_report_long - report.non_report_short;
        return ((whaleNet / whaleTotal) * 100) - ((retailNet / retailTotal) * 100);
    };

    const signalData = useMemo(() => {
        if (!reports || reports.length < 2 || !priceHistory || priceHistory.length === 0) return null;

        const currentReport = reports[0];
        const prevReport = reports[1];
        const latestAlert = alerts && alerts.length > 0 ? alerts[0] : { z_score: 0, cot_index: 50 };

        // --- Layer 1: Direction ---
        // "Non basta il segno assoluto, serve la combinazione segno + momentum + forza statistica"
        const asset_mgr_net = currentReport.asset_mgr_net;
        const asset_mgr_net_prev = prevReport.asset_mgr_net;
        const z_score = latestAlert.z_score || 0;

        const is_long = asset_mgr_net > 0;
        const is_growing = asset_mgr_net > asset_mgr_net_prev;
        const is_strong = Math.abs(z_score) >= 0.5;

        let direction = "NEUTRAL";
        if (is_long && is_growing && is_strong) direction = "BULLISH";
        else if (!is_long && !is_growing && is_strong) direction = "BEARISH";
        else if (Math.abs(z_score) < 0.3) direction = "NEUTRAL";
        else direction = is_long ? "BULLISH" : "BEARISH"; // weak signal

        // --- Layer 2: Base Confidence Components ---

        // A: COT Index Oscillator (30%)
        const cot_index = latestAlert.cot_index || 50;
        let compA = 0.3; // Neutral default
        if (direction === "BULLISH") {
            if (cot_index >= 80) compA = 1.0;
            else if (cot_index >= 60) compA = 0.7;
            else if (cot_index >= 40) compA = 0.4;
            else compA = 0.2;
        } else if (direction === "BEARISH") {
            if (cot_index <= 20) compA = 1.0;
            else if (cot_index <= 40) compA = 0.7;
            else if (cot_index <= 60) compA = 0.4;
            else compA = 0.2;
        }

        // B: Sentiment Gap (25%)
        const currentGap = calculateGap(currentReport);
        const prevGap = calculateGap(reports[reports.length > 6 ? 6 : reports.length - 1]); // approx 6 months or max history
        const gapTrend = currentGap - prevGap;

        let gapBase = 0.1;
        const absGap = Math.abs(currentGap);
        if (absGap >= 30) gapBase = 1.0;
        else if (absGap >= 20) gapBase = 0.8;
        else if (absGap >= 10) gapBase = 0.6;
        else if (absGap >= 5) gapBase = 0.3;

        // Trend bonus: normalized +/- 0.2
        const trendBonus = Math.max(-0.2, Math.min(0.2, gapTrend / 10.0));
        const compB = Math.max(0, Math.min(1, gapBase + trendBonus));

        // C: Historical Edge (25%)
        // Mocked win rates as per user snippet: {10: 0.673, 20: 0.661, 30: 0.668}
        const winRates: Record<number, number> = { 10: 0.673, 20: 0.661, 30: 0.668 };
        let wr = 0.5;
        if (absGap >= 30) wr = winRates[30];
        else if (absGap >= 20) wr = winRates[20];
        else if (absGap >= 10) wr = winRates[10];
        else wr = 0.5; // No edge

        // Normalize: 50% = 0, 100% = 1
        // Example: 67% -> (0.67 - 0.5) / 0.5 = 0.17 / 0.5 = 0.34
        // Wait, user logic: (wr - 0.5) / 0.5. If wr is 0.67 -> 0.34 context score.
        // It seems low but consistent with logical normalization.
        // Let's stick to user logic.
        const compC = Math.max(0, Math.min(1, (wr - 0.5) / 0.5));

        // D: VWAP Context (20%)
        // Needs sigma of price-vwap distance.
        // Approximation: Calculate recent std dev of (Price - VWAP)
        const distances = priceHistory.slice(0, 20).map(p => (p.close_price - (p.reporting_vwap || p.close_price)));
        const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
        const stdDevDist = Math.sqrt(distances.map(d => Math.pow(d - meanDist, 2)).reduce((a, b) => a + b, 0) / distances.length) || 1;

        const currentPrice = priceHistory[0].close_price;
        const currentVWAP = priceHistory[0].reporting_vwap || currentPrice;
        const currentDist = currentPrice - currentVWAP;
        const sigma = currentDist / stdDevDist; // Approx Z-score of distance

        const absSigma = Math.abs(sigma);
        let compD = 0.1;
        if (absSigma <= 0.5) compD = 1.0;
        else if (absSigma <= 1.0) compD = 0.7;
        else if (absSigma <= 2.0) compD = 0.4;

        // Bonus for "right side" of VWAP
        if (direction === "BULLISH" && sigma > 0) compD = Math.min(compD * 1.1, 1.0);
        else if (direction === "BEARISH" && sigma < 0) compD = Math.min(compD * 1.1, 1.0);

        // --- Calculate Base Confidence ---
        const baseConfidence = (0.30 * compA) + (0.25 * compB) + (0.25 * compC) + (0.20 * compD);

        // --- Layer 3: Staleness Adjustment ---
        const reliability = stalenessData ? (stalenessData.reliability_pct / 100) : 1.0;
        // Floor at 40%: effective = 0.40 + (reliability * 0.60)
        const effectiveReliability = 0.40 + (reliability * 0.60);

        const finalConfidence = baseConfidence * effectiveReliability;
        const finalPct = Math.round(finalConfidence * 100);

        let label = "NO SIGNAL";
        if (finalPct >= 75) label = "HIGH CONVICTION";
        else if (finalPct >= 55) label = "MODERATE";
        else if (finalPct >= 35) label = "WEAK";

        return {
            direction,
            confidence: finalPct,
            label,
            breakdown: {
                A_cotIndex: Math.round(compA * 100),
                B_gap: Math.round(compB * 100),
                C_edge: Math.round(compC * 100),
                D_vwap: Math.round(compD * 100),
                base: Math.round(baseConfidence * 100),
                staleness: Math.round(reliability * 100)
            },
            metrics: {
                cot_index,
                gap: Math.round(currentGap),
                edge_wr: (wr * 100).toFixed(1),
                vwap_sigma: sigma.toFixed(2)
            }
        };

    }, [reports, alerts, priceHistory, stalenessData]);

    if (!signalData) return null;

    // --- Visual Styles ---
    const { confidence, direction, label } = signalData;
    const isBull = direction === "BULLISH";
    const isBear = direction === "BEARISH";
    const isNeut = direction === "NEUTRAL";

    // Dynamic Conviction Colors
    let confColor = "text-gray-500";
    let confBg = "bg-gray-100 dark:bg-white/10";
    let barColor = "bg-gray-400";
    let accentColor = "text-gray-500";
    let bgGradient = "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900";
    let icon = <Activity size={24} />;

    if (confidence >= 75) {
        // High conviction
        confColor = isBull ? "text-emerald-500" : isBear ? "text-rose-500" : "text-gray-500";
        confBg = isBull ? "bg-emerald-500/10" : isBear ? "bg-rose-500/10" : "bg-gray-100";
        barColor = isBull ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : isBear ? "bg-gradient-to-r from-rose-600 to-rose-400" : "bg-gray-400";
        accentColor = isBull ? "text-emerald-500" : isBear ? "text-rose-500" : "text-gray-500";
        bgGradient = isBull ? "from-emerald-500/10 to-teal-500/10 border-emerald-500/20" : isBear ? "from-rose-500/10 to-orange-500/10 border-rose-500/20" : bgGradient;
        icon = isBull ? <TrendingUp size={24} /> : isBear ? <TrendingDown size={24} /> : <Activity size={24} />;
    } else if (confidence >= 55) {
        // Moderate conviction
        confColor = isBull ? "text-teal-500" : isBear ? "text-orange-500" : "text-gray-500";
        confBg = isBull ? "bg-teal-500/10" : isBear ? "bg-orange-500/10" : "bg-gray-100";
        barColor = isBull ? "bg-teal-500" : isBear ? "bg-orange-500" : "bg-gray-400";
        accentColor = isBull ? "text-teal-500" : isBear ? "text-orange-500" : "text-gray-500";
        bgGradient = isBull ? "from-teal-500/5 to-emerald-500/5 border-teal-500/10" : isBear ? "from-orange-500/5 to-rose-500/5 border-orange-500/10" : bgGradient;
        icon = isBull ? <TrendingUp size={24} /> : isBear ? <TrendingDown size={24} /> : <Activity size={24} />;
    } else if (confidence >= 35) {
        // Weak conviction - Always Warning Color (Amber)
        confColor = "text-amber-500";
        confBg = "bg-amber-500/10";
        barColor = "bg-amber-500";
        accentColor = "text-amber-500";
        bgGradient = "from-amber-500/5 to-yellow-500/5 border-amber-500/10";
        icon = isBull ? <TrendingUp size={24} /> : isBear ? <TrendingDown size={24} /> : <Activity size={24} />;
    }

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${isNeut ? 'border-gray-200 dark:border-white/10' : ''} ${bgGradient} bg-white dark:bg-black/20 backdrop-blur-md p-6 mb-8`}>
            {/* Header / Main Signal */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-full bg-white dark:bg-black/40 shadow-sm ${accentColor}`}>
                        {icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Smart Signal</h2>
                            <button
                                onClick={() => setShowGlossary(!showGlossary)}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 transition-colors"
                            >
                                <Info size={14} />
                            </button>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-4xl font-black tracking-tight ${confColor}`}>
                                {direction}
                            </span>
                            <span className={`text-xl font-bold px-3 py-1 rounded-lg ${confBg} ${confColor}`}>
                                {confidence}% <span className="text-xs opacity-70 ml-1">{label}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Gauge / Visualizer (Simplified) */}
                <div className="flex-1 w-full max-w-sm">
                    <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">
                        <span>Confidence</span>
                        <span>{confidence}/100</span>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${barColor}`}
                            style={{ width: `${confidence}%` }}
                        ></div>
                    </div>
                    {signalData.breakdown.staleness < 100 && (
                        <div className="text-right mt-1">
                            <span className="text-[10px] font-bold text-orange-400 flex items-center justify-end gap-1">
                                <Zap size={10} /> Staleness Penalty applied (-{100 - signalData.breakdown.staleness}%)
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Breakdown Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200/50 dark:border-white/5">
                {/* Component A */}
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-blue-500/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">COT Index</span>
                        <Target size={12} className="text-blue-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg font-black text-gray-700 dark:text-gray-200">{signalData.metrics.cot_index.toFixed(0)}</span>
                        <span className={`text-xs font-bold ${signalData.breakdown.A_cotIndex > 50 ? 'text-emerald-500' : 'text-gray-400'}`}>
                            Score: {signalData.breakdown.A_cotIndex}%
                        </span>
                    </div>
                </div>

                {/* Component B */}
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-purple-500/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Sent. Gap</span>
                        <Activity size={12} className="text-purple-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg font-black text-gray-700 dark:text-gray-200">{signalData.metrics.gap}%</span>
                        <span className={`text-xs font-bold ${signalData.breakdown.B_gap > 50 ? 'text-emerald-500' : 'text-gray-400'}`}>
                            Score: {signalData.breakdown.B_gap}%
                        </span>
                    </div>
                </div>

                {/* Component C */}
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-orange-500/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Hist. Edge</span>
                        <Clock size={12} className="text-orange-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg font-black text-gray-700 dark:text-gray-200">{signalData.metrics.edge_wr}%</span>
                        <span className={`text-xs font-bold ${signalData.breakdown.C_edge > 30 ? 'text-emerald-500' : 'text-gray-400'}`}>
                            Score: {signalData.breakdown.C_edge}%
                        </span>
                    </div>
                </div>

                {/* Component D */}
                <div className="p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-pink-500/20 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Price ctx</span>
                        <Target size={12} className="text-pink-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg font-black text-gray-700 dark:text-gray-200">{signalData.metrics.vwap_sigma}σ</span>
                        <span className={`text-xs font-bold ${signalData.breakdown.D_vwap > 50 ? 'text-emerald-500' : 'text-gray-400'}`}>
                            Score: {signalData.breakdown.D_vwap}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Glossary Section */}
            {showGlossary && (
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Signal Glossary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            <span className="font-bold text-gray-900 dark:text-gray-200">Direction:</span>
                            <p className="text-xs mt-1 leading-relaxed">Derived from Asset Managers' net positioning trend. Requires consistency in momentum and statistical strength (Z-Score).</p>
                        </div>
                        <div>
                            <span className="font-bold text-gray-900 dark:text-gray-200">Confidence Score:</span>
                            <p className="text-xs mt-1 leading-relaxed">A weighted average of 4 components (below), penalized by the staleness of the data.</p>
                        </div>
                        <div>
                            <span className="font-bold text-blue-500">COT Index (30%):</span>
                            <p className="text-xs mt-1 leading-relaxed">Oscillator (0-100) measuring how extreme the current net position is relative to history. &gt;80 is extreme long.</p>
                        </div>
                        <div>
                            <span className="font-bold text-purple-500">Sentiment Gap (25%):</span>
                            <p className="text-xs mt-1 leading-relaxed">The divergence between Smart Money (Asset Mgrs) and Retail. Bigger gap = stronger signal.</p>
                        </div>
                        <div>
                            <span className="font-bold text-orange-500">Historical Edge (25%):</span>
                            <p className="text-xs mt-1 leading-relaxed">Win rate of similar setups in the past (specifically when Gap &gt; 10%).</p>
                        </div>
                        <div>
                            <span className="font-bold text-pink-500">Price Context (20%):</span>
                            <p className="text-xs mt-1 leading-relaxed">Measures if price is in a favorable entry zone relative to VWAP benchmark.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartSignalCard;
