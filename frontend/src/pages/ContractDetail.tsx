import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SeasonalityChart from '../components/SeasonalityChart';
import FullReportsTable from '../components/FullReportsTable';
import PriceCorrelationChart from '../components/PriceCorrelationChart';


interface HistoricalReport {
    report_date: string;
    dealer_long: number;
    dealer_short: number;
    dealer_net: number;
    asset_mgr_long: number;
    asset_mgr_short: number;
    asset_mgr_net: number;
    lev_long: number;
    lev_short: number;
    lev_net: number;
    open_interest: number;
}

interface HistoricalAlert {
    id: number;
    report_date: string;
    alert_level: string;
    z_score: number | null;
    cot_index: number | null;
    price_context: string;
    confidence_score: number | null;
}

interface PriceHistory {
    report_date: string;
    close_price: number;
    reporting_vwap: number | null;
    close_vs_vwap_pct: number | null;
}

interface ContractHistory {
    contract_id: number;
    contract_name: string;
    historical_reports: HistoricalReport[];
    historical_alerts: HistoricalAlert[];
    price_history: PriceHistory[];
}

const ContractDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ContractHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchContractHistory = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:8000/api/v1/contracts/${id}/history`);
                if (!response.ok) throw new Error('Failed to fetch contract history');
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchContractHistory();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Activity className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading contract details...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">Error: {error || 'No data found'}</p>
                    <Link to="/" className="text-blue-500 hover:underline">← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    // Prepare chart data (reverse to show chronologically)
    const chartData = [...data.historical_reports].reverse().map(report => ({
        date: new Date(report.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dealer: report.dealer_net,
        assetMgr: report.asset_mgr_net,
        leveraged: report.lev_net,
    }));

    const priceData = [...data.price_history].reverse().map(price => ({
        date: new Date(price.report_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: price.close_price,
        vwap: price.reporting_vwap,
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mb-4">
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        {data.contract_name}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Historical COT Positions & Price Analysis
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Alerts</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.historical_alerts.length}</p>
                            </div>
                            <Activity className="text-blue-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">High Alerts</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                    {data.historical_alerts.filter(a => a.alert_level === 'High').length}
                                </p>
                            </div>
                            <TrendingUp className="text-red-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Data Points</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.historical_reports.length}</p>
                            </div>
                            <TrendingDown className="text-green-500" size={32} />
                        </div>
                    </div>
                </div>

                {/* COT Positions Chart */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Net Positions Over Time
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                            <XAxis
                                dataKey="date"
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#F3F4F6'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="dealer"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                name="Dealer Net"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="assetMgr"
                                stroke="#10B981"
                                strokeWidth={2}
                                name="Asset Manager Net"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="leveraged"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                name="Leveraged Funds Net"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Price History Chart */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Price & VWAP History
                    </h2>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={priceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                            <XAxis
                                dataKey="date"
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '8px',
                                    color: '#F3F4F6'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="price"
                                stroke="#8B5CF6"
                                strokeWidth={2}
                                name="Close Price"
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="vwap"
                                stroke="#EC4899"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="VWAP"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Alerts Table */}
                <div className="bg-white dark:bg-black/40 backdrop-blur-md rounded-xl border border-gray-200 dark:border-white/10 p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Recent Alerts
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-300">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Level</th>
                                    <th className="px-6 py-4">Z-Score</th>
                                    <th className="px-6 py-4">Context</th>
                                    <th className="px-6 py-4">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {data.historical_alerts.slice(0, 10).map((alert) => (
                                    <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                                            {new Date(alert.report_date).toLocaleDateString('it-IT')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${alert.alert_level === 'High' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                                                alert.alert_level === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                                    'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                                                }`}>
                                                {alert.alert_level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                                            {alert.z_score?.toFixed(2) || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {alert.price_context || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-semibold">
                                            {alert.confidence_score?.toFixed(0)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Price Correlation Chart */}
                <PriceCorrelationChart
                    reports={data.historical_reports}
                    prices={data.price_history}
                    contractName={data.contract_name}
                />

                {/* Seasonality Chart */}
                <SeasonalityChart contractId={data.contract_id} />

                {/* Full Historical Reports */}
                <FullReportsTable contractId={data.contract_id} />
            </div>
        </div>
    );
};

export default ContractDetail;
