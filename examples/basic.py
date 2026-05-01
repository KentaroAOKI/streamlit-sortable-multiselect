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
    options=["Python", "TypeScript", "Rust", "Go", "Java", "Kotlin"],
    default=["Python", "TypeScript"],
    placeholder="Add a language...",
    show_numbers=False,
    show_move_buttons=False,
    base_color="#eef2ff",
    order_colors={1: "#fee2e2", 3: "#dcfce7"},
    key="languages",
)

st.write("Selected order:", selected)
