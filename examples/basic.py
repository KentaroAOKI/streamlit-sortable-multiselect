from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from streamlit_sortable_multiselect import sortable_multiselect

st.set_page_config(page_title="Sortable Multiselect", layout="centered")

st.title("Sortable Multiselect")

selected = sortable_multiselect(
    "Languages",
    options=["Python","TypeScript", "Rust", "Go", "Java", "Kotlin", "C#", "Swift", "PHP"],
    default=["Python", "TypeScript"],
    key="simple_languages",
)

st.write("Selected order:", selected)


selected = sortable_multiselect(
    "Languages",
    options=[
        {"label": "Python", "value": "python", "icon_url": "https://www.python.org/static/favicon.ico"},
        {"label": "TypeScript", "value": "typescript", "icon_url": "https://www.typescriptlang.org/favicon-32x32.png"},
        {"label": "Rust", "value": "rust", "icon_url": "https://rust-lang.org/static/images/favicon.svg"},
        {"label": "Go", "value": "go", "icon_url": "https://go.dev/images/favicon-gopher.png"},
        {"label": "Java", "value": "java", "icon_url": "https://www.oracle.com/favicon.ico"},
        {"label": "Kotlin", "value": "kotlin", "icon_url": "https://kotlinlang.org/assets/images/favicon.ico"},
        {"label": "C#", "value": "csharp", "icon_url": "https://dotnet.microsoft.com/favicon.ico"},
        {"label": "Swift", "value": "swift", "icon_url": "https://developer.apple.com/swift/images/swift-og.png"},
        {"label": "PHP", "value": "php", "icon_url": "https://www.php.net/favicon.ico"},
    ],
    default=["python", "typescript"],
    placeholder="Add a language...",
    show_numbers=False,
    show_move_buttons=False,
    base_color="#eef2ff",
    order_colors={1: "#fee2e2", 3: "#dcfce7"},
    key="languages",
)

st.write("Selected order:", selected)
