from decimal import Decimal
from typing import List, Dict, Any
from models import Transaction
from datetime import date

class FifoLedger:
    def __init__(self):
        self.inventory = [] # List of {'date': date, 'price': Decimal, 'qty': Decimal}
        self.realized_pnl = Decimal(0)
        self.total_fees = Decimal(0)
        
    def process_transactions(self, transactions: List[Transaction], update_snapshots: bool = False):
        # Ensure transactions are sorted by date
        sorted_txs = sorted(transactions, key=lambda x: x.date)
        
        events = []
        
        for tx in sorted_txs:
            if tx.type == 'BUY':
                self._process_buy(tx)
            elif tx.type == 'SELL':
                pnl = self._process_sell(tx)
                events.append({'tx': tx, 'realized_pnl': pnl})
            elif tx.type == 'DIVIDEND_CASH':
                # Cash dividend reduces cost basis or treated as income? 
                # Usually treated as income/realized PnL in simple ledgers, or reduces cost basis
                # Let's treat as realized income for now
                self.realized_pnl += tx.price # assuming price stores the total amount or amount/share * qty
                # If quantity is provided, price is per share. 
                # Let's assume price field holds the total amount for dividend type, or price * qty
                total_div = tx.price * tx.quantity if tx.quantity else tx.price
                self.realized_pnl += total_div
            
            self.total_fees += tx.fees

    def _process_buy(self, tx: Transaction):
        self.inventory.append({
            'date': tx.date,
            'price': tx.price,
            'qty': tx.quantity,
            'original_qty': tx.quantity
        })

    def _process_sell(self, tx: Transaction) -> Decimal:
        qty_to_sell = abs(tx.quantity)
        realized_gain = Decimal(0)
        
        # FIFO Consumption
        while qty_to_sell > 0 and self.inventory:
            lot = self.inventory[0]
            
            if lot['qty'] > qty_to_sell:
                # Partial lot consumption
                cost = lot['price'] * qty_to_sell
                revenue = tx.price * qty_to_sell
                realized_gain += (revenue - cost)
                
                lot['qty'] -= qty_to_sell
                qty_to_sell = 0
            else:
                # Full lot consumption
                amount = lot['qty']
                cost = lot['price'] * amount
                revenue = tx.price * amount
                realized_gain += (revenue - cost)
                
                qty_to_sell -= amount
                self.inventory.pop(0)
                
        # If we oversold (short), current logic doesn't support shorting well (negative inventory not implemented)
        return realized_gain

    def get_holdings(self) -> Dict[str, Any]:
        total_qty = sum(item['qty'] for item in self.inventory)
        total_cost = sum(item['qty'] * item['price'] for item in self.inventory)
        avg_cost = total_cost / total_qty if total_qty > 0 else 0
        
        return {
            'quantity': total_qty,
            'total_cost': total_cost,
            'avg_cost': avg_cost,
            'realized_pnl': self.realized_pnl,
            'total_fees': self.total_fees
        }
