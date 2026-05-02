import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("renders default selection and adds an item", async () => {
    renderComponent();

    expect(screen.getByText("Beta")).toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText("Search and add item to Items"));
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });
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

  it("filters options case-insensitively while typing", () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "ga" },
    });

    expect(screen.getByRole("option", { name: "Gamma" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Alpha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Beta" })).not.toBeInTheDocument();
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
    renderComponent({ default_selected: ["Alpha"] });

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith([]);
    });

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("No items selected")).toBeInTheDocument();
  });

  it("disables adding options when the selection limit is reached", async () => {
    renderComponent({
      default_selected: ["Beta"],
      max_selections: 2,
      max_selections_placeholder: "Choose up to 2 items",
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
