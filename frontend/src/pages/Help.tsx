import {
    Activity, BarChart2, ShieldCheck,
    TrendingUp, Clock, Users, History, Maximize
} from 'lucide-react';

const Help: React.FC = () => {
    return (
        <div className="space-y-12">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    Understanding Whaleradarr
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    A guide to interpreting Institutional Order Flow, Sentiment Divergences, and the risk metrics used in our analysis engine.
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Z-Score */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-blue-500/30 transition-colors shadow-sm">
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
                            <span>Extremely Bullish (Top 2.5% of history)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-blue-500 font-bold">0.0</span>
                            <span>Average / Neutral positioning</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-red-500 font-bold">&lt; -2.0</span>
                            <span>Extremely Bearish (Bottom 2.5% of history)</span>
                        </li>
                    </ul>
                </div>

                {/* COT Index */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-emerald-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <TrendingUp size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">COT Index (0-100)</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        A percentile ranking of the current net position against the specified historical range (e.g. 3 years).
                    </p>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-green-500 font-bold">100%</span>
                            <span>Institutions are at their maximally Long net position</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-yellow-500 font-bold">50%</span>
                            <span>Neutral / Middle of the historical range</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-mono text-red-500 font-bold">0%</span>
                            <span>Institutions are at their maximally Short net position</span>
                        </li>
                    </ul>
                </div>

                {/* Sentiment Gap & Convergence */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-purple-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-500">
                            <Users size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Sentiment Analysis</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Tracking the divergence between the "Smart Money" (Whales) and Retail speculators.
                    </p>
                    <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Whale/Retail Gap</span>
                            <span>Calculated as (Asset Mgr % Long) - (Retail % Long). A gap &gt; 30% indicates significant divergence.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Institutional Convergence</span>
                            <span>When both <b>Asset Managers</b> and <b>Leveraged Funds</b> are positioned on the same side, signal confidence increases.</span>
                        </li>
                    </ul>
                </div>

                {/* Price Distance & Risk */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-orange-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-orange-500/20 text-orange-500">
                            <Maximize size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Price Distance (Risk)</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Measures how far the price has deviated from the institutional average (VWAP), adjusted for volatility.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-green-500">Safe (&lt; 1&sigma;)</span>
                            <span>Optimal entry zone; price is near institutional value.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-yellow-500">Extended (&gt; 1&sigma;)</span>
                            <span>Caution recommended; risk of a mean-reversion pull-back.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="font-bold text-red-500">Danger (&gt; 2&sigma;)</span>
                            <span>Overextended; extreme risk of retracement. Avoid chasing.</span>
                        </li>
                    </ul>
                </div>

                {/* Historical Edge */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-pink-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-pink-500/20 text-pink-500">
                            <History size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Historical Edge</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Real-time backtest engine that calculates the statistical probability of a signal based on last 5 years of data.
                    </p>
                    <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Win Rate</span>
                            <span>The % of times price moved in the signal direction over the following 4 weeks.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Sample Size</span>
                            <span>The number of times this specific sentiment threshold was triggered in history.</span>
                        </li>
                    </ul>
                </div>

                {/* Weekly Changes & Position Flow */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-emerald-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <Activity size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Weekly Position Flow</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Tracks the Week-over-Week (WoW) change in positions for key market participants.
                    </p>
                    <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Asset Managers (Whales)</span>
                            <span>Pension Funds and Sovereign Wealth. Represent long-term strategic value.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Leveraged Funds (Speculators)</span>
                            <span>Hedge Funds and CTA's. Fast money that often drives short-term trends.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Non-Reportable (Retail)</span>
                            <span>Small speculators. Often used as a contrarian indicator at extremes.</span>
                        </li>
                    </ul>
                </div>

                {/* Alert Confidence */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-amber-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-amber-500/20 text-amber-500">
                            <ShieldCheck size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Confidence Score</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        A proprietary algorithm that combines Z-Score, COT Index, Sentiment Gap, and Price Context.
                    </p>
                    <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4 shadow-inner">
                        <div className="absolute top-0 left-0 h-full w-1/3 bg-red-500 opacity-80"></div>
                        <div className="absolute top-0 left-1/3 h-full w-1/3 bg-yellow-500 opacity-80"></div>
                        <div className="absolute top-0 left-2/3 h-full w-1/3 bg-green-500 opacity-80"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low (&lt;40)</span>
                        <span>Mid (40-75)</span>
                        <span>High (&gt;75)</span>
                    </div>
                </div>

                {/* Execution Timing */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 space-y-4 hover:border-indigo-500/30 transition-colors shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-500">
                            <Clock size={24} />
                        </div>
                        <h2 className="text-2xl font-bold">Execution Timing</h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Technical sentiment signals that identify entry/exit zones using RSI, EMAs, and Trend momentum.
                    </p>
                    <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-black/20 p-4 rounded-lg">
                        <li className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold">Entry Zone</span>
                                <span className="text-xs text-gray-400">(Bullish Trend + Value)</span>
                            </div>
                            <span>Price is above long-term EMAs while technical oscillators indicate a return to value.</span>
                        </li>
                        <li className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-bold">Exit Zone</span>
                                <span className="text-xs text-gray-400">(Exhaustion Signal)</span>
                            </div>
                            <span>Positions are at extremes and technical momentum is starting to rollover.</span>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default Help;
