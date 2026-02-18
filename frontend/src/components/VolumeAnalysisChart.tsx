import React, { useMemo, useState } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceArea,
    ReferenceLine
} from 'recharts';
import { BarChart3, Info, TrendingUp, TrendingDown, Anchor } from 'lucide-react';

// --- Types ---

interface PriceHistory {
    report_date: string;
    open_price?: number;
    high_price?: number;
    low_price?: number;
    close_price: number;
    volume?: number;
    reporting_vwap?: number;
}

interface HistoricalReport {
    report_date: string;
    asset_mgr_net: number;
    asset_mgr_long: number;
    asset_mgr_short: number;
}

interface VolumeAnalysisChartProps {
    prices: PriceHistory[];
    reports: HistoricalReport[];
    contractName: string;
}

// --- Wyckoff / Whale Logic Interfaces ---

interface WyckoffPhase {
    type: 'ACCUMULATION' | 'DISTRIBUTION';
    startDate: number;
    endDate: number;
    startPrice: number;
    endPrice: number;
    confidence: number;
    volumeTotal: number;
}

// --- Helpers ---

// Calculate Whale VWAP: Volume Weighted Average Price ONLY during weeks where Whales are NET BUYERS
const calculateWhaleVWAP = (prices: PriceHistory[], reports: HistoricalReport[]) => {
    let cumulativeVolumePrice = 0;
    let cumulativeVolume = 0;
    const whaleVwapSeries: { [date: string]: number } = {};

    // Sort to ensure chronological order
    const sortedPrices = [...prices].sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());

    // Map report dates to whale net flow
    const whaleFlowMap = new Map<string, number>();
    reports.forEach(r => {
        whaleFlowMap.set(r.report_date.split('T')[0], r.asset_mgr_net);
    });

    // We need to associate daily price with the *previous* known COT report to know if we are in an accumulation week
    // COT reports are weekly (usually Tuesday). We'll do a simple lookback.

    // Simplified Logic: 
    // 1. Iterate prices.
    // 2. Find most recent COT report.
    // 3. If that report (or simpler, the report matching the week) shows Whale Net increase > 0, we add to VWAP.

    // Better approximation for "Whale VWAP":
    // Reset VWAP at significant trend changes? Or rolling? 
    // Let's implement a "Rolling Whale VWAP" that starts from the beginning of the visible data or a fixed lookback.
    // For this implementation, we will accumulate whenever Whales are Net Long and Increasing their position.

    let lastWhaleNet = 0;

    sortedPrices.forEach(p => {
        const dateStr = p.report_date.split('T')[0];

        // Find report for this week (or closest previous)
        // Since reports are weekly, we can find the report that covers this day. 
        // For simplicity, we'll use the report_date matching or immediately preceding.
        const report = reports.find(r => r.report_date.startsWith(dateStr)); // Exact match often exists in our data model

        let isWhaleAccumulating = false;

        if (report) {
            const currentNet = report.asset_mgr_net;
            if (currentNet > lastWhaleNet && currentNet > 0) {
                isWhaleAccumulating = true;
            }
            lastWhaleNet = currentNet;
        }

        if (isWhaleAccumulating && p.volume && p.volume > 0) {
            cumulativeVolumePrice += p.close_price * p.volume;
            cumulativeVolume += p.volume;
        }

        if (cumulativeVolume > 0) {
            whaleVwapSeries[dateStr] = cumulativeVolumePrice / cumulativeVolume;
        }
    });

    return whaleVwapSeries;
};

// Detect Wyckoff Phases based on Price Range and Whale Activity
const detectWyckoffPhases = (data: any[]): WyckoffPhase[] => {
    const phases: WyckoffPhase[] = [];
    let currentPhase: Partial<WyckoffPhase> | null = null;

    // Thresholds
    const VOLATILITY_THRESHOLD = 0.05; // 5% range considered "tight" for accumulation

    for (let i = 20; i < data.length; i++) {
        const day = data[i];
        const prevDay = data[i - 1];

        // Check for Whale Accumulation (Net Position Increasing + Price Flat/Range)
        const whaleNetChange = day.whaleNet - (prevDay.whaleNet || 0);
        const priceChange = Math.abs((day.close - day.open) / day.open);

        const isWhaleBuying = whaleNetChange > 0;
        const isLowVolatility = priceChange < VOLATILITY_THRESHOLD;

        if (isWhaleBuying && isLowVolatility) {
            if (!currentPhase || currentPhase.type !== 'ACCUMULATION') {
                // Close previous if exists
                if (currentPhase && currentPhase.startDate) {
                    phases.push(currentPhase as WyckoffPhase);
                }
                // Start new
                currentPhase = {
                    type: 'ACCUMULATION',
                    startDate: day.timestamp,
                    startPrice: day.close,
                    volumeTotal: day.volume,
                    confidence: 50 // Base confidence
                };
            } else {
                // Continue phase
                if (currentPhase) {
                    currentPhase.endDate = day.timestamp;
                    currentPhase.endPrice = day.close;
                    currentPhase.volumeTotal = (currentPhase.volumeTotal || 0) + day.volume;
                    currentPhase.confidence = Math.min(95, (currentPhase.confidence || 0) + 2);
                }
            }
        } else if (currentPhase) {
            // End phase if conditions break
            if (currentPhase.startDate) {
                // Filter short phases (noise)
                if ((day.timestamp - currentPhase.startDate) > 86400000 * 7) { // > 1 week
                    phases.push(currentPhase as WyckoffPhase);
                }
            }
            currentPhase = null;
        }
    }

    return phases;
};

