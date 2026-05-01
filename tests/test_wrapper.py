from __future__ import annotations

import pytest

import streamlit_sortable_multiselect as sms


def test_returns_default_when_component_has_no_value(monkeypatch):
    calls = []

    def fake_component(**kwargs):
        calls.append(kwargs)
        return None

    monkeypatch.setattr(sms, "_component_func", fake_component)

    result = sms.sortable_multiselect(
        "Items",
        options=["a", "b", "c"],
        default=["b", "a"],
        show_move_buttons=False,
        show_numbers=True,
        base_color="#eef2ff",
        order_colors={1: "#fee2e2", 2: "#dcfce7"},
        key="items",
    )

    assert result == ["b", "a"]
    assert calls[0]["options"] == ["a", "b", "c"]
    assert calls[0]["default_selected"] == ["b", "a"]
    assert calls[0]["default"] == ["b", "a"]
    assert calls[0]["show_move_buttons"] is False
    assert calls[0]["show_numbers"] is True
    assert calls[0]["base_color"] == "#eef2ff"
    assert calls[0]["order_colors"] == {1: "#fee2e2", 2: "#dcfce7"}
    assert calls[0]["key"] == "items"


def test_returns_component_value(monkeypatch):
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: ["c", "a"])

    result = sms.sortable_multiselect("Items", options=["a", "b", "c"])

    assert result == ["c", "a"]


@pytest.mark.parametrize(
    ("kwargs", "error"),
    [
        ({"label": 123, "options": ["a"]}, TypeError),
        ({"label": "Items", "options": "a"}, TypeError),
        ({"label": "Items", "options": ["a", 1]}, TypeError),
        ({"label": "Items", "options": ["a"], "default": "a"}, TypeError),
        ({"label": "Items", "options": ["a"], "placeholder": 1}, TypeError),
        ({"label": "Items", "options": ["a"], "disabled": "no"}, TypeError),
        ({"label": "Items", "options": ["a"], "show_move_buttons": "yes"}, TypeError),
        ({"label": "Items", "options": ["a"], "show_numbers": "yes"}, TypeError),
        ({"label": "Items", "options": ["a"], "base_color": 123}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": "red"}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": {"1": "red"}}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": {1: 123}}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": {0: "red"}}, ValueError),
        ({"label": "Items", "options": ["a", "a"]}, ValueError),
        ({"label": "Items", "options": ["a"], "default": ["b"]}, ValueError),
        ({"label": "Items", "options": ["a", "b"], "default": ["a", "a"]}, ValueError),
    ],
)
def test_validation_errors(kwargs, error):
    with pytest.raises(error):
        sms.sortable_multiselect(**kwargs)
