import smtplib
from email.mime.text import MIMEText
from email.header import Header

SMTP_SERVER = "smtp.qq.com"
SMTP_PORT = 465
SENDER_EMAIL = "suimigg@qq.com"
SENDER_PASSWORD = "kxfrdkdimxrqbgbi"

def test_send():
    target = "suimigg@qq.com" # Send to self for test
    msg = MIMEText("Test content", 'plain', 'utf-8')
    msg['From'] = SENDER_EMAIL
    msg['To'] = target
    msg['Subject'] = Header("Test Subject", 'utf-8')

    try:
        print(f"Connecting to {SMTP_SERVER}...")
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=20)
        print("Connected. Logging in...")
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        print("Logged in. Sending...")
        server.sendmail(SENDER_EMAIL, [target], msg.as_string())
        print("Sent successfully!")
        server.quit()
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_send()
