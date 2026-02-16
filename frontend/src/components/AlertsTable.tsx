import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WhaleAlert } from '../types/api';
import { ArrowUpRight, ArrowDownRight, Activity, ChevronDown, ChevronUp, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AlertsTableProps {
    alerts: WhaleAlert[];
}

const AlertsTable: React.FC<AlertsTableProps> = ({ alerts }) => {
    const [expandedAlerts, setExpandedAlerts] = useState<number[]>([]);

    const toggleExpand = (id: number) => {
        setExpandedAlerts(prev =>
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'High': return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 border-red-500/50';
            case 'Medium': return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-yellow-500/50';
            case 'Low': return 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500 border-green-500/50';
            default: return 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-500 border-gray-500/50';
        }
    };

    const formatChange = (change: number, current: number) => {
        if (!change) return '0';
        const previous = current - change;

        // Handle case where previous value was 0
        if (previous === 0) {
            const sign = change > 0 ? '+' : '';
            return `${sign}${change.toLocaleString()} (100%)`;
        }

        const percent = ((change / previous) * 100).toFixed(1);
        const sign = change > 0 ? '+' : '';
        return `${sign}${change.toLocaleString()} (${sign}${percent}%)`;
    };

    const getChangeColor = (val: number) => {
        if (val > 0) return 'text-green-600 dark:text-green-400';
        if (val < 0) return 'text-red-600 dark:text-red-400';
        return 'text-gray-500 dark:text-gray-400';
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-md shadow-sm dark:shadow-none">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-300">
                    <tr>
                        <th className="px-6 py-4 font-semibold w-8"></th>
                        <th className="px-6 py-4 font-semibold">Contract</th>
                        <th className="px-6 py-4 font-semibold">Signal</th>
                        <th className="px-6 py-4 font-semibold">Timing</th>
                        <th className="px-6 py-4 font-semibold">Z-Score</th>
                        <th className="px-6 py-4 font-semibold">Context</th>
                        <th className="px-6 py-4 font-semibold text-right">Confidence</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {alerts.map((alert) => (
                        <React.Fragment key={alert.id}>
                            <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggleExpand(alert.id)}>
                                <td className="px-6 py-4 text-center">
                                    {expandedAlerts.includes(alert.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </td>
                                <td className="px-6 py-4">
                                    <Link
                                        to={`/contract/${alert.contract_id}`}
                                        className="text-gray-900 dark:text-white font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {alert.contract_name || `Contract #${alert.contract_id}`}
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getLevelColor(alert.alert_level)}`}>
                                        {alert.alert_level}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {alert.technical_signal && alert.technical_context ? (
                                        <div className="flex items-center gap-2">
                                            <div className="group relative">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium $
                                                    {alert.technical_signal.includes('Entry') ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                                                     alert.technical_signal.includes('Exit') ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                                                     'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400'}`}>
                                                    <Clock size={12} />
                                                    {alert.technical_signal}
                                                </span>
                                                {/* Tooltip */}
                                                <div className="absolute left-0 top-full mt-2 w-48 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300">RSI:</span>
                                                            <span className="font-semibold">{alert.technical_context.rsi?.toFixed(1) || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-300">Trend:</span>
                                                            <span className="flex items-center gap-1 font-semibold">
                                                                {alert.technical_context.trend === 'bullish' && <TrendingUp size={12} className="text-green-400" />}
                                                                {alert.technical_context.trend === 'bearish' && <TrendingDown size={12} className="text-red-400" />}
                                                                {alert.technical_context.trend === 'neutral' && <Minus size={12} className="text-gray-400" />}
                                                                {alert.technical_context.trend || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-300">EMA 50:</span>
                                                            <span className="font-semibold">{alert.technical_context.ema_50 || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Loading...</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono font-bold ${(alert.z_score || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {typeof alert.z_score === 'number' ? alert.z_score.toFixed(2) : 'N/A'}
                                        </span>
                                        {(alert.z_score || 0) > 0 ? <ArrowUpRight size={14} className="text-green-600 dark:text-green-400" /> : <ArrowDownRight size={14} className="text-red-600 dark:text-red-400" />}

                                        {/* Delta Indicator */}
                                        {alert.z_score_delta !== undefined && alert.z_score_delta !== null && (
                                            <span className={`text-xs ml-1 font-medium ${alert.z_score_delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                ({alert.z_score_delta > 0 ? '+' : ''}{alert.z_score_delta.toFixed(2)})
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-700 dark:text-gray-300">{alert.price_context || '-'}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-gray-900 dark:text-white font-semibold">{alert.confidence_score}%</span>
                                        <Activity size={14} className="text-blue-500 dark:text-blue-400" />
                                    </div>
                                </td>
                            </tr>

                            {/* Expanded Details Row */}
                            {expandedAlerts.includes(alert.id) && alert.report && (
                                <tr className="bg-gray-50/50 dark:bg-white/5">
                                    <td colSpan={7} className="px-6 py-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Dealer Positions */}
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Dealer / Intermediary</h4>
                                                <div className="grid grid-cols-2 gap-4 bg-white dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-white/10">
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Long</span>
                                                        <div className="font-mono text-gray-900 dark:text-white font-medium">
                                                            {alert.report.dealer_long.toLocaleString()}
                                                        </div>
                                                        <span className={`text-xs font-mono font-medium ${getChangeColor(alert.report.dealer_long_chg)}`}>
                                                            {formatChange(alert.report.dealer_long_chg, alert.report.dealer_long)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Short</span>
                                                        <div className="font-mono text-gray-900 dark:text-white font-medium">
                                                            {alert.report.dealer_short.toLocaleString()}
                                                        </div>
                                                        <span className={`text-xs font-mono font-medium ${getChangeColor(alert.report.dealer_short_chg)}`}>
                                                            {formatChange(alert.report.dealer_short_chg, alert.report.dealer_short)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Asset Manager Positions */}
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Asset Manager</h4>
                                                <div className="grid grid-cols-2 gap-4 bg-white dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-white/10">
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Long</span>
                                                        <div className="font-mono text-gray-900 dark:text-white font-medium">
                                                            {alert.report.asset_mgr_long.toLocaleString()}
                                                        </div>
                                                        <span className={`text-xs font-mono font-medium ${getChangeColor(alert.report.asset_mgr_long_chg)}`}>
                                                            {formatChange(alert.report.asset_mgr_long_chg, alert.report.asset_mgr_long)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Short</span>
                                                        <div className="font-mono text-gray-900 dark:text-white font-medium">
                                                            {alert.report.asset_mgr_short.toLocaleString()}
                                                        </div>
                                                        <span className={`text-xs font-mono font-medium ${getChangeColor(alert.report.asset_mgr_short_chg)}`}>
                                                            {formatChange(alert.report.asset_mgr_short_chg, alert.report.asset_mgr_short)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Leveraged Funds Positions */}
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Leveraged Funds</h4>
                                                <div className="grid grid-cols-2 gap-4 bg-white dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-white/10">
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Long</span>
                                                        <div className="font-mono text-gray-900 dark:text-white font-medium">
                                                            {alert.report.lev_long.toLocaleString()}
                                                        </div>
                                                        <span className={`text-xs font-mono font-medium ${getChangeColor(alert.report.lev_long_chg)}`}>
                                                            {formatChange(alert.report.lev_long_chg, alert.report.lev_long)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Short</span>
                                                        <div className="font-mono text-gray-900 dark:text-white font-medium">
                                                            {alert.report.lev_short.toLocaleString()}
                                                        </div>
                                                        <span className={`text-xs font-mono font-medium ${getChangeColor(alert.report.lev_short_chg)}`}>
                                                            {formatChange(alert.report.lev_short_chg, alert.report.lev_short)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    {alerts.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                                No alerts found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AlertsTable;
