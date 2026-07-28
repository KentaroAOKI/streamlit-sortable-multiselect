"""Streamlit sortable multiselect component."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence, Union, cast
from urllib.parse import urlparse

import streamlit.components.v1 as components

__version__ = "0.7.6"
__all__ = ["COLOR_FIELDS", "COLOR_SOURCES", "ColorValue", "sortable_multiselect"]

_COMPONENT_NAME = "streamlit_sortable_multiselect"
_DEV_SERVER_URL = "http://localhost:5173"
_RELEASE = os.environ.get("STREAMLIT_SORTABLE_MULTISELECT_DEV") != "1"

#: A color is either a CSS color string (used as the background) or a mapping
#: that sets any subset of the fields in :data:`COLOR_FIELDS`.
ColorValue = Union[str, Mapping[str, str]]

#: Styleable parts of a selected item.
COLOR_FIELDS = ("background", "text", "border")

#: Color sources, in default precedence order. Each source contributes a color
#: spec, and the highest-priority source that sets a field wins that field.
COLOR_SOURCES = ("value", "option", "order", "palette", "base")


def _declare_component():
    if _RELEASE:
        build_dir = Path(__file__).parent / "frontend" / "build"
        return components.declare_component(_COMPONENT_NAME, path=str(build_dir))
    return components.declare_component(_COMPONENT_NAME, url=_DEV_SERVER_URL)


_component_func = _declare_component()


def _validate_string_sequence(name: str, values: Sequence[str] | None) -> list[str]:
    if values is None:
        return []
    if isinstance(values, str) or not isinstance(values, Iterable):
        raise TypeError(f"{name} must be a sequence of strings.")

    result = list(values)
    invalid = [value for value in result if not isinstance(value, str)]
    if invalid:
        raise TypeError(f"{name} must contain only strings.")
    return result


def _normalize_color(name: str, color: ColorValue | None) -> dict[str, str] | None:
    """Return a color as a field mapping, or None when nothing is set."""
    if color is None:
        return None
    if isinstance(color, str):
        if not color:
            raise ValueError(f"{name} must not be an empty color string.")
        return {"background": color}
    if not isinstance(color, Mapping):
        raise TypeError(
            f"{name} must be a CSS color string or a mapping with any of: "
            f"{', '.join(COLOR_FIELDS)}."
        )

    spec: dict[str, str] = {}
    for field, field_value in color.items():
        if field not in COLOR_FIELDS:
            raise ValueError(
                f"{name} contains an unknown color field {field!r}. "
                f"Use any of: {', '.join(COLOR_FIELDS)}."
            )
        if not isinstance(field_value, str):
            raise TypeError(f"{name} color fields must be strings.")
        if not field_value:
            raise ValueError(f"{name} color fields must not be empty.")
        spec[field] = field_value
    return spec or None


def _normalize_options(
    options: Sequence[str | Mapping[str, Any]],
) -> list[dict[str, Any]]:
    if isinstance(options, str) or not isinstance(options, Iterable):
        raise TypeError("options must be a sequence of strings or option dictionaries.")

    normalized_options: list[dict[str, Any]] = []
    for option in options:
        if isinstance(option, str):
            normalized_options.append(
                {"label": option, "value": option, "icon_url": None, "color": None}
            )
            continue

        if not isinstance(option, Mapping):
            raise TypeError("options must contain only strings or option dictionaries.")

        label = option.get("label")
        value = option.get("value")
        icon_url = option.get("icon_url")
        if not isinstance(label, str):
            raise TypeError("option dictionaries must contain a string label.")
        if not isinstance(value, str):
            raise TypeError("option dictionaries must contain a string value.")
        if icon_url is not None and not isinstance(icon_url, str):
            raise TypeError("option icon_url must be a string or None.")
        color = _normalize_color(f"option color for {value!r}", option.get("color"))

        normalized_options.append(
            {"label": label, "value": value, "icon_url": icon_url, "color": color}
        )

    return normalized_options


def _validate_order_colors(
    order_colors: Mapping[int, ColorValue] | None,
) -> dict[int, dict[str, str]]:
    if order_colors is None:
        return {}
    if not isinstance(order_colors, Mapping):
        raise TypeError("order_colors must be a mapping of positions to colors.")

    result: dict[int, dict[str, str]] = {}
    for position, color in order_colors.items():
        if isinstance(position, bool) or not isinstance(position, int):
            raise TypeError("order_colors keys must be integers.")
        if position == 0:
            raise ValueError(
                "order_colors keys must be non-zero integers. "
                "Positive keys count from the top, negative keys count from the bottom."
            )
        spec = _normalize_color(f"order_colors[{position}]", color)
        if spec is not None:
            result[position] = spec
    return result


def _validate_value_colors(
    value_colors: Mapping[str, ColorValue] | None,
) -> dict[str, dict[str, str]]:
    if value_colors is None:
        return {}
    if not isinstance(value_colors, Mapping):
        raise TypeError("value_colors must be a mapping of option values to colors.")

    result: dict[str, dict[str, str]] = {}
    for value, color in value_colors.items():
        if not isinstance(value, str):
            raise TypeError("value_colors keys must be strings.")
        spec = _normalize_color(f"value_colors[{value!r}]", color)
        if spec is not None:
            result[value] = spec
    return result


def _validate_color_palette(
    color_palette: Sequence[ColorValue] | None,
) -> list[dict[str, str]]:
    if color_palette is None:
        return []
    if isinstance(color_palette, (str, Mapping)) or not isinstance(color_palette, Iterable):
        raise TypeError("color_palette must be a sequence of colors.")

    result: list[dict[str, str]] = []
    for index, color in enumerate(color_palette):
        spec = _normalize_color(f"color_palette[{index}]", color)
        if spec is None:
            raise TypeError("color_palette entries must be colors.")
        result.append(spec)
    return result


def _validate_color_priority(color_priority: Sequence[str] | None) -> list[str]:
    if color_priority is None:
        return list(COLOR_SOURCES)
    if isinstance(color_priority, str) or not isinstance(color_priority, Iterable):
        raise TypeError("color_priority must be a sequence of color source names.")

    result: list[str] = []
    for source in color_priority:
        if not isinstance(source, str):
            raise TypeError("color_priority must contain only strings.")
        if source not in COLOR_SOURCES:
            raise ValueError(
                f"color_priority contains an unknown color source {source!r}. "
                f"Use any of: {', '.join(COLOR_SOURCES)}."
            )
        if source in result:
            raise ValueError(f"color_priority must not repeat {source!r}.")
        result.append(source)

    # Sources the caller left out still apply, ranked below the listed ones.
    result.extend(source for source in COLOR_SOURCES if source not in result)
    return result


def _validate_max_selections(max_selections: int | None) -> int | None:
    if max_selections is None:
        return None
    if isinstance(max_selections, bool) or not isinstance(max_selections, int):
        raise TypeError("max_selections must be an integer or None.")
    if max_selections < 0:
        raise ValueError("max_selections must be 0 or greater.")
    return max_selections


def _validate_icon_size(icon_size: int) -> int:
    if isinstance(icon_size, bool) or not isinstance(icon_size, int):
        raise TypeError("icon_size must be an integer.")
    if icon_size < 1:
        raise ValueError("icon_size must be 1 or greater.")
    return icon_size


def _validate_options_max_height(options_max_height: int) -> int:
    if isinstance(options_max_height, bool) or not isinstance(options_max_height, int):
        raise TypeError("options_max_height must be an integer.")
    if options_max_height < 1:
        raise ValueError("options_max_height must be 1 or greater.")
    return options_max_height


def _validate_non_negative_int(name: str, value: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{name} must be an integer.")
    if value < 0:
        raise ValueError(f"{name} must be 0 or greater.")
    return value


def _validate_optional_non_empty_string(name: str, value: str | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a string or None.")
    if not value:
        raise ValueError(f"{name} must not be empty.")
    return value


def _validate_non_empty_string(name: str, value: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a string.")
    if not value:
        raise ValueError(f"{name} must not be empty.")
    return value


def _validate_suggestions_api_url(value: str | None) -> str | None:
    validated = _validate_optional_non_empty_string("suggestions_api_url", value)
    if validated is None:
        return None

    parsed = urlparse(validated)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("suggestions_api_url must be an absolute HTTP(S) URL.")
    return validated


def _normalize_suggestions_headers(
    headers: Mapping[str, str] | None,
) -> dict[str, str]:
    if headers is None:
        return {}
    if not isinstance(headers, Mapping):
        raise TypeError("suggestions_headers must be a mapping of strings to strings.")

    result: dict[str, str] = {}
    for name, value in headers.items():
        if not isinstance(name, str) or not isinstance(value, str):
            raise TypeError("suggestions_headers must contain only string keys and values.")
        result[name] = value
    return result


def sortable_multiselect(
    label: str,
    options: Sequence[str | Mapping[str, Any]],
    default: Sequence[str] | None = None,
    placeholder: str = "Select...",
    disabled: bool = False,
    show_move_buttons: bool = True,
    show_numbers: bool = False,
    base_color: ColorValue | None = None,
    order_colors: Mapping[int, ColorValue] | None = None,
    max_selections: int | None = None,
    max_selections_placeholder: str = "Selection limit reached",
    empty_message: str = "No items selected",
    no_options_placeholder: str = "No more options",
    selected_position: str = "bottom",
    icon_size: int = 20,
    options_max_height: int = 190,
    suggestions_api_url: str | None = None,
    suggestions_query_param: str = "q",
    suggestions_response_path: str = "",
    suggestions_label_path: str = "label",
    suggestions_value_path: str = "value",
    suggestions_icon_url_path: str | None = "icon_url",
    suggestions_headers: Mapping[str, str] | None = None,
    suggestions_min_chars: int = 1,
    suggestions_debounce_ms: int = 300,
    suggestions_loading_message: str = "Loading suggestions...",
    suggestions_error_message: str = "Failed to load suggestions",
    value_colors: Mapping[str, ColorValue] | None = None,
    color_palette: Sequence[ColorValue] | None = None,
    color_priority: Sequence[str] | None = None,
    suggestions_color_path: str | None = None,
    key: str | None = None,
) -> list[str]:
    """Select multiple string values and return them in user-defined order.

    Parameters
    ----------
    label:
        Text label rendered above the component.
    options:
        Available string values, or dictionaries with label, value, and optional
        icon_url and color.
    default:
        Initially selected values, in the desired initial order.
    placeholder:
        Placeholder text shown in the add-item select control.
    disabled:
        Disable selection and ordering controls.
    show_move_buttons:
        Show up/down buttons for selected items.
    show_numbers:
        Show 1-based numbers before selected items.
    base_color:
        Fallback color for every selected item. A CSS color string sets the background;
        a mapping may set any of "background", "text", and "border".
    order_colors:
        Per-position colors keyed by selected item position. Positive keys count from
        the top (1 is first), negative keys count from the bottom (-1 is last).
    max_selections:
        Maximum number of selected items. None means no limit.
    max_selections_placeholder:
        Placeholder text shown when the maximum selection count is reached.
    empty_message:
        Text shown when no items are selected.
    no_options_placeholder:
        Placeholder text shown when there are no more options to add.
    selected_position:
        Position of selected items relative to the select control. Use "bottom" or "top".
    icon_size:
        Icon display size in pixels. Images keep their aspect ratio within this square size.
    options_max_height:
        Maximum height in pixels for the available options dropdown.
    suggestions_api_url:
        Absolute HTTP(S) endpoint used to fetch suggestions. None disables API suggestions.
    suggestions_query_param:
        Query parameter name used to send the current search text.
    suggestions_response_path:
        Dot-separated path to the options array in the JSON response. Empty means the root.
    suggestions_label_path:
        Dot-separated path to each suggestion's display label.
    suggestions_value_path:
        Dot-separated path to each suggestion's returned value.
    suggestions_icon_url_path:
        Optional dot-separated path to each suggestion's icon URL.
    suggestions_headers:
        HTTP headers sent by the browser. Do not include secret credentials.
    suggestions_min_chars:
        Minimum query length before requesting suggestions.
    suggestions_debounce_ms:
        Delay in milliseconds between input and the suggestions request.
    suggestions_loading_message:
        Text shown while suggestions are loading.
    suggestions_error_message:
        Text shown when suggestions cannot be loaded.
    value_colors:
        Per-value colors keyed by option value. These follow an item as it is reordered.
    color_palette:
        Colors cycled across selected positions. Position 1 uses the first entry, and
        the palette repeats once there are more items than entries.
    color_priority:
        Ranking of the color sources "value", "option", "order", "palette", and "base".
        Earlier sources win, field by field. Omitted sources keep their default rank.
    suggestions_color_path:
        Optional dot-separated path to each suggestion's color. None disables API colors.
    key:
        Optional Streamlit component key.
    """
    if not isinstance(label, str):
        raise TypeError("label must be a string.")
    if not isinstance(placeholder, str):
        raise TypeError("placeholder must be a string.")
    if not isinstance(max_selections_placeholder, str):
        raise TypeError("max_selections_placeholder must be a string.")
    if not isinstance(empty_message, str):
        raise TypeError("empty_message must be a string.")
    if not isinstance(no_options_placeholder, str):
        raise TypeError("no_options_placeholder must be a string.")
    if not isinstance(selected_position, str):
        raise TypeError("selected_position must be a string.")
    if selected_position not in {"bottom", "top"}:
        raise ValueError('selected_position must be "bottom" or "top".')
    if not isinstance(disabled, bool):
        raise TypeError("disabled must be a bool.")
    if not isinstance(show_move_buttons, bool):
        raise TypeError("show_move_buttons must be a bool.")
    if not isinstance(show_numbers, bool):
        raise TypeError("show_numbers must be a bool.")

    base_color_value = _normalize_color("base_color", base_color)
    option_items = _normalize_options(options)
    option_values = [option["value"] for option in option_items]
    default_values = _validate_string_sequence("default", default)
    order_color_values = _validate_order_colors(order_colors)
    value_color_values = _validate_value_colors(value_colors)
    color_palette_values = _validate_color_palette(color_palette)
    color_priority_values = _validate_color_priority(color_priority)
    max_selection_count = _validate_max_selections(max_selections)
    icon_size_value = _validate_icon_size(icon_size)
    options_max_height_value = _validate_options_max_height(options_max_height)
    suggestions_api_url_value = _validate_suggestions_api_url(suggestions_api_url)
    suggestions_query_param_value = _validate_non_empty_string(
        "suggestions_query_param", suggestions_query_param
    )
    if not isinstance(suggestions_response_path, str):
        raise TypeError("suggestions_response_path must be a string.")
    suggestions_label_path_value = _validate_non_empty_string(
        "suggestions_label_path", suggestions_label_path
    )
    suggestions_value_path_value = _validate_non_empty_string(
        "suggestions_value_path", suggestions_value_path
    )
    suggestions_icon_url_path_value = _validate_optional_non_empty_string(
        "suggestions_icon_url_path", suggestions_icon_url_path
    )
    suggestions_color_path_value = _validate_optional_non_empty_string(
        "suggestions_color_path", suggestions_color_path
    )
    suggestions_headers_value = _normalize_suggestions_headers(suggestions_headers)
    suggestions_min_chars_value = _validate_non_negative_int(
        "suggestions_min_chars", suggestions_min_chars
    )
    suggestions_debounce_ms_value = _validate_non_negative_int(
        "suggestions_debounce_ms", suggestions_debounce_ms
    )
    if not isinstance(suggestions_loading_message, str):
        raise TypeError("suggestions_loading_message must be a string.")
    if not isinstance(suggestions_error_message, str):
        raise TypeError("suggestions_error_message must be a string.")

    # Set membership keeps these checks O(n); list.count / `in list` here are
    # O(n**2) and hang the rerun once options reaches tens of thousands.
    seen_option_values: set[str] = set()
    has_duplicate_options = False
    for value in option_values:
        if value in seen_option_values:
            has_duplicate_options = True
            break
        seen_option_values.add(value)
    if has_duplicate_options:
        raise ValueError("options must not contain duplicate values.")

    missing_defaults = [value for value in default_values if value not in seen_option_values]
    if missing_defaults:
        missing = ", ".join(repr(value) for value in missing_defaults)
        raise ValueError(f"default contains values not present in options: {missing}.")

    seen_default_values: set[str] = set()
    has_duplicate_defaults = False
    for value in default_values:
        if value in seen_default_values:
            has_duplicate_defaults = True
            break
        seen_default_values.add(value)
    if has_duplicate_defaults:
        raise ValueError("default must not contain duplicate values.")

    if max_selection_count is not None and len(default_values) > max_selection_count:
        raise ValueError("default must not contain more values than max_selections.")

    component_value = _component_func(
        label=label,
        options=option_items,
        default_selected=default_values,
        placeholder=placeholder,
        disabled=disabled,
        show_move_buttons=show_move_buttons,
        show_numbers=show_numbers,
        base_color=base_color_value,
        order_colors=order_color_values,
        value_colors=value_color_values,
        color_palette=color_palette_values,
        color_priority=color_priority_values,
        max_selections=max_selection_count,
        max_selections_placeholder=max_selections_placeholder,
        empty_message=empty_message,
        no_options_placeholder=no_options_placeholder,
        selected_position=selected_position,
        icon_size=icon_size_value,
        options_max_height=options_max_height_value,
        suggestions_api_url=suggestions_api_url_value,
        suggestions_query_param=suggestions_query_param_value,
        suggestions_response_path=suggestions_response_path,
        suggestions_label_path=suggestions_label_path_value,
        suggestions_value_path=suggestions_value_path_value,
        suggestions_icon_url_path=suggestions_icon_url_path_value,
        suggestions_color_path=suggestions_color_path_value,
        suggestions_headers=suggestions_headers_value,
        suggestions_min_chars=suggestions_min_chars_value,
        suggestions_debounce_ms=suggestions_debounce_ms_value,
        suggestions_loading_message=suggestions_loading_message,
        suggestions_error_message=suggestions_error_message,
        key=key,
        default=default_values,
    )

    if component_value is None:
        return default_values
    return cast(list[str], component_value)
