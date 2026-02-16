import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, BarChart2, ShieldCheck, TrendingUp } from 'lucide-react';

const Help: React.FC = () => {
    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    Understanding Whaleradarr
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    A guide to interpreting Institutional Order Flow, Z-Scores, and the metrics used in our analysis engine.
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Z-Score */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-blue-500/20 text-blue-500">
                            <BarChart2 size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Standard Score (Z-Score)</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        The Z-Score measures how "unusual" the current institutional position is compared to the past 3 years.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-green-500 font-bold">&gt; 2.0</span>
                            <span>Extremely Bullish (Top 2% of history)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-blue-500 font-bold">0.0</span>
                            <span>Average / Neutral positioning</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-red-500 font-bold">&lt; -2.0</span>
                            <span>Extremely Bearish (Bottom 2% of history)</span>
                        </li>
                    </ul>
                </div>

                {/* COT Index */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <TrendingUp size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">COT Index (0-100)</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        A percentile ranking of the current net position against the all-time range.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-green-500 font-bold">100%</span>
                            <span>Institutions are maximally Long</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-yellow-500 font-bold">50%</span>
                            <span>Neutral</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-red-500 font-bold">0%</span>
                            <span>Institutions are maximally Short</span>
                        </li>
                    </ul>
                </div>

                {/* Price Context (VWAP) */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-purple-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-500">
                            <Activity size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">VWAP Context</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        We compare the closing price to the Weekly VWAP (Volume Weighted Average Price) to confirm the trend strength.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex items-start gap-2">
                            <div className="flex items-center gap-1 text-green-400 font-bold min-w-[80px]">
                                Markup <ArrowUpRight size={14} />
                            </div>
                            <span>Price &gt; VWAP (Buyers in control)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="flex items-center gap-1 text-red-400 font-bold min-w-[80px]">
                                Markdown <ArrowDownRight size={14} />
                            </div>
                            <span>Price &lt; VWAP (Sellers in control)</span>
                        </li>
                    </ul>
                </div>


                {/* Weekly Changes & Position Flow */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-pink-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-pink-500/20 text-pink-500">
                            <Activity size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Weekly Position Flow</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        We track the WoW (Week-over-Week) change in positions for key market participants to spot momentum shifts.
                    </p>
                    <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Z-Score Delta</span>
                            <span>The change in Z-Score from the previous week. <span className="text-green-500">(+0.5)</span> indicates strengthening bullishness, while <span className="text-red-500">(-0.5)</span> indicates weakening.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Dealer / Intermediary</span>
                            <span>Banks and market makers. They usually take the other side of the trade (Hedging).</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Asset Manager</span>
                            <span>Institutional investors (Pension Funds, Insurance). Slow moving, trend following money.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Leveraged Funds</span>
                            <span>Hedge Funds and Speculators. Fast moving, often chasing trends or reversing quickly.</span>
                        </li>
                    </ul>
                </div>

                {/* Alert Confidence */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-orange-500/30 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-orange-500/20 text-orange-500">
                            <ShieldCheck size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Confidence Score</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        A proprietary algorithm that combines Z-Score, COT Index, and Price Context to gauge the reliability of a signal.
                    </p>
                    <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                        <div className="absolute top-0 left-0 h-full w-1/3 bg-red-500"></div>
                        <div className="absolute top-0 left-1/3 h-full w-1/3 bg-yellow-500"></div>
                        <div className="absolute top-0 left-2/3 h-full w-1/3 bg-green-500"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low (&lt;50)</span>
                        <span>Medium (50-80)</span>
                        <span>High (&gt;80)</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Help;
