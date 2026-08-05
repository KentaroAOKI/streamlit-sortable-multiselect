from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from streamlit_sortable_multiselect import sortable_multiselect

st.set_page_config(page_title="Sortable Multiselect", layout="centered")

st.title("Sortable Multiselect")

st.subheader("1. Basic sortable multiselect")
st.caption(
    "Uses plain string options and an initial default. Select, remove, drag, or use the move "
    "buttons to change the returned order."
)

selected_1st = sortable_multiselect(
    "Default languages",
    options=["Python", "TypeScript", "Rust", "Go", "Java", "Kotlin", "C#", "Swift", "PHP"],
    default=["Python", "TypeScript"],
    key="simple_languages_1st",
)

st.write("Selected order:", selected_1st)

st.subheader("2. Inline single selection")
st.caption(
    "Displays one selected structured option inside the search control. Selecting another option "
    "replaces it while preserving its icon and option-specific color."
)

selected_2nd = sortable_multiselect(
    "Primary language",
    options=[
        {
            "label": "Python",
            "value": "python",
            "icon_url": "https://www.python.org/static/favicon.ico",
            "color": "#dbeafe",
        },
        {
            "label": "TypeScript",
            "value": "typescript",
            "icon_url": "https://www.typescriptlang.org/favicon-32x32.png",
            "color": "#e0f2fe",
        },
        {"label": "Rust", "value": "rust", "color": "#ffedd5"},
        {"label": "Go", "value": "go", "color": "#cffafe"},
    ],
    default=["python"],
    placeholder="Search for a replacement...",
    max_selections=1,
    single_select_display=True,
    icon_size=24,
    key="primary_language",
)

st.write("Selected value:", selected_2nd)

st.subheader("3. Layout and selection limits")
st.caption(
    "Shows selected items above the search control, hides move buttons, limits selection to four, "
    "and combines a base color with overrides for positions 1 and 3."
)

selected_3rd = sortable_multiselect(
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

st.write("Selected order:", selected_3rd)

st.subheader("4. Position colors and priority")
st.caption(
    "Applies medal colors by position and gives order colors priority over colors defined on the "
    "individual options. Reordering changes which item receives each medal color."
)

selected_4th = sortable_multiselect(
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
    # Position colors win when they define the same fields as an option color.
    color_priority=["order"],
    key="podium",
)

st.write("Selected order:", selected_4th)

st.subheader("5. Repeating palette and value color")
st.caption(
    "Cycles a three-color palette across positions while the value-specific Chorus highlight "
    "follows that item when it is reordered."
)

selected_5th = sortable_multiselect(
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

st.write("Selected order:", selected_5th)

if "form_default_revision" not in st.session_state:
    st.session_state.form_default_revision = 0

st.subheader("6. Default source inside a form")
st.caption(
    "Edits made here are submitted together by the form. The first submitted value becomes the "
    "default for example 7."
)

with st.form("language_defaults"):
    selected_6th = sortable_multiselect(
        "Default languages",
        options=["Python", "TypeScript", "Rust", "Go", "Java", "Kotlin", "C#", "Swift", "PHP"],
        default=["Python", "TypeScript"],
        key="simple_languages_1st",
    )
    submitted = st.form_submit_button("Apply default")

if submitted:
    st.session_state.form_default_revision += 1

st.write("Submitted default order:", selected_6th)

st.subheader("7. Reapplying a submitted default")
st.caption(
    "Uses the first value submitted by example 6. Each form submission increments "
    "default_revision, so the same default can be reapplied after this selection is changed manually."
)

selected_7th = sortable_multiselect(
    "Primary language from the form",
    options=["Python", "TypeScript", "Rust", "Go", "Java", "Kotlin", "C#", "Swift", "PHP"],
    default=selected_6th[:1],
    key="simple_languages",
    max_selections=1,
    single_select_display=True,
    default_revision=st.session_state.form_default_revision,
)

st.write("Selected value:", selected_7th)
