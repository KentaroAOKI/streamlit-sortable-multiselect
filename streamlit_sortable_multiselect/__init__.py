"""Streamlit sortable multiselect component."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, Sequence, cast

import streamlit.components.v1 as components

__version__ = "0.2.0"
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


def sortable_multiselect(
    label: str,
    options: Sequence[str],
    default: Sequence[str] | None = None,
    placeholder: str = "Select...",
    disabled: bool = False,
    key: str | None = None,
) -> list[str]:
    """Select multiple string values and return them in user-defined order.

    Parameters
    ----------
    label:
        Text label rendered above the component.
    options:
        Available string values.
    default:
        Initially selected values, in the desired initial order.
    placeholder:
        Placeholder text shown in the add-item select control.
    disabled:
        Disable selection and ordering controls.
    key:
        Optional Streamlit component key.
    """
    if not isinstance(label, str):
        raise TypeError("label must be a string.")
    if not isinstance(placeholder, str):
        raise TypeError("placeholder must be a string.")
    if not isinstance(disabled, bool):
        raise TypeError("disabled must be a bool.")

    option_values = _validate_string_sequence("options", options)
    default_values = _validate_string_sequence("default", default)

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

    component_value = _component_func(
        label=label,
        options=option_values,
        default_selected=default_values,
        placeholder=placeholder,
        disabled=disabled,
        key=key,
        default=default_values,
    )

    if component_value is None:
        return default_values
    return cast(list[str], component_value)
