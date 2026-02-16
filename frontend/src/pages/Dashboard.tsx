import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { WhaleAlert } from '../types/api';
import AlertsTable from '../components/AlertsTable';
import { Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
    const [alerts, setAlerts] = useState<WhaleAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await api.getAlerts();
                setAlerts(data);
            } catch (error) {
                console.error("Failed to fetch alerts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Calculate latest COT date
    const latestDate = alerts.length > 0
        ? new Date(Math.max(...alerts.map(a => new Date(a.report_date).getTime()))).toLocaleDateString('it-IT')
        : '-';

    return (
        <div className="space-y-8">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
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

                {/* Stats Overview (Placeholder for now) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="text-blue-500 dark:text-blue-400" size={20} />
                            <h3 className="text-gray-600 dark:text-gray-300 font-medium">Total Alerts</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{alerts.length}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Latest Signals</h2>
                    {loading ? (
                        <div className="text-center py-12 text-gray-500 animate-pulse">Loading analysis...</div>
                    ) : (
                        <AlertsTable alerts={alerts} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
