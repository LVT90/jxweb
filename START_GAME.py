#!/usr/bin/env python3
"""A local-only HTTP file server. It never connects to the Internet."""
import http.server
import os
import socketserver
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
HOST = '0.0.0.0'
PORT = 8765
URL = f'http://127.0.0.1:{PORT}/index.html'
PROJECT_MARKER = b'Idle Offline V23'

os.chdir(PROJECT_ROOT)

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

Handler.extensions_map.update({
    '.webp': 'image/webp',
    '.js': 'application/javascript; charset=utf-8',
    '.woff2': 'font/woff2',
    '.css': 'text/css; charset=utf-8'
})

class Server(socketserver.ThreadingTCPServer):
    # Windows SO_REUSEADDR can let two processes bind the same port.
    # Keep the game port exclusive there; POSIX can safely reuse TIME_WAIT.
    allow_reuse_address = os.name != 'nt'
    daemon_threads = True


def project_server_is_running():
    """Only reuse port 8765 when it is serving this project's index page."""
    try:
        with urllib.request.urlopen(URL, timeout=1.5) as response:
            return response.status == 200 and PROJECT_MARKER in response.read(65536)
    except (OSError, urllib.error.URLError):
        return False


def open_game():
    webbrowser.open(URL)

if __name__ == '__main__':
    try:
        server = Server((HOST, PORT), Handler)
    except OSError as error:
        if project_server_is_running():
            print('Game da chay tai: ' + URL)
            open_game()
            sys.exit(0)
        print(f'Khong the mo cong {PORT}: cong dang bi ung dung khac su dung.')
        print('Hay tat ung dung chiem cong roi chay lai START_GAME.bat.')
        sys.exit(1)

    with server:
        print('VO LAM IDLE - OFFLINE: ' + URL)
        print('Bam Ctrl+C de tat server. Toan bo du lieu luu o trinh duyet cua may nay.')
        threading.Thread(target=lambda: (time.sleep(0.8), open_game()), daemon=True).start()
        try:
            server.serve_forever(poll_interval=0.25)
        except KeyboardInterrupt:
            print('Da dung game.')
