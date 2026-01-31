from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship
    stocks: List["Stock"] = Relationship(back_populates="user")

class Stock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    symbol: str = Field(index=True) # Removed unique here to allow same symbol for different users
    name: str
    market: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship
    user: Optional[User] = Relationship(back_populates="stocks")

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    stock_id: int = Field(foreign_key="stock.id")
    type: str # BUY, SELL, DIVIDEND
    date: str
    price: float
    quantity: float
    fees: float
    notes: Optional[str] = None

class DailyQuote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    stock_id: int = Field(index=True) # Remove foreign key to keep market quotes shared even if stock is deleted by one user
    # Actually, keep it for now but be careful.
    # To keep it simple, market quotes remain tied to a stock record.
    # But if two users have the same stock symbol, do we share quotes? 
    # For now, let's keep them separate per user stock record to avoid complex sharing logic.
    date: str
    open: float
    close: float
    high: float
    low: float
    volume: int
    is_manual: bool = Field(default=False)

class AssetSnapshot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    stock_id: int = Field(foreign_key="stock.id")
    # user_id added for faster portfolio stats
    user_id: int = Field(default=0, foreign_key="user.id", index=True) 
    date: str
    holdings_qty: float
    cost_basis_fifo: float
    total_cost: float
    market_value: float
    daily_pnl: float
    total_pnl: float
    realized_pnl: float

class SystemConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True) # e.g., 'EXTERNAL_API_KEY'
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
