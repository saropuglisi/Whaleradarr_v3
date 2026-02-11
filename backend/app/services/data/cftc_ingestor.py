import io
import zipfile
import requests
import pandas as pd
import json
import os
from datetime import datetime
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

class CFTCIngestor:
    # URL Base
    HISTORICAL_URL = "https://www.cftc.gov/files/dea/history"
    
    # Financial Futures (TFF)
    LIVE_URL_FIN = "https://www.cftc.gov/dea/newcot/FinFutWk.txt"
    
    # Disaggregated Futures (Commodities: Gold, Oil, etc.)
    LIVE_URL_DIS = "https://www.cftc.gov/dea/newcot/c_disagg.txt" # "c_" prefix for commodities

    # Mapping per Financial Futures (TFF)
    MAPPING_FIN = {
        'CFTC_Contract_Market_Code': 'cftc_contract_code',
        'Market_and_Exchange_Names': 'contract_name_raw',
        'Open_Interest_All': 'open_interest',
        'Dealer_Positions_Long_All': 'dealer_long',
        'Dealer_Positions_Short_All': 'dealer_short',
        'Dealer_Positions_Spread_All': 'dealer_spread',
        'Asset_Mgr_Positions_Long_All': 'asset_mgr_long',
        'Asset_Mgr_Positions_Short_All': 'asset_mgr_short',
        'Asset_Mgr_Positions_Spread_All': 'asset_mgr_spread',
        'Lev_Money_Positions_Long_All': 'lev_money_long',
        'Lev_Money_Positions_Short_All': 'lev_money_short',
        'Lev_Money_Positions_Spread_All': 'lev_money_spread',
        'Other_Rept_Positions_Long_All': 'other_rept_long',
        'Other_Rept_Positions_Short_All': 'other_rept_short',
        'Other_Rept_Positions_Spread_All': 'other_rept_spread',
        'NonRept_Positions_Long_All': 'non_report_long',
        'NonRept_Positions_Short_All': 'non_report_short'
    }

    # Mapping per Disaggregated Futures (Commodities)
    # Mappiamo le categorie Commodities sulle colonne DB esistenti (Financial)
    # Managed Money -> Lev Funds (Whales)
    # Swap Dealers -> Dealer (spesso banche)
    # Prod/Merc -> Asset Mgr (Proxy imperfetto ma funzionale per il lato commerciale)
    MAPPING_DIS = {
        'CFTC_Contract_Market_Code': 'cftc_contract_code',
        'Market_and_Exchange_Names': 'contract_name_raw',
        'Open_Interest_All': 'open_interest',
        
        # Swap Dealers -> Dealer
        'Swap_Positions_Long_All': 'dealer_long',
        'Swap_Positions_Short_All': 'dealer_short',
        'Swap_Positions_Spread_All': 'dealer_spread',
        
        # Managed Money -> Leveraged Funds (CRITICO: SONO LE WHALES)
        'M_Money_Positions_Long_All': 'lev_money_long',
        'M_Money_Positions_Short_All': 'lev_money_short',
        'M_Money_Positions_Spread_All': 'lev_money_spread',
        
        # Producer/Merchant -> Asset Manager (Lato Commerciale/Hedging Reale)
        'Prod_Merc_Positions_Long_All': 'asset_mgr_long',
        'Prod_Merc_Positions_Short_All': 'asset_mgr_short',
        # Prod/Merc non ha sempre spread column, dipende dal report
        
        # Other Reportables
        'Other_Rept_Positions_Long_All': 'other_rept_long',
        'Other_Rept_Positions_Short_All': 'other_rept_short',
        'Other_Rept_Positions_Spread_All': 'other_rept_spread',
        
        'NonRept_Positions_Long_All': 'non_report_long',
        'NonRept_Positions_Short_All': 'non_report_short'
    }

    def __init__(self, whitelist_path: str = "scripts/seed_contracts.json"):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; WhaleRadarr/2.5; +http://whaleradarr.internal)"
        })
        self.whitelist = self._load_whitelist(whitelist_path)

    def _load_whitelist(self, path: str) -> list[str]:
        try:
            with open(path, 'r') as f:
                contracts = json.load(f)
                ids = [c['cftc_contract_code'].strip() for c in contracts]
                logger.info(f"Loaded whitelist with {len(ids)} contracts.")
                return ids
        except FileNotFoundError:
            logger.warning(f"Whitelist file {path} not found.")
            return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def fetch_data(self, year: int = None, mode: str = 'historical', report_type: str = 'financial') -> pd.DataFrame:
        """
        Scarica dati.
        report_type: 'financial' (FinFut) o 'disaggregated' (ComDisagg - Commodities)
        """
        try:
            filename_part = "com_fin" if report_type == 'financial' else "com_disagg"
            live_url = self.LIVE_URL_FIN if report_type == 'financial' else self.LIVE_URL_DIS
            
            if mode == 'live':
                logger.info(f"Fetching LIVE {report_type} report...")
                response = self.session.get(live_url, timeout=30)
                response.raise_for_status()
                
                # I file live NON hanno header
                headers = self._get_headers(report_type)
                df = pd.read_csv(
                    io.BytesIO(response.content), 
                    names=headers,
                    low_memory=False,
                    dtype=str,
                    on_bad_lines='warn'
                )
            else:
                # Esempio URL: com_fin_txt_2024.zip o com_disagg_txt_2024.zip
                url = f"{self.HISTORICAL_URL}/{filename_part}_txt_{year}.zip"
                logger.info(f"Fetching HISTORICAL {report_type} ({year})...")
                response = self.session.get(url, timeout=45)
                response.raise_for_status()
                
                with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                    # Cerca file txt dentro
                    target_str = "FinCom" if report_type == 'financial' else "Disagg"
                    files = [f for f in z.namelist() if f.endswith('.txt') and not f.startswith('__')]
                    
                    # Filtra meglio se possibile
                    best_match = next((f for f in files if target_str.lower() in f.lower()), files[0] if files else None)
                    
                    if not best_match:
                        raise ValueError(f"No .txt file found in ZIP {year}")
                    
                    logger.info(f"Processing file: {best_match}")
                    with z.open(best_match) as f:
                        df = pd.read_csv(f, low_memory=False, encoding='latin-1', dtype=str, on_bad_lines='warn')

            return self._process_dataframe(df, report_type, mode)

        except Exception as e:
            logger.error(f"Ingestion failed ({report_type}/{mode}): {e}")
            return pd.DataFrame()

    def _process_dataframe(self, df: pd.DataFrame, report_type: str, mode: str) -> pd.DataFrame:
        if df.empty:
            return df

        df.columns = df.columns.str.strip()

        # Date handling
        date_col = None
        for col in ['Report_Date_as_MM_DD_YYYY', 'Report_Date_as_YYYY-MM-DD']:
            if col in df.columns:
                date_col = col
                break
        
        if date_col:
            df = df.rename(columns={date_col: 'report_date'})

        # Select Mapping
        mapping = self.MAPPING_FIN if report_type == 'financial' else self.MAPPING_DIS
        df = df.rename(columns=mapping)
        
        target_cols = list(mapping.values()) + ['report_date']
        existing_cols = [c for c in target_cols if c in df.columns]
        
        # Filtra whitelist
        if self.whitelist and 'cftc_contract_code' in df.columns:
            df['cftc_contract_code'] = df['cftc_contract_code'].astype(str).str.strip()
            df = df[df['cftc_contract_code'].isin(self.whitelist)]

        if df.empty:
            return df
            
        df = df[existing_cols]

        # Clean Dates
        try:
            if mode == 'live':
                df['report_date'] = pd.to_datetime(df['report_date'], format='%y%m%d', errors='coerce')
            else:
                df['report_date'] = pd.to_datetime(df['report_date'], errors='coerce')
            df['report_date'] = df['report_date'].dt.date
            df = df.dropna(subset=['report_date'])
        except Exception:
            pass

        # Numeric conversion
        numeric_cols = [c for c in df.columns if c not in ['cftc_contract_code', 'contract_name_raw', 'report_date']]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(',', '', regex=False)
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype('int64')

        return df

    def _get_headers(self, report_type: str):
        # Header standard CFTC per i file live (che non li hanno)
        # Financial
        if report_type == 'financial':
            return [
                "Market_and_Exchange_Names", "Report_Date_as_MM_DD_YYYY", "CFTC_Contract_Market_Code", 
                "CFTC_Market_Code", "Region_Code", "Commodity_Code", "Open_Interest_All",
                "Dealer_Positions_Long_All", "Dealer_Positions_Short_All", "Dealer_Positions_Spread_All",
                "Asset_Mgr_Positions_Long_All", "Asset_Mgr_Positions_Short_All", "Asset_Mgr_Positions_Spread_All",
                "Lev_Money_Positions_Long_All", "Lev_Money_Positions_Short_All", "Lev_Money_Positions_Spread_All",
                "Other_Rept_Positions_Long_All", "Other_Rept_Positions_Short_All", "Other_Rept_Positions_Spread_All",
                "Total_Reportable_Positions_Long_All", "Total_Reportable_Positions_Short_All",
                "NonRept_Positions_Long_All", "NonRept_Positions_Short_All"
            ]
        # Disaggregated (Commodities)
        else:
            return [
                "Market_and_Exchange_Names", "Report_Date_as_MM_DD_YYYY", "CFTC_Contract_Market_Code", 
                "CFTC_Market_Code", "Region_Code", "Commodity_Code", "Open_Interest_All",
                "Prod_Merc_Positions_Long_All", "Prod_Merc_Positions_Short_All", 
                "Swap_Positions_Long_All", "Swap_Positions_Short_All", "Swap_Positions_Spread_All",
                "M_Money_Positions_Long_All", "M_Money_Positions_Short_All", "M_Money_Positions_Spread_All",
                "Other_Rept_Positions_Long_All", "Other_Rept_Positions_Short_All", "Other_Rept_Positions_Spread_All",
                "Total_Reportable_Positions_Long_All", "Total_Reportable_Positions_Short_All",
                "NonRept_Positions_Long_All", "NonRept_Positions_Short_All"
            ]
