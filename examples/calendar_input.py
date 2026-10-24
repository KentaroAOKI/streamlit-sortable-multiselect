from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from streamlit_sortable_multiselect import sortable_multiselect

JAPANESE_LABELS = {
    "date_range": "日付（範囲）",
    "month_single": "年月（単一）",
    "single": "単一",
    "range": "範囲",
    "add": "追加",
    "start": "開始日",
    "end": "終了日",
    "date": "日付",
    "month": "年月",
    "calendar_input": "入力方法",
    "selection_kind": "選択方法",
    "invalid_value": "選択可能な範囲内で、開始日が終了日以前になるように指定してください。",
    "duplicate_value": "この項目はすでに選択されています。",
    "incomplete_selection": "追加する値をすべて入力してください。",
    "range_too_long": "開始日と終了日を含めて{max_range_days}日以内で指定してください。",
}

st.set_page_config(page_title="Sortable Calendar", layout="centered")
st.title("Sortable Calendar")

st.subheader("Date ranges and single months")
selected = sortable_multiselect(
    "Reporting periods",
    input_mode="date_month",
    min_value=date(2026, 1, 1),
    max_value=date(2028, 12, 31),
    max_range_days=31,
    default=["2026-10-01/2026-10-24", "2026-11", "2026-12-01/2026-12-15", "2027-01"],
    show_numbers=True,
    max_selections=8,
    color_palette=["#e0f2fe", "#dcfce7", "#fce7f3"],
    calendar_labels=JAPANESE_LABELS,
    empty_message="期間が選択されていません。",
    max_selections_placeholder="選択数の上限に達しました。",
    key="mixed_calendar",
)
st.write("Selected order:", selected)

st.subheader("Dates only")
selected_dates = sortable_multiselect(
    "Event dates",
    input_mode="date",
    min_value="2026-01-01",
    max_value="2026-12-31",
    default=["2026-10-24"],
    show_numbers=True,
    selected_position="top",
    calendar_labels=JAPANESE_LABELS,
    key="date_calendar",
)
st.write("Selected order:", selected_dates)

st.subheader("Months only")
selected_months = sortable_multiselect(
    "Budget months",
    input_mode="month",
    min_value="2026-01",
    max_value="2027-12",
    default=["2026-10/2026-12"],
    key="month_calendar",
)
st.write("Selected order:", selected_months)

st.subheader("Form submission")
with st.form("calendar_form"):
    form_values = sortable_multiselect(
        "Submission periods",
        input_mode="date_month",
        min_value="2026-01",
        max_value="2028-12",
        key="form_calendar",
    )
    submitted = st.form_submit_button("Submit periods")
if submitted:
    st.write("Submitted periods:", form_values)
