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