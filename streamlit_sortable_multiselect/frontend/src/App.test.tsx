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

  it("filters options case-insensitively while typing", () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText("Search and add item to Items"), {
      target: { value: "ga" },
    });

    expect(screen.getByRole("option", { name: "Gamma" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Alpha" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Beta" })).not.toBeInTheDocument();
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

  it("removes selected items", async () => {
    renderComponent({ default_selected: ["Alpha", "Beta"] });

    fireEvent.click(screen.getByLabelText("Remove Alpha"));

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta"]);
    });
  });
});
