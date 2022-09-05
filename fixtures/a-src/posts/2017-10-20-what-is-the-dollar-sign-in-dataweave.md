---
layout: post
title: "What is the dollar sign in DataWeave?"
description: "And why it may make your life easier"
tags:
  - DataWeave
  - languages
author: "@menduz"
excerpt_separator: <!--more-->
redirect_from:
  - /what-is-the-dollar-sign-in-dataweave
  - /what-is-the-dollar-sign-in-dataweave/
slug: posts/2017.10.20
date: 2017-10-20
---

TL;DR: It is an argument of an **automatic function injection**

<!--more-->

First of all, a normal function call looks like this:

```kotlin
var list = [1,2]
---
map(list, (item, index) -> (item * 10 + index))
```

That's not handy to chain different function calls. We came up with infix function calls, that means we can move the `map` to the middle of the parameters and remove the parentheses. It looks like this now:

```kotlin
[1,2] map (item, index) -> (item * 10 + index)
```

And the function `map` expects to receive a function in the right hand side. DataWeave automatically injects a function if you don't write a literal one. The injected function will register arguments `$` and `$$` in this case, those corresponds to `item = $` and `index = $$`.  

So...

```kotlin
map([1,2], (item, index) -> (item * 10 + index))

// Is exactly the same as (infix notation)

[1,2] map (item, index) -> (item * 10 + index)

// Is exactly the same as (infix + injection)

[1,2] map ($ * 10 + $$)
```