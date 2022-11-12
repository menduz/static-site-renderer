---
layout: post
title: "Calculating PI using streams, head & tail in DataWeave"
description: ""
tags:
  - DataWeave
  - languages
author: "@menduz"
excerpt_separator: <!--more-->
slug: posts/2017.11.05
date: 2017-11-05
---

Thanks to `[head ~ tail]` in DataWeave 2.0 we can easily create infinite sequence generators.

<!--more-->

In this case we are implementing the [Leibniz's series](https://proofwiki.org/wiki/Leibniz's_Formula_for_Pi) to calculate an approximation of PI.

```kotlin
/**
 * This function returns a stream. We first populate the stream with a
 * head value, and a lazy tail.
 * In this case, we tell the engine the tail is a function call. 
 * That function call will be not be executed UNTIL the value of that
 * call is needed.
 */
fun leibnizTerm(n: Number = 0): Array<Number> = 
  [4 / (n + 1) - 4 / (n + 3) ~ leibnizTerm(n + 4)]
// ^^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^
//           head                  lazy tail

/**
 * Now we have the sequence generator, the only thing left is select 
 * the values and aggregate them. We are going to pick a slice of the
 * infinite sequence of leibnizTerm using a range selector.
 */
fun pi(terms: Number = 1E4): Number = do {
  var seriesSubset = leibnizTerm()[0 to terms]
  //                 ^^^^^^^^^^^  ^^^^^^^^^^^^
  //                 series gen   range selector
  ---
  sum( seriesSubset )
}


---
// Then executing
pi(1E4)
// Outputs: 3.1415426585893202
```


$$
s_j = \sum_{i} w_{ij}.y_{i}
$$

*where $$y_{i}$$ is all the inputs (bias included)*

After computing its state, the neuron passes it through its activation function ($f_j$), which normalizes the result ($$y_j$$) (normally between 0-1).

$$y_j = f_j(S_j)$$

```x-dot
# Find examples at https://graphviz.org/gallery/
digraph G {

	subgraph cluster_0 {
		style=filled;
		color=lightgrey;
		node [style=filled,color=white];
		a0 -> a1 -> a2 -> a3;
		label = "process #1";
	}

	subgraph cluster_1 {
		node [style=filled];
		b0 -> b1 -> b2 -> b3;
		label = "process #2";
		color=blue
	}
	start -> a0;
	start -> b0;
	a1 -> b3;
	b2 -> a3;
	a3 -> a0;
	a3 -> end;
	b3 -> end;

	start [shape=Mdiamond];
	end [shape=Msquare];
}
```


Unformated typescript
```typescript
function formatIfNeeded(code: string, language: string) {
switch (language) {
case "typescript":
case "css":
case "scss":
case "json":
case "yaml":
case "json5":
case "graphql":
case "markdown":
case "html":
return prettier.format(code, { semi: false, parser: language });
case "javascript":
return prettier.format(code, { semi: false, parser: "babel" });
}
return code;
}
```