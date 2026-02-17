export interface ContractStatistics {
    trader_category: string;
    position_type: string;
    rolling_median: number;
    rolling_iqr: number;
    all_time_min: number;
    all_time_max: number;
}

export interface Contract {
    id: number;
    cftc_contract_code: string;
    contract_name: string;
    market_category: string;
    yahoo_ticker?: string;
    exchange?: string;
    is_active: boolean;
    statistics?: ContractStatistics[];
    latest_report?: WeeklyReport; // Re-use WeeklyReport interface for simplicity, or pick fields
}

export interface WeeklyReport {
    id: number;
    contract_id: number;
    report_date: string;

    dealer_long: number;
    dealer_long_chg: number;
    dealer_short: number;
    dealer_short_chg: number;
    dealer_net: number;

    asset_mgr_long: number;
    asset_mgr_long_chg: number;
    asset_mgr_short: number;
    asset_mgr_short_chg: number;
    asset_mgr_net: number;

    lev_long: number;
    lev_long_chg: number;
    lev_short: number;
    lev_short_chg: number;
    lev_net: number;

    open_interest: number;
    open_interest_chg: number;
}

export interface WhaleAlert {
    id: number;
    contract_id: number;
    contract_name?: string;
    report_date: string;
    alert_level: 'High' | 'Medium' | 'Low';
    z_score: number;
    cot_index: number;
    price_context: string;
    confidence_score: number;
    is_rollover_week: boolean;
    z_score_delta?: number;
    report?: WeeklyReport;
    technical_signal?: string;
    technical_context?: {
        rsi?: number;
        trend?: string;
        ema_50?: number;
        ema_200?: number;
    };
}
