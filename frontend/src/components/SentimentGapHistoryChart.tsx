import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HistoricalReport {
    report_date: string;
    asset_mgr_long: number;
    asset_mgr_short: number;
    lev_long: number;
    lev_short: number;
    non_report_long: number;
    non_report_short: number;
}

interface SentimentGapHistoryChartProps {
    reports: HistoricalReport[];
}

const SentimentGapHistoryChart: React.FC<SentimentGapHistoryChartProps> = ({ reports }) => {
    const chartData = useMemo(() => {
        if (!reports || reports.length === 0) return [];

        // Calculate sentiment gap for each report
        const calculateGap = (report: HistoricalReport) => {
            const whaleTotal = Math.abs(report.asset_mgr_long || 0) + Math.abs(report.asset_mgr_short || 0);
            const retailTotal = Math.abs(report.non_report_long || 0) + Math.abs(report.non_report_short || 0);
            const levTotal = Math.abs(report.lev_long || 0) + Math.abs(report.lev_short || 0);

            if (whaleTotal === 0 || retailTotal === 0) return null;

            const whaleNet = (report.asset_mgr_long || 0) - (report.asset_mgr_short || 0);
            const retailNet = (report.non_report_long || 0) - (report.non_report_short || 0);
            const levNet = (report.lev_long || 0) - (report.lev_short || 0);

            const whalePct = (whaleNet / whaleTotal) * 100;
            const retailPct = (retailNet / retailTotal) * 100;
            const levPct = levTotal > 0 ? (levNet / levTotal) * 100 : null;

            return {
                date: new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: report.report_date,
                gap: whalePct - retailPct,
                whalePct,
                retailPct,
                levPct
            };
        };

        // Get last 6 months of data (approximately 26 weeks)
        const recentReports = reports.slice(0, 26).reverse();

        return recentReports
            .map(calculateGap)
            .filter(d => d !== null) as Array<{
                date: string;
                fullDate: string;
                gap: number;
                whalePct: number;
                retailPct: number;
                levPct: number | null;
            }>;
    }, [reports]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sentiment Gap Evolution</h3>
                <p className="text-sm text-gray-500">Insufficient data to display sentiment history.</p>
            </div>
        );
    }

    // Calculate trend (recent gap vs old gap)
    const currentGap = chartData[chartData.length - 1]?.gap || 0;
    const oldGap = chartData[0]?.gap || 0;
    const trend = currentGap - oldGap;
    const isTrendUp = trend > 0;

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
                <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">{data.fullDate}</p>
                <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-600 dark:text-gray-400">Sentiment Gap:</span>
                        <span className={`font-bold ${Math.abs(data.gap) > 30 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                            {data.gap > 0 ? '+' : ''}{data.gap.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-green-600 dark:text-green-400">🐳 Whales:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{data.whalePct.toFixed(1)}% Long</span>
                    </div>
                    {data.levPct !== null && (
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-orange-600 dark:text-orange-400">⚡ Leveraged:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{data.levPct.toFixed(1)}% Long</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-blue-600 dark:text-blue-400">🐟 Retail:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{data.retailPct.toFixed(1)}% Long</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Sentiment Gap Evolution
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        6-month trend • {isTrendUp ? 'Widening' : 'Narrowing'} divergence
                    </p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg border ${isTrendUp ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                    <div className="flex items-center gap-1.5">
                        {isTrendUp ? <TrendingUp size={16} className="text-green-600 dark:text-green-400" /> : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />}
                        <span className={`text-sm font-bold ${isTrendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        style={{ fontSize: '12px' }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Gap (%)', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                        iconType="line"
                    />
                    <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                    <ReferenceLine y={30} stroke="#10B981" strokeDasharray="2 2" opacity={0.3} />
                    <ReferenceLine y={-30} stroke="#EF4444" strokeDasharray="2 2" opacity={0.3} />

                    <Line
                        type="monotone"
                        dataKey="gap"
                        stroke="#8B5CF6"
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Sentiment Gap"
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Interpretation */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Trend Analysis:</span> {isTrendUp ? (
                        <>The sentiment gap has <strong>widened by {Math.abs(trend).toFixed(1)}%</strong> over 6 months, indicating growing divergence between Whales and Retail. This suggests increasing institutional conviction.</>
                    ) : (
                        <>The sentiment gap has <strong>narrowed by {Math.abs(trend).toFixed(1)}%</strong> over 6 months, suggesting convergence or potential sentiment reversal. Watch for breakout signals.</>
                    )}
                </p>
            </div>
        </div>
    );
};

export default SentimentGapHistoryChart;
