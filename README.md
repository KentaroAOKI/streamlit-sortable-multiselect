# streamlit-sortable-multiselect

A Streamlit custom component for searching, selecting, and reordering options,
dates, months, and date/month ranges. Selected items can be reordered by dragging
or using move buttons, and are returned as an ordered `list[str]`.

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

The default `input_mode="options"` provides searchable options. For calendar
inputs, see [Calendar Input](#calendar-input), including date ranges, single
months, selection bounds, and Japanese labels and messages.

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

`sortable_multiselect` returns selected values as a `list[str]` in the current
display order. Calendar values use the formats in [Returned Values](#returned-values).

| Argument | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `str` | required | Label displayed above the component. |
| `options` | `Sequence[str \| Mapping[str, Any]]` | `()` | Available options. Each option can be a plain string, or a dictionary with `label`, `value`, and optional `icon_url` and `color`. Option values must be unique. In calendar modes, optional entries supply labels, icons, and colors for matching calendar values. |
| `default` | `Sequence[str] \| None` | `None` | Initially selected values, in the initial order. Changing the values or their order replaces the current selection. In options mode, values must exist in `options`. Calendar defaults must match the mode and bounds. Duplicates are not allowed. |
| `default_revision` | `str \| int \| None` | `None` | Change this value to reapply `default` when its values and order are unchanged. |
| `input_mode` | `str` | `"options"` | `"options"`, `"date"`, `"month"`, or `"date_month"`. Mixed mode offers one switch between date ranges and single months. Date-only and month-only modes offer Single/Range controls. |
| `min_value` | `str \| datetime.date \| None` | `None` | Inclusive lower bound in calendar modes. Accepts `YYYY-MM-DD`, `YYYY-MM`, or a date object. |
| `max_value` | `str \| datetime.date \| None` | `None` | Inclusive upper bound in calendar modes. Accepts `YYYY-MM-DD`, `YYYY-MM`, or a date object. |
| `max_range_days` | `int \| None` | `None` | Maximum number of days in each date range, including start and end. Must be positive. `None` means unlimited. Does not limit single values or month ranges. Requires a calendar mode. |
| `calendar_labels` | `Mapping[str, str] \| None` | `None` | Overrides calendar switches, the Add button, field labels, accessibility group names, and validation messages. See [Calendar Input](#calendar-input) for all keys. Unspecified entries retain their English defaults. |
| `placeholder` | `str` | `"Select..."` | Placeholder shown in the search/add input when options are available. Used in options mode. |
| `disabled` | `bool` | `False` | Disables searching, calendar inputs and switches, adding, removing, dragging, and move buttons. |
| `show_move_buttons` | `bool` | `True` | Shows up/down buttons on selected items. Drag sorting remains available unless `disabled=True`. |
| `show_numbers` | `bool` | `False` | Shows 1-based position numbers before selected item labels. |
| `base_color` | `str \| Mapping[str, str] \| None` | `None` | Fallback color for every selected item. See [Colors](#colors). |
| `order_colors` | `Mapping[int, str \| Mapping[str, str]] \| None` | `None` | Per-position colors. Positive keys count from the top (`1` is first), negative keys count from the bottom (`-1` is last), for example `{1: "#fee2e2", -1: "#dcfce7"}`. |
| `value_colors` | `Mapping[str, str \| Mapping[str, str]] \| None` | `None` | Per-value colors keyed by option value, for example `{"python": "#3776ab"}`. These follow an item as it is reordered. |
| `color_palette` | `Sequence[str \| Mapping[str, str]] \| None` | `None` | Colors cycled across selected positions. Position 1 uses the first entry and the palette repeats for longer selections. |
| `color_priority` | `Sequence[str] \| None` | `None` | Ranking of the color sources `"value"`, `"option"`, `"order"`, `"palette"`, and `"base"`. Omitted sources keep their default rank. |
| `tooltip_color` | `str \| Mapping[str, str] \| None` | `None` | Color of the tooltip shown for labels that do not fit. `None` uses the built-in dark tooltip. See [Labels](#labels). |
| `max_selections` | `int \| None` | `None` | Maximum number of selected items. `None` means no limit. Use `0` to prevent any selections. |
| `single_select_display` | `bool` | `False` | With `max_selections=1`, displays the selected item inside the search control and replaces it when another option is selected. |
| `max_selections_placeholder` | `str` | `"Selection limit reached"` | Placeholder shown when `max_selections` has been reached in options mode; a status message in calendar modes. Takes precedence over other placeholders. Not shown in inline single-selection mode, which permits replacement. |
| `empty_message` | `str` | `"No items selected"` | Message shown where the selected list appears when no items are selected. |
| `no_options_placeholder` | `str` | `"No more options"` | Placeholder shown when every option is already selected and there are no more options to add. Used in options mode. |
| `selected_position` | `str` | `"bottom"` | Position of the selected item list relative to the search/add input. Use `"bottom"` or `"top"`. |
| `icon_size` | `int` | `20` | Icon display size in pixels for `icon_url` images. Images are displayed inside a square area while preserving their aspect ratio. |
| `options_max_height` | `int` | `190` | Maximum height in pixels for the available options dropdown. Used in options mode. |
| `suggestions_api_url` | `str \| None` | `None` | Absolute HTTP(S) endpoint used to fetch suggestions in the browser. `None` disables API suggestions. Only supported in options mode. |
| `suggestions_query_param` | `str` | `"q"` | Query parameter name used to send the current search text. |
| `suggestions_response_path` | `str` | `""` | Dot-separated path to the suggestions array in the JSON response. Empty means the response root. |
| `suggestions_label_path` | `str` | `"label"` | Dot-separated path to each suggestion's display label. |
| `suggestions_value_path` | `str` | `"value"` | Dot-separated path to each suggestion's returned value. |
| `suggestions_icon_url_path` | `str \| None` | `"icon_url"` | Optional dot-separated path to each suggestion's icon URL. `None` disables API icons. |
| `suggestions_color_path` | `str \| None` | `None` | Optional dot-separated path to each suggestion's color. The value may be a CSS color string or a mapping of color fields. `None` disables API colors. |
| `suggestions_headers` | `Mapping[str, str] \| None` | `None` | HTTP headers sent with suggestions requests. Header values are visible to browser users and must not contain secrets. |
| `suggestions_min_chars` | `int` | `1` | Minimum trimmed query length before requesting suggestions. Use `0` to allow an empty query. |
| `suggestions_debounce_ms` | `int` | `300` | Delay in milliseconds between the latest input and the API request. |
| `suggestions_loading_message` | `str` | `"Loading suggestions..."` | Message shown while an API request is in progress. |
| `suggestions_error_message` | `str` | `"Failed to load suggestions"` | Message shown when the request or response cannot be processed. |
| `key` | `str \| None` | `None` | Optional Streamlit component key. Use this when rendering multiple sortable multiselects. |

To reset a component to the same `default` after the user changes its selection,
increment or otherwise change `default_revision`:

```python
if "reset_revision" not in st.session_state:
    st.session_state.reset_revision = 0

if st.button("Reset languages"):
    st.session_state.reset_revision += 1

selected = sortable_multiselect(
    "Languages",
    options=["Python", "TypeScript", "Rust"],
    default=["Python"],
    default_revision=st.session_state.reset_revision,
)
```

Option dictionaries use this shape:

```python
{
    "label": "Python",
    "value": "python",
    "icon_url": "https://www.python.org/static/favicon.ico",
    "color": "#3776ab",
}
```

`icon_url` and `color` may be omitted. The returned value is always the `value`, not the display `label`.

## Colors

Anywhere a color is accepted, pass either a CSS color string or a mapping that sets
any subset of `background`, `text`, and `border`:

```python
"#fee2e2"
{"background": "#111827", "text": "#facc15", "border": "#f74c00"}
```

A string sets the background. When `text` is not set, the component picks black or
white for readability against the resolved background.

Colors come from five sources. Each source contributes a color, and the highest
ranked source that sets a field wins that field, so a value color that sets only
`text` still inherits the background from `base_color`:

| Source | Set with | Keyed by |
| --- | --- | --- |
| `value` | `value_colors` | Option value. Follows the item as it is reordered. |
| `option` | `color` in an option dictionary, or `suggestions_color_path` | The option itself. |
| `order` | `order_colors` | Selected position. `1` is first, `-1` is last. |
| `palette` | `color_palette` | Selected position, cycling through the palette. |
| `base` | `base_color` | Every selected item. |

The default ranking is the table order. Reorder it with `color_priority`; sources you
leave out keep their default rank, so `color_priority=["order"]` only promotes
position colors above everything else.

When a positive and a negative `order_colors` key address the same slot, such as `1`
and `-3` in a three item list, the positive key wins. Every color must set at least
one field: `None` and `{}` are rejected rather than ignored, so a mistyped color
surfaces as an error instead of silently doing nothing.

```python
selected = sortable_multiselect(
    "Podium",
    options=[
        {"label": "Python", "value": "python", "color": "#3776ab"},
        {"label": "Rust", "value": "rust"},
        {"label": "Go", "value": "go"},
    ],
    default=["python", "rust", "go"],
    # Gold, silver, and bronze by position, ranked above each option's own color.
    order_colors={
        1: {"background": "#fde68a", "border": "#f59e0b"},
        2: {"background": "#e5e7eb", "border": "#9ca3af"},
        -1: {"background": "#fed7aa", "border": "#ea580c"},
    },
    color_priority=["order"],
)
```

Options that resolve to a color show a small swatch in the options dropdown.

Because an option's `value` is its id, `value_colors` binds a color to an item rather
than to a slot. `examples/color_by_id.py` puts both side by side: two lists holding the
same items, one colored by position and one colored by id. Dragging an item in each
shows position colors staying with the slot while id colors travel with the item.

## Labels

Option labels in the dropdown are shown on one line and cut off with an ellipsis when
they do not fit. Hovering a cut-off label shows the full text in a tooltip anchored to
that label, and labels that fit are left without one. Selected item labels wrap onto
multiple lines instead of being cut off, so they only get a tooltip if surrounding
styles clip them.

The tooltip is drawn by the component rather than by the browser's native `title`, so
it is styled with the rest of the component, appears after a short delay instead of
about a second, and flips above or below the label to stay inside the component frame.
It disappears as soon as the pointer leaves, the list scrolls, or the row it points at
changes. Screen readers are unaffected either way: a clipped label is cut off visually
but its full text is always in the DOM.

`tooltip_color` restyles it, using the same color form as everything above. A string
sets the background and the text follows for contrast; a mapping may also set `text`
and `border`. Because the component renders inside an iframe, this argument is the only
way to change the tooltip: styles from the surrounding app cannot reach it.

```python
tooltip_color="#1e3a8a"                                              # white text follows
tooltip_color={"background": "#ffffff", "text": "#111827", "border": "#d1d5db"}
```

A light tooltip needs a `border` to separate it from the content behind it. The arrow
picks up both the background and the border, so it stays attached either way.

`examples/tooltip_labels.py` shows the same options in a narrow list and a wide one,
so the conditional behavior is visible side by side.

## Single Selection Display

Set `single_select_display=True` together with `max_selections=1` to keep the selected
item inside the search control. The external selected-item list is not rendered in this
mode. The item keeps its label, icon, resolved colors, optional number, and truncated
label tooltip. Because no external selected list is rendered, `selected_position`,
`empty_message`, and `show_move_buttons` do not affect this mode.

```python
selected = sortable_multiselect(
    "Primary language",
    options=[
        {"label": "Python", "value": "python", "icon_url": "https://www.python.org/static/favicon.ico"},
        {"label": "TypeScript", "value": "typescript"},
        {"label": "Rust", "value": "rust"},
    ],
    default=["python"],
    max_selections=1,
    single_select_display=True,
)
```

The input remains available after a selection. Opening the choices and selecting a new
option replaces the current value instead of adding another one. Use the remove button
inside the selected item to clear it. `single_select_display=True` without
`max_selections=1` raises `ValueError`.

In calendar modes, the selected item is displayed inside the calendar control.
Adding another calendar value replaces it. A date range counts as one selected item.

## Calendar Input

### Input Modes

`input_mode` selects the input method for the whole component:

| Mode | Picker controls | Items added |
| --- | --- | --- |
| `"options"` (default) | Searchable dropdown and optional API suggestions | Values from options or API results |
| `"date"` | Date input with a Single/Range switch | One date or one date range |
| `"month"` | Month input with a Single/Range switch | One month or one month range |
| `"date_month"` | One Date (range)/Month (single) switch | One date range or one month |

Use `input_mode="date_month"` to add date ranges and single months to one sortable
list. One switch selects Date (range) or Month (single). Date (range) shows Start
and End inputs; Month (single) shows one month input. Press Add to append the
selection. A range is one item, not an expanded sequence. Use `"date"` or `"month"`
for a fixed precision with a separate Single/Range switch.

```python
import streamlit as st
from streamlit_sortable_multiselect import sortable_multiselect

selected = sortable_multiselect(
    "Reporting periods",
    input_mode="date_month",
    min_value="2026-01-01",
    max_value="2027-12-31",
    max_range_days=31,
    default=["2026-10-01/2026-10-24", "2026-11"],
    show_numbers=True,
    key="reporting_periods",
)
st.write("Selected order:", selected)
```

Mixed mode initially shows the date-range inputs. Switching to Month (single)
clears unfinished inputs and keeps items already added to the sortable list.

### Calendar Labels

Override `calendar_labels` to display Japanese or another language. The settings
apply to switch text, the Add button, field labels, accessibility group names,
and validation messages. They do not change returned values. Supported keys and
defaults are:

| Key | Default | Used in |
| --- | --- | --- |
| `date_range` | `"Date (range)"` | `date_month` |
| `month_single` | `"Month (single)"` | `date_month` |
| `single` | `"Single"` | `date`, `month` |
| `range` | `"Range"` | `date`, `month` |
| `add` | `"Add"` | Add button |
| `start` | `"Start"` | Range start field and its accessible name |
| `end` | `"End"` | Range end field and its accessible name |
| `date` | `"Date"` | Single-date field and its accessible name |
| `month` | `"Month"` | Single-month field and its accessible name |
| `calendar_input` | `"Calendar input"` | Accessible name of the mixed-mode switch group |
| `selection_kind` | `"Selection kind"` | Accessible name of the Single/Range switch group |
| `invalid_value` | `"Choose a valid value within the allowed range, with start on or before end."` | Invalid date, bounds, or reversed range |
| `duplicate_value` | `"This item is already selected."` | Exact duplicate selection |
| `incomplete_selection` | `"Complete the selection before adding it."` | Add or Enter with missing input |
| `range_too_long` | `"Choose a date range of at most {max_range_days} days (including both endpoints)."` | Date range longer than `max_range_days` |

Only specify the labels you want to override. Unknown keys, non-string values,
and empty or whitespace-only labels raise an error. In `range_too_long`, every
`{max_range_days}` placeholder is replaced with the configured limit; a message
without the placeholder is also allowed. Native calendar localization follows
the browser and operating system. Set `empty_message` for the empty selected
list and `max_selections_placeholder` for the selection-count limit message.

### Japanese Example

```python
import streamlit as st
from streamlit_sortable_multiselect import sortable_multiselect

selected = sortable_multiselect(
    "Reporting periods",
    input_mode="date_month",
    min_value="2026-01-01",
    max_value="2027-12-31",
    max_range_days=31,
    default=["2026-10-01/2026-10-24", "2026-11", "2027-01"],
    show_numbers=True,
    max_selections=8,
    calendar_labels={
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
        "invalid_value": "選択範囲を確認してください。",
        "duplicate_value": "この項目は選択済みです。",
        "incomplete_selection": "追加する値をすべて入力してください。",
        "range_too_long": "{max_range_days}日以内で指定してください。",
    },
    empty_message="期間が選択されていません。",
    max_selections_placeholder="選択数の上限に達しました。",
    key="periods",
)
st.write(selected)
```

### Returned Values

Across the calendar modes, the returned `list[str]` retains the selected order
and identifies precision by format:

| Selection | Returned value |
| --- | --- |
| Date | `"2026-10-24"` |
| Month | `"2026-10"` |
| Date range | `"2026-10-01/2026-10-31"` |
| Month range | `"2026-10/2026-12"` |

Ranges include both endpoints, require the same precision at each end, and must
start on or before their end. Overlapping ranges are allowed; identical items
cannot be added twice. Dates and months may coexist in mixed mode. Switching
precision clears the unfinished input and preserves added items.

### Bounds and Range Length

Bounds are optional. A `YYYY-MM` lower bound expands to the first day of that
month and an upper bound to its last day. Month selections compare by month:
`min_value="2026-01-15"` still permits the month `"2026-01"`, while date selections
must be on or after January 15. Changing bounds or input mode removes selected
items that are no longer valid.

Set `max_range_days=31` to allow at most 31 days in each date range. Both endpoints
count: January 1 through January 31 is 31 days; January 1 through February 1 is
32 days and cannot be added. `max_range_days=1` allows only same-day date ranges.
The end picker uses the earlier of `max_value` and the start date plus
`max_range_days - 1` days. Invalid defaults and option metadata values raise an
error, and reducing the limit removes date ranges that exceed it. This limit
does not restrict single months or month ranges; `min_value` and `max_value`
still apply. It is available only in calendar modes.

| Setting | What it limits | Example |
| --- | --- | --- |
| `min_value` / `max_value` | Earliest/latest date or month that can be selected | `"2026-01-01"` through `"2027-12-31"` |
| `max_range_days` | Inclusive duration of each date range | `31` permits January 1 through January 31 |
| `max_selections` | Number of items in the list | `8` permits eight items, each a single value or a whole range |

Use a `datetime.date` object or an ISO string for bounds. `datetime.datetime`
objects are not accepted. Calendar defaults remain strings, such as
`"2026-10"` and `"2026-10-01/2026-10-31"`.

### Shared Settings

Existing ordering, numbering, colors, selection limits, disabled states,
`selected_position`, `default_revision`, and inline single selection apply to
calendar items. `options` is optional and can supply metadata for known calendar
values; it does not restrict which valid values the picker accepts. API
suggestions are available only in options mode. Search placeholders and dropdown
height do not affect calendar inputs; `max_selections_placeholder` appears as a
status message when the limit is reached.

### Browser Support

Date and month inputs use the browser's native picker, whose presentation and
language depend on the browser and operating system. Browsers without a native
month picker can accept `YYYY-MM` as text; the same validation applies. Calendar
values are strings without timezone conversion. See
[`examples/calendar_input.py`](examples/calendar_input.py) for mixed, date-only,
month-only, and form examples, including Japanese messages.

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

## Examples

See [`examples/README.md`](examples/README.md) for a description of each example.
Build the frontend before packaging or using release mode:

```bash
cd streamlit_sortable_multiselect/frontend
npm run build
```

Run the example app:

```bash
streamlit run examples/basic.py
streamlit run examples/calendar_input.py
streamlit run examples/color_by_id.py
streamlit run examples/tooltip_labels.py
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

## Troubleshooting

If a new argument such as `calendar_labels` or `max_range_days` raises
`TypeError: sortable_multiselect() got an unexpected keyword argument ...`,
check the package path and function signature in the Python environment used
to run Streamlit:

```bash
python -c 'import inspect; import streamlit_sortable_multiselect as sms; print(sms.__file__); print(inspect.signature(sms.sortable_multiselect))'
```

For repository development, install the local package in that environment with
`python -m pip install -e ".[dev]"`. If the signature includes the argument but
an existing Streamlit process still reports it as unexpected, stop that process
and restart it to load the updated Python module:

```bash
python -m streamlit run examples/calendar_input.py
```

After rebuilding frontend assets, reload the app page to pick up the updated UI.

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
