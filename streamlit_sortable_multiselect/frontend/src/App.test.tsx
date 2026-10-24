import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Streamlit } from "streamlit-component-lib";
import { SortableMultiselect } from "./App";

vi.mock("streamlit-component-lib", async () => {
  const actual = await vi.importActual<typeof import("streamlit-component-lib")>(
    "streamlit-component-lib",
  );
  return {
    ...actual,
    Streamlit: {
      ...actual.Streamlit,
      setComponentValue: vi.fn(),
      setFrameHeight: vi.fn(),
    },
  };
});

function componentWithArgs(args = {}) {
  return (
    <SortableMultiselect
      args={{
        label: "Items",
        options: ["Alpha", "Beta", "Gamma"],
        default_selected: ["Beta"],
        placeholder: "Add item...",
        disabled: false,
        ...args,
      }}
      disabled={false}
      theme={undefined}
      width={640}
    />
  );
}

function renderComponent(args = {}) {
  return render(componentWithArgs(args));
}

// jsdom reports every box as 0x0, so clipping has to be stubbed to be observable.
function stubClippedText(scrollWidth: number, clientWidth: number) {
  const scrollWidthSpy = vi
    .spyOn(HTMLElement.prototype, "scrollWidth", "get")
    .mockReturnValue(scrollWidth);
  const clientWidthSpy = vi
    .spyOn(HTMLElement.prototype, "clientWidth", "get")
    .mockReturnValue(clientWidth);
  return () => {
    scrollWidthSpy.mockRestore();
    clientWidthSpy.mockRestore();
  };
}

