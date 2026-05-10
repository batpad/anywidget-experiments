import type { RenderProps } from "@anywidget/types";

interface CounterModel {
  value: number;
  label: string;
  widget_id: string;
  last_change: { old: number; new: number; widget_id: string } | Record<string, never>;
}

function render({ model, el }: RenderProps<CounterModel>): void {
  const container = document.createElement("div");
  container.className = "counter-widget";

  const heading = document.createElement("h3");
  heading.textContent = model.get("label");
  container.appendChild(heading);

  const valueDisplay = document.createElement("div");
  valueDisplay.className = "counter-value";
  valueDisplay.textContent = String(model.get("value"));
  container.appendChild(valueDisplay);

  const buttons = document.createElement("div");
  buttons.className = "counter-buttons";

  const button = (text: string, delta: number | "reset"): HTMLButtonElement => {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = () => {
      const next = delta === "reset" ? 0 : model.get("value") + delta;
      model.set("value", next);
      try {
        model.save_changes();
      } catch {
        // No-op when running statically (no kernel).
      }
    };
    return b;
  };

  buttons.appendChild(button("-", -1));
  buttons.appendChild(button("+", 1));
  buttons.appendChild(button("Reset", "reset"));
  container.appendChild(buttons);

  const info = document.createElement("div");
  info.className = "counter-info";
  const small = document.createElement("small");
  small.textContent = `Widget ID: ${model.get("widget_id")}`;
  info.appendChild(small);
  container.appendChild(info);

  model.on("change:value", () => {
    valueDisplay.textContent = String(model.get("value"));
    valueDisplay.classList.add("value-changed");
    setTimeout(() => valueDisplay.classList.remove("value-changed"), 300);
  });

  model.on("change:label", () => {
    heading.textContent = model.get("label");
  });

  el.appendChild(container);
}

export default { render };
