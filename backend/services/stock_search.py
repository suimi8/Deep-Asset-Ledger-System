import akshare as ak
import pandas as pd
from typing import List, Dict

# Simple in-memory cache
_cache_cn = None
_cache_hk = None

def get_cn_stocks():
    """Fetch A-Share list. Priority: Lighter list API -> Spot API."""
    global _cache_cn
    if _cache_cn is not None and not _cache_cn.empty:
        return _cache_cn

    # Strategy 1: Lighter 'code-name' list (fast, less prone to blocks)
    try:
        df = ak.stock_info_a_code_name()
        if not df.empty and 'code' in df.columns:
            # Rename columns to match our internal standard if needed, or just use as is
            # df has 'code', 'name'
            _cache_cn = df
            return _cache_cn
    except Exception as e:
        print(f"Strategy 1 (List) failed: {e}")

    # Strategy 2: Spot EM (Full details, higher failure rate)
    try:
        df = ak.stock_zh_a_spot_em()
        if not df.empty:
            # Standardize columns: '代码'->'code', '名称'->'name'
            df = df.rename(columns={'代码': 'code', '名称': 'name'})
            _cache_cn = df
            return _cache_cn
    except Exception as e:
        print(f"Strategy 2 (Spot) failed: {e}")

    return pd.DataFrame()

def get_hk_stocks():
    global _cache_hk
    if _cache_hk is not None and not _cache_hk.empty:
        return _cache_hk
        
    try:
        df = ak.stock_hk_spot_em()
        if not df.empty:
            df = df.rename(columns={'代码': 'code', '名称': 'name'})
            _cache_hk = df
    except Exception as e:
        print(f"HK Fetch failed: {e}")
        return pd.DataFrame() # Return empty DF but don't cache failure forever if we want retry logic
        
    return _cache_hk if _cache_hk is not None else pd.DataFrame()

def search_stocks(query: str) -> List[Dict]:
    results = []
    query = query.strip()
    if not query:
        return []

    # 1. Search CN (A-Shares)
    try:
        df_cn = get_cn_stocks()
        if not df_cn.empty:
            # Filter matches
            mask = df_cn['code'].astype(str).str.contains(query, case=False) | \
                   df_cn['name'].astype(str).str.contains(query, case=False)
            
            matched = df_cn[mask].head(10)
            for _, row in matched.iterrows():
                results.append({
                    "symbol": row['code'],
                    "name": row['name'],
                    "market": "CN"
                })
    except Exception as e:
        print(f"CN Search Error: {e}")

    # 2. Search HK Stocks
    try:
        df_hk = get_hk_stocks()
        if not df_hk.empty:
            mask = df_hk['code'].astype(str).str.contains(query, case=False) | \
                   df_hk['name'].astype(str).str.contains(query, case=False)
            
            matched = df_hk[mask].head(5)
            for _, row in matched.iterrows():
                results.append({
                    "symbol": row['code'],
                    "name": row['name'],
                    "market": "HK"
                })
    except Exception as e:
        print(f"HK Search Error: {e}")
        
    # 3. Basic US Handling
    # If user queries a pure ASCII alpha string (e.g. "AAPL"), suggest it as US
    if query.isascii() and query.isalpha() and len(query) <= 5:
        results.append({
            "symbol": query.upper(),
            "name": f"{query.upper()} (US Stock)",
            "market": "US"
        })

    return results
