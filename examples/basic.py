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
    max_selections=4,
    max_selections_placeholder="You cannot select more than four.",
    empty_message="No languages selected.",
    no_options_placeholder="All languages selected.",
    selected_position="top",
    icon_size=28,
    options_max_height=360,
    key="languages",
)

st.write("Selected order:", selected)


selected = sortable_multiselect(
    "Podium",
    options=[
        {"label": "Python", "value": "python", "color": "#3776ab"},
        {"label": "TypeScript", "value": "typescript", "color": "#3178c6"},
        {
            "label": "Rust",
            "value": "rust",
            "color": {"background": "#000000", "text": "#ffffff", "border": "#f74c00"},
        },
        {"label": "Go", "value": "go", "color": "#00add8"},
        {"label": "Elixir", "value": "elixir"},
    ],
    default=["python", "rust", "go"],
    show_numbers=True,
    # Medal colors by position: 1 and 2 count from the top, -1 counts from the bottom.
    order_colors={
        1: {"background": "#fde68a", "border": "#f59e0b"},
        2: {"background": "#e5e7eb", "border": "#9ca3af"},
        -1: {"background": "#fed7aa", "border": "#ea580c"},
    },
    # Position wins over the color each option carries.
    color_priority=["order"],
    key="podium",
)

st.write("Selected order:", selected)


selected = sortable_multiselect(
    "Playlist",
    options=["Intro", "Verse", "Chorus", "Bridge", "Outro", "Encore"],
    default=["Intro", "Verse", "Chorus", "Bridge"],
    show_numbers=True,
    # The palette repeats once there are more items than colors.
    color_palette=["#eef2ff", "#f0fdf4", "#fef2f2"],
    # Highlight one value wherever it ends up in the order.
    value_colors={"Chorus": {"background": "#fef9c3", "border": "#facc15"}},
    key="playlist",
)

st.write("Selected order:", selected)
