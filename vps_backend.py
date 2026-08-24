import http.server
import socketserver
import sqlite3
import json
import re
import sys
import os

PORT = 5000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tapeball.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, data TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS matches (code TEXT PRIMARY KEY, data TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS completed_matches (id TEXT PRIMARY KEY, data TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS teams (name TEXT PRIMARY KEY, data TEXT)''')
    conn.commit()
    conn.close()

init_db()

class VPSAPIHandler(http.server.BaseHTTPRequestHandler):

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        if self.path == '/api/health':
            self.send_json({"status": "ok", "db": DB_FILE})
        elif self.path == '/api/tournaments':
            c.execute("SELECT id, data FROM tournaments")
            rows = c.fetchall()
            result = {r[0]: json.loads(r[1]) for r in rows}
            self.send_json(result)
        elif self.path.startswith('/api/match/'):
            code = self.path.replace('/api/match/', '')
            c.execute("SELECT data FROM matches WHERE code = ?", (code,))
            row = c.fetchone()
            if row:
                self.send_json(json.loads(row[0]))
            else:
                self.send_json(None, status=404)
        elif self.path == '/api/completed-matches':
            c.execute("SELECT data FROM completed_matches")
            rows = c.fetchall()
            result = [json.loads(r[0]) for r in rows]
            self.send_json(result)
        elif self.path == '/api/teams':
            c.execute("SELECT data FROM teams")
            rows = c.fetchall()
            result = [json.loads(r[0]) for r in rows]
            self.send_json(result)
        else:
            self.send_json({"error": "Not Found"}, status=404)

        conn.close()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        data = json.loads(body) if body else {}

        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        if self.path == '/api/tournaments':
            tour_id = data.get('id')
            if tour_id:
                c.execute("INSERT OR REPLACE INTO tournaments (id, data) VALUES (?, ?)", (tour_id, json.dumps(data)))
                conn.commit()
                self.send_json({"status": "saved", "id": tour_id})
            else:
                self.send_json({"error": "Missing tour id"}, status=400)
        elif self.path.startswith('/api/match/'):
            code = self.path.replace('/api/match/', '')
            c.execute("INSERT OR REPLACE INTO matches (code, data) VALUES (?, ?)", (code, json.dumps(data)))
            conn.commit()
            self.send_json({"status": "saved", "code": code})
        elif self.path == '/api/completed-matches':
            match_id = data.get('id', str(Date.now() if 'Date' in globals() else 1))
            c.execute("INSERT OR REPLACE INTO completed_matches (id, data) VALUES (?, ?)", (match_id, json.dumps(data)))
            conn.commit()
            self.send_json({"status": "saved", "id": match_id})
        elif self.path == '/api/teams':
            c.execute("DELETE FROM teams")
            for t in data:
                c.execute("INSERT OR REPLACE INTO teams (name, data) VALUES (?, ?)", (t, json.dumps(t)))
            conn.commit()
            self.send_json({"status": "saved"})
        else:
            self.send_json({"error": "Not Found"}, status=404)

        conn.close()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

print(f"====================================================")
print(f" Tapeball VPS API Storage Server Started")
print(f" Port: {PORT}")
print(f" Database: {DB_FILE}")
print(f" CORS Enabled for GitHub / Vercel Hosting")
print(f"====================================================")

with socketserver.TCPServer(("", PORT), VPSAPIHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
