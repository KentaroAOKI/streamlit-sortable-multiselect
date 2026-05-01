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
)

st.write(selected)
```

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
