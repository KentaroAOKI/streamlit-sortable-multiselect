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

    fireEvent.change(screen.getByLabelText("Add item to Items"), {
      target: { value: "Alpha" },
    });

    await waitFor(() => {
      expect(Streamlit.setComponentValue).toHaveBeenLastCalledWith(["Beta", "Alpha"]);
    });
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
