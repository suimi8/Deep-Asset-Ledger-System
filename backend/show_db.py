import sqlite3

conn = sqlite3.connect('ledger.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("所有表:")
for t in tables:
    table_name = t[0]
    print(f"\n表名: {table_name}")
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    columns = cursor.fetchall()
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    
    # 查询记录数
    cursor.execute(f'SELECT COUNT(*) FROM "{table_name}"')
    count = cursor.fetchone()[0]
    print(f"  记录数: {count}")
    
    if count > 0 and count < 10:
        cursor.execute(f'SELECT * FROM "{table_name}" LIMIT 5')
        rows = cursor.fetchall()
        print(f"  前{len(rows)}条记录:")
        for row in rows:
            print(f"    {row}")

conn.close()
