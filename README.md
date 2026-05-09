# streamlit-sortable-multiselect

A Streamlit custom component for searching, selecting, and reordering multiple string values.

## Install

```bash
python -m pip install streamlit-sortable-multiselect
```

For local development:

```bash
python -m pip install -e ".[dev]"
```

For frontend development:

```bash
cd streamlit_sortable_multiselect/frontend
npm install
npm run dev
```

## Usage

```python
import streamlit as st
from streamlit_sortable_multiselect import sortable_multiselect

selected = sortable_multiselect(
    "Favorite frameworks",
    options=[
        {"label": "Streamlit", "value": "streamlit", "icon_url": "https://streamlit.io/images/brand/streamlit-mark-color.png"},
        {"label": "FastAPI", "value": "fastapi", "icon_url": "https://fastapi.tiangolo.com/img/favicon.png"},
        {"label": "Django", "value": "django"},
        {"label": "Flask", "value": "flask"},
    ],
    default=["streamlit"],
    placeholder="Search frameworks...",
    show_move_buttons=True,
    show_numbers=True,
    base_color="#eef2ff",
    order_colors={1: "#fee2e2", 2: "#dcfce7"},
    max_selections=3,
    max_selections_placeholder="Choose up to 3 frameworks",
    empty_message="No frameworks selected",
    no_options_placeholder="All frameworks selected",
    selected_position="top",
)

st.write(selected)
```

## Settings

`sortable_multiselect` returns the selected option values as a `list[str]` in the current display order.

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `str` | required | Label displayed above the component. |
| `options` | `Sequence[str \| Mapping[str, Any]]` | required | Available options. Each option can be a plain string, or a dictionary with `label`, `value`, and optional `icon_url`. Option values must be unique. |
| `default` | `Sequence[str] \| None` | `None` | Initially selected values, in the initial order. Values must exist in `options` and must not contain duplicates. |
| `placeholder` | `str` | `"Select..."` | Placeholder shown in the search/add input when options are available. |
| `disabled` | `bool` | `False` | Disables searching, selecting, removing, dragging, and move buttons. |
| `show_move_buttons` | `bool` | `True` | Shows up/down buttons on selected items. Drag sorting remains available unless `disabled=True`. |
| `show_numbers` | `bool` | `False` | Shows 1-based position numbers before selected item labels. |
| `base_color` | `str \| None` | `None` | Background color applied to all selected items. Accepts CSS color values such as `"#eef2ff"` or `"lightblue"`. |
| `order_colors` | `Mapping[int, str] \| None` | `None` | Per-position selected item background colors. Keys are 1-based positions, for example `{1: "#fee2e2", 2: "#dcfce7"}`. These override `base_color` for matching positions. |
| `max_selections` | `int \| None` | `None` | Maximum number of selected items. `None` means no limit. Use `0` to prevent any selections. |
| `max_selections_placeholder` | `str` | `"Selection limit reached"` | Placeholder shown when `max_selections` has been reached. This takes precedence over `placeholder` and `no_options_placeholder`. |
| `empty_message` | `str` | `"No items selected"` | Message shown where the selected list appears when no items are selected. |
| `no_options_placeholder` | `str` | `"No more options"` | Placeholder shown when every option is already selected and there are no more options to add. |
| `selected_position` | `str` | `"bottom"` | Position of the selected item list relative to the search/add input. Use `"bottom"` or `"top"`. |
| `key` | `str \| None` | `None` | Optional Streamlit component key. Use this when rendering multiple sortable multiselects. |

Option dictionaries use this shape:

```python
{"label": "Python", "value": "python", "icon_url": "https://www.python.org/static/favicon.ico"}
```

`icon_url` may be omitted. The returned value is always the `value`, not the display `label`.

Build the frontend before packaging or using release mode:

```bash
cd streamlit_sortable_multiselect/frontend
npm run build
```

Run the example app:

```bash
streamlit run examples/basic.py
```

## Release

Build and check the distribution files:

```bash
cd streamlit_sortable_multiselect/frontend
npm install
npm run build
cd ../..
python -m pip install -e ".[dev]"
python -m build
python -m twine check dist/*
```

Upload to PyPI with an API token:

```bash
python -m twine upload dist/*
```
