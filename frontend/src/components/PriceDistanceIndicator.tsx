import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface PriceHistory {
    report_date: string;
    close_price: number;
    reporting_vwap?: number;
}

interface PriceDistanceIndicatorProps {
    priceHistory: PriceHistory[];
}

const PriceDistanceIndicator: React.FC<PriceDistanceIndicatorProps> = ({ priceHistory }) => {
    const analysis = useMemo(() => {
        if (!priceHistory || priceHistory.length < 20) {
            return null;
        }

        // Get most recent data point
        const latest = priceHistory[priceHistory.length - 1];
        const currentPrice = latest.close_price;
        const currentVWAP = latest.reporting_vwap || currentPrice;

        // Calculate historical VWAP and price distances for last 52 weeks
        const lookbackPeriod = Math.min(52, priceHistory.length);
        const recentData = priceHistory.slice(-lookbackPeriod);

        const distances = recentData
            .filter(p => p.reporting_vwap && p.close_price)
            .map(p => {
                const vwap = p.reporting_vwap!;
                const price = p.close_price;
                // Distance as percentage deviation from VWAP
                return ((price - vwap) / vwap) * 100;
            });

        if (distances.length === 0) return null;

        // Calculate mean and standard deviation
        const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
        const stdDev = Math.sqrt(variance);

        // Current distance
        const currentDistance = ((currentPrice - currentVWAP) / currentVWAP) * 100;

        // Z-Score (volatility-adjusted)
        const zScore = stdDev > 0 ? (currentDistance - mean) / stdDev : 0;

        // Risk level
        let riskLevel: 'safe' | 'caution' | 'danger' = 'safe';
        let riskLabel = 'Normal';
        if (Math.abs(zScore) > 2) {
            riskLevel = 'danger';
            riskLabel = 'Overextended';
        } else if (Math.abs(zScore) > 1) {
            riskLevel = 'caution';
            riskLabel = 'Extended';
        }

        return {
            currentPrice,
            currentVWAP,
            currentDistance,
            zScore,
            stdDev,
            mean,
            riskLevel,
            riskLabel,
            direction: currentDistance > 0 ? 'above' : 'below'
        };
    }, [priceHistory]);

    if (!analysis) {
        return (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Price Distance from VWAP
                </h3>
                <p className="text-sm text-gray-500">Insufficient data to calculate price distance.</p>
            </div>
        );
    }

    const { currentPrice, currentVWAP, currentDistance, zScore, riskLevel, riskLabel, direction } = analysis;

    // Color based on risk
    const riskColors = {
        safe: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-600 dark:text-green-400', icon: TrendingUp },
        caution: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', icon: AlertCircle },
        danger: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-600 dark:text-red-400', icon: TrendingDown }
    };

    const colors = riskColors[riskLevel];
    const RiskIcon = colors.icon;

    // Calculate bar width (capped at ±3 sigma for visualization)
    const barWidth = Math.min(Math.abs(zScore), 3) / 3 * 100;

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Price Distance from VWAP
                        <RiskIcon size={20} className={colors.text} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Volatility-adjusted deviation • {riskLabel}
                    </p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border ${colors.bg} ${colors.border}`}>
                    <span className={`text-sm font-bold ${colors.text}`}>
                        {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}σ
                    </span>
                </div>
            </div>

            {/* Visual Bar */}
            <div className="relative h-16 bg-gray-100 dark:bg-white/5 rounded-lg mb-6 overflow-hidden">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-600 z-10"></div>

                {/* Risk zones (±1σ, ±2σ) */}
                <div className="absolute left-1/6 top-0 bottom-0 w-0.5 bg-yellow-500/30"></div>
                <div className="absolute left-5/6 top-0 bottom-0 w-0.5 bg-yellow-500/30"></div>

                {/* Current position bar */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 h-10 ${colors.bg} ${colors.border} border-2 rounded transition-all duration-500`}
                    style={{
                        [direction === 'above' ? 'left' : 'right']: '50%',
                        width: `${barWidth}%`
                    }}
                ></div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Price</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${currentPrice.toFixed(2)}
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">VWAP</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${currentVWAP.toFixed(2)}
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Distance</div>
                    <div className={`text-lg font-bold ${colors.text}`}>
                        {currentDistance > 0 ? '+' : ''}{currentDistance.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Risk Level</div>
                    <div className={`text-lg font-bold ${colors.text}`}>
                        {riskLabel}
                    </div>
                </div>
            </div>

            {/* Interpretation */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Interpretation:</span>
                    {Math.abs(zScore) < 1 && (
                        <> Price is within normal range of VWAP. Good entry zone.</>
                    )}
                    {Math.abs(zScore) >= 1 && Math.abs(zScore) < 2 && (
                        <> Price is {direction === 'above' ? 'extended above' : 'extended below'} VWAP. Watch for potential reversion.</>
                    )}
                    {Math.abs(zScore) >= 2 && (
                        <> Price is significantly overextended ({direction === 'above' ? 'above' : 'below'} VWAP). High risk of retracement. Avoid chasing.</>
                    )}
                </p>
            </div>
        </div>
    );
};

export default PriceDistanceIndicator;
