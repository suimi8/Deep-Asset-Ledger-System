import requests
from datetime import date
import json

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("🚀 Starting System Test...")

    # 1. Create Stock
    stock_payload = {
        "symbol": "TEST001",
        "name": "Test Company",
        "market": "US"
    }
    try:
        res = requests.post(f"{BASE_URL}/stocks/", json=stock_payload)
        if res.status_code == 200:
            stock = res.json()
            print(f"✅ Created Stock: {stock['name']} (ID: {stock['id']})")
            stock_id = stock['id']
        else:
            # Maybe it exists, let's fetch list
            res = requests.get(f"{BASE_URL}/stocks/")
            stocks = res.json()
            target = next((s for s in stocks if s['symbol'] == "TEST001"), None)
            if target:
                stock_id = target['id']
                print(f"ℹ️ Stock already exists (ID: {stock_id})")
            else:
                print("❌ Failed to create or find stock")
                return
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2. Add Transaction (Buy 100 @ 10.0)
    tx_payload = {
        "stock_id": stock_id,
        "type": "BUY",
        "date": str(date.today()),
        "price": 10.0,
        "quantity": 100,
        "fees": 5.0,
        "notes": "Initial Test Buy"
    }
    res = requests.post(f"{BASE_URL}/stocks/{stock_id}/transactions", json=tx_payload)
    if res.status_code == 200:
        print("✅ Recorded Transaction: BUY 100 @ $10.0")
    else:
        print(f"❌ Transaction Failed Code: {res.status_code}")
        try:
            print("ERROR DETAIL:")
            print(res.json().get('detail', res.text))
        except:
            print(res.text)

    # 3. Add Quote (Close @ 12.0)
    quote_payload = {
        "stock_id": stock_id,
        "date": str(date.today()),
        "open": 10.0,
        "close": 12.0,
        "high": 12.5,
        "low": 9.8,
        "volume": 10000
    }
    res = requests.post(f"{BASE_URL}/quotes/", json=quote_payload)
    if res.status_code == 200:
        print("✅ Recorded Quote: Close @ $12.0")
    else:
        print(f"❌ Quote Failed Code: {res.status_code}")
        try:
             print("ERROR DETAIL:")
             print(res.json().get('detail', res.text))
        except:
             print(res.text)

    # 4. Check Analysis
    res = requests.get(f"{BASE_URL}/stocks/{stock_id}/analysis")
    if res.status_code == 200:
        data = res.json()
        print("\n📊 Analysis Restults:")
        print(f"   - Holdings: {data['holdings_qty']} (Exp: 100)")
        print(f"   - Avg Cost: {data['avg_cost']} (Exp: 10.00)")
        print(f"   - Market Value: {data['market_value']} (Exp: 1200.00)")
        print(f"   - Unrealized P/L: {data['unrealized_pnl']} (Exp: 200.00)")
        
    else:
        print(f"❌ Analysis Failed: {res.text}")

if __name__ == "__main__":
    run_test()
