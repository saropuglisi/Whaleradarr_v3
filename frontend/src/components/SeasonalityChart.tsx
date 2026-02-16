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
    const [activeCategory, setActiveCategory] = useState<string>('asset_mgr');
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

    const categories = [
        { id: 'asset_mgr', label: 'Asset Manager', color: '#10B981' },
        { id: 'lev', label: 'Leveraged Funds', color: '#F59E0B' },
        { id: 'dealer', label: 'Dealer / Intermediary', color: '#3B82F6' },
    ];

    if (loading) {
        return (
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-8 flex justify-center">
                <div className="animate-pulse text-gray-500">Loading seasonality...</div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Seasonality Analysis
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Compare year-over-year trends by category.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    {/* Category Toggles */}
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeCategory === cat.id
                                    ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Years Selector */}
                    <select
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg border-none bg-gray-100 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:ring-0 cursor-pointer"
                    >
                        {[3, 5, 10, 15].map(y => (
                            <option key={y} value={y}>{y} Years</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                        <XAxis
                            dataKey="week"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Week of Year', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#9CA3AF' }}
                            interval={4}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                            labelFormatter={(week) => `Week ${week}`}
                            formatter={(value: number) => [Math.round(value).toLocaleString(), 'Net Position']}
                        />
                        <Legend wrapperStyle={{ paddingTop: '10px' }} />

                        {availableYears.map((year, index) => (
                            <Line
                                key={year}
                                type="monotone"
                                dataKey={`${activeCategory}_${year}`}
                                name={`${year}`}
                                stroke={COLORS[index % COLORS.length]}
                                strokeWidth={year === availableYears[availableYears.length - 1] ? 3 : 1.5} // Highlight current year
                                strokeOpacity={year === availableYears[availableYears.length - 1] ? 1 : 0.7}
                                dot={false}
                                activeDot={{ r: 4 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 justify-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Tip:</span>
                The thickest line represents the most recent year. Compare its trajectory against historical seasonal averages.
            </div>
        </div>
    );
};

export default SeasonalityChart;
