import sqlite3
import pandas as pd
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

DB_FILE = "crop_predict.db"

def create_tables():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Create users table (for authentication)
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    plaintext_password TEXT,
                    contact TEXT)''')

    # Create predictions table (for storing model forecasts)
    cursor.execute('''CREATE TABLE IF NOT EXISTS predictions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        commodity TEXT,
                        year INTEGER,
                        forecast_price REAL,
                        FOREIGN KEY (user_id) REFERENCES users(id))''')

    # Create commodity prices table
    cursor.execute('''CREATE TABLE IF NOT EXISTS commodity_prices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        date TEXT,
                        location TEXT,
                        commodity TEXT,
                        price REAL,
                        source TEXT)''')

    conn.commit()
    conn.close()

def upload_csv_to_db(csv_file):
    """Uploads CSV data to the commodity_prices table."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    try:
        df = pd.read_csv(csv_file)

        # Rename "Commodities" column for consistency
        df.rename(columns={"Commodities": "commodity"}, inplace=True)

        # Convert wide format (months as columns) to long format (date, commodity, price)
        df_long = df.melt(id_vars=["commodity"], var_name="date", value_name="price")

        # Ensure no empty commodity names
        df_long = df_long.dropna(subset=["commodity", "price"])

        # Insert data into the database
        for index, row in df_long.iterrows():
            cursor.execute("INSERT INTO commodity_prices (date, commodity, price) VALUES (?, ?, ?)",
                           (row["date"], row["commodity"], row["price"]))

        conn.commit()
        print(f"✅ Data from {csv_file} uploaded successfully!")

    except Exception as e:
        print(f"❌ Error uploading {csv_file}: {e}")

    finally:
        conn.close()


def register_user(username, password, contact):
    """Registers a new user with hashed password."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    hashed_password = generate_password_hash(password)

    try:
        cursor.execute("INSERT INTO users (username, password, plaintext_password, contact) VALUES (?, ?, ?, ?)",
                       (username, hashed_password, password, contact))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False  # Username/contact already exists
    finally:
        conn.close()

def store_otp(contact, otp, expiry):
    """Stores OTP for verification."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET otp = ?, otp_expiry = ? WHERE contact = ?",
                       (otp, expiry, contact))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error storing OTP: {e}")
        return False
    finally:
        conn.close()

def verify_otp(contact, otp):
    """Verifies OTP and marks user as verified if correct."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT otp, otp_expiry FROM users WHERE contact = ?", (contact,))
        result = cursor.fetchone()
        if not result:
            return False
        
        stored_otp, expiry = result
        if stored_otp == otp and datetime.now() < datetime.strptime(expiry, '%Y-%m-%d %H:%M:%S'):
            cursor.execute("UPDATE users SET is_verified = 1, otp = NULL, otp_expiry = NULL WHERE contact = ?",
                          (contact,))
            conn.commit()
            return True
        return False
    finally:
        conn.close()

def login_user(username, password):
    """Logs in a user by verifying credentials."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, password FROM users WHERE username=?", (username,))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user[1], password):
        return user[0]  # Return user ID if login is successful
    return None

def verify_database():
    """Verifies database setup and creates tables if they don't exist."""
    try:
        print("Attempting to connect to database...")
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("Users table not found. Creating tables...")
            create_tables()
            print("Database tables created successfully")
        else:
            print("Database tables already exist")
            
        # Verify table structure
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("Users table columns:", [col[1] for col in columns])
            
        conn.close()
        print("Database verification completed successfully")
    except sqlite3.Error as e:
        print(f"SQLite error during database verification: {str(e)}")
        raise
    except Exception as e:
        print(f"Unexpected error during database verification: {str(e)}")
        raise

if __name__ == "__main__":
    verify_database()

    # Upload both CSV files
    upload_csv_to_db("datamain.csv")
    upload_csv_to_db("DatasetSIH1647.csv")

    print("✅ Database setup complete!")
