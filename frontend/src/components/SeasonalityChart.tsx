import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SeasonalityChartProps {
    contractId: number;
}

interface SeasonalityData {
    week: number;
    [key: string]: number; // dealer_2024, asset_mgr_2025, etc.
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const SeasonalityChart: React.FC<SeasonalityChartProps> = ({ contractId }) => {
    const [data, setData] = useState<SeasonalityData[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [years, setYears] = useState(5);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeasonality = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:8000/api/v1/contracts/${contractId}/seasonality?years=${years}`);
                const result = await response.json();
                setData(result.seasonality || []);
                setAvailableYears(result.available_years || []);
            } catch (error) {
                console.error('Failed to fetch seasonality:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSeasonality();
    }, [contractId, years]);

    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading seasonality...</div>;
    }

    // Helper to render a chart for a specific trader type
    const renderChart = (title: string, prefix: string, color: string) => {
        return (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="week"
                            stroke="#9CA3AF"
                            label={{ value: 'Week of Year', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#F3F4F6' }}
                        />
                        <Legend />
                        {availableYears.map((year, index) => (
                            <Line
                                key={year}
                                type="monotone"
                                dataKey={`${prefix}_${year}`}
                                stroke={COLORS[index % COLORS.length]}
                                name={`${year}`}
                                strokeWidth={2}
                                dot={false}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Seasonality Analysis</h2>
                <select
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white"
                >
                    {[1, 2, 3, 5, 10].map(y => (
                        <option key={y} value={y}>{y} Year{y > 1 ? 's' : ''}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {renderChart('Dealer / Intermediary Net Positions', 'dealer', '#3B82F6')}
                {renderChart('Asset Manager Net Positions', 'asset_mgr', '#10B981')}
                {renderChart('Leveraged Funds Net Positions', 'lev', '#F59E0B')}
            </div>
        </div>
    );
};

export default SeasonalityChart;
