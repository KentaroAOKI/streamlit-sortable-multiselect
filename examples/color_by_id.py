"""Show that item colors can be bound to an item id instead of a position."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Mapping

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from streamlit_sortable_multiselect import sortable_multiselect

# The ids look nothing like the labels, so a color that lands on the right item
# can only have been matched on the id.
LANGUAGES = [
    {"label": "Python", "value": "lang-8f21"},
    {"label": "TypeScript", "value": "lang-3c07"},
    {"label": "Rust", "value": "lang-b45e"},
    {"label": "Go", "value": "lang-1d92"},
]

ID_COLORS: dict[str, Any] = {
    "lang-8f21": "#3776ab",
    "lang-3c07": "#3178c6",
    "lang-b45e": {"background": "#000000", "text": "#ffffff", "border": "#f74c00"},
    "lang-1d92": "#00add8",
}

POSITION_COLORS: dict[int, Any] = {
    1: "#fde68a",
    2: "#e5e7eb",
    3: "#fed7aa",
    4: "#e0e7ff",
}

DEFAULT_ORDER = [option["value"] for option in LANGUAGES]
LABELS_BY_ID = {option["value"]: option["label"] for option in LANGUAGES}


def swatch(color: str | Mapping[str, str]) -> str:
    background = color["background"] if isinstance(color, Mapping) else color
    return (
        '<span style="display:inline-block;width:14px;height:14px;border-radius:4px;'
        "border:1px solid rgba(17,24,39,0.18);vertical-align:middle;"
        f'background:{background}"></span>'
    )


st.set_page_config(page_title="Color by ID", layout="centered")

st.title("Color by ID")

st.write(
    "Both lists hold the same four items. The left list assigns colors by position, "
    "the way it worked before. The right list assigns colors by item id. "
    "**Drag an item in each list and watch what the color follows.**"
)

by_position_column, by_id_column = st.columns(2)

with by_position_column:
    st.subheader("By position")
    st.caption("Colors stay with the slot.")
    position_order = sortable_multiselect(
        "Colored by position",
        options=LANGUAGES,
        default=DEFAULT_ORDER,
        show_numbers=True,
        order_colors=POSITION_COLORS,
        key="colors_by_position",
    )

with by_id_column:
    st.subheader("By id")
    st.caption("Colors travel with the item.")
    id_order = sortable_multiselect(
        "Colored by id",
        options=LANGUAGES,
        default=DEFAULT_ORDER,
        show_numbers=True,
        value_colors=ID_COLORS,
        key="colors_by_id",
    )

st.divider()

st.subheader("The id to color binding")

st.write("This mapping never changes, whatever order the lists end up in:")

binding_rows = "".join(
    f"<tr><td><code>{item_id}</code></td><td>{LABELS_BY_ID[item_id]}</td>"
    f"<td>{swatch(color)}</td></tr>"
    for item_id, color in ID_COLORS.items()
)
st.markdown(
    "<table><thead><tr><th>Item id</th><th>Label</th><th>Color</th></tr></thead>"
    f"<tbody>{binding_rows}</tbody></table>",
    unsafe_allow_html=True,
)

st.code(
    "value_colors={\n"
    + "".join(f"    {item_id!r}: {color!r},\n" for item_id, color in ID_COLORS.items())
    + "}",
    language="python",
)

st.subheader("What each list returns now")

st.write(
    "The component returns ids in display order. Compare each id against the color "
    "shown above: on the right they still match after reordering, on the left they do not."
)

result_columns = st.columns(2)
with result_columns[0]:
    st.write("By position:")
    st.json([{"position": index + 1, "id": item_id} for index, item_id in enumerate(position_order)])
with result_columns[1]:
    st.write("By id:")
    st.json(
        [
            {"position": index + 1, "id": item_id, "color": ID_COLORS[item_id]}
            for index, item_id in enumerate(id_order)
        ]
    )
