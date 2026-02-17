import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { WhaleAlert, Contract } from '../types/api';
import AlertsTable from '../components/AlertsTable';
import ContractsList from '../components/ContractsList';
import { Activity, Search, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [alertsData, contractsData] = await Promise.all([
                    api.getAlerts(),
                    api.getContracts()
                ]);

                setAlerts(alertsData);
                setContracts(contractsData);

                // Get unique contract count

            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Calculate latest COT date from alerts and contracts
    const allDates = [
        ...alerts.map(a => new Date(a.report_date).getTime()),
        ...contracts.filter(c => c.latest_report).map(c => new Date(c.latest_report!.report_date).getTime())
    ];

    const latestDate = allDates.length > 0
        ? new Date(Math.max(...allDates)).toLocaleDateString('it-IT')
        : '-';

    // Contract Filtering Logic
    const categories = ['all', ...Array.from(new Set(contracts.map(c => c.market_category)))];

    const filteredContracts = contracts.filter(c => {
        const matchesSearch = c.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.yahoo_ticker?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || c.market_category === selectedCategory;
        return matchesSearch && matchesCategory;
    });



    const formatCategory = (cat: string) => {
        return cat.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-12 animate-fade-in">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
                            Whaleradarr Dashboard
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Institutional Order Flow Analysis</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Latest COT:</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{latestDate}</span>
                        </div>
                        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">System Online</span>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="text-blue-500 dark:text-blue-400" size={20} />
                            <h3 className="text-gray-600 dark:text-gray-300 font-medium">Contracts Tracked</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{contracts.length}</p>
                    </div>
                </div>

                {/* Active Alerts Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="w-1 h-6 bg-rose-500 rounded-full"></div>
                        Active Signals
                    </h2>
                    {loading ? (
                        <div className="text-center py-12 text-gray-500 animate-pulse">Loading analysis...</div>
                    ) : (
                        <AlertsTable alerts={alerts} />
                    )}
                </div>

                {/* All Markets Section */}
                <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-white/10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                Explore Markets
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Browse all {contracts.length} available futures contracts.
                            </p>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search markets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all w-full sm:w-64"
                                />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all capitalize"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat === 'all' ? 'All Categories' : formatCategory(cat)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {loading ? (
                            <div className="text-center py-12">
                                <Activity className="animate-spin h-8 w-8 text-blue-500 mx-auto" />
                            </div>
                        ) : (
                            filteredContracts.length > 0 ? (
                                <ContractsList contracts={filteredContracts} />
                            ) : (
                                <div className="text-center py-12 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                                    <p className="text-gray-500 dark:text-gray-400">No markets found matching "{searchTerm}"</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
