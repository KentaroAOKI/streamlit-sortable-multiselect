from __future__ import annotations

import streamlit as st

from streamlit_sortable_multiselect import sortable_multiselect

st.set_page_config(page_title="Sortable Multiselect", layout="centered")

st.title("Sortable Multiselect")

selected = sortable_multiselect(
    "Languages",
    options=["Python", "TypeScript", "Rust", "Go", "Java", "Kotlin", "スイフト"],
    default=["Python", "TypeScript"],
    placeholder="Add a language...",
    key="languages",
)

st.write("Selected order:", selected)
