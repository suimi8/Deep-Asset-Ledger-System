import sqlite3

conn = sqlite3.connect('ledger.db')
cursor = conn.cursor()

cursor.execute('SELECT COUNT(*) FROM "dailyquote"')
count = cursor.fetchone()[0]

print(f"当前行情记录数: {count}")

if count == 0:
    print("✓ 删除成功！数据库已清空")
    print("\n现在您可以：")
    print("1. 回到浏览器")
    print("2. 点击'更新今日行情'按钮")
    print("3. 系统会自动获取博纳影业(001330)的真实收盘价")
else:
    cursor.execute('SELECT * FROM "dailyquote"')
    quotes = cursor.fetchall()
    print(f"剩余记录:")
    for q in quotes:
        print(f"  {q}")

conn.close()