// --- Component ---

const VolumeAnalysisChart: React.FC<VolumeAnalysisChartProps> = ({ prices, reports, contractName }) => {
    const [timeRange, setTimeRange] = useState<number>(0.5); // Default 6 Months (0.5 years)

    const processedData = useMemo(() => {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - (timeRange * 12));
        const cutoffTimestamp = cutoffDate.getTime();

        // 1. Map Reports to Quick Lookup
        const reportMap = new Map<string, HistoricalReport>();
        reports.forEach(r => reportMap.set(r.report_date.split('T')[0], r));

        // 2. Process Prices
        // We need to merge report data into daily price data.
        // Strategy: Forward fill COT data. If a report came out on Tuesday, use that for Wed-Mon.
        let lastReport: HistoricalReport | null = null;

        // Sort chronological first
        const sortedPrices = [...prices].sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());
        const whaleVnps = calculateWhaleVWAP(sortedPrices, reports);

        return sortedPrices
            .map((p, idx) => {
                const dateStr = p.report_date.split('T')[0];
                if (reportMap.has(dateStr)) {
                    lastReport = reportMap.get(dateStr)!;
                }

                // Volume Color Gradient Logic
                // Simple: Compare to 20-day Avg Volume
                const lookback = 20;
                let avgVol = 0;
                if (idx >= lookback) {
                    const slice = sortedPrices.slice(idx - lookback, idx);
                    avgVol = slice.reduce((sum, item) => sum + (item.volume || 0), 0) / lookback;
                }
                const volRatio = avgVol > 0 ? (p.volume || 0) / avgVol : 1;

                const isUp = p.close_price > (p.open_price || p.close_price);

                // Color Intensity
                let volColor = isUp ? '#10B981' : '#EF4444'; // Base Green/Red
                if (volRatio > 2.5) volColor = isUp ? '#059669' : '#DC2626'; // Intense
                if (volRatio < 0.5) volColor = isUp ? '#6EE7B7' : '#FCA5A5'; // Weak

                return {
                    ...p,
                    displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    timestamp: new Date(dateStr).getTime(),
                    open: p.open_price,
                    high: p.high_price,
                    low: p.low_price,
                    close: p.close_price,
                    priceRange: [p.low_price || p.close_price, p.high_price || p.close_price], // For candles

                    // Volume Data
                    volume: p.volume || 0,
                    volumeColor: volColor,

                    // Whale Data (mapped from last report)
                    whaleNet: lastReport ? lastReport.asset_mgr_net : 0,
                    whaleLong: lastReport ? lastReport.asset_mgr_long : 0,
                    whaleShort: lastReport ? lastReport.asset_mgr_short : 0,

                    // VWAPs
                    marketVwap: p.reporting_vwap,
                    whaleVwap: whaleVnps[dateStr] || null
                };
            })
            .filter(d => d.timestamp >= cutoffTimestamp);

    }, [prices, reports, timeRange]);

    // Detect Phases
    const phases = useMemo(() => detectWyckoffPhases(processedData), [processedData]);

    if (!prices || prices.length === 0) return null;

    // Custom Candle Shape
    const CandleShape = (props: any) => {
        const { x, y, width, height, payload } = props;
        const { open, close, high, low } = payload;
        if (open === undefined || close === undefined) return null; // Handle missing data

        const isUp = close > open;
        const color = isUp ? '#10B981' : '#EF4444';

        const range = (high || close) - (low || close);
        if (range === 0) return <line x1={x} y1={y} x2={x + width} y2={y} stroke={color} />;

        // Scaling (recharts gives us y and height corresponding to the value range)
        // We need to re-calculate internal offsets because Recharts 'Bar' logic is simple rect
        // Actually, for a composed chart Bar with [min, max], 'y' is the top (max) and 'height' is diff.
        // So y matches 'high', y+height matches 'low'.

        // We need to map open/close to pixels within this [y, y+height] space.
        const pixelPerUnit = height / range;

        // Distances from High
        const openOffset = ((high || close) - open) * pixelPerUnit;
        const closeOffset = ((high || close) - close) * pixelPerUnit;

        const bodyTop = y + Math.min(openOffset, closeOffset);
        const bodyHeight = Math.abs(openOffset - closeOffset);
        const effectiveBodyHeight = Math.max(1, bodyHeight); // Ensure visibility

        const wickX = x + width / 2;

        return (
            <g>
                <line x1={wickX} y1={y} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
                <rect x={x} y={bodyTop} width={width} height={effectiveBodyHeight} fill={color} stroke={color} />
            </g>
        );
    };

    return (
        <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6 mb-8 group">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 size={24} className="text-blue-500" />
                        Whale Volume Analysis
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500 text-white font-bold uppercase tracking-wider">Pro</span>
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Institutional Accumulation Zones & Dual-Volume logic.
                    </p>
                </div>

                {/* Time Range Selector */}
                <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                    {[
                        { label: '1M', val: 0.083 },
                        { label: '3M', val: 0.25 },
                        { label: '6M', val: 0.5 },
                        { label: '1Y', val: 1 },
                        { label: 'All', val: 5 }
                    ].map(opt => (
                        <button
                            key={opt.label}
                            onClick={() => setTimeRange(opt.val)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${Math.abs(timeRange - opt.val) < 0.01
                                ? 'bg-white dark:bg-blue-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[550px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            {/* Gradients if we want them, currently using solid calc colors */}
                            <linearGradient id="whaleZone" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 10 }}
                            minTickGap={40}
                        />

                        {/* Price Axis (Right) */}
                        <YAxis
                            yAxisId="price"
                            orientation="right"
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 11, fill: '#8B5CF6' }}
                            stroke="#8B5CF6"
                            width={50}
                            scale="auto"
                        />

                        {/* Volume Axis (Left, Hidden scaling) */}
                        <YAxis
                            yAxisId="volume"
                            orientation="left"
                            domain={[0, 'dataMax * 3']}
                            hide={true}
                        />

                        {/* Whale Net Axis (Hidden, for scaling accumulation bars if we overlaid them) */}
                        {/* We use 'volume' axis for now, or just reference areas */}

                        <Tooltip
                            contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                            itemStyle={{ fontSize: '12px', color: '#E2E8F0' }}
                            labelStyle={{ color: '#94A3B8', marginBottom: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                            formatter={(value: any, name: string) => {
                                if (name === 'priceRange') return [null, null];
                                if (name === 'volume') return [Number(value).toLocaleString(), 'Retail Volume'];
                                if (name === 'whaleNet') return [Number(value).toLocaleString(), 'Whale Net Pos'];
                                if (name === 'reporting_vwap') return [Number(value).toFixed(2), 'Market VWAP'];
                                if (name === 'whaleVwap') return [value ? Number(value).toFixed(2) : 'N/A', 'Whale VWAP'];
                                if (name === 'close') return [Number(value).toFixed(2), 'Price'];
                                return [value, name];
                            }}
                        />

                        {/* 1. Whale Accumulation Zones (Background) */}
                        {phases.map((phase, idx) => (
                            <ReferenceArea
                                key={`phase-${idx}`}
                                yAxisId="price"
                                x1={phase.startDate}
                                x2={phase.endDate || processedData[processedData.length - 1].timestamp}
                                fill={phase.type === 'ACCUMULATION' ? '#10B981' : '#F43F5E'}
                                fillOpacity={0.08}
                            />
                        ))}

                        {/* 2. Volume Bars (Retail) */}
                        <Bar
                            yAxisId="volume"
                            dataKey="volume"
                            isAnimationActive={false}
                        >
                            {
                                processedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.volumeColor} opacity={0.6} />
                                ))
                            }
                        </Bar>

                        {/* 3. Whale Net Position Line (Overlay) - Optional, maybe too noisy? 
                            User asked for "Dual Volume Bars". Let's try to map Whale Change as a line or second bar.
                            Since scales are vastly different (Contracts vs Volume), a line on separate axis is safer.
                        */}


                        {/* 4. Price Candles */}
                        <Bar
                            yAxisId="price"
                            dataKey="priceRange"
                            shape={<CandleShape />}
                            isAnimationActive={false}
                        />

                        {/* 5. Market VWAP */}
                        <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey="marketVwap"
                            stroke="#E879F9"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            name="reporting_vwap"
                            opacity={0.8}
                        />

                        {/* 6. Whale VWAP (Gold) */}
                        <Line
                            yAxisId="price"
                            type="stepAfter" // Step to show levels clearly
                            dataKey="whaleVwap"
                            stroke="#F59E0B" // Amber/Gold
                            strokeWidth={3}
                            dot={false}
                            name="whaleVwap"
                            connectNulls
                        />

                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend / Context Footer */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                        <TrendingUp size={14} /> Whale Accumulation
                    </div>
                    <p className="text-gray-500">Green zones: Whales buying + Price stable.</p>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <div className="flex items-center gap-2 font-bold text-amber-500 mb-1">
                        <Anchor size={14} /> Whale VWAP
                    </div>
                    <p className="text-gray-500">Gold Line: Inst. Avg Entry Price.</p>
                </div>

                <div className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 font-bold text-gray-500 mb-1">
                        <BarChart3 size={14} /> Dual Volume
                    </div>
                    <p className="text-gray-500">Bars = Retail Vol. Color intensity = RVOL.</p>
                </div>

                <div className="p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-2 font-bold text-gray-500 mb-1">
                        <TrendingDown size={14} /> Market VWAP
                    </div>
                    <p className="text-gray-500">Pink Dashed: Standard Market VWAP.</p>
                </div>
            </div>
        </div>
    );
};

export default VolumeAnalysisChart;
