#!/usr/bin/env bash
# Secret scan for arano-security-checks: every commit in BASE..HEAD (side branches included, merge
# commits as their first-parent diff), then the net change. Usage: scan_secrets.sh GITLEAKS BASE HEAD
# An empty or all-zero BASE (a new branch, or no pull request) scans the whole history of HEAD.
#
# Run against a trusted configuration: the checkout's .gitleaks.toml, .gitleaksignore and
# gitleaks:allow comments are not honoured, and .gitattributes cannot turn source into binary diffs.
set -euo pipefail
gitleaks="$1" base="$2" head="$3"
here="$(cd "$(dirname "$0")" && pwd)"
ignores="$(mktemp)"
trap 'rm -f "$ignores"' EXIT
args=(--config "$here/gitleaks.toml" --gitleaks-ignore-path "$ignores" --ignore-gitleaks-allow
      --redact --no-banner --exit-code 1)
patch=(--text --no-textconv --no-ext-diff)

if [ -z "$base" ] || [ "$base" = 0000000000000000000000000000000000000000 ]; then
  range="$head"
else
  range="$base..$head"
fi
"$gitleaks" git "${args[@]}" --log-opts="${patch[*]} --diff-merges=first-parent $range" .
if [ "$range" != "$head" ]; then
  git diff "${patch[@]}" "$base...$head" | "$gitleaks" stdin "${args[@]}"
fi