describe("SortableMultiselect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses one switch for date ranges and single months in a sortable list", () => {
    renderComponent({ input_mode: "date_month", options: [], default_selected: [] });
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Date (range)" })).toBeChecked();
    expect(screen.queryByRole("radio", { name: "Single" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-02-28" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Complete the selection");
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-02-29" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02-28/2028-02-29"]);
    fireEvent.click(screen.getByRole("radio", { name: "Month (single)" }));
    expect(screen.queryByLabelText("End")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2028-03" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2028-04" } });
    fireEvent.click(screen.getByRole("radio", { name: "Date (range)" }));
    expect(screen.getByLabelText("Start")).toHaveValue("");
    expect(screen.getByLabelText("End")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-04-01" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-04-30" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([
      "2028-02-28/2028-02-29", "2028-03", "2028-04-01/2028-04-30",
    ]);
    fireEvent.click(screen.getByLabelText("Move 2028-04-01 – 2028-04-30 up"));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([
      "2028-02-28/2028-02-29", "2028-04-01/2028-04-30", "2028-03",
    ]);
    fireEvent.click(screen.getByLabelText("Remove 2028-02-28 – 2028-02-29"));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-04-01/2028-04-30", "2028-03"]);
  });

  it("localizes the combined switch and preserves input when labels change", () => {
    const args = { input_mode: "date_month", options: [], default_selected: [],
      calendar_labels: { date_range: "日付（範囲）" } };
    const { rerender } = renderComponent(args);
    expect(screen.getByRole("radio", { name: "日付（範囲）" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Month (single)" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-02-01" } });
    rerender(componentWithArgs({ ...args,
      calendar_labels: { date_range: "日付（範囲）", month_single: "年月（単一）" },
    }));
    expect(screen.getByLabelText("Start")).toHaveValue("2028-02-01");
    fireEvent.click(screen.getByRole("radio", { name: "年月（単一）" }));
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2028-02" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02"]);
  });

  it("localizes buttons, fields, validation messages, and range-limit placeholders", () => {
    renderComponent({ input_mode: "date_month", options: [], default_selected: [],
      max_range_days: 3, max_selections: 2,
      empty_message: "未選択です。", max_selections_placeholder: "上限です。",
      calendar_labels: {
        date_range: "日付（範囲）", month_single: "年月（単一）",
        add: "追加", start: "開始日", end: "終了日", month: "年月",
        calendar_input: "入力方法", incomplete_selection: "入力してください。",
        invalid_value: "範囲を確認してください。", duplicate_value: "選択済みです。",
        range_too_long: "{max_range_days}日以内（最大{max_range_days}日）で指定してください。",
      },
    });
    expect(screen.getByRole("group", { name: "入力方法" })).toBeInTheDocument();
    expect(screen.getByText("未選択です。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByRole("alert")).toHaveTextContent("入力してください。");
    fireEvent.change(screen.getByLabelText("開始日"), { target: { value: "2028-02-28" } });
    fireEvent.change(screen.getByLabelText("終了日"), { target: { value: "2028-03-02" } });
    expect(screen.getByRole("alert")).toHaveTextContent("3日以内（最大3日）で指定してください。");
    expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("終了日"), { target: { value: "2028-02-27" } });
    expect(screen.getByRole("alert")).toHaveTextContent("範囲を確認してください。");
    fireEvent.change(screen.getByLabelText("終了日"), { target: { value: "2028-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02-28/2028-03-01"]);
    fireEvent.change(screen.getByLabelText("開始日"), { target: { value: "2028-02-28" } });
    fireEvent.change(screen.getByLabelText("終了日"), { target: { value: "2028-03-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent("選択済みです。");
    fireEvent.click(screen.getByRole("radio", { name: "年月（単一）" }));
    fireEvent.change(screen.getByLabelText("年月"), { target: { value: "2028-12" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02-28/2028-03-01", "2028-12"]);
    expect(screen.getByText("上限です。")).toHaveAttribute("role", "status");
  });

  it.each(["date", "month"])("localizes single-value input labels in %s mode", (mode) => {
    renderComponent({ input_mode: mode, options: [], default_selected: [],
      calendar_labels: { date: "日付", month: "年月", selection_kind: "選択方法" },
    });
    expect(screen.getByRole("group", { name: "選択方法" })).toBeInTheDocument();
    expect(screen.getByLabelText(mode === "date" ? "日付" : "年月")).toHaveAttribute("type", mode);
  });

  it.each(["date", "month"])("localizes the Single/Range switch in %s mode", (mode) => {
    renderComponent({ input_mode: mode, options: [], default_selected: [],
      calendar_labels: { single: "単一", range: "範囲" },
    });
    expect(screen.getByRole("radio", { name: "単一" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "範囲" }));
    expect(screen.getByLabelText("Start")).toHaveAttribute("type", mode);
    expect(screen.getByLabelText("End")).toHaveAttribute("type", mode);
  });

  it("updates iframe height when picker-local validation appears and clears", () => {
    renderComponent({ input_mode: "date", options: [], default_selected: [] });
    vi.mocked(Streamlit.setFrameHeight).mockClear();
    vi.mocked(Streamlit.setComponentValue).mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Complete the selection");
    expect(Streamlit.setFrameHeight).toHaveBeenCalled();
    expect(Streamlit.setComponentValue).not.toHaveBeenCalled();

    vi.mocked(Streamlit.setFrameHeight).mockClear();
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2028-02-29" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(Streamlit.setFrameHeight).toHaveBeenCalled();
    expect(Streamlit.setComponentValue).not.toHaveBeenCalled();
  });

  it.each(["date", "month", "date_month"])(
    "updates iframe height when the %s picker switches layout", (mode) => {
      renderComponent({ input_mode: mode, options: [], default_selected: [] });
      vi.mocked(Streamlit.setFrameHeight).mockClear();
      vi.mocked(Streamlit.setComponentValue).mockClear();

      fireEvent.click(screen.getByRole("radio", {
        name: mode === "date_month" ? "Month (single)" : "Range",
      }));
      if (mode === "date_month") {
        expect(screen.queryByLabelText("End")).not.toBeInTheDocument();
      } else {
        expect(screen.getByLabelText("End")).toBeInTheDocument();
      }
      expect(Streamlit.setFrameHeight).toHaveBeenCalled();
      expect(Streamlit.setComponentValue).not.toHaveBeenCalled();

      vi.mocked(Streamlit.setFrameHeight).mockClear();
      fireEvent.click(screen.getByRole("radio", {
        name: mode === "date_month" ? "Date (range)" : "Single",
      }));
      if (mode === "date_month") {
        expect(screen.getByLabelText("End")).toBeInTheDocument();
      } else {
        expect(screen.queryByLabelText("End")).not.toBeInTheDocument();
      }
      expect(Streamlit.setFrameHeight).toHaveBeenCalled();
      expect(Streamlit.setComponentValue).not.toHaveBeenCalled();
    },
  );

  it("validates date bounds, reversed ranges, and duplicate items", () => {
    renderComponent({ input_mode: "date", options: [], default_selected: ["2028-02-29"],
      min_value: "2028-02-01", max_value: "2028-03-31" });
    const input = screen.getByLabelText("Date");
    expect(input).toHaveAttribute("min", "2028-02-01");
    expect(input).toHaveAttribute("max", "2028-03-31");
    fireEvent.change(input, { target: { value: "2028-01-31" } });
    expect(screen.getByRole("alert")).toHaveTextContent("allowed range");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "2028-02-29" } });
    expect(screen.getByRole("alert")).toHaveTextContent("already selected");
    fireEvent.click(screen.getByRole("radio", { name: "Range" }));
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-03-10" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent("start on or before end");
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([
      "2028-02-29", "2028-03-10/2028-03-31",
    ]);
  });

  it("limits inclusive date range length and keeps month selection available", () => {
    renderComponent({ input_mode: "date_month", options: [], default_selected: [], max_range_days: 3 });
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-02-28" } });
    expect(screen.getByLabelText("End")).toHaveAttribute("max", "2028-03-01");
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-02" } });
    expect(screen.getByRole("alert")).toHaveTextContent("at most 3 days");
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02-28/2028-03-01"]);
    fireEvent.click(screen.getByRole("radio", { name: "Month (single)" }));
    fireEvent.change(screen.getByLabelText("Month"), { target: { value: "2028-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02-28/2028-03-01", "2028-12"]);
  });

  it("revalidates selections and the end picker when the range limit changes", () => {
    const args = { input_mode: "date_month", options: [], default_selected: [], max_range_days: 3,
      max_value: "2028-03-31" };
    const { rerender } = renderComponent(args);
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-03-30" } });
    expect(screen.getByLabelText("End")).toHaveAttribute("max", "2028-03-31");
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-03-30/2028-03-31"]);
    rerender(componentWithArgs({ ...args, max_range_days: 1 }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-03-30" } });
    expect(screen.getByLabelText("End")).toHaveAttribute("max", "2028-03-30");
  });

  it("applies month bounds, selection limits, and disabled controls", () => {
    const { rerender } = renderComponent({ input_mode: "month", options: [], default_selected: [],
      min_value: "2028-01-15", max_value: "2028-03-10", max_selections: 1 });
    const input = screen.getByLabelText("Month");
    expect(input).toHaveAttribute("min", "2028-01");
    expect(input).toHaveAttribute("max", "2028-03");
    fireEvent.change(input, { target: { value: "2028-01" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-01"]);
    expect(input).toBeDisabled();
    expect(screen.getByText("Selection limit reached")).toHaveAttribute("role", "status");
    fireEvent.click(screen.getByLabelText("Remove 2028-01"));
    expect(input).not.toBeDisabled();
    rerender(componentWithArgs({ input_mode: "month", options: [], default_selected: [], disabled: true }));
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("keeps calendar values across reruns and reapplies defaults on revision changes", () => {
    const args = { input_mode: "date_month", options: [], default_selected: ["2028-01"], default_revision: 0 };
    const { rerender } = renderComponent(args);
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-02-29" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    rerender(componentWithArgs({ ...args, default_selected: ["2028-01"], options: [] }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-01", "2028-02-29/2028-03-01"]);
    rerender(componentWithArgs({ ...args, default_revision: 1 }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-01"]);
    rerender(componentWithArgs({ ...args, default_revision: 1, min_value: "2028-02-01" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
  });

  it("replaces inline calendar selections and supports clearing them", () => {
    renderComponent({ input_mode: "date_month", options: [], default_selected: ["2028-01"],
      single_select_display: true, max_selections: 1 });
    expect(screen.queryByRole("list", { name: "Selected items" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Start"), { target: { value: "2028-02-29" } });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "2028-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["2028-02-29/2028-03-01"]);
    fireEvent.click(screen.getByLabelText("Remove 2028-02-29 – 2028-03-01"));
    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
  });

  it("renders default selection and adds an item", async () => {
    renderComponent();

    expect(screen.getByText("Beta")).toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });
  });

  it("renders selected items below the search input by default", () => {
    const { container } = renderComponent({ default_selected: ["Beta"] });
    const search = container.querySelector(".search-combobox");
    const selectedList = container.querySelector(".selected-list");

    expect(search).not.toBeNull();
    expect(selectedList).not.toBeNull();
    expect(search!.compareDocumentPosition(selectedList!) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders selected items above the search input when configured", () => {
    const { container } = renderComponent({
      default_selected: ["Beta"],
      selected_position: "top",
    });
    const search = container.querySelector(".search-combobox");
    const selectedList = container.querySelector(".selected-list");

    expect(search).not.toBeNull();
    expect(selectedList).not.toBeNull();
    expect(selectedList!.compareDocumentPosition(search!) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("keeps options open after adding an item so another item can be selected", async () => {
    renderComponent();

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    expect(input).toHaveFocus();
    expect(screen.getByRole("option", { name: "Gamma" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Gamma" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha", "Gamma"]);
    });
  });

  it("virtualizes the options list so only a small window of rows is in the DOM", () => {
    const options = Array.from({ length: 5000 }, (_, index) => `Option ${index}`);
    const { container } = renderComponent({ options, default_selected: [] });

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));

    const renderedRows = container.querySelectorAll(".option-item");
    expect(renderedRows.length).toBeGreaterThan(0);
    // Windowing must keep the DOM tiny regardless of option count.
    expect(renderedRows.length).toBeLessThan(50);
    expect(screen.getByText("Option 0")).toBeInTheDocument();
  });

  it("filters options case-insensitively while typing", () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "ga" },
    });

    expect(screen.getByRole("option", { name: "Gamma" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Alpha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Beta" })).not.toBeInTheDocument();
  });

  it("fetches mapped API suggestions and merges them after static options", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: "python",
              name: "Remote Python",
              image: { url: "https://example.com/remote-python.png" },
            },
            {
              id: "pypi",
              name: "PyPI",
              image: { url: "https://example.com/pypi.png" },
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderComponent({
      options: [{ label: "Python", value: "python" }],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest?lang=en",
      suggestions_query_param: "term",
      suggestions_response_path: "data.items",
      suggestions_label_path: "name",
      suggestions_value_path: "id",
      suggestions_icon_url_path: "image.url",
      suggestions_headers: { "X-Public-Client": "streamlit" },
      suggestions_debounce_ms: 0,
    });

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "py" },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/suggest?lang=en&term=py",
      expect.objectContaining({
        method: "GET",
        headers: { "X-Public-Client": "streamlit" },
        signal: expect.any(AbortSignal),
      }),
    );

    const optionLabels = await screen.findAllByRole("option");
    expect(optionLabels.map((option) => option.textContent)).toEqual(["Python", "PyPI"]);
    expect(container.querySelector(".option-icon")).toHaveAttribute(
      "src",
      "https://example.com/pypi.png",
    );
  });

  it("keeps API-only search enabled and debounces to the latest query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_min_chars: 1,
      suggestions_debounce_ms: 30,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: "p" } });
    fireEvent.change(input, { target: { value: "py" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/suggest?q=py");
  });

  it("does not refetch when Streamlit resends equivalent headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([
        { label: "Python", value: "python" },
        { label: "PHP", value: "php" },
      ]),
    });
    vi.stubGlobal("fetch", fetchMock);

    const args = {
      label: "Items",
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_headers: {
        "X-Public-Client": "streamlit",
        "X-Request-Source": "test",
      },
      suggestions_debounce_ms: 0,
    };
    const { rerender } = render(
      <SortableMultiselect
        args={args}
        disabled={false}
        theme={undefined}
        width={640}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "p" },
    });
    await screen.findByRole("option", { name: "Python" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender(
      <SortableMultiselect
        args={{
          ...args,
          suggestions_headers: {
            "X-Request-Source": "test",
            "X-Public-Client": "streamlit",
          },
        }}
        disabled={false}
        theme={undefined}
        width={640}
      />,
    );

    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits for the configured minimum query length", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([]),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_min_chars: 2,
      suggestions_debounce_ms: 0,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.change(input, { target: { value: "p" } });
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "py" } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it("shows a custom API error while keeping static options available", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network unavailable"));
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: ["Alpha", "Beta"],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_debounce_ms: 0,
      suggestions_error_message: "Suggestions are unavailable",
    });

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "alp" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Suggestions are unavailable");
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
  });

  it("shows a custom loading message while the API request is pending", async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_debounce_ms: 0,
      suggestions_loading_message: "Searching the API...",
    });

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "py" },
    });

    expect(await screen.findByRole("status")).toHaveTextContent("Searching the API...");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-controls");
  });

  it("keeps a selected API option when later search results replace it", async () => {
    const fetchMock = vi.fn().mockImplementation(async (requestUrl: string) => {
      const query = new URL(requestUrl).searchParams.get("q");
      return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(
          query === "py"
            ? [{ label: "Python", value: "python", icon_url: "https://example.com/python.png" }]
            : [{ label: "Rust", value: "rust", icon_url: "https://example.com/rust.png" }],
        ),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_debounce_ms: 0,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.change(input, { target: { value: "py" } });
    fireEvent.click(await screen.findByRole("option", { name: "Python" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["python"]);
    });

    fireEvent.change(input, { target: { value: "ru" } });
    expect(await screen.findByRole("option", { name: "Rust" })).toBeInTheDocument();

    const selectedItems = screen.getByRole("list", { name: "Selected items" });
    expect(within(selectedItems).getByText("Python")).toBeInTheDocument();
    expect(selectedItems.querySelector(".item-icon")).toHaveAttribute(
      "src",
      "https://example.com/python.png",
    );
  });

  it("replaces an inline API selection and keeps the latest option metadata", async () => {
    const fetchMock = vi.fn().mockImplementation(async (requestUrl: string) => {
      const query = new URL(requestUrl).searchParams.get("q");
      return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(
          query === "py"
            ? [{ label: "Python", value: "python", icon_url: "https://example.com/python.png" }]
            : [{ label: "Rust", value: "rust", icon_url: "https://example.com/rust.png" }],
        ),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = renderComponent({
      options: [],
      default_selected: [],
      max_selections: 1,
      single_select_display: true,
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_debounce_ms: 0,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.change(input, { target: { value: "py" } });
    fireEvent.click(await screen.findByRole("option", { name: "Python" }));
    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["python"]);
    });

    fireEvent.change(input, { target: { value: "ru" } });
    fireEvent.click(await screen.findByRole("option", { name: "Rust" }));
    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["rust"]);
    });

    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
    expect(container.querySelector(".single-selected-item .item-icon")).toHaveAttribute(
      "src",
      "https://example.com/rust.png",
    );
  });

  it("aborts an in-flight request when the query changes", async () => {
    const fetchMock = vi.fn().mockImplementation((requestUrl: string) => {
      const query = new URL(requestUrl).searchParams.get("q");
      if (query === "p") {
        return new Promise(() => undefined);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_debounce_ms: 0,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.change(input, { target: { value: "p" } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const firstSignal = fetchMock.mock.calls[0][1].signal as AbortSignal;

    fireEvent.change(input, { target: { value: "py" } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    expect(firstSignal.aborted).toBe(true);
  });

  it("shows the API error message for an invalid response path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: { items: "not-an-array" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://api.example.com/suggest",
      suggestions_response_path: "data.items",
      suggestions_debounce_ms: 0,
      suggestions_error_message: "Invalid suggestions response",
    });

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "py" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid suggestions response");
  });

  it("supports label value options and returns selected values", async () => {
    renderComponent({
      options: [
        { label: "Python", value: "python", icon_url: "https://example.com/python.png" },
        { label: "TypeScript", value: "typescript", icon_url: "https://example.com/ts.png" },
      ],
      default_selected: ["python"],
    });

    const selectedPython = screen.getByText("Python");
    expect(selectedPython).toBeInTheDocument();
    expect(selectedPython.parentElement?.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/python.png",
    );

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));
    fireEvent.click(screen.getByRole("option", { name: "TypeScript" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["python", "typescript"]);
    });
  });

  it("uses the default icon size when no custom size is configured", () => {
    const { container } = renderComponent({
      options: [{ label: "Python", value: "python", icon_url: "https://example.com/python.png" }],
      default_selected: ["python"],
    });

    expect(container.querySelector(".sortable-multiselect")).toHaveStyle({
      "--icon-size": "20px",
    });
  });

  it("applies a custom icon size to option and selected icons", () => {
    const { container } = renderComponent({
      options: [
        { label: "Python", value: "python", icon_url: "https://example.com/python.png" },
        { label: "TypeScript", value: "typescript", icon_url: "https://example.com/ts.png" },
      ],
      default_selected: ["python"],
      icon_size: 28,
    });

    expect(container.querySelector(".sortable-multiselect")).toHaveStyle({
      "--icon-size": "28px",
    });
    expect(container.querySelector(".item-icon")).toHaveAttribute(
      "src",
      "https://example.com/python.png",
    );

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));
    expect(container.querySelector(".option-icon")).toHaveAttribute(
      "src",
      "https://example.com/ts.png",
    );
  });

  it("uses the default options max height when no custom height is configured", () => {
    const { container } = renderComponent();

    expect(container.querySelector(".sortable-multiselect")).toHaveStyle({
      "--options-max-height": "190px",
    });
  });

  it("applies a custom options max height", () => {
    const { container } = renderComponent({ options_max_height: 260 });

    expect(container.querySelector(".sortable-multiselect")).toHaveStyle({
      "--options-max-height": "260px",
    });
  });

  it("adds the highlighted option with enter", async () => {
    renderComponent();

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.change(input, { target: { value: "alp" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });
  });

  it("moves highlighted option with arrow keys", async () => {
    renderComponent({ default_selected: [] });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta"]);
    });
  });

  it("closes options with escape", () => {
    renderComponent();

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.focus(input);
    expect(screen.getByRole("listbox", { name: "Available options" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox", { name: "Available options" })).not.toBeInTheDocument();
  });

  it("does not show already selected options as search results", () => {
    renderComponent();

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));

    expect(screen.queryByRole("option", { name: "Beta" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alpha" })).toBeInTheDocument();
  });

  it("disables search input when disabled", () => {
    renderComponent({ disabled: true });

    expect(screen.getByLabelText("Search and add item to Items")).toBeDisabled();
  });

  it("moves selected items with buttons", async () => {
    renderComponent({ default_selected: ["Alpha", "Beta"] });

    fireEvent.click(screen.getByLabelText("Move Alpha down"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });
  });

  it("shows move buttons by default", () => {
    renderComponent({ default_selected: ["Alpha", "Beta"] });

    expect(screen.getByLabelText("Move Alpha down")).toBeInTheDocument();
    expect(screen.getByLabelText("Move Beta up")).toBeInTheDocument();
  });

  it("hides move buttons when configured", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      show_move_buttons: false,
    });

    expect(screen.queryByLabelText("Move Alpha down")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Move Beta up")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Remove Alpha")).toBeInTheDocument();
  });

  it("shows 1-based numbers for selected items when configured", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      show_numbers: true,
    });

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("keeps numbers aligned with the current order after moving", async () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      show_numbers: true,
    });

    fireEvent.click(screen.getByLabelText("Move Alpha down"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("1");
    expect(rows[0]).toHaveTextContent("Beta");
    expect(rows[1]).toHaveTextContent("2");
    expect(rows[1]).toHaveTextContent("Alpha");
  });

  it("applies a base color to selected items", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      base_color: "#eef2ff",
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#eef2ff" });
    expect(rows[1]).toHaveStyle({ "--item-bg": "#eef2ff" });
  });

  it("applies order colors before the base color", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      base_color: "#eef2ff",
      order_colors: { "2": "#fee2e2" },
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#eef2ff" });
    expect(rows[1]).toHaveStyle({ "--item-bg": "#fee2e2" });
  });

  it("keeps order colors tied to the current order after moving", async () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      base_color: "#eef2ff",
      order_colors: { "1": "#fee2e2", "2": "#dcfce7" },
    });

    fireEvent.click(screen.getByLabelText("Move Alpha down"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Beta");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#fee2e2" });
    expect(rows[1]).toHaveTextContent("Alpha");
    expect(rows[1]).toHaveStyle({ "--item-bg": "#dcfce7" });
  });

  it("applies value colors that follow an item as it moves", async () => {
    renderComponent({
      default_selected: ["Alpha", "Beta"],
      base_color: "#eef2ff",
      value_colors: { Alpha: "#fee2e2" },
    });

    let rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#fee2e2" });
    expect(rows[1]).toHaveStyle({ "--item-bg": "#eef2ff" });

    fireEvent.click(screen.getByLabelText("Move Alpha down"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Beta");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#eef2ff" });
    expect(rows[1]).toHaveTextContent("Alpha");
    expect(rows[1]).toHaveStyle({ "--item-bg": "#fee2e2" });
  });

  it("keys value colors by the option id, not the displayed label", () => {
    renderComponent({
      options: [
        { label: "Python", value: "lang-8f21" },
        { label: "Rust", value: "lang-b45e" },
      ],
      default_selected: ["lang-8f21", "lang-b45e"],
      // The label-keyed entry must be ignored: colors match on the id.
      value_colors: { "lang-8f21": "#3776ab", Python: "#ff0000", Rust: "#ff0000" },
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Python");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#3776ab" });
    expect(rows[1]).toHaveTextContent("Rust");
    expect(rows[1]).not.toHaveStyle({ "--item-bg": "#ff0000" });
  });

  it("applies colors carried by an option", () => {
    renderComponent({
      options: [
        { label: "Alpha", value: "Alpha", color: "#fee2e2" },
        { label: "Beta", value: "Beta" },
      ],
      default_selected: ["Alpha", "Beta"],
      base_color: "#eef2ff",
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#fee2e2" });
    expect(rows[1]).toHaveStyle({ "--item-bg": "#eef2ff" });
  });

  it("previews an option color in the options list", () => {
    renderComponent({
      options: [
        { label: "Alpha", value: "Alpha", color: "#fee2e2" },
        { label: "Beta", value: "Beta" },
      ],
      default_selected: [],
    });

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));

    const alpha = screen.getByRole("option", { name: "Alpha" });
    const beta = screen.getByRole("option", { name: "Beta" });
    expect(alpha.querySelector(".option-swatch")).toHaveStyle({ background: "#fee2e2" });
    expect(beta.querySelector(".option-swatch")).toBeNull();
  });

  it("cycles a color palette across selected positions", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta", "Gamma"],
      color_palette: ["#fee2e2", "#dcfce7"],
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#fee2e2" });
    expect(rows[1]).toHaveStyle({ "--item-bg": "#dcfce7" });
    expect(rows[2]).toHaveStyle({ "--item-bg": "#fee2e2" });
  });

  it("counts negative order color positions from the last item", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta", "Gamma"],
      base_color: "#eef2ff",
      order_colors: { "-1": "#fee2e2" },
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#eef2ff" });
    expect(rows[1]).toHaveStyle({ "--item-bg": "#eef2ff" });
    expect(rows[2]).toHaveStyle({ "--item-bg": "#fee2e2" });
  });

  it("applies text and border colors from a color mapping", () => {
    renderComponent({
      default_selected: ["Alpha"],
      base_color: { background: "#111827", text: "#facc15", border: "#f74c00" },
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({
      "--item-bg": "#111827",
      "--item-fg": "#facc15",
      "--item-muted-fg": "#facc15",
      "--item-border": "#f74c00",
    });
  });

  it("fills unset color fields from lower priority sources", () => {
    renderComponent({
      default_selected: ["Alpha"],
      base_color: "#eef2ff",
      value_colors: { Alpha: { text: "#7f1d1d" } },
    });

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveStyle({ "--item-bg": "#eef2ff", "--item-fg": "#7f1d1d" });
  });

  it("ranks color sources with color_priority", () => {
    const args = {
      default_selected: ["Alpha"],
      value_colors: { Alpha: "#fee2e2" },
      order_colors: { "1": "#dcfce7" },
    };

    const { unmount } = renderComponent(args);
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ "--item-bg": "#fee2e2" });
    unmount();

    renderComponent({ ...args, color_priority: ["order"] });
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ "--item-bg": "#dcfce7" });
  });

  it("reads suggestion colors from the configured path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ label: "Delta", value: "delta", theme: { color: "#fee2e2" } }],
    });
    vi.stubGlobal("fetch", fetchMock);

    renderComponent({
      options: [],
      default_selected: [],
      suggestions_api_url: "https://example.com/suggest",
      suggestions_color_path: "theme.color",
      suggestions_debounce_ms: 0,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "de" } });

    const option = await screen.findByRole("option", { name: "Delta" });
    expect(option.querySelector(".option-swatch")).toHaveStyle({ background: "#fee2e2" });

    fireEvent.click(option);

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["delta"]);
    });

    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ "--item-bg": "#fee2e2" });
  });

  // These drive real hovers: hovering an option row also highlights it, which
  // re-renders the list, and the tooltip has to survive that.
  it("shows a tooltip when a clipped option label is hovered", async () => {
    const user = userEvent.setup();
    const longLabel = "An option label that is far too long for the dropdown";
    const restore = stubClippedText(320, 120);

    try {
      renderComponent({ options: ["Short", longLabel], default_selected: [] });
      fireEvent.focus(screen.getByLabelText("Search and add item to Items"));
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      // Row 1 is not the highlighted row, so this also moves the highlight.
      await user.hover(screen.getByText(longLabel));

      expect(await screen.findByRole("tooltip")).toHaveTextContent(longLabel);
    } finally {
      restore();
    }
  });

  it("hides the tooltip when the pointer leaves the label", async () => {
    const user = userEvent.setup();
    const longLabel = "An option label that is far too long for the dropdown";
    const restore = stubClippedText(320, 120);

    try {
      renderComponent({ options: [longLabel], default_selected: [] });
      fireEvent.focus(screen.getByLabelText("Search and add item to Items"));

      const label = screen.getByText(longLabel);
      await user.hover(label);
      expect(await screen.findByRole("tooltip")).toBeInTheDocument();

      await user.unhover(label);

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("colors the tooltip from tooltip_color", async () => {
    const user = userEvent.setup();
    const longLabel = "An option label that is far too long for the dropdown";
    const restore = stubClippedText(320, 120);

    try {
      renderComponent({
        options: [longLabel],
        default_selected: [],
        tooltip_color: { background: "#ffffff", text: "#111827", border: "#d1d5db" },
      });
      fireEvent.focus(screen.getByLabelText("Search and add item to Items"));

      await user.hover(screen.getByText(longLabel));

      expect(await screen.findByRole("tooltip")).toHaveStyle({
        "--tooltip-bg": "#ffffff",
        "--tooltip-fg": "#111827",
        "--tooltip-border": "#d1d5db",
      });
    } finally {
      restore();
    }
  });

  it("picks readable tooltip text when only a background is given", async () => {
    const user = userEvent.setup();
    const longLabel = "An option label that is far too long for the dropdown";
    const restore = stubClippedText(320, 120);

    try {
      renderComponent({
        options: [longLabel],
        default_selected: [],
        tooltip_color: "#fde68a",
      });
      fireEvent.focus(screen.getByLabelText("Search and add item to Items"));

      await user.hover(screen.getByText(longLabel));

      // Light background, so the text has to go dark rather than stay white.
      expect(await screen.findByRole("tooltip")).toHaveStyle({
        "--tooltip-bg": "#fde68a",
        "--tooltip-fg": "#111827",
      });
    } finally {
      restore();
    }
  });

  it("drops the tooltip when a reused row shows a different option", async () => {
    const user = userEvent.setup();
    const restore = stubClippedText(320, 120);

    try {
      renderComponent({
        options: ["Alpha long label", "Beta long label"],
        default_selected: [],
      });
      const input = screen.getByLabelText("Search and add item to Items");
      fireEvent.focus(input);

      await user.hover(screen.getByText("Alpha long label"));
      expect(await screen.findByRole("tooltip")).toHaveTextContent("Alpha long label");

      // Filtering puts a different option in the same row without a hover.
      fireEvent.change(input, { target: { value: "Beta" } });

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("shows a tooltip when a clipped selected item label is hovered", async () => {
    const user = userEvent.setup();
    const longLabel = "A selected item label that is far too long for its row";
    const restore = stubClippedText(320, 120);

    try {
      renderComponent({ options: [longLabel], default_selected: [longLabel] });

      await user.hover(screen.getByText(longLabel));

      expect(await screen.findByRole("tooltip")).toHaveTextContent(longLabel);
    } finally {
      restore();
    }
  });

  it("leaves a label that fits without a tooltip", async () => {
    const user = userEvent.setup();
    const restore = stubClippedText(120, 120);

    try {
      renderComponent({ default_selected: ["Alpha"] });

      await user.hover(screen.getByText("Alpha"));
      // Outlast the show delay: nothing should appear even after it elapses.
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("removes selected items", async () => {
    renderComponent({ default_selected: ["Alpha", "Beta"] });

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta"]);
    });
  });

  it("allows removing all selected items without restoring defaults", async () => {
    const args = { default_selected: ["Alpha"], empty_message: "Nothing selected yet" };
    const { rerender } = renderComponent(args);

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    });

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing selected yet")).toBeInTheDocument();

    rerender(componentWithArgs({ ...args, default_selected: ["Alpha"] }));

    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing selected yet")).toBeInTheDocument();
  });

  it("replaces the current selection when default values or order change", async () => {
    const { rerender } = renderComponent({ default_selected: ["Alpha", "Beta"] });

    rerender(componentWithArgs({ default_selected: ["Beta", "Alpha"] }));
    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    rerender(componentWithArgs({ default_selected: [] }));
    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    });
    expect(screen.getByText("No items selected")).toBeInTheDocument();
  });

  it("preserves equivalent defaults until the default revision changes", async () => {
    const { rerender } = renderComponent({
      default_selected: ["Alpha"],
      default_revision: 0,
    });

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Alpha", "Beta"]);
    });

    rerender(componentWithArgs({ default_selected: ["Alpha"], default_revision: 0 }));

    expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Alpha", "Beta"]);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();

    rerender(componentWithArgs({ default_selected: ["Alpha"], default_revision: 1 }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Alpha"]);
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("shows the default empty message when no custom message is configured", () => {
    renderComponent({ default_selected: [] });

    expect(screen.getByText("No items selected")).toBeInTheDocument();
  });

  it("keeps the external selected list for max one unless inline display is enabled", () => {
    renderComponent({ default_selected: ["Beta"], max_selections: 1 });

    expect(screen.getByRole("list", { name: "Selected items" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search and add item to Items")).toBeDisabled();
  });

  it("renders a styled selected item inside the control without an external list", () => {
    const { container } = renderComponent({
      options: [
        {
          label: "Beta language with a long label",
          value: "beta",
          icon_url: "https://example.com/beta.png",
        },
        { label: "Alpha", value: "alpha" },
      ],
      default_selected: ["beta"],
      max_selections: 1,
      single_select_display: true,
      selected_position: "top",
      show_numbers: true,
      base_color: { background: "#112233", text: "#ffffff", border: "#445566" },
    });

    expect(screen.queryByRole("list", { name: "Selected items" })).not.toBeInTheDocument();
    expect(screen.queryByText("No items selected")).not.toBeInTheDocument();
    expect(screen.getByText("Beta language with a long label")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(container.querySelector(".single-selected-item")).toHaveStyle({
      "--item-bg": "#112233",
      "--item-fg": "#ffffff",
      "--item-border": "#445566",
    });
    expect(container.querySelector(".item-icon")).toHaveAttribute(
      "src",
      "https://example.com/beta.png",
    );
  });

  it("opens from the inline value and replaces the selected item", async () => {
    renderComponent({
      default_selected: ["Beta"],
      max_selections: 1,
      single_select_display: true,
    });

    const input = screen.getByLabelText("Search and add item to Items");
    expect(input).not.toBeDisabled();
    fireEvent.mouseDown(screen.getByText("Beta"));
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Alpha"]);
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("updates an inline selection when the default changes", async () => {
    const { rerender } = renderComponent({
      default_selected: ["Beta"],
      max_selections: 1,
      single_select_display: true,
    });

    rerender(
      componentWithArgs({
        default_selected: ["Gamma"],
        max_selections: 1,
        single_select_display: true,
      }),
    );

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Gamma"]);
    });
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("clears the inline selection and keeps removal disabled when disabled", async () => {
    const { unmount } = renderComponent({
      default_selected: ["Beta"],
      max_selections: 1,
      single_select_display: true,
    });

    fireEvent.click(screen.getByLabelText("Remove Beta"));
    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    });
    expect(screen.queryByText("No items selected")).not.toBeInTheDocument();

    unmount();
    renderComponent({
      default_selected: ["Beta"],
      max_selections: 1,
      single_select_display: true,
      disabled: true,
    });
    expect(screen.getByLabelText("Search and add item to Items")).toBeDisabled();
    expect(screen.getByLabelText("Remove Beta")).toBeDisabled();
  });

  it("disables adding options when the selection limit is reached", async () => {
    renderComponent({
      default_selected: ["Beta"],
      max_selections: 2,
      max_selections_placeholder: "Choose up to 2 items",
      no_options_placeholder: "All items selected",
    });

    const input = screen.getByLabelText("Search and add item to Items");
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", "Choose up to 2 items");
    expect(screen.queryByRole("listbox", { name: "Available options" })).not.toBeInTheDocument();
  });

  it("shows the default no-options placeholder when every option is selected", () => {
    renderComponent({ default_selected: ["Alpha", "Beta", "Gamma"] });

    const input = screen.getByLabelText("Search and add item to Items");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", "No more options");
  });

  it("shows a custom no-options placeholder when every option is selected", () => {
    renderComponent({
      default_selected: ["Alpha", "Beta", "Gamma"],
      no_options_placeholder: "All items selected",
    });

    const input = screen.getByLabelText("Search and add item to Items");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", "All items selected");
  });

  it("allows adding again after removing an item below the selection limit", async () => {
    renderComponent({ default_selected: ["Alpha", "Beta"], max_selections: 2 });

    const input = screen.getByLabelText("Search and add item to Items");
    expect(input).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta"]);
    });

    expect(input).not.toBeDisabled();
    fireEvent.focus(input);
    fireEvent.click(screen.getByRole("option", { name: "Gamma" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Gamma"]);
    });
  });

  it("keeps remove and move controls enabled when the selection limit is reached", async () => {
    renderComponent({ default_selected: ["Alpha", "Beta"], max_selections: 2 });

    fireEvent.click(screen.getByLabelText("Move Alpha down"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });

    fireEvent.click(screen.getByLabelText("Remove Beta"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Alpha"]);
    });
  });
});
