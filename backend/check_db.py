import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

# 查看所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("数据库中的表:")
for t in tables:
    print(f"  - {t[0]}")

print("\n" + "="*60)

# 查询行情记录
try:
    cursor.execute("SELECT * FROM dailyquote")
    quotes = cursor.fetchall()
    print(f"\n行情记录 (共 {len(quotes)} 条):")
    for q in quotes:
        print(f"  ID:{q[0]} | 股票ID:{q[1]} | 日期:{q[2]} | 开:{q[3]} | 收:{q[4]} | 高:{q[5]} | 低:{q[6]}")
except Exception as e:
    print(f"查询行情失败: {e}")

# 查询股票记录
try:
    cursor.execute("SELECT * FROM stock")
    stocks = cursor.fetchall()
    print(f"\n股票记录 (共 {len(stocks)} 条):")
    for s in stocks:
        print(f"  ID:{s[0]} | 代码:{s[1]} | 名称:{s[2]} | 市场:{s[3]}")
except Exception as e:
    print(f"查询股票失败: {e}")

conn.close()
