import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface SentimentGaugeProps {
    reports: {
        asset_mgr_long: number;
        asset_mgr_short: number;
        lev_long: number;
        lev_short: number;
        non_report_long: number;
        non_report_short: number;
        dealer_long: number;
        dealer_short: number;
        dealer_net: number;
    }[];
}

const SentimentGauge: React.FC<SentimentGaugeProps> = ({ reports }) => {
    if (!reports || reports.length === 0) return null;

    // Use latest report
    const latest = reports[0];

    // Calculate Percentages
    const calcLongPct = (long: number, short: number) => {
        const total = long + short;
        if (total === 0) return 50; // Neutral if no positions
        return (long / total) * 100;
    };

    const whaleLongPct = calcLongPct(latest.asset_mgr_long, latest.asset_mgr_short);
    const levLongPct = calcLongPct(latest.lev_long, latest.lev_short);
    const retailLongPct = calcLongPct(latest.non_report_long, latest.non_report_short);

    // Calculate institutional convergence (Whales + Leveraged both on same side)
    const institutionalAlignment = Math.abs(whaleLongPct - levLongPct) < 20; // Within 20% = aligned
    const institutionalBullish = institutionalAlignment && whaleLongPct > 60 && levLongPct > 60;
    const institutionalBearish = institutionalAlignment && whaleLongPct < 40 && levLongPct < 40;

    // Determine Gap and Sentiment
    const gap = whaleLongPct - retailLongPct;
    // Positive Gap = Whales more Bullish than Retail
    // Negative Gap = Whales more Bearish than Retail

    // Enhanced signal logic with institutional convergence
    let signalType: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell' = 'Neutral';
    let signalColor = 'text-gray-500';
    let signalBg = 'bg-gray-100 dark:bg-gray-800';

    // Strong signals require institutional convergence
    if (institutionalBullish && retailLongPct < 40) {
        signalType = 'Strong Buy';
        signalColor = 'text-green-600';
        signalBg = 'bg-green-100 dark:bg-green-900/30';
    } else if (institutionalBearish && retailLongPct > 60) {
        signalType = 'Strong Sell';
        signalColor = 'text-red-600';
        signalBg = 'bg-red-100 dark:bg-red-900/30';
    } else if (gap > 30) {
        signalType = 'Buy';
        signalColor = 'text-green-500';
        signalBg = 'bg-green-50 dark:bg-green-900/10';
    } else if (gap < -30) {
        signalType = 'Sell';
        signalColor = 'text-red-500';
        signalBg = 'bg-red-50 dark:bg-red-900/10';
    }

    // Helper for Gauge Bar
    const renderBar = (pct: number, colorLeft: string, colorRight: string, label: string) => (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1 font-medium text-gray-600 dark:text-gray-400">
                <span>{Math.round(pct)}% Long</span>
                <span className="font-bold text-gray-900 dark:text-white">{label}</span>
                <span>{Math.round(100 - pct)}% Short</span>
            </div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex shadow-inner">
                <div
                    style={{ width: `${pct}%` }}
                    className={`h-full transition-all duration-500 ${colorLeft} flex items-center justify-start px-2`}
                >
                    {pct > 20 && <span className="text-[10px] text-white/90 font-bold">L</span>}
                </div>
                <div
                    className={`flex-1 h-full ${colorRight} flex items-center justify-end px-2 transition-all duration-500`}
                >
                    {pct < 80 && <span className="text-[10px] text-white/90 font-bold">S</span>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Sentiment Gap
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Smart Money (Whales) vs. Retail (Small Specs) positioning.
                    </p>
                </div>
                {/* Signal Badge */}
                <div className={`px-4 py-2 rounded-lg font-bold border ${signalBg} ${signalColor} border-current/20 flex items-center gap-2 shadow-sm`}>
                    {signalType === 'Strong Buy' && <TrendingUp size={18} />}
                    {signalType === 'Strong Sell' && <TrendingDown size={18} />}
                    {signalType === 'Buy' && <ArrowRight className="rotate-[-45deg]" size={18} />}
                    {signalType === 'Sell' && <ArrowRight className="rotate-[45deg]" size={18} />}
                    {signalType === 'Neutral' && <Minus size={18} />}
                    <span className="uppercase tracking-wide text-xs">{signalType} Signal</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Visual Gauges */}
                <div className="space-y-6">
                    {/* Whales Gauge */}
                    {renderBar(whaleLongPct, 'bg-green-500', 'bg-red-400', '🐳 Whales (Asset Mgr)')}

                    {/* Leveraged Funds Gauge */}
                    {renderBar(levLongPct, 'bg-orange-500', 'bg-purple-400', '⚡ Leveraged Funds')}

                    {/* Retail Gauge */}
                    {renderBar(retailLongPct, 'bg-blue-400', 'bg-orange-400', '🐟 Retail (Non-Rep)')}
                </div>

                {/* Analysis Box */}
                <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Gap Analysis</h4>

                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500">Sentiment Divergence:</span>
                        <span className={`font-bold ${Math.abs(gap) > 30 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {Math.round(Math.abs(gap))}%
                        </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {signalType.includes('Buy') ? (
                            institutionalBullish ? (
                                "Both Whales AND Leveraged Funds are aggressively Long while Retail is selling. This institutional convergence often precedes significant price markup."
                            ) : (
                                "Whales are aggressively Long while Retail is selling. This divergence often indicates smart money accumulation before a price markup."
                            )
                        ) : signalType.includes('Sell') ? (
                            institutionalBearish ? (
                                "Both Whales AND Leveraged Funds are distributing (Shorting) while Retail is buying. This institutional convergence often precedes a major price drop."
                            ) : (
                                "Whales are distributing (Shorting) while Retail is buying. This often precedes a price drop as smart money exits liquidity provided by retail."
                            )
                        ) : (
                            "No strong contrarian signal present. Institutions and retail are not showing clear divergence."
                        )}
                    </p>

                    {Math.abs(gap) > 50 && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                            <AlertTriangle size={14} />
                            Extreme Divergence Detected!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SentimentGauge;
