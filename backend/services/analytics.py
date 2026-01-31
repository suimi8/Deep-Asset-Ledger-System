from typing import List, Dict, Any
from models import Transaction, DailyQuote
from datetime import date

class PortfolioAnalyzer:
    def __init__(self, transactions: List[Transaction], quotes: List[DailyQuote]):
        self.transactions = sorted(transactions, key=lambda x: (x.date, x.id))
        self.quotes = sorted(quotes, key=lambda x: x.date)
        self.holdings_qty = 0.0
        self.total_cost = 0.0           # Accounting cost (Mark-to-Market)
        self.purchase_total_cost = 0.0  # Real purchase cost (Average of all buys)
        
        self.realized_pnl = 0.0
        self.total_fees = 0.0
        self.current_avg_cost = 0.0
        self.purchase_avg_cost = 0.0

        # Process transactions to get current state
        self._calculate_current_state()

    def _calculate_current_state(self):
        last_valid_avg_cost = 0.0
        last_valid_purchase_cost = 0.0
        
        for tx in self.transactions:
            self.total_fees += tx.fees
            
            if tx.type == 'BUY':
                cost_added = (tx.price * tx.quantity) + tx.fees
                self.total_cost += cost_added
                self.purchase_total_cost += cost_added
                self.holdings_qty += tx.quantity
                
            elif tx.type == 'SELL':
                if self.holdings_qty > 0:
                    avg_cost = self.total_cost / self.holdings_qty
                    p_avg_cost = self.purchase_total_cost / self.holdings_qty
                    last_valid_avg_cost = avg_cost
                    last_valid_purchase_cost = p_avg_cost
                else:
                    avg_cost = last_valid_avg_cost
                    p_avg_cost = last_valid_purchase_cost
                
                cost_removed = avg_cost * abs(tx.quantity)
                p_cost_removed = p_avg_cost * abs(tx.quantity)
                revenue = (tx.price * abs(tx.quantity)) - tx.fees
                
                self.total_cost -= cost_removed
                self.purchase_total_cost -= p_cost_removed
                self.holdings_qty -= abs(tx.quantity)
                # Correct realized PnL: Net Revenue - current accounting cost basis
                self.realized_pnl += (revenue - cost_removed)
            
            elif tx.type == 'CLOSE_POSITION':
                # Settlement: Only updates accounting cost, NOT purchase cost
                if self.holdings_qty > 0:
                    avg_cost = self.total_cost / self.holdings_qty
                    # Profit factor in fees
                    profit = (tx.price * abs(tx.quantity)) - tx.fees - (avg_cost * abs(tx.quantity))
                    self.realized_pnl += profit
                    self.total_cost += (profit + tx.fees) # Add back fees to total_cost if we are clearing it? 
                    # Actually for CLOSE_POSITION, if it's meant to clear the position:
                    # If we sold everything, total_cost should go to 0.
                    # Let's just use the same logic as SELL.
                    last_valid_avg_cost = self.total_cost / self.holdings_qty if self.holdings_qty > 0 else avg_cost

        if self.holdings_qty > 0:
            self.current_avg_cost = self.total_cost / self.holdings_qty
            self.purchase_avg_cost = self.purchase_total_cost / self.holdings_qty
        else:
            self.current_avg_cost = last_valid_avg_cost
            self.purchase_avg_cost = last_valid_purchase_cost
            if self.holdings_qty < 0.0001: 
                self.total_cost = 0.0
                self.purchase_total_cost = 0.0

    def get_snapshot(self, current_price: float = None):
        if current_price is None:
            current_price = self.quotes[-1].close if self.quotes else 0.0
            
        market_value = self.holdings_qty * current_price
        # Unrealized PnL based on accounting cost
        unrealized_pnl = market_value - self.total_cost
        # Total PnL is sum of realized and unrealized
        total_pnl = self.realized_pnl + unrealized_pnl
        
        return {
            "holdings_qty": self.holdings_qty,
            "avg_cost": self.purchase_avg_cost, # Display purchase cost as 'Average Cost'
            "accounting_avg_cost": self.current_avg_cost,
            "total_cost": self.purchase_total_cost,
            "current_price": current_price,
            "market_value": market_value,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_percent": (unrealized_pnl / self.total_cost * 100) if self.total_cost > 0 else 0,
            "realized_pnl": self.realized_pnl,
            "total_pnl": total_pnl,
            "pnl_percent": (total_pnl / self.purchase_total_cost * 100) if self.purchase_total_cost > 0 else 0,
            "total_fees": self.total_fees
        }

    def get_timeline(self):
        """
        Generate daily series of (date, price, qty, avg_cost, unrealized_pnl)
        """
        if not self.quotes:
            return []
            
        timeline = []
        running_qty = 0.0
        running_cost = 0.0          # Accounting
        running_purchase_cost = 0.0 # Real
        
        # Helper to group transactions by date
        tx_by_date = {}
        for tx in self.transactions:
            d_str = tx.date if isinstance(tx.date, str) else tx.date.strftime('%Y-%m-%d')
            if d_str not in tx_by_date:
                tx_by_date[d_str] = []
            tx_by_date[d_str].append(tx)
            
        running_realized_pnl = 0.0
        # Iterate through daily quotes
        for quote in self.quotes:
            d_str = quote.date if isinstance(quote.date, str) else quote.date.strftime('%Y-%m-%d')
            
            if d_str in tx_by_date:
                for tx in tx_by_date[d_str]:
                    if tx.type == 'BUY':
                        cost = (tx.price * tx.quantity) + tx.fees
                        running_cost += cost
                        running_purchase_cost += cost
                        running_qty += tx.quantity
                    elif tx.type == 'SELL' and running_qty > 0:
                        accounting_avg = running_cost / running_qty
                        purchase_avg = running_purchase_cost / running_qty
                        
                        revenue = (tx.price * abs(tx.quantity)) - tx.fees
                        cost_removed = accounting_avg * abs(tx.quantity)
                        
                        running_realized_pnl += (revenue - cost_removed)
                        running_cost -= cost_removed
                        running_purchase_cost -= (purchase_avg * abs(tx.quantity))
                        running_qty -= abs(tx.quantity)
                    elif tx.type == 'CLOSE_POSITION' and running_qty > 0:
                        accounting_avg = running_cost / running_qty
                        profit = (tx.price * abs(tx.quantity)) - tx.fees - (accounting_avg * abs(tx.quantity))
                        running_realized_pnl += profit
                        running_cost += (profit + tx.fees)
            
            # Calculate metrics
            market_value = running_qty * quote.close
            # Unrealized based on current accounting cost
            unrealized_pnl = market_value - running_cost
            total_pnl_val = unrealized_pnl + running_realized_pnl
            
            timeline.append({
                "date": d_str,
                "close": quote.close,
                "qty": running_qty,
                "avg_cost": running_purchase_cost / running_qty if running_qty > 0 else 0,
                "market_value": market_value,
                "unrealized_pnl": unrealized_pnl,
                "realized_pnl": running_realized_pnl,
                "total_pnl": total_pnl_val,
                "unrealized_pnl_percent": (unrealized_pnl / running_cost * 100) if running_cost > 0 else 0
            })
            
        return timeline
