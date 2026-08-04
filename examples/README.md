# Examples

These Streamlit apps demonstrate the main features of
`streamlit-sortable-multiselect`.

## Setup

Run the examples from the repository root after installing the project:

```bash
python -m pip install -e ".[dev]"
```

Select options by typing in the search box or choosing from the dropdown. Drag
selected items to reorder them. When move buttons are enabled, they provide an
alternative way to change the order. Each app displays the selected values in
their current order.

## Basic Example

File: [`basic.py`](basic.py)

This app renders five sortable multiselect components.

The first component demonstrates the minimal string-based API:

- options provided as plain strings
- initial selections provided with `default`
- default search, selection, removal, drag, and move-button behavior
- selected strings returned in display order

The second component demonstrates structured options and visual settings:

- a single selected item displayed inside the search control
- direct replacement while keeping `max_selections=1`
- an inline remove button, icon, and item color

The remaining components demonstrate structured options and visual settings:

- separate `label` and `value` fields
- option icons loaded from `icon_url`
- selected items displayed above the search box
- custom icon size, base color, and position-specific colors
- hidden move buttons
- a maximum of four selections
- custom empty, limit, and no-options messages
- custom dropdown height
- position colors, option colors, palettes, and value colors

Internet access is required to display the external icon images. The component
continues to work if an icon cannot be loaded.

Run it with:

```bash
streamlit run examples/basic.py
```

## Color by ID Example

File: [`color_by_id.py`](color_by_id.py)

This app compares `order_colors`, whose colors stay with positions, with
`value_colors`, whose colors follow option values as items are reordered. The
option values intentionally differ from their labels so the identity-based
matching is visible.

Run it with:

```bash
streamlit run examples/color_by_id.py
```

## Tooltip Labels Example

File: [`tooltip_labels.py`](tooltip_labels.py)

This app places the same long labels in narrow and wide columns. Hovering a
truncated label in the narrow dropdown shows the full text, while labels that
fit do not show a tooltip. Additional components demonstrate `tooltip_color`
with light, bordered, and background-only styles.

Run it with:

```bash
streamlit run examples/tooltip_labels.py
```

## API Suggestions Example

File: [`api_suggestions.py`](api_suggestions.py)

This app demonstrates suggestions loaded from an HTTP API as the user types.
It uses `options=[]`, so all available choices come from the API response.

The example is self-contained. It starts a `ThreadingHTTPServer` in a daemon
thread and exposes:

```text
GET /suggest?q=<search-text>
```

The server filters its programming-language dataset and returns up to ten
matching items:

```json
{
  "data": {
    "items": [
      {
        "label": "Python",
        "value": "python",
        "color": "#3776ab"
      }
    ]
  }
}
```

The component maps this response using:

- `suggestions_response_path="data.items"`
- `suggestions_label_path="label"`
- `suggestions_value_path="value"`
- `suggestions_color_path="color"`
- `suggestions_min_chars=1`
- `suggestions_debounce_ms=300`

Run it with an automatically selected free API port:

```bash
streamlit run examples/api_suggestions.py
```

The page displays the actual API address and port. To verify the server from
another terminal, replace `PORT` with that displayed port:

```bash
curl "http://127.0.0.1:PORT/suggest?q=py"
```

Use a fixed API port by passing a script argument after `--`:

```bash
streamlit run examples/api_suggestions.py -- --api-port 8765
```

Then verify it with:

```bash
curl "http://127.0.0.1:8765/suggest?q=py"
```

Port `0`, which is the default, asks the operating system to select a free
port. Explicit ports must be between `0` and `65535`. Startup fails if the
selected nonzero port is already in use.

The sample server includes CORS support for browser requests and preflight
requests. It is intended only for local development. Because it binds to
`127.0.0.1` and the component fetches suggestions in the browser, the browser
and Streamlit must run on the same machine. For Docker, remote hosts, or
deployed Streamlit apps, use a separately deployed browser-accessible HTTPS
API.
