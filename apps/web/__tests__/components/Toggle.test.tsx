import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Toggle from "@/components/ui/Toggle";

describe("Toggle", () => {
  it("renders with checked state", () => {
    const { container } = render(<Toggle checked={true} onChange={() => {}} />);
    const switchEl = within(container).getByRole("switch", { checked: true });
    expect(switchEl).toBeInTheDocument();
  });

  it("renders with unchecked state", () => {
    const { container } = render(<Toggle checked={false} onChange={() => {}} />);
    expect(within(container).getByRole("switch", { checked: false })).toBeInTheDocument();
  });

  it("calls onChange when clicked", () => {
    const onChange = vi.fn();
    const { container } = render(<Toggle checked={false} onChange={onChange} />);
    fireEvent.click(within(container).getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("toggles from true to false on click", () => {
    const onChange = vi.fn();
    const { container } = render(<Toggle checked={true} onChange={onChange} />);
    fireEvent.click(within(container).getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("renders label and description", () => {
    const { container } = render(
      <Toggle checked={false} onChange={() => {}} label="Enable feature" description="Turn this on to enable." />,
    );
    expect(within(container).getByText("Enable feature")).toBeInTheDocument();
    expect(within(container).getByText("Turn this on to enable.")).toBeInTheDocument();
  });

  it("does not call onChange when disabled", () => {
    const onChange = vi.fn();
    const { container } = render(<Toggle checked={false} onChange={onChange} disabled />);
    const switchEl = within(container).getByRole("switch");
    expect(switchEl).toBeDisabled();
    fireEvent.click(switchEl);
    expect(onChange).not.toHaveBeenCalled();
  });
});
