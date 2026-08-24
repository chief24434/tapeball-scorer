import http.server
import socketserver
import os
import sys

PORT = 8000

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep logs clean and readable
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args))

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), QuietHTTPRequestHandler) as httpd:
    print(f"====================================================")
    print(f" Tapeball Scorer & Tournament System Server Started")
    print(f" Local URL: http://localhost:{PORT}")
    print(f" Network URL: http://0.0.0.0:{PORT} (For VPS / Phones)")
    print(f" Press Ctrl+C to stop the server.")
    print(f"====================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
