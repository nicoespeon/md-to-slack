# 3. Use release-please to automate releases

Date: 2025-03-07

## Status

Accepted

## Context

We want to automate the process of creating new releases as much as possible.

Following [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) we can lean on tools such as [release-please](https://github.com/googleapis/release-please) to automatically create new GitHub releases and update the CHANGELOG.

## Decision

The project will use [release-please](https://github.com/googleapis/release-please), through its [GitHub Action](https://github.com/marketplace/actions/release-please-action).

## Consequences

The benefits:

- The changelog will be automatically updated with the latest changes
- GitHub releases will be automatically created
- The version will be automatically updated in the package.json

On the other hand, we will need to follow the Conventional Commits specification to have the tool work properly.

It also does not publish to npm, so we will need to do that manually or via another GitHub Action that releases on tag.

release-please recommends the squash-and-merge strategy for pull requests, so we will follow this as well.
