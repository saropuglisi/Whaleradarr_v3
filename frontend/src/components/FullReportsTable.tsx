import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FullReportsTableProps {
    contractId: number;
}

interface Report {
    id: number;
    report_date: string;
    dealer_net: number;
    asset_mgr_net: number;
    lev_net: number;
    open_interest: number;
}

const FullReportsTable: React.FC<FullReportsTableProps> = ({ contractId }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const limit = 20;

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const offset = page * limit;
                const response = await fetch(`http://localhost:8000/api/v1/contracts/${contractId}/reports?limit=${limit}&offset=${offset}`);
                const result = await response.json();
                setReports(result.reports || []);
                setTotalCount(result.total_count || 0);
            } catch (error) {
                console.error('Failed to fetch reports:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, [contractId, page]);

    const totalPages = Math.ceil(totalCount / limit);

    if (loading && reports.length === 0) {
        return <div className="text-center py-8 text-gray-500">Loading reports...</div>;
    }

    return (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Full Report History ({totalCount} reports)
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-2 rounded-lg border border-gray-300 dark:border-white/10 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {page + 1} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-2 rounded-lg border border-gray-300 dark:border-white/10 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-white/5"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3 text-right">Dealer Net</th>
                            <th className="px-4 py-3 text-right">Asset Mgr Net</th>
                            <th className="px-4 py-3 text-right">Leveraged Net</th>
                            <th className="px-4 py-3 text-right">Open Interest</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                        {reports.map((report) => (
                            <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                    {new Date(report.report_date).toLocaleDateString('it-IT')}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono ${report.dealer_net > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {report.dealer_net.toLocaleString()}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono ${report.asset_mgr_net > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {report.asset_mgr_net.toLocaleString()}
                                </td>
                                <td className={`px-4 py-3 text-right font-mono ${report.lev_net > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {report.lev_net.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                                    {report.open_interest.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FullReportsTable;
