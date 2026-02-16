import React, { useMemo, useState } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface HistoricalReport {
    report_date: string;
    dealer_net: number;
    asset_mgr_net: number;
    lev_net: number;
    open_interest: number;
}

interface PriceHistory {
    report_date: string;
    open_price?: number;
    high_price?: number;
    low_price?: number;
    close_price: number;
}

interface AdvancedPriceChartProps {
    reports: HistoricalReport[];
    prices: PriceHistory[];
    contractName: string;
    currentContractId: number;
    allContracts: { id: number; contract_name: string }[];
}

const METRICS = [
    { key: 'asset_mgr_net', label: 'Asset Mgr Net', color: '#10B981', type: 'area' },
    { key: 'lev_net', label: 'Leveraged Funds Net', color: '#F59E0B', type: 'line' },
    { key: 'dealer_net', label: 'Dealer Net', color: '#3B82F6', type: 'line' },
    { key: 'open_interest', label: 'Open Interest', color: '#8B5CF6', type: 'line' }
];

const CandleShape = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, close, high, low } = payload;

    // Safety check
    if (open === undefined || close === undefined || high === undefined || low === undefined) return null;

    const isUp = close > open;
    const color = isUp ? '#10B981' : '#EF4444'; // Green / Red

    // Calculate coordinates
    // y is the top position (high value)
    // height is the total height (high - low)
    // We need to map open and close within this range

    const range = high - low;
    if (range === 0) return null;

    const pixelPerUnit = height / range;

    const openOffset = (high - open) * pixelPerUnit;
    const closeOffset = (high - close) * pixelPerUnit;

    const bodyTop = y + Math.min(openOffset, closeOffset);
    const bodyHeight = Math.abs(openOffset - closeOffset);

    // Ensure body has at least 1px height
    const effectiveBodyHeight = Math.max(1, bodyHeight);

    // Wick center x
    const wickX = x + width / 2;

    return (
        <g>
            {/* Wick */}
            <line x1={wickX} y1={y} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
            {/* Body */}
            <rect
                x={x}
                y={bodyTop}
                width={width}
                height={effectiveBodyHeight}
                fill={color}
                stroke={color} // Add stroke to prevent anti-aliasing gaps
            />
        </g>
    );
};

