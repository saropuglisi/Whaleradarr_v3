import React, { useMemo, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Info } from 'lucide-react';

interface COTOscillatorProps {
    reports: any[];
}

const COTOscillator: React.FC<COTOscillatorProps> = ({ reports }) => {
    const [lookbackYears, setLookbackYears] = useState<number>(3);
    const [showGlossary, setShowGlossary] = useState(false);

    const chartData = useMemo(() => {
        if (!reports || reports.length === 0) return [];

        // Sort by date ascending for calculation
        const sortedReports = [...reports].sort((a, b) =>
            new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
        );

        const lookbackWeeks = lookbackYears * 52;

        return sortedReports.map((report, index) => {
            // Define window
            const startIdx = Math.max(0, index - lookbackWeeks + 1);
            const windowSlice = sortedReports.slice(startIdx, index + 1);

            // Calculate Min/Max for Asset Manager Net
            const values = windowSlice.map(r => r.asset_mgr_net);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const current = report.asset_mgr_net;

            let indexValue = 50; // Default neutral
            if (max !== min) {
                indexValue = ((current - min) / (max - min)) * 100;
            }

            return {
                date: report.report_date,
                displayDate: new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                cotIndex: Math.round(indexValue),
                netPosition: current
            };
        });
    }, [reports, lookbackYears]);

    // Filter to show only relevant history (last 5 years max for visibility, or match index?)
    // User wants to see the oscillator. Usually we show the timeline requested by the user.
    // Let's default to showing the last 'lookbackYears' + extra?
    // Actually, simply show the last 5 years of data derived.
    const visibleData = chartData.slice(- (5 * 52));

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            COT Index Oscillator
                        </h3>
                        <button
                            onClick={() => setShowGlossary(!showGlossary)}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-blue-500 transition-colors"
                        >
                            <Info size={16} />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Normalized Asset Manager positioning (0-100). Identifies statistical extremes.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Lookback:</span>
                    <select
                        value={lookbackYears}
                        onChange={(e) => setLookbackYears(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-lg border-none bg-gray-100 dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:ring-0 cursor-pointer"
                    >
                        <option value={1}>1 Year (52 Weeks)</option>
                        <option value={3}>3 Years (156 Weeks)</option>
                        <option value={5}>5 Years (260 Weeks)</option>
                    </select>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={visibleData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            minTickGap={30}
                        />
                        <YAxis
                            domain={[0, 100]}
                            ticks={[0, 20, 50, 80, 100]}
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px', color: '#fff' }}
                            labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                            formatter={(value: number) => [value, 'COT Index']}
                        />

                        {/* Zones */}
                        <ReferenceLine y={80} stroke="#10B981" strokeDasharray="3 3" label={{ position: 'right', value: 'Overbought', fill: '#10B981', fontSize: 10 }} />
                        <ReferenceLine y={20} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Oversold', fill: '#EF4444', fontSize: 10 }} />
                        <ReferenceLine y={50} stroke="#9CA3AF" strokeDasharray="3 3" />

                        <Area
                            type="monotone"
                            dataKey="cotIndex"
                            stroke="#8B5CF6"
                            fillOpacity={1}
                            fill="url(#colorIndex)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs justify-center">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-600 dark:text-gray-300"><strong>90-100:</strong> Historic Extreme Long</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span className="text-gray-600 dark:text-gray-300"><strong>0-10:</strong> Historic Extreme Short</span>
                </div>
            </div>

            {/* Glossary Section */}
            {showGlossary && (
                <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Oscillator Glossary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                            <span className="font-bold text-green-500">Overbought (&gt;80):</span>
                            <p className="text-xs mt-1 leading-relaxed">Whales have historically been this Long rarely. Risk of reversal or pause is high.</p>
                        </div>
                        <div>
                            <span className="font-bold text-red-500">Oversold (&lt;20):</span>
                            <p className="text-xs mt-1 leading-relaxed">Whales have historically been this Short rarely. Markets often bounce from these levels.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default COTOscillator;
