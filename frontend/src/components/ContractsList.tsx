import React, { useState } from 'react';
import { Contract } from '../types/api';
import { Link } from 'react-router-dom';
import {
    ChevronDown, ChevronUp, ExternalLink, Activity,
    Wheat, Flame, Gem, Coins, Percent, Landmark, Bitcoin,
    BarChart3, Beef
} from 'lucide-react';

interface ContractsListProps {
    contracts: Contract[];
}

const ContractsList: React.FC<ContractsListProps> = ({ contracts }) => {
    // Group contracts by category
    const groupedContracts = contracts.reduce((acc, contract) => {
        const cat = contract.market_category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(contract);
        return acc;
    }, {} as Record<string, Contract[]>);

    const categories = Object.keys(groupedContracts).sort();

    // State for expanded categories (default all expanded or just first?)
    // User probably wants to see them. Let's expand all by default or let them toggle.
    // Let's expand all by default for better visibility.
    const [expandedCategories, setExpandedCategories] = useState<string[]>(categories);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const formatCategory = (cat: string) => {
        return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const formatNumber = (num?: number) => {
        if (num === undefined || num === null) return '-';
        return num.toLocaleString();
    };

    const getNetColor = (net?: number) => {
        if (!net) return 'text-gray-500';
        return net > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    };

    const getChangeColor = (change?: number) => {
        if (!change) return 'text-gray-400';
        return change > 0 ? 'text-green-500' : 'text-red-500';
    };

    const getCategoryIcon = (category: string) => {
        switch (category.toLowerCase()) {
            case 'agricultural': return <Wheat className="text-amber-500" size={20} />;
            case 'energy': return <Flame className="text-orange-500" size={20} />;
            case 'metal': return <Gem className="text-purple-500" size={20} />;
            case 'currency': return <Coins className="text-emerald-500" size={20} />;
            case 'stock_index': return <BarChart3 className="text-blue-500" size={20} />;
            case 'interest_rate': return <Landmark className="text-indigo-500" size={20} />;
            case 'crypto': return <Bitcoin className="text-yellow-500" size={20} />;
            case 'livestock': return <Beef className="text-rose-500" size={20} />;
            default: return <Activity className="text-gray-400" size={20} />;
        }
    };

    return (
        <div className="space-y-6">
            {categories.map(category => (
                <div key={category} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 backdrop-blur-md overflow-hidden">
                    {/* Category Header */}
                    <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {getCategoryIcon(category)}
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                                {formatCategory(category)}
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                                {groupedContracts[category].length}
                            </span>
                        </div>
                        {expandedCategories.includes(category) ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>

                    {/* Contracts Table */}
                    {expandedCategories.includes(category) && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                                <thead className="bg-gray-50 dark:bg-black/20 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Contract</th>
                                        <th className="px-6 py-3 text-right">Dealer Net</th>
                                        <th className="px-6 py-3 text-right">Asset Mgr Net</th>
                                        <th className="px-6 py-3 text-right">Lev Funds Net</th>
                                        <th className="px-6 py-3 text-right">Open Interest</th>
                                        <th className="px-6 py-3 text-right">Last Report</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {groupedContracts[category].map(contract => (
                                        <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <Link
                                                    to={`/contract/${contract.id}`}
                                                    className="flex items-center gap-2 font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors"
                                                >
                                                    {contract.contract_name}
                                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Link>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex gap-2">
                                                    <span>{contract.exchange}</span>
                                                    {contract.yahoo_ticker && (
                                                        <span className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">
                                                            {contract.yahoo_ticker}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Dealer Net */}
                                            <td className="px-6 py-4 text-right">
                                                {contract.latest_report ? (
                                                    <div>
                                                        <div className={`font-mono font-medium ${getNetColor(contract.latest_report.dealer_net)}`}>
                                                            {formatNumber(contract.latest_report.dealer_net)}
                                                        </div>
                                                        <div className={`text-xs ${getChangeColor(contract.latest_report.dealer_long_chg - contract.latest_report.dealer_short_chg)}`}>
                                                            {/* Showing net change approximated or just change in long/short? Let's show net if computed, else just long/short chg implies net change approximately? 
                                                                Actually usually net change is useful. 
                                                                Computed net change = (Long_new - Short_new) - (Long_old - Short_old)
                                                                = (Long_new - Long_old) - (Short_new - Short_old)
                                                                = Long_chg - Short_chg
                                                            */}
                                                            {(() => {
                                                                const netChg = (contract.latest_report.dealer_long_chg || 0) - (contract.latest_report.dealer_short_chg || 0);
                                                                return (
                                                                    <span>
                                                                        {netChg > 0 ? '+' : ''}{formatNumber(netChg)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>

                                            {/* Asset Manager Net */}
                                            <td className="px-6 py-4 text-right">
                                                {contract.latest_report ? (
                                                    <div>
                                                        <div className={`font-mono font-medium ${getNetColor(contract.latest_report.asset_mgr_net)}`}>
                                                            {formatNumber(contract.latest_report.asset_mgr_net)}
                                                        </div>
                                                        <div className={`text-xs ${getChangeColor((contract.latest_report.asset_mgr_long_chg || 0) - (contract.latest_report.asset_mgr_short_chg || 0))}`}>
                                                            {(() => {
                                                                const netChg = (contract.latest_report.asset_mgr_long_chg || 0) - (contract.latest_report.asset_mgr_short_chg || 0);
                                                                return (
                                                                    <span>
                                                                        {netChg > 0 ? '+' : ''}{formatNumber(netChg)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>

                                            {/* Lev Funds Net */}
                                            <td className="px-6 py-4 text-right">
                                                {contract.latest_report ? (
                                                    <div>
                                                        <div className={`font-mono font-medium ${getNetColor(contract.latest_report.lev_net)}`}>
                                                            {formatNumber(contract.latest_report.lev_net)}
                                                        </div>
                                                        <div className={`text-xs ${getChangeColor((contract.latest_report.lev_long_chg || 0) - (contract.latest_report.lev_short_chg || 0))}`}>
                                                            {(() => {
                                                                const netChg = (contract.latest_report.lev_long_chg || 0) - (contract.latest_report.lev_short_chg || 0);
                                                                return (
                                                                    <span>
                                                                        {netChg > 0 ? '+' : ''}{formatNumber(netChg)}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>

                                            {/* Open Interest */}
                                            <td className="px-6 py-4 text-right">
                                                {contract.latest_report ? (
                                                    <div>
                                                        <div className="font-mono text-gray-900 dark:text-white">
                                                            {formatNumber(contract.latest_report.open_interest)}
                                                        </div>
                                                        <div className={`text-xs ${getChangeColor(contract.latest_report.open_interest_chg)}`}>
                                                            {contract.latest_report.open_interest_chg > 0 ? '+' : ''}{formatNumber(contract.latest_report.open_interest_chg)}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-gray-400">-</span>}
                                            </td>

                                            {/* Date */}
                                            <td className="px-6 py-4 text-right text-xs text-gray-500">
                                                {contract.latest_report ? new Date(contract.latest_report.report_date).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ContractsList;
