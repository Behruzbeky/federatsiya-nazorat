# Local dev server with caching disabled, so edits show up on reload.
import http.server, functools, sys, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 5190
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=root)).serve_forever()
