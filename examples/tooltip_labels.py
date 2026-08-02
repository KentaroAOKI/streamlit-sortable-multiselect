"""Show the hover tooltip that appears only when a label does not fit."""

from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from streamlit_sortable_multiselect import sortable_multiselect

# A mix of short and long labels: only the long ones should get a tooltip, and
# only while the column they are in is too narrow to show them in full.
REPORTS = [
    "Summary",
    "Quarterly revenue by region, product line, and sales channel",
    "Churn",
    "Monthly active users segmented by acquisition source and plan tier",
    "Refunds and chargebacks reconciled against the payment processor ledger",
    "Costs",
]

st.set_page_config(page_title="Label tooltips", layout="wide")

st.title("Label tooltips")

st.write(
    "Both dropdowns list the same six reports. The left one is too narrow for the "
    "long labels, so they are cut off with an ellipsis. The right one has room for "
    "them. **Open both dropdowns and hover the labels.** A cut-off label shows the "
    "full text in a tooltip anchored to it; a label that fits shows nothing."
)

narrow_column, wide_column = st.columns([1, 2])

with narrow_column:
    st.subheader("Narrow: labels are cut off")
    st.caption("Hover a cut-off label to see its full text.")
    narrow_selection = sortable_multiselect(
        "Reports",
        options=REPORTS,
        placeholder="Open me...",
        options_max_height=240,
        key="tooltip_narrow",
    )

with wide_column:
    st.subheader("Wide: labels fit")
    st.caption("Hovering here shows no tooltip, because nothing is hidden.")
    wide_selection = sortable_multiselect(
        "Reports",
        options=REPORTS,
        placeholder="Open me...",
        options_max_height=240,
        key="tooltip_wide",
    )

st.divider()

st.subheader("Styling the tooltip")

st.write(
    "`tooltip_color` takes the same color form as item colors. Both lists below are "
    "narrow, so both cut their labels off; only the tooltip styling differs."
)

light_column, brand_column = st.columns(2)

with light_column:
    st.caption("Light, with a border to separate it from the page.")
    sortable_multiselect(
        "Reports",
        options=REPORTS,
        placeholder="Open me...",
        tooltip_color={"background": "#ffffff", "text": "#111827", "border": "#d1d5db"},
        key="tooltip_light",
    )

with brand_column:
    st.caption("A background only: the text color follows for contrast.")
    sortable_multiselect(
        "Reports",
        options=REPORTS,
        placeholder="Open me...",
        tooltip_color="#fde68a",
        key="tooltip_brand",
    )

st.divider()

st.subheader("What to look for")

st.markdown(
    """
1. **Cut-off label, narrow list** — hovering `Quarterly revenue by region, ...`
   on the left shows the whole label in a tooltip.
2. **Short label, narrow list** — hovering `Summary` shows nothing. The tooltip is
   conditional, not attached to every row.
3. **Same label, wide list** — hovering the long label on the right shows nothing
   either, because it is fully visible.
4. **Move the pointer down the list** — each row you enter is highlighted *and*
   measured, so the tooltip keeps working as you sweep through the options rather
   than only on the first row you touch.
5. **Type to filter, then hover** — the tooltip always matches the label currently
   in the row, never the one that was there before.
6. **Hover a row near the top of the list** — the tooltip flips below the label
   instead of being cut off by the top edge of the component frame.
7. **Scroll the dropdown while a tooltip is open** — it disappears rather than
   floating away from the row it belongs to.
8. **The styled pair above** — the light one keeps a visible outline including
   around its arrow, and the yellow one gets dark text without being told to.
"""
)

st.caption(
    "Selected items are not part of this: their labels wrap onto more lines instead "
    "of being cut off, so nothing is hidden and no tooltip appears. Add an item to "
    "either list to see that."
)

st.write("Narrow selection:", narrow_selection)
st.write("Wide selection:", wide_selection)
