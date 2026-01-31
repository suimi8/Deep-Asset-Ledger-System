from sqlmodel import SQLModel, create_engine, Session

import os
sqlite_file_name = os.getenv("DATABASE_PATH", "ledger.db")
# If it's a relative path, make it relative to the script location
if not os.path.isabs(sqlite_file_name):
    sqlite_file_name = os.path.join(os.path.dirname(__file__), sqlite_file_name)

sqlite_url = f"sqlite:///{sqlite_file_name}"
print(f"📦 Using database at: {sqlite_url}")

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
