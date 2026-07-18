from __future__ import annotations

import argparse
import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from streamlit_sortable_multiselect import sortable_multiselect


SUGGESTIONS = [
    {"label": "Python", "value": "python"},
    {"label": "TypeScript", "value": "typescript"},
    {"label": "JavaScript", "value": "javascript"},
    {"label": "Java", "value": "java"},
    {"label": "Kotlin", "value": "kotlin"},
    {"label": "Swift", "value": "swift"},
    {"label": "Rust", "value": "rust"},
    {"label": "Go", "value": "go"},
    {"label": "Ruby", "value": "ruby"},
    {"label": "PHP", "value": "php"},
    {"label": "C", "value": "c"},
    {"label": "C++", "value": "cpp"},
    {"label": "C#", "value": "csharp"},
    {"label": "Dart", "value": "dart"},
    {"label": "Elixir", "value": "elixir"},
]


def parse_api_port(value: str) -> int:
    try:
        port = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("API port must be an integer.") from error
    if not 0 <= port <= 65535:
        raise argparse.ArgumentTypeError("API port must be between 0 and 65535.")
    return port


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--api-port",
        type=parse_api_port,
        default=0,
        help="Port for the local suggestions API. The default 0 selects a free port.",
    )
    return parser.parse_args()


class SuggestionsHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        if parsed_url.path != "/suggest":
            self._send_json(404, {"error": "Not found"})
            return

        query = parse_qs(parsed_url.query).get("q", [""])[0].strip().casefold()
        matches = [
            option
            for option in SUGGESTIONS
            if query in option["label"].casefold()
        ][:10]
        self._send_json(200, {"data": {"items": matches}})

    def log_message(self, format: str, *args: Any) -> None:
        return


@st.cache_resource
def start_suggestions_server(port: int) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("127.0.0.1", port), SuggestionsHandler)
    server.daemon_threads = True
    threading.Thread(
        target=server.serve_forever,
        name="suggestions-api",
        daemon=True,
    ).start()
    return server


args = parse_args()

st.set_page_config(page_title="API Suggestions", layout="centered")

st.title("API Suggestions")

suggestions_server = start_suggestions_server(args.api_port)
api_host, bound_api_port = suggestions_server.server_address
api_url = f"http://{api_host}:{bound_api_port}/suggest"

st.caption(f"Debug API server: {api_host}:{bound_api_port}")

selected = sortable_multiselect(
    "Search programming languages",
    options=[],
    suggestions_api_url=api_url,
    suggestions_response_path="data.items",
    suggestions_label_path="label",
    suggestions_value_path="value",
    suggestions_icon_url_path=None,
    suggestions_min_chars=1,
    suggestions_debounce_ms=300,
    suggestions_loading_message="Searching...",
    suggestions_error_message="Could not load suggestions",
    key="api_suggestions",
)
st.write("Selected order:", selected)
