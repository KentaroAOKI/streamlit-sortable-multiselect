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
        max_selections=2,
        max_selections_placeholder="Up to 2 items",
        empty_message="Nothing selected",
        no_options_placeholder="No choices left",
        selected_position="top",
        icon_size=24,
        options_max_height=260,
        key="items",
    )

    assert result == ["b", "a"]
    assert calls[0]["options"] == [
        {"label": "a", "value": "a", "icon_url": None},
        {"label": "b", "value": "b", "icon_url": None},
        {"label": "c", "value": "c", "icon_url": None},
    ]
    assert calls[0]["default_selected"] == ["b", "a"]
    assert calls[0]["default"] == ["b", "a"]
    assert calls[0]["show_move_buttons"] is False
    assert calls[0]["show_numbers"] is True
    assert calls[0]["base_color"] == "#eef2ff"
    assert calls[0]["order_colors"] == {1: "#fee2e2", 2: "#dcfce7"}
    assert calls[0]["max_selections"] == 2
    assert calls[0]["max_selections_placeholder"] == "Up to 2 items"
    assert calls[0]["empty_message"] == "Nothing selected"
    assert calls[0]["no_options_placeholder"] == "No choices left"
    assert calls[0]["selected_position"] == "top"
    assert calls[0]["icon_size"] == 24
    assert calls[0]["options_max_height"] == 260
    assert calls[0]["key"] == "items"


def test_returns_component_value(monkeypatch):
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: ["c", "a"])

    result = sms.sortable_multiselect("Items", options=["a", "b", "c"])

    assert result == ["c", "a"]


def test_accepts_label_value_icon_options(monkeypatch):
    calls = []

    def fake_component(**kwargs):
        calls.append(kwargs)
        return None

    monkeypatch.setattr(sms, "_component_func", fake_component)

    result = sms.sortable_multiselect(
        "Items",
        options=[
            {"label": "Python", "value": "python", "icon_url": "https://example.com/python.png"},
            {"label": "TypeScript", "value": "typescript"},
        ],
        default=["python"],
    )

    assert result == ["python"]
    assert calls[0]["options"] == [
        {"label": "Python", "value": "python", "icon_url": "https://example.com/python.png"},
        {"label": "TypeScript", "value": "typescript", "icon_url": None},
    ]


@pytest.mark.parametrize(
    ("kwargs", "error"),
    [
        ({"label": 123, "options": ["a"]}, TypeError),
        ({"label": "Items", "options": "a"}, TypeError),
        ({"label": "Items", "options": ["a", 1]}, TypeError),
        ({"label": "Items", "options": [{"value": "a"}]}, TypeError),
        ({"label": "Items", "options": [{"label": "A"}]}, TypeError),
        ({"label": "Items", "options": [{"label": "A", "value": "a", "icon_url": 1}]}, TypeError),
        ({"label": "Items", "options": ["a"], "default": "a"}, TypeError),
        ({"label": "Items", "options": ["a"], "placeholder": 1}, TypeError),
        ({"label": "Items", "options": ["a"], "max_selections_placeholder": 1}, TypeError),
        ({"label": "Items", "options": ["a"], "empty_message": 1}, TypeError),
        ({"label": "Items", "options": ["a"], "no_options_placeholder": 1}, TypeError),
        ({"label": "Items", "options": ["a"], "selected_position": 1}, TypeError),
        ({"label": "Items", "options": ["a"], "icon_size": True}, TypeError),
        ({"label": "Items", "options": ["a"], "icon_size": "20"}, TypeError),
        ({"label": "Items", "options": ["a"], "options_max_height": True}, TypeError),
        ({"label": "Items", "options": ["a"], "options_max_height": "260"}, TypeError),
        ({"label": "Items", "options": ["a"], "disabled": "no"}, TypeError),
        ({"label": "Items", "options": ["a"], "show_move_buttons": "yes"}, TypeError),
        ({"label": "Items", "options": ["a"], "show_numbers": "yes"}, TypeError),
        ({"label": "Items", "options": ["a"], "base_color": 123}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": "red"}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": {"1": "red"}}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": {1: 123}}, TypeError),
        ({"label": "Items", "options": ["a"], "max_selections": True}, TypeError),
        ({"label": "Items", "options": ["a"], "max_selections": 1.5}, TypeError),
        ({"label": "Items", "options": ["a"], "order_colors": {0: "red"}}, ValueError),
        ({"label": "Items", "options": ["a", "a"]}, ValueError),
        ({"label": "Items", "options": ["a"], "default": ["b"]}, ValueError),
        ({"label": "Items", "options": ["a", "b"], "default": ["a", "a"]}, ValueError),
        ({"label": "Items", "options": ["a"], "max_selections": -1}, ValueError),
        ({"label": "Items", "options": ["a"], "selected_position": "left"}, ValueError),
        ({"label": "Items", "options": ["a"], "icon_size": 0}, ValueError),
        ({"label": "Items", "options": ["a"], "options_max_height": 0}, ValueError),
        ({"label": "Items", "options": ["a", "b"], "default": ["a", "b"], "max_selections": 1}, ValueError),
    ],
)
def test_validation_errors(kwargs, error):
    with pytest.raises(error):
        sms.sortable_multiselect(**kwargs)


def test_allows_zero_max_selections(monkeypatch):
    calls = []

    def fake_component(**kwargs):
        calls.append(kwargs)
        return None

    monkeypatch.setattr(sms, "_component_func", fake_component)

    result = sms.sortable_multiselect("Items", options=["a", "b"], max_selections=0)

    assert result == []
    assert calls[0]["max_selections"] == 0
    assert calls[0]["selected_position"] == "bottom"
    assert calls[0]["icon_size"] == 20
    assert calls[0]["options_max_height"] == 190
