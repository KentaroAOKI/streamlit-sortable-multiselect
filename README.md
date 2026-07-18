# streamlit-sortable-multiselect

A Streamlit custom component for searching, selecting, and reordering multiple string values.

## Install

```bash
python -m pip install streamlit-sortable-multiselect
```

Upgrade an existing installation:

```bash
python -m pip install --upgrade streamlit-sortable-multiselect
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
    icon_size=24,
    options_max_height=260,
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
| `icon_size` | `int` | `20` | Icon display size in pixels for `icon_url` images. Images are displayed inside a square area while preserving their aspect ratio. |
| `options_max_height` | `int` | `190` | Maximum height in pixels for the available options dropdown. |
| `suggestions_api_url` | `str \| None` | `None` | Absolute HTTP(S) endpoint used to fetch suggestions in the browser. `None` disables API suggestions. |
| `suggestions_query_param` | `str` | `"q"` | Query parameter name used to send the current search text. |
| `suggestions_response_path` | `str` | `""` | Dot-separated path to the suggestions array in the JSON response. Empty means the response root. |
| `suggestions_label_path` | `str` | `"label"` | Dot-separated path to each suggestion's display label. |
| `suggestions_value_path` | `str` | `"value"` | Dot-separated path to each suggestion's returned value. |
| `suggestions_icon_url_path` | `str \| None` | `"icon_url"` | Optional dot-separated path to each suggestion's icon URL. `None` disables API icons. |
| `suggestions_headers` | `Mapping[str, str] \| None` | `None` | HTTP headers sent with suggestions requests. Header values are visible to browser users and must not contain secrets. |
| `suggestions_min_chars` | `int` | `1` | Minimum trimmed query length before requesting suggestions. Use `0` to allow an empty query. |
| `suggestions_debounce_ms` | `int` | `300` | Delay in milliseconds between the latest input and the API request. |
| `suggestions_loading_message` | `str` | `"Loading suggestions..."` | Message shown while an API request is in progress. |
| `suggestions_error_message` | `str` | `"Failed to load suggestions"` | Message shown when the request or response cannot be processed. |
| `key` | `str \| None` | `None` | Optional Streamlit component key. Use this when rendering multiple sortable multiselects. |

Option dictionaries use this shape:

```python
{"label": "Python", "value": "python", "icon_url": "https://www.python.org/static/favicon.ico"}
```

`icon_url` may be omitted. The returned value is always the `value`, not the display `label`.

## API Suggestions

Set `suggestions_api_url` to request suggestions as the user types. Static `options` that match the query are shown first, followed by API results. Duplicate `value` entries prefer the static option.

```python
selected = sortable_multiselect(
    "Repositories",
    options=[{"label": "Streamlit", "value": "streamlit/streamlit"}],
    suggestions_api_url="https://api.example.com/repositories",
    suggestions_query_param="query",
    suggestions_response_path="data.items",
    suggestions_label_path="name",
    suggestions_value_path="full_name",
    suggestions_icon_url_path="owner.avatar_url",
    suggestions_headers={"X-Public-Client": "streamlit-app"},
    suggestions_min_chars=2,
    suggestions_debounce_ms=300,
    suggestions_loading_message="Searching repositories...",
    suggestions_error_message="Repository search is unavailable",
)
```

The example above accepts a response such as:

```json
{
  "data": {
    "items": [
      {
        "name": "streamlit-sortable-multiselect",
        "full_name": "example/streamlit-sortable-multiselect",
        "owner": {
          "avatar_url": "https://example.com/avatar.png"
        }
      }
    ]
  }
}
```

Requests are made directly from the component iframe, so the endpoint must allow browser requests with CORS. Values in `suggestions_headers` are exposed to browser users. Do not pass API secrets, private bearer tokens, or other credentials. Use a server-side proxy when authentication must remain private.

The component sends a `GET` request after the trimmed input reaches
`suggestions_min_chars` and remains unchanged for `suggestions_debounce_ms`.
Changing the input cancels the previous in-flight request. Set `options=[]` to
use only API results. Selected API values remain selected when a later query
returns different suggestions.

Build the frontend before packaging or using release mode:

```bash
cd streamlit_sortable_multiselect/frontend
npm run build
```

Run the example app:

```bash
streamlit run examples/basic.py
streamlit run examples/api_suggestions.py
```

`api_suggestions.py` starts a CORS-enabled sample API on a local random port, so
it can be tried without a separate API process. This embedded server is intended
for local development; use a separately deployed HTTPS API in remote deployments.
The Streamlit page displays the address and port selected for the API. Test the
endpoint from the same machine with:

```bash
curl "http://127.0.0.1:<displayed-port>/suggest?q=py"
```

Pass a fixed API port after `--` when needed:

```bash
streamlit run examples/api_suggestions.py -- --api-port 8765
```

The embedded API binds to `127.0.0.1`. Because suggestions are fetched by the
browser, it works only when the browser and Streamlit run on the same machine.
For Docker, another computer, or a hosted Streamlit app, configure
`suggestions_api_url` with a browser-accessible HTTPS endpoint instead.

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
