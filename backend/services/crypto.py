from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
import base64
import os
from dotenv import load_dotenv

load_dotenv()

# Path to store keys - use /data for persistence in containers, fallback to local for dev
def _get_key_path(filename: str) -> str:
    """Get the appropriate path for key files based on environment"""
    data_dir = "/data"
    if os.path.exists(data_dir) and os.access(data_dir, os.W_OK):
        return os.path.join(data_dir, filename)
    return filename

PRIVATE_KEY_PATH = _get_key_path("private_key.pem")
PUBLIC_KEY_PATH = _get_key_path("public_key.pem")

def _normalize_pem_key(content: str) -> str:
    """Normalize PEM key format - handle spaces instead of newlines from env vars"""
    import re
    
    # Check if this is a PEM key that needs normalization (spaces instead of newlines)
    if "-----BEGIN" in content and "-----END" in content and "\n" not in content:
        # Use regex to extract the key type and content
        # Match patterns like: -----BEGIN RSA PRIVATE KEY----- ... -----END RSA PRIVATE KEY-----
        # or: -----BEGIN PUBLIC KEY----- ... -----END PUBLIC KEY-----
        
        # Find the header pattern: -----BEGIN XXX-----
        header_match = re.search(r'(-----BEGIN [A-Z ]+-----)', content)
        footer_match = re.search(r'(-----END [A-Z ]+-----)', content)
        
        if header_match and footer_match:
            header = header_match.group(1)
            footer = footer_match.group(1)
            
            # Extract the base64 content between header and footer
            start_idx = content.find(header) + len(header)
            end_idx = content.find(footer)
            key_content = content[start_idx:end_idx].strip()
            
            # Split the base64 content by spaces (which should be newlines)
            key_parts = key_content.split()
            
            # Reconstruct with proper newlines
            normalized = header + "\n" + "\n".join(key_parts) + "\n" + footer
            return normalized
    
    return content

def _get_key_from_env_or_file(env_var: str, file_path: str):
    # 1. Try Env Var
    content = os.getenv(env_var)
    if content:
        # Handle potential base64 encoding if user encoded it for env safety
        if "-----BEGIN" not in content:
            try:
                decoded = base64.b64decode(content).decode('utf-8')
                if "-----BEGIN" in decoded:
                    return _normalize_pem_key(decoded)
            except:
                pass
        # Normalize PEM format (handle spaces instead of newlines)
        return _normalize_pem_key(content)

    # 2. Try File
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return f.read()
    
    return None


def ensure_keys_exist():
    priv = _get_key_from_env_or_file("RSA_PRIVATE_KEY", PRIVATE_KEY_PATH)
    pub = _get_key_from_env_or_file("RSA_PUBLIC_KEY", PUBLIC_KEY_PATH)

    if not priv or not pub:
        print("⚠️ RSA Keys missing. Generating new local key pair...")
        key = RSA.generate(2048)
        private_key = key.export_key()
        with open(PRIVATE_KEY_PATH, "wb") as f:
            f.write(private_key)
        
        public_key = key.publickey().export_key()
        with open(PUBLIC_KEY_PATH, "wb") as f:
            f.write(public_key)
        print("✅ RSA Key Pair Generated locally.")

def get_public_key():
    ensure_keys_exist()
    return _get_key_from_env_or_file("RSA_PUBLIC_KEY", PUBLIC_KEY_PATH)

def decrypt_password(encrypted_password_b64: str):
    try:
        ensure_keys_exist()
        private_key_content = _get_key_from_env_or_file("RSA_PRIVATE_KEY", PRIVATE_KEY_PATH)
        
        if not private_key_content:
            print("❌ Private key not found")
            return None
        
        # Debug: Show private key info (not the actual key!)
        print(f"🔑 Private key loaded, length: {len(private_key_content)} chars")
        print(f"🔑 Private key starts with: {private_key_content[:50]}...")

        try:
            private_key = RSA.import_key(private_key_content)
            print(f"✅ Private key parsed successfully, size: {private_key.size_in_bits()} bits")
        except Exception as e:
            print(f"❌ Failed to parse private key: {e}")
            return None
            
        cipher = PKCS1_v1_5.new(private_key)
        
        try:
            encrypted_data = base64.b64decode(encrypted_password_b64)
            print(f"📦 Encrypted data length: {len(encrypted_data)} bytes")
        except Exception as e:
            print(f"❌ Failed to decode base64: {e}")
            return None
        
        # sentinel is used to protect against Bleichenbacher's attack
        sentinel = os.urandom(32)
        decrypted_data = cipher.decrypt(encrypted_data, sentinel)
        
        if decrypted_data == sentinel:
            print("❌ Decryption returned sentinel (key mismatch or invalid data)")
            return None
        
        print(f"📦 Decrypted data length: {len(decrypted_data)} bytes")
        
        # Try to decode as UTF-8
        try:
            password = decrypted_data.decode('utf-8')
        except UnicodeDecodeError as e:
            print(f"❌ Failed to decode as UTF-8: {e}")
            print(f"❌ Raw bytes (first 50): {decrypted_data[:50]}")
            return None
        
        # Validate decrypted password length (bcrypt limit is 72 bytes)
        password_bytes = len(password.encode('utf-8'))
        if password_bytes > 72:
            print(f"❌ Decrypted data too long ({password_bytes} bytes), likely decrypt mismatch")
            return None
        
        # Basic sanity check - password shouldn't contain null bytes or be empty
        if '\x00' in password or len(password) == 0:
            print("❌ Decrypted password is invalid (empty or contains null bytes)")
            return None
            
        print(f"✅ Password decrypted successfully (length: {len(password)} chars)")
        return password
        
    except Exception as e:
        print(f"❌ Decryption failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return None



