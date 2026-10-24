from datetime import date, datetime

import pytest

import streamlit_sortable_multiselect as sms


@pytest.mark.parametrize("mode,values", [
    ("date", ["2028-02-29", "2028-03-01/2028-03-10"]),
    ("month", ["2028-02", "2028-03/2028-05"]),
    ("date_month", ["2028-02-29", "2028-02", "2028-03/2028-05"]),
])
def test_calendar_defaults_without_options(monkeypatch, mode, values):
    calls = []
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: calls.append(kwargs))
    assert sms.sortable_multiselect("Calendar", input_mode=mode, default=values) == values
    assert calls[0]["input_mode"] == mode
    assert calls[0]["options"] == []
    assert calls[0]["calendar_labels"] == {}


def test_calendar_switch_labels_are_forwarded(monkeypatch):
    calls = []
    labels = {"date_range": "日付（範囲）", "month_single": "年月（単一）"}
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: calls.append(kwargs))
    sms.sortable_multiselect("Calendar", input_mode="date_month", calendar_labels=labels)
    assert calls[0]["calendar_labels"] == labels


def test_calendar_messages_and_field_labels_are_forwarded(monkeypatch):
    labels = {
        "add": "追加", "start": "開始日", "end": "終了日", "date": "日付", "month": "年月",
        "calendar_input": "入力方法", "selection_kind": "選択方法",
        "invalid_value": "範囲を確認してください。", "duplicate_value": "選択済みです。",
        "incomplete_selection": "入力してください。",
        "range_too_long": "{max_range_days}日以内で指定してください。",
    }
    calls = []
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: calls.append(kwargs))
    sms.sortable_multiselect("Calendar", input_mode="date_month", calendar_labels=labels)
    assert calls[0]["calendar_labels"] == labels


@pytest.mark.parametrize("labels,error", [
    ("Date", TypeError),
    ({"date_range": 1}, TypeError),
    ({"date_range": ""}, ValueError),
    ({"single": "  "}, ValueError),
    ({"add": ""}, ValueError),
    ({"range_too_long": 3}, TypeError),
    ({"unknown": "Label"}, ValueError),
])
def test_invalid_calendar_switch_labels(monkeypatch, labels, error):
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: pytest.fail("Invalid args forwarded"))
    with pytest.raises(error):
        sms.sortable_multiselect("Calendar", input_mode="date_month", calendar_labels=labels)


def test_calendar_bounds_and_metadata(monkeypatch):
    calls = []
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: calls.append(kwargs))
    sms.sortable_multiselect(
        "Calendar", input_mode="date_month", min_value=date(2028, 1, 15),
        max_value="2028-02", default=["2028-01", "2028-02-29"],
        options=[{"label": "Leap day", "value": "2028-02-29", "color": "red"}],
    )
    assert calls[0]["min_value"] == "2028-01-15"
    assert calls[0]["max_value"] == "2028-02-29"
    assert calls[0]["options"][0]["color"] == {"background": "red"}


@pytest.mark.parametrize("kwargs,error", [
    ({"input_mode": 1}, TypeError),
    ({"input_mode": "calendar"}, ValueError),
    ({"min_value": "2028-01"}, ValueError),
    ({"input_mode": "date", "min_value": 123}, TypeError),
    ({"input_mode": "date", "min_value": datetime(2028, 1, 1)}, TypeError),
    ({"input_mode": "date", "min_value": "2027-02-29"}, ValueError),
    ({"input_mode": "date", "max_value": "2028-13"}, ValueError),
    ({"input_mode": "date", "min_value": "2028-03", "max_value": "2028-02"}, ValueError),
    ({"input_mode": "date", "suggestions_api_url": "https://example.com"}, ValueError),
    ({"input_mode": "date", "default": ["2028-02"]}, ValueError),
    ({"input_mode": "month", "default": ["2028-02-29"]}, ValueError),
    ({"input_mode": "date_month", "default": ["2028-02/2028-02-29"]}, ValueError),
    ({"input_mode": "date_month", "default": ["2027-02-29"]}, ValueError),
    ({"input_mode": "date_month", "default": ["2028-00"]}, ValueError),
    ({"input_mode": "date_month", "default": ["0000-01"]}, ValueError),
    ({"input_mode": "date_month", "default": ["2028-3"]}, ValueError),
    ({"input_mode": "date", "default": ["2028-03-10/2028-03-01"]}, ValueError),
    ({"input_mode": "month", "default": ["2028-02/2028-01"]}, ValueError),
    ({"input_mode": "date", "default": ["2028-01-01/"]}, ValueError),
    ({"input_mode": "month", "default": ["2028-01/2028-02/2028-03"]}, ValueError),
    ({"input_mode": "date", "min_value": "2028-01-02", "default": ["2028-01-01"]}, ValueError),
    ({"input_mode": "month", "max_value": "2028-02", "default": ["2028-03"]}, ValueError),
    ({"input_mode": "date", "options": ["Python"]}, ValueError),
    ({"input_mode": "month", "default": ["2028-01", "2028-01"]}, ValueError),
    ({"input_mode": "month", "default": ["2028-01", "2028-02"], "max_selections": 1}, ValueError),
])
def test_invalid_calendar_arguments(monkeypatch, kwargs, error):
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: pytest.fail("Invalid args forwarded"))
    with pytest.raises(error):
        sms.sortable_multiselect("Calendar", **kwargs)


def test_returns_calendar_component_values(monkeypatch):
    values = ["2028-03/2028-05", "2028-02-29"]
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: values)
    assert sms.sortable_multiselect("Calendar", input_mode="date_month") == values


@pytest.mark.parametrize("value,limit", [
    ("2028-02-28/2028-03-01", 3),
    ("2028-12-31/2029-01-01", 2),
    ("2028-02-29/2028-02-29", 1),
    ("2028-01/2028-12", 1),
    ("2028-02-29", 1),
    ("2028-02", 1),
])
def test_max_range_days_includes_both_endpoints(monkeypatch, value, limit):
    calls = []
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: calls.append(kwargs))
    assert sms.sortable_multiselect(
        "Calendar", input_mode="date_month", default=[value], max_range_days=limit,
    ) == [value]
    assert calls[0]["max_range_days"] == limit


@pytest.mark.parametrize("kwargs,error", [
    ({"input_mode": "date", "max_range_days": True}, TypeError),
    ({"input_mode": "date", "max_range_days": 1.5}, TypeError),
    ({"input_mode": "date", "max_range_days": "31"}, TypeError),
    ({"input_mode": "date", "max_range_days": 0}, ValueError),
    ({"input_mode": "date", "max_range_days": -1}, ValueError),
    ({"max_range_days": 31}, ValueError),
    ({"input_mode": "date", "max_range_days": 2, "default": ["2028-02-28/2028-03-01"]}, ValueError),
    ({"input_mode": "date", "max_range_days": 1, "options": ["2028-01-01/2028-01-02"]}, ValueError),
])
def test_invalid_max_range_days(monkeypatch, kwargs, error):
    monkeypatch.setattr(sms, "_component_func", lambda **kwargs: pytest.fail("Invalid args forwarded"))
    with pytest.raises(error):
        sms.sortable_multiselect("Calendar", **kwargs)
