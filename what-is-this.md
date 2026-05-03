---
title: Background and story - Jupyter Notebooks + MyST + Anywidget
---

_Note_: This page is written by a human (me). The rest of the text on this site has been largely crafted by AI, so please treat it as such. On this page, I promise I've not used any AI ❤️.

## Who am I and what is this?

I am not a scientific python person. I am not a scientific person at all, for that matter. I'm a bit of a Python person, but I have my roots in front-end web development.

I've been getting involved in the Jupyter space over the past few years and have been amazed by the fantastic community, and all the amazing things people are doing in notebooks. I had the privilege of meeting Fernando Perez, and his vision for Jupyter and what it enables for open science is inspiring.

One thing that has annoyed me, as a frontend developer, is how hard it is to make custom frontend data visualiztion / interactivity components inside a notebook. Now I know there's a few ways to do it, and people have built some amazing frontend things inside Jupyter, but it's required knowing a lot of details about the Jupyter widget system, and feels like a whole new thing to learn if you're a regular frontend developer who uses React or Vue, etc.

A few years ago, Trevor Manz, who I also had the privilege of meeting in New York, developed a very useful library called [`anywidget`](https://github.com/manzt/anywidget). This made elegant use of ECMAScript Modules (ESM) and clever plumbing on the Python side to deliver a very simple-to-understand interface for frontend developers to develop widgets for Jupyter notebooks.

This was **amazing** - you could now drop arbitrary JS code - all it needed to do was export a `render` function that expected a DOM element to render into, and some model state, and you could go wild and do anything you can do with frontend Javascript. You could, of course, also attach arbitrary CSS to make a fully functional piece of frontend interactivity rendered as a notebook widget. The model "state" would be populated from the Python notebook, and is what you would use to pass data and rendering options into the widget.

Using `traitlets` in Python, you could then also "communicate" between the widget and Python - so your Python code in the notebook could modify widget state, and the user interacting with the widget could modify the state of a variable in the notebook in Python. In the frontend paradigm of "your view is a function of state", this was easy to map onto a React application or component, where the "state" was shared with Python.

The cool thing about this is you could also "link" multiple widgets together - so you could have, for example, a time-slider widget that a user can use to change a "year", connected to a map widget where some data visualization updates for that year. 

So, all this sounds great, why was I still annoyed? All this required the user viewing the outputs of the notebook to be running a Jupyter kernel, which means a backend process running compute somewhere, for each user. Projects like [Jupyterlite](https://jupyterlite.readthedocs.io/) are opening up the possibility of being able to do that Python compute in the user's browser without backend compute, but it does not work with all python tooling, and adds a layer of complexity.

There is a project called [Jupyter Book](https://jupyterbook.org/) which takes a mixture of notebook / computational content and arbitrary markdown, and generates beautiful frontend websites that can be distributed as HTML and Javascript, making the content very easily distributable. It is what's used to generate the website you are looking at right now. Jupyter Book uses the [MyST rendering engine](https://mystmd.org/) to parse the custom markdown format and the outputs of computational notebook content and convert them into a static HTML bundle. (Jupyter Book also does a lot more, but those are the bits relevant to my story here.)

The "annoyance" has been that widgets you create using anywidget in your notebooks, did not output when rendered via the MyST rendering engine. Recently, the MyST team merged in a feature to add a support for an `anywidget` directive - so you could now include widgets created using `anywidget` in MyST markdown content, and have it render. So I can put this in my markdown:

```
:::{anywidget} widgets/counter_widget/widget.js
:css: widgets/counter_widget/style.css

{
  value: 4,
  label: "Hello from markdown",
  widget_id: "what_is_this_counter_1"
}
:::
```

Which renders a simple counter widget that I wrote some simple JS and CSS for, with a starting value of 4:

:::{anywidget} widgets/counter_widget/widget.js
:css: widgets/counter_widget/style.css

{
  value: 4,
  label: "Hello from markdown",
  widget_id: "what_is_this_counter_1"
}
:::

Again, this is **amazing**. Taking off from this, there are two additional problems that I'm interested in seeing solved:

 - Rendering `anywidget` widgets that are included as part of `.ipnyb` notebooks when notebooks are rendered using Jupyter Book / MyST. Currently, MyST will only render anywidget widgets when specified as directives in markdown. I want it to, for example, output a [`lonboard`](https://developmentseed.org/lonboard/) map visualized inside a notebook when exporting as a built website.
 - Inter-widget communication: in the current rendering model, individual widget states are isolated from each other - i.e. it is not possible for one anywidget widget to affect state of another widget - I wanted to enable this to make it possible, for example, to make an interactive slider affecting a map, with individual widgets composed separately to make widgets re-usable. There should be a clearly defined interface to allow this communication to happen in a purely client-side way where appropriate. 

The rest of this repository, apart from this file, is generated with a lot of help from AI coding tools. The aim of this repository is experimentation and an attempt to show "what's possible".

## MyST Anywidget Static Export Plugin

The meat of this is a very hacked together [MyST plugin](https://github.com/batpad/anywidget-experiments/blob/main/plugins/anywidget-static-export.mjs) that does a few things. It parses the AST generated by MyST from the `ipnyb` file, and finds all nodes that have a mime-type corresponding to an `anywidget` widget. It then does some overly "clever" string manipulation to read the ESM and CSS bundles exported by the widget, and bundle and re-export it along-with the state / data defined in the notebook, so that it can be rendered by the MyST frontend application.

If this wasn't bad enough, it additionally sets up the "event" system for widgets to "link" to eachother and be able to effect eachother's state, by adding a `__myst_widgets` object to the global `window`.

Since we're using AI to write code now, it gets worse: it also handles binary buffers that were part of the widget data in the notebook. This adds additional complexity, but we needed this for widgets like `lonboard` to work.

The end result is a monstrous bit of code where we have things like javascript code defined as a string and horrible regexes trying to parse out and re-write different ways JS modules might be doing an `export`. This should not be considered production code, but rather perhaps a starting point to think of some of these ideas, and how we may implement them in upstream projects in a sustainable way (OR as a neat hack one can use for particular use-cases with all disclaimers taken into account).

## This is all boring as hell, where are the cool things?

I tried to create some examples to demonstrate what one can do. If you want to jump straight to something fun, scroll to the bottom of the ["what happened to your name" notebook](/names) and type your name. You can see the results of the analysis of the name database with year-by-year analysis for the popularity of your name, authored in a Python notebook, with a fun custom frontend widget to visualize the data, where we added some confetti because we could.

There is another notebook that begins to attempt [a simple "disaster dashboard"](/helene), constructed in a notebook. At the bottom, you can see a simple interface with a layer switcher and some filter options, that change state on the `lonboard` map.

If you want to see how simple widgets are constructed and how communication between widgets is handled, look at the simpler examples in [counter_widget](/anywidget-counter) and [linked_counter](/linked-counters). You can see the simple JS + CSS code used to create the widgets in the [widgets/ folder](https://github.com/batpad/anywidget-experiments/tree/main/widgets). These are currently simple, old-school Javascript functions because I'm old, but in theory this should work with React, Vue or any web framework. I will work on creating some examples for the same.

If you have any ideas for some cool frontend visualization you'd like to experiment with for data you're analyzing in Python, let me know by creating an issue and we can try writing a custom widget. 

## Thanks

Many thanks to Chris Holdgraf who successfully nerd-sniped me on Jupyter Book, and Angus Holland who helped break down some of the MyST internals to help me figure out getting this stuff to work (with the help of Claude).
