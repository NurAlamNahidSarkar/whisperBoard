"""
WhisperBoard — Python Flask Backend
Database: PostgreSQL via psycopg2

Install:
    pip install flask flask-cors psycopg2-binary python-dotenv

Run:
    python app.py
"""

import os
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "5432")),
    "dbname":   os.getenv("DB_NAME",     "whisperboard"),
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", "yourpassword"),
}

def get_db():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id          SERIAL       PRIMARY KEY,
            recipient   VARCHAR(100) NOT NULL,
            message     TEXT         NOT NULL,
            hash        INTEGER      NOT NULL,
            created_at  TIMESTAMPTZ  DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient);
        CREATE INDEX IF NOT EXISTS idx_messages_created   ON messages(created_at DESC);
    """)
    cur.close()
    conn.close()
    print("✓ Database ready")


@app.route("/api/messages", methods=["POST"])
def send_message():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    recipient = (data.get("to") or "").strip()
    message   = (data.get("message") or "").strip()

    if not recipient:
        return jsonify({"error": "Recipient is required"}), 400
    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400
    if len(message) > 1000:
        return jsonify({"error": "Message too long (max 1000 chars)"}), 400

    # Purely random — zero connection to sender identity
    anon_hash = random.randint(0, 2_147_483_647)

    try:
        conn = get_db()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            INSERT INTO messages (recipient, message, hash)
            VALUES (%s, %s, %s)
            RETURNING id, recipient AS "to", message, hash, created_at
            """,
            (recipient, message, anon_hash)
        )
        row = dict(cur.fetchone())
        row["created_at"] = row["created_at"].isoformat()
        cur.close(); conn.close()
        return jsonify(row), 201
    except psycopg2.Error as e:
        print(f"DB error: {e}")
        return jsonify({"error": "Database error"}), 500


@app.route("/api/messages", methods=["GET"])
def get_messages():
    filter_to = request.args.get("to", "").strip()
    try:
        conn = get_db()
        cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if filter_to:
            cur.execute(
                "SELECT id, recipient AS \"to\", message, hash, created_at FROM messages WHERE recipient=%s ORDER BY created_at DESC LIMIT 300",
                (filter_to,)
            )
        else:
            cur.execute(
                "SELECT id, recipient AS \"to\", message, hash, created_at FROM messages ORDER BY created_at DESC LIMIT 300"
            )
        rows = [dict(r) for r in cur.fetchall()]
        for r in rows:
            r["created_at"] = r["created_at"].isoformat()
        cur.close(); conn.close()
        return jsonify(rows), 200
    except psycopg2.Error as e:
        print(f"DB error: {e}")
        return jsonify({"error": "Database error"}), 500


@app.route("/api/messages/<int:mid>", methods=["DELETE"])
def delete_message(mid):
    if request.headers.get("X-Admin-Key", "") != os.getenv("ADMIN_KEY", "change-me"):
        return jsonify({"error": "Unauthorized"}), 401
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("DELETE FROM messages WHERE id=%s", (mid,))
        deleted = cur.rowcount
        cur.close(); conn.close()
        if deleted == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"deleted": True, "id": mid}), 200
    except psycopg2.Error as e:
        return jsonify({"error": "Database error"}), 500


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    init_db()
    port = int(os.getenv("PORT", 5000))
    print(f"✓ WhisperBoard running → http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=os.getenv("DEBUG", "true").lower() == "true")
