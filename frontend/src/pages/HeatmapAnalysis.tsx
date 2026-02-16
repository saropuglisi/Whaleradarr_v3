import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeatmapData {
    contract_id: number;
    contract_name: string;
    category: string;
    data: {
        date: string;
        value: number | null;
    }[];
}

interface HeatmapResponse {
    weeks: string[];
    heatmap: HeatmapData[];
}

const CATEGORIES = ['All', 'Currencies', 'Energies', 'Equities', 'Grains', 'Meats', 'Metals', 'Softs'];

const HeatmapAnalysis: React.FC = () => {
    const [data, setData] = useState<HeatmapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [weeks, setWeeks] = useState(12);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const categoryParam = selectedCategory === 'All' ? undefined : selectedCategory;
                const result = await api.getHeatmap(weeks, categoryParam);
                setData(result);
            } catch (error) {
                console.error("Failed to fetch heatmap:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [weeks, selectedCategory]);

    // Helper to get color based on COT Index (0-100)
    const getCellColor = (value: number | null) => {
        if (value === null) return 'bg-gray-100 dark:bg-white/5';

        // Extreme Long (>80) - Green
        if (value >= 90) return 'bg-green-500 text-white font-bold shadow-[0_0_10px_rgba(34,197,94,0.5)]';
        if (value >= 80) return 'bg-green-400 text-white font-semibold';
        if (value >= 60) return 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-200';

        // Extreme Short (<20) - Red
        if (value <= 10) return 'bg-red-500 text-white font-bold shadow-[0_0_10px_rgba(239,68,68,0.5)]';
        if (value <= 20) return 'bg-red-400 text-white font-semibold';
        if (value <= 40) return 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200';

        // Neutral (40-60)
        return 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500';
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                        Market Heatmap
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Cross-market COT Index analysis to spot institutional extremes.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                    {/* Weeks Selector */}
                    <div className="flex items-center gap-2 px-2 border-r border-gray-200 dark:border-white/10">
                        <Calendar size={16} className="text-gray-500" />
                        <select
                            value={weeks}
                            onChange={(e) => setWeeks(Number(e.target.value))}
                            className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-900 dark:text-white"
                        >
                            <option value={8}>8 Weeks</option>
                            <option value={12}>12 Weeks</option>
                            <option value={24}>6 Months</option>
                            <option value={52}>1 Year</option>
                        </select>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {CATEGORIES.slice(0, 4).map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                        <select
                            value={CATEGORIES.includes(selectedCategory) && !CATEGORIES.slice(0, 4).includes(selectedCategory) ? selectedCategory : ''}
                            onChange={(e) => e.target.value && setSelectedCategory(e.target.value)}
                            className="bg-transparent border-none text-xs font-medium focus:ring-0 text-gray-500 dark:text-gray-400 w-20"
                        >
                            <option value="" disabled>More...</option>
                            {CATEGORIES.slice(4).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm backdrop-blur-md">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 animate-pulse">Calculating institutional positioning...</p>
                    </div>
                ) : !data || data.heatmap.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No data available for this selection.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                                    <th className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-[#111] z-10 w-48">
                                        Contract
                                    </th>
                                    {data.weeks.map(week => (
                                        <th key={week} className="px-2 py-3 font-mono text-xs text-gray-400 font-normal min-w-[60px] text-center">
                                            {new Date(week).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {data.heatmap.map((row) => (
                                    <tr key={row.contract_id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-black/95 group-hover:bg-gray-50 dark:group-hover:bg-[#111] transition-colors z-10 border-r border-gray-100 dark:border-white/5">
                                            <Link to={`/contract/${row.contract_id}`} className="hover:text-purple-500 transition-colors flex items-center gap-2">
                                                {row.contract_name}
                                                <ArrowLeft className="opacity-0 group-hover:opacity-100 transform rotate-180 transition-all text-purple-500" size={12} />
                                            </Link>
                                        </td>
                                        {row.data.map((cell, idx) => (
                                            <td key={idx} className="p-1 px-2 text-center">
                                                <div
                                                    className={`w-full h-8 rounded flex items-center justify-center text-xs transition-transform hover:scale-110 cursor-default ${getCellColor(cell.value)}`}
                                                    title={`Date: ${cell.date}\nCOT Index: ${cell.value}`}
                                                >
                                                    {cell.value !== null ? Math.round(cell.value) : '-'}
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 items-center justify-center text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
                <span className="font-semibold mr-2">COT Index Legend:</span>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">0</div>
                    <span>Extreme Short</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded bg-red-200 dark:bg-red-900/40"></div>
                    <span>Bearish</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded bg-gray-100 dark:bg-white/10"></div>
                    <span>Neutral</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded bg-green-200 dark:bg-green-900/40"></div>
                    <span>Bullish</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-4 rounded bg-green-500 text-white flex items-center justify-center text-[10px] font-bold">100</div>
                    <span>Extreme Long</span>
                </div>
            </div>

            {/* Interpretation Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            ℹ️
                        </span>
                        How to Read the Heatmap
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <li className="flex gap-3">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 min-w-[80px]">COT Index:</span>
                            <span>A normalized score (0-100) showing where current positioning stands relative to the last 3 years.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-semibold text-green-600 dark:text-green-400 min-w-[80px]">Greens:</span>
                            <span>Institutional Sentiment is <strong>Bullish</strong>. Dark green (90+) indicates an extreme Long position, often a precursor to a trend reversal or continuation.</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="font-semibold text-red-600 dark:text-red-400 min-w-[80px]">Reds:</span>
                            <span>Institutional Sentiment is <strong>Bearish</strong>. Dark red (10-) indicates an extreme Short position.</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-white dark:bg-white/5 p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            💡
                        </span>
                        Trading Strategy Tips
                    </h3>
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <li className="flex items-start gap-2">
                            <span className="mt-1">✅</span>
                            <span><strong>Spot Extremes:</strong> When a market hits 0 or 100, Smart Money is fully positioned. Expect volatility or a reversal.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1">✅</span>
                            <span><strong>Cluster Analysis:</strong> Look for vertical bands of color. If all "Currencies" turn Green against USD, it's a macro dollar-weakness signal.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="mt-1">✅</span>
                            <span><strong>Divergences:</strong> If price makes a new High but the Heatmap color fades from Dark Green to Light Green, institutions are selling into strength.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default HeatmapAnalysis;
