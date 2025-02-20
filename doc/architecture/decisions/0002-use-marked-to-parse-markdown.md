# 2. Use marked to parse Markdown

Date: 2025-02-19

## Status

Accepted

## Context

To properly convert Markdown into Slack `mrkdwn`, Regular Expressions will not be enough. We need to parse the Markdown into an abstract syntax tree (AST) that we can transform and print back into Slack-compatible syntax.

There are different options available as of February 2025, the most serious ones being:

- [marked](https://github.com/markedjs/marked), a low-level compiler for parsing markdown built for speed
- [mdast](https://github.com/syntax-tree/mdast) that implements [unist](https://github.com/syntax-tree/unist) specification for syntax trees

After experimenting with both for a POC implementation, we noticed that:

- **mdast has a bigger, but more complex ecosystem** to deal with. There are numerous libraries and extensions to install. For our use-case, it seems that [micromark](https://github.com/micromark/micromark) was the best option, with extensions such as `micromark-extension-gfm`.
- **mdast implementation was faster than marked**. We would have expected otherwise, but using `micromark` we could transform the syntax with ~1ms vs. ~2ms with marked. However, both are fast enough for our needs, Slack API being a bigger bottleneck anyway.
- **marked implementation was trivial compared to mdast**. Going with `micromark` requires us to implement ~204 methods (one `enter` and one `exit` for each of the ~102 node types). In comparison, `marked` only requires us to implement ~20 methods. Also, micromark implementation was more based on performing side-effects while visiting a node whereas marked consists of pure functions that return the output string. The latter makes code much easier to implement and debug.
- both can be extended and configured to support other syntaxes, such as [GitHub Flavored Markdown](https://github.github.com/gfm/)

## Decision

The project will use [marked](https://github.com/markedjs/marked) to parse Markdown and transform it into `mrkdwn`.

## Consequences

Pros:

- initial implementation of the library should be simplified
- transformation should be fast enough for our use-cases
- we will be able to easily extend it and support different flavors of markdown, such as [GitHub Flavored Markdown](https://github.github.com/gfm/).

Cons:

- we will tie the initial implementation details to marked interfaces

The exposed API will be independent of the selected tool anyway. Thus, we can always change it later and lean on our automated tests.