const AdvancedPriceChart: React.FC<AdvancedPriceChartProps> = ({
    reports,
    prices,
    contractName,
    currentContractId,
    allContracts
}) => {
    const [timeRange, setTimeRange] = useState<number>(3); // Default 3 years
    const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(['asset_mgr_net', 'lev_net']));
    const [selectedCorrelationId, setSelectedCorrelationId] = useState<number | null>(null);
    const [correlationData, setCorrelationData] = useState<PriceHistory[] | null>(null);
    const [loadingCorrelation, setLoadingCorrelation] = useState(false);

    // Fetch correlation data when a contract is selected
    React.useEffect(() => {
        if (!selectedCorrelationId) {
            setCorrelationData(null);
            return;
        }

        const fetchCorrelation = async () => {
            try {
                setLoadingCorrelation(true);
                const response = await fetch(`http://localhost:8000/api/v1/contracts/${selectedCorrelationId}/history?weeks_back=500`);
                if (response.ok) {
                    const data = await response.json();
                    setCorrelationData(data.price_history || []);
                } else {
                    console.warn('Failed to fetch correlation data');
                    setCorrelationData(null);
                }
            } catch (error) {
                console.error('Error fetching correlation:', error);
                setCorrelationData(null);
            } finally {
                setLoadingCorrelation(false);
            }
        };

        fetchCorrelation();
    }, [selectedCorrelationId]);

    const toggleMetric = (key: string) => {
        const newSet = new Set(selectedMetrics);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedMetrics(newSet);
    };

    const chartData = useMemo(() => {
        // Map prices by date
        const priceMap = new Map();
        prices.forEach((p: PriceHistory) => {
            const d = p.report_date.split('T')[0];
            priceMap.set(d, p);
        });

        // Map correlation data
        const corrMap = new Map();
        if (correlationData) {
            correlationData.forEach((p: PriceHistory) => {
                const d = p.report_date.split('T')[0];
                corrMap.set(d, p.close_price);
            });
        }

        // Combined data
        const data = reports.map(report => {
            const dateStr = report.report_date.split('T')[0];
            const p = priceMap.get(dateStr);
            const corrPrice = corrMap.get(dateStr);

            // Check if we have OHLC, otherwise fallback to close for all
            const hasOHLC = p?.open_price !== undefined;
            const open = hasOHLC ? p.open_price : p?.close_price;
            const high = hasOHLC ? p.high_price : p?.close_price;
            const low = hasOHLC ? p.low_price : p?.close_price;
            const close = p?.close_price;

            return {
                date: dateStr,
                displayDate: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                timestamp: new Date(dateStr).getTime(),

                // Candle Data
                open, high, low, close,
                priceRange: [low, high], // For Bar chart range

                // Metrics
                asset_mgr_net: report.asset_mgr_net,
                lev_net: report.lev_net,
                dealer_net: report.dealer_net,
                open_interest: report.open_interest,

                // Correlation
                correlationPrice: corrPrice
            };
        });

        // Filter time range
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - timeRange);
        const cutoffTimestamp = cutoffDate.getTime();

        return data
            .filter(d => d.timestamp >= cutoffTimestamp)
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [reports, prices, timeRange, correlationData]);

    if (!chartData || chartData.length === 0) {
        return <div className="text-gray-500 text-center py-8">No data available for chart.</div>;
    }

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex flex-col xl:flex-row items-start justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Price vs. Positions
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Overlay institutional positioning on {contractName} price action.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
                    {/* Time Range */}
                    <div className="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                        {[1, 3, 5, 10].map(yr => (
                            <button
                                key={yr}
                                onClick={() => setTimeRange(yr)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === yr
                                    ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {yr}Y
                            </button>
                        ))}
                    </div>

                    {/* Metrics Toggles */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {METRICS.map(m => (
                            <button
                                key={m.key}
                                onClick={() => toggleMetric(m.key)}
                                className={`px-2 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 ${selectedMetrics.has(m.key)
                                    ? ''
                                    : 'opacity-50 grayscale border-transparent bg-gray-100 dark:bg-white/5'
                                    }`}
                                style={{
                                    borderColor: selectedMetrics.has(m.key) ? m.color : 'transparent',
                                    backgroundColor: selectedMetrics.has(m.key) ? `${m.color}20` : undefined,
                                    color: m.color
                                }}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></span>
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Correlation Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Overlay:</span>
                        <select
                            value={selectedCorrelationId || ''}
                            onChange={(e) => setSelectedCorrelationId(e.target.value ? Number(e.target.value) : null)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
                            disabled={loadingCorrelation}
                        >
                            <option value="">None</option>
                            {allContracts
                                .filter(c => c.id !== currentContractId)
                                .map(contract => (
                                    <option key={contract.id} value={contract.id}>
                                        {contract.contract_name}
                                    </option>
                                ))}
                        </select>
                        {loadingCorrelation && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}
                    </div>
                </div>
            </div>

            <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#9CA3AF"
                            tick={{ fontSize: 11 }}
                            minTickGap={30}
                        />
                        {/* Left Axis: Positions */}
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'}
                            stroke="#9CA3AF"
                        />
                        {/* Right Axis: Price */}
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            scale="auto"
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 11, fill: '#3B82F6' }}
                            stroke="#3B82F6"
                            width={50}
                        />

                        {/* Macro Axis (Hidden but used for scaling) */}
                        {correlationData && correlationData.length > 0 && (
                            <YAxis
                                yAxisId="macro"
                                orientation="right"
                                scale="auto"
                                domain={['auto', 'auto']}
                                hide={true} // Hide axis to avoid clutter, just overlay line
                            />
                        )}

                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                            formatter={(value: number, name: string) => {
                                // Find matching metric label
                                const m = METRICS.find(met => met.key === name);
                                const label = m ? m.label : name;

                                if (name === 'priceRange') return [null, null]; // Hide range array
                                if (name === 'open' || name === 'close' || name === 'high' || name === 'low') return [value, name];
                                if (name === 'correlationPrice') {
                                    const selectedContract = allContracts.find(c => c.id === selectedCorrelationId);
                                    return [value, `🔗 ${selectedContract?.contract_name || 'Correlation'}`];
                                }

                                return [Math.round(value).toLocaleString(), label];
                            }}
                            labelFormatter={(label) => `${label}`}
                        />

                        {/* Candlesticks (Price) */}
                        <Bar
                            yAxisId="right"
                            dataKey="priceRange"
                            fill="#8884d8"
                            shape={<CandleShape />}
                            isAnimationActive={false}
                        />

                        {/* Selected Metrics */}
                        {METRICS.map(m => selectedMetrics.has(m.key) && (
                            <Line
                                key={m.key}
                                yAxisId="left"
                                type="monotone"
                                dataKey={m.key}
                                stroke={m.color}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                            />
                        ))}

                        {/* Correlation Line */}
                        {correlationData && correlationData.length > 0 && (
                            <Line
                                yAxisId="macro"
                                type="monotone"
                                dataKey="correlationPrice"
                                stroke="#F97316" // Orange
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                                name="correlationPrice"
                            />
                        )}

                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default AdvancedPriceChart;
