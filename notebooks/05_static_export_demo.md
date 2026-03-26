---
title: Static Export Demo
---

# Static Export Demo

This page tests whether our custom anywidgets render interactively in MyST static HTML exports (no kernel required).

We keep it minimal: one CounterWidget and one pair of linked counters. All widgets are fully interactive client-side using the MyST `{anywidget}` directive.

## Basic CounterWidget

A single counter widget. It renders with +/- buttons and is fully interactive — no Python kernel needed.

```{anywidget} ../widgets/counter_widget/widget.js
:css: ../widgets/counter_widget/style.css
{
  "widget_id": "static_counter_1",
  "label": "Static Export Counter",
  "value": 5
}
```

## Linked CounterWidgets

A source counter linked to a follower. The follower mirrors the source's value changes, all client-side.

### Source Counter

```{anywidget} ../widgets/counter_widget/widget.js
:css: ../widgets/counter_widget/style.css
{
  "widget_id": "static_source",
  "label": "Source Counter",
  "value": 0
}
```

### Follower Counter

```{anywidget} ../widgets/linked_counter/widget.js
:css: ../widgets/linked_counter/style.css
{
  "widget_id": "static_follower",
  "label": "Follower Counter",
  "value": 0,
  "link_to": "static_source",
  "link_mode": "mirror",
  "linked_value": 0,
  "status": "Ready"
}
```
