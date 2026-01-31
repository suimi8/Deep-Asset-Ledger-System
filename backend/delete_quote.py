import sqlite3

conn = sqlite3.connect('ledger.db')
cursor = conn.cursor()

# 删除今天的行情记录
cursor.execute('DELETE FROM "dailyquote" WHERE date = "2026-01-30"')
deleted_count = cursor.rowcount

conn.commit()
conn.close()

print(f"已删除 {deleted_count} 条今日行情记录")
print("现在可以重新获取正确的收盘价了！")
