import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function renderComponent(args = {}) {
  return render(
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
    />,
  );
}

describe("SortableMultiselect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("removes selected items", async () => {
    renderComponent({ default_selected: ["Alpha", "Beta"] });

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta"]);
    });
  });

  it("allows removing all selected items without restoring defaults", async () => {
    renderComponent({ default_selected: ["Alpha"], empty_message: "Nothing selected yet" });

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    });

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Nothing selected yet")).toBeInTheDocument();
  });

  it("shows the default empty message when no custom message is configured", () => {
    renderComponent({ default_selected: [] });

    expect(screen.getByText("No items selected")).toBeInTheDocument();
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
