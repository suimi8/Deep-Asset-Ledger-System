from sqlmodel import Session, select, create_engine
from models import DailyQuote, Stock

sqlite_file_name = "ledger.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

with Session(engine) as session:
    quotes = session.exec(select(DailyQuote)).all()
    print(f"Total Quotes: {len(quotes)}")
    for q in quotes:
        print(f"ID: {q.id}, Stock: {q.stock_id}, Date: {q.date}, Close: {q.close}")
