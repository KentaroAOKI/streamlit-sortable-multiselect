"""Streamlit sortable multiselect component."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence, cast

import streamlit.components.v1 as components

__version__ = "0.6.0"
__all__ = ["sortable_multiselect"]

_COMPONENT_NAME = "streamlit_sortable_multiselect"
_DEV_SERVER_URL = "http://localhost:5173"
_RELEASE = os.environ.get("STREAMLIT_SORTABLE_MULTISELECT_DEV") != "1"


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


def _normalize_options(options: Sequence[str | Mapping[str, Any]]) -> list[dict[str, str | None]]:
    if isinstance(options, str) or not isinstance(options, Iterable):
        raise TypeError("options must be a sequence of strings or option dictionaries.")

    normalized_options: list[dict[str, str | None]] = []
    for option in options:
        if isinstance(option, str):
            normalized_options.append({"label": option, "value": option, "icon_url": None})
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

        normalized_options.append({"label": label, "value": value, "icon_url": icon_url})

    return normalized_options


def _validate_order_colors(order_colors: Mapping[int, str] | None) -> dict[int, str]:
    if order_colors is None:
        return {}
    if not isinstance(order_colors, Mapping):
        raise TypeError("order_colors must be a mapping of 1-based positions to color strings.")

    result: dict[int, str] = {}
    for position, color in order_colors.items():
        if not isinstance(position, int):
            raise TypeError("order_colors keys must be integers.")
        if position < 1:
            raise ValueError("order_colors keys must be 1 or greater.")
        if not isinstance(color, str):
            raise TypeError("order_colors values must be strings.")
        result[position] = color
    return result


def _validate_max_selections(max_selections: int | None) -> int | None:
    if max_selections is None:
        return None
    if isinstance(max_selections, bool) or not isinstance(max_selections, int):
        raise TypeError("max_selections must be an integer or None.")
    if max_selections < 0:
        raise ValueError("max_selections must be 0 or greater.")
    return max_selections


def sortable_multiselect(
    label: str,
    options: Sequence[str | Mapping[str, Any]],
    default: Sequence[str] | None = None,
    placeholder: str = "Select...",
    disabled: bool = False,
    show_move_buttons: bool = True,
    show_numbers: bool = False,
    base_color: str | None = None,
    order_colors: Mapping[int, str] | None = None,
    max_selections: int | None = None,
    max_selections_placeholder: str = "Selection limit reached",
    key: str | None = None,
) -> list[str]:
    """Select multiple string values and return them in user-defined order.

    Parameters
    ----------
    label:
        Text label rendered above the component.
    options:
        Available string values, or dictionaries with label, value, and optional icon_url.
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
        Background color applied to selected items.
    order_colors:
        Per-position background colors keyed by 1-based selected item position.
    max_selections:
        Maximum number of selected items. None means no limit.
    max_selections_placeholder:
        Placeholder text shown when the maximum selection count is reached.
    key:
        Optional Streamlit component key.
    """
    if not isinstance(label, str):
        raise TypeError("label must be a string.")
    if not isinstance(placeholder, str):
        raise TypeError("placeholder must be a string.")
    if not isinstance(max_selections_placeholder, str):
        raise TypeError("max_selections_placeholder must be a string.")
    if not isinstance(disabled, bool):
        raise TypeError("disabled must be a bool.")
    if not isinstance(show_move_buttons, bool):
        raise TypeError("show_move_buttons must be a bool.")
    if not isinstance(show_numbers, bool):
        raise TypeError("show_numbers must be a bool.")
    if base_color is not None and not isinstance(base_color, str):
        raise TypeError("base_color must be a string or None.")

    option_items = _normalize_options(options)
    option_values = [option["value"] for option in option_items]
    default_values = _validate_string_sequence("default", default)
    order_color_values = _validate_order_colors(order_colors)
    max_selection_count = _validate_max_selections(max_selections)

    duplicate_options = sorted({value for value in option_values if option_values.count(value) > 1})
    if duplicate_options:
        raise ValueError("options must not contain duplicate values.")

    missing_defaults = [value for value in default_values if value not in option_values]
    if missing_defaults:
        missing = ", ".join(repr(value) for value in missing_defaults)
        raise ValueError(f"default contains values not present in options: {missing}.")

    duplicate_defaults = sorted({value for value in default_values if default_values.count(value) > 1})
    if duplicate_defaults:
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
        base_color=base_color,
        order_colors=order_color_values,
        max_selections=max_selection_count,
        max_selections_placeholder=max_selections_placeholder,
        key=key,
        default=default_values,
    )

    if component_value is None:
        return default_values
    return cast(list[str], component_value)
