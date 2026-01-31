import smtplib
from email.mime.text import MIMEText
from email.header import Header
import os

# QQ Mail Configuration provided by user
SMTP_SERVER = "smtp.qq.com"
SMTP_PORT = 465
SENDER_EMAIL = "suimigg@qq.com"
SENDER_PASSWORD = "kxfrdkdimxrqbgbi" # Authorization Code

def send_email(target_email: str, subject: str, content: str, is_html: bool = False):
    max_retries = 2
    for attempt in range(max_retries):
        try:
            msg = MIMEText(content, 'html' if is_html else 'plain', 'utf-8')
            msg['From'] = SENDER_EMAIL
            msg['To'] = target_email
            msg['Subject'] = Header(subject, 'utf-8')

            print(f"🚀 Attempting to send email to {target_email} (Attempt {attempt + 1})...")
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=20)
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, [target_email], msg.as_string())
            print("📨 Email sent successfully")
            server.quit()
            return True
        except smtplib.SMTPAuthenticationError:
            print("❌ SMTP Authentication Failed. Check SENDER_EMAIL and SENDER_PASSWORD.")
            return False
        except Exception as e:
            print(f"⚠️ Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                import traceback
                print(f"❌ All attempts failed. Traceback: {traceback.format_exc()}")
                return False
            import time
            time.sleep(2) # Wait 2 seconds before retry
    return False

def send_verification_code(email: str, code: str, lang: str = "zh-CN"):
    templates = {
        "en": {
            "subject": "DeepLedger Verification Code",
            "title": "Verification Code",
            "body": "Your verification code is:",
            "footer": "This code will expire in 10 minutes. If you did not request this, please ignore this email."
        },
        "zh-CN": {
            "subject": "深度资产账本 - 验证码",
            "title": "您的验证码",
            "body": "您正在进行操作，验证码如下：",
            "footer": "验证码在 10 分钟内有效。如非本人操作，请忽略此邮件。"
        },
        "zh-TW": {
            "subject": "深度資產賬本 - 驗證碼",
            "title": "您的驗證碼",
            "body": "您正在进行操作，驗證碼如下：",
            "footer": "驗證碼在 10 分鐘內有效。如非本人操作，請忽略此郵件。"
        }
    }
    
    # Default to zh-CN if lang not found
    t = templates.get(lang, templates["zh-CN"])
    
    html_content = f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background-color: #2563eb; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">深度资产账本</h1>
            </div>
            <div style="padding: 40px; color: #334155;">
                <h2 style="font-size: 20px; margin-bottom: 20px; color: #1e293b;">{t['title']}</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #64748b;">{t['body']}</p>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">{code}</span>
                </div>
                <p style="font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; pt: 20px;">{t['footer']}</p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                &copy; 2026 DeepLedger. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, t["subject"], html_content, is_html=True)
