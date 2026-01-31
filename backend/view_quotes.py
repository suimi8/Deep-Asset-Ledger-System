from database import engine
from sqlmodel import Session, select
from models import DailyQuote, Stock

session = Session(engine)
quotes = session.exec(select(DailyQuote)).all()

print(f"=== 数据库中的行情记录 (共 {len(quotes)} 条) ===\n")

if not quotes:
    print("暂无行情记录")
else:
    for q in quotes:
        stock = session.get(Stock, q.stock_id)
        print(f"日期: {q.date}")
        print(f"股票: {stock.symbol} - {stock.name}")
        print(f"收盘价: ${q.close}")
        print(f"开盘: ${q.open} | 最高: ${q.high} | 最低: ${q.low}")
        print("-" * 50)

session.close()
