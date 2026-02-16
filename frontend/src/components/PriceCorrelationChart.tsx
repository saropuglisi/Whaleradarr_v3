import React, { useMemo, useState } from 'react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface HistoricalReport {
    report_date: string;
    dealer_net: number;
    asset_mgr_net: number;
    lev_net: number;
}

interface PriceHistory {
    report_date: string;
    close_price: number;
}

interface PriceCorrelationChartProps {
    reports: HistoricalReport[];
    prices: PriceHistory[];
    contractName: string;
}

const PriceCorrelationChart: React.FC<PriceCorrelationChartProps> = ({ reports, prices, contractName }) => {
    const [timeRange, setTimeRange] = useState<number>(3); // Default 3 years

    const chartData = useMemo(() => {
        // Create a map of prices by date for O(1) lookup
        const priceMap = new Map(prices.map(p => [p.report_date.split('T')[0], p.close_price]));

        // Combine report data with matching price data
        const data = reports.map(report => {
            const dateStr = report.report_date.split('T')[0];
            return {
                date: dateStr,
                displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                timestamp: new Date(dateStr).getTime(),
                price: priceMap.get(dateStr) || null,
                asset_mgr_net: report.asset_mgr_net,
                lev_net: report.lev_net,
                dealer_net: report.dealer_net
            };
        });

        // Filter by time range
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - timeRange);
        const cutoffTimestamp = cutoffDate.getTime();

        return data
            .filter(d => d.timestamp >= cutoffTimestamp)
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [reports, prices, timeRange]);

    if (!chartData || chartData.length === 0) {
        return <div className="text-gray-500 text-center py-8">No correlation data available for this timeframe.</div>;
    }

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{contractName}: Price vs. Positioning</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Identify divergences between price action and Smart Money (Asset Manager) positioning.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-2">
                    {[1, 3, 5, 10].map(yr => (
                        <button
                            key={yr}
                            onClick={() => setTimeRange(yr)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${timeRange === yr
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {yr}Y
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAssetMgr" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 12 }}
                            tickMargin={10}
                            minTickGap={30}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            stroke="#10B981"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                            label={{ value: 'Net Contracts', angle: -90, position: 'insideLeft', fill: '#10B981', style: { textAnchor: 'middle' } }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#3B82F6"
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(val) => val.toLocaleString()}
                            label={{ value: 'Price', angle: 90, position: 'insideRight', fill: '#3B82F6', style: { textAnchor: 'middle' } }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            itemStyle={{ color: '#E5E7EB' }}
                            labelStyle={{ color: '#9CA3AF', marginBottom: '0.5rem' }}
                            formatter={(value: number, name: string) => [
                                name === 'Close Price' ? value.toLocaleString() : Math.round(value).toLocaleString(),
                                name
                            ]}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Legend verticalAlign="top" height={36} />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="asset_mgr_net"
                            name="Asset Mgr Net"
                            stroke="#10B981"
                            fillOpacity={1}
                            fill="url(#colorAssetMgr)"
                            strokeWidth={2}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="price"
                            name="Close Price"
                            stroke="#3B82F6"
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PriceCorrelationChart;
