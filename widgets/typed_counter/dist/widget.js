// src/index.ts
function render({ model, el }) {
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
  const button = (text, delta) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = () => {
      const next = delta === "reset" ? 0 : model.get("value") + delta;
      model.set("value", next);
      try {
        model.save_changes();
      } catch {
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
var index_default = { render };
export {
  index_default as default
};
