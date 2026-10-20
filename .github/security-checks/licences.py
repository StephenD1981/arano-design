"""Fail when a project's runtime dependencies include a GPL or AGPL licence.

Two inputs:

- ``python REPORT.json``: a pip-licenses JSON report (a list of {Name, Version, License}).
- ``node DIR``: a Node project after ``npm ci --omit=dev``. Every non-dev package in npm's
  effective lock (``npm-shrinkwrap.json`` if present, else ``package-lock.json``; version 2
  or later) is checked, private ones included, using the licence in its installed
  ``package.json`` (or the lock's, for optional packages not installed here). The project's
  own root package is not checked. ``SEE LICENSE IN <file>`` is resolved by the file's title:
  a GPL or AGPL licence text fails; any other file is listed as undeclared.

SPDX expressions are evaluated: ``MIT OR GPL-3.0`` is acceptable (MIT can be chosen),
``MIT AND GPL-3.0`` is not. Anything that does not parse completely as SPDX is judged
conservatively: it fails if it mentions GPL or AGPL anywhere. LGPL is not matched.
Packages with no declared licence are listed as warnings, not failures.
"""

from __future__ import annotations

import json
import os
import re
import sys

COPYLEFT = re.compile(r"\bA?GPL|GNU\s+(AFFERO\s+)?GENERAL\s+PUBLIC\s+LICEN[CS]E", re.IGNORECASE)
SPDX_TOKEN = re.compile(r"\(|\)|[^\s()]+")
SPDX_ID = re.compile(r"[A-Za-z0-9.+-]+")
UNKNOWN = {"", "UNKNOWN", "UNLICENSED", "CUSTOM"}
SEE_FILE = re.compile(r"SEE LICEN[CS]E IN\s+(\S+)", re.IGNORECASE)
COPYLEFT_TITLE = re.compile(r"^\s*GNU\s+(AFFERO\s+)?GENERAL\s+PUBLIC\s+LICEN[CS]E", re.IGNORECASE)


class NotSpdx(ValueError):
    pass


def _spdx_ok(tokens: list[str]) -> bool:
    """Evaluate a complete SPDX expression; raise NotSpdx unless every token is consumed."""
    pos = 0

    def peek() -> str | None:
        return tokens[pos] if pos < len(tokens) else None

    def expr() -> bool:
        nonlocal pos
        result = term()
        while (peek() or "").upper() == "OR":
            pos += 1
            result = term() or result
        return result

    def term() -> bool:
        nonlocal pos
        result = factor()
        while (peek() or "").upper() == "AND":
            pos += 1
            result = factor() and result
        return result

    def factor() -> bool:
        nonlocal pos
        if peek() == "(":
            pos += 1
            result = expr()
            if peek() != ")":
                raise NotSpdx("unbalanced parentheses")
            pos += 1
            return result
        licence = peek()
        if licence is None or not SPDX_ID.fullmatch(licence) or licence.upper() in ("AND", "OR", "WITH"):
            raise NotSpdx(f"expected a licence identifier, got {licence!r}")
        pos += 1
        if (peek() or "").upper() == "WITH":
            pos += 1
            if peek() is None or not SPDX_ID.fullmatch(peek()):
                raise NotSpdx("WITH needs an exception identifier")
            pos += 1
        return not COPYLEFT.search(licence)

    result = expr()
    if pos != len(tokens):
        raise NotSpdx(f"unexpected {tokens[pos]!r}")
    return result


def acceptable(licence: str | list[str]) -> bool:
    """True when the declared licence(s) can be used without GPL or AGPL terms."""
    if isinstance(licence, list):  # several declared licences: any one may be chosen
        return bool(licence) and any(acceptable(item) for item in licence)
    if ";" in licence:  # pip-licenses joins several classifiers with "; "
        return any(acceptable(part.strip()) for part in licence.split(";") if part.strip())
    if re.search(r"\s(AND|OR|WITH)\s", licence, re.IGNORECASE):
        try:
            return _spdx_ok(SPDX_TOKEN.findall(licence))
        except NotSpdx:
            pass  # prose, or a broken expression: judged on the whole text below
    return not COPYLEFT.search(licence)


def _declared(manifest: dict) -> str | list[str]:
    """The licence a package.json declares (``license``, or the legacy ``licenses`` list)."""
    value = manifest.get("license")
    if value is None and isinstance(manifest.get("licenses"), list):
        value = [item.get("type", "") if isinstance(item, dict) else str(item) for item in manifest["licenses"]]
    if isinstance(value, dict):
        value = value.get("type", "")
    return value if isinstance(value, (str, list)) else ""


def python_entries(report_path: str) -> list[tuple[str, str | list[str]]]:
    with open(report_path) as f:
        return [(f"{p.get('Name')}=={p.get('Version')}", p.get("License") or "") for p in json.load(f)]


def _licence_file(package_dir: str, declaration: str) -> str:
    """Resolve ``SEE LICENSE IN <file>`` by the file's title: a GPL/AGPL text or undeclared."""
    name = SEE_FILE.match(declaration.strip())[1]
    path = os.path.realpath(os.path.join(package_dir, name))
    if not path.startswith(os.path.realpath(package_dir) + os.sep) or not os.path.isfile(path):
        return ""
    with open(path, errors="replace") as f:
        return "GPL (licence file)" if COPYLEFT_TITLE.match(f.read(4096)) else ""


def node_entries(project: str) -> list[tuple[str, str | list[str]]]:
    shrinkwrap = os.path.join(project, "npm-shrinkwrap.json")  # npm uses it in preference to the lock
    lock_path = shrinkwrap if os.path.isfile(shrinkwrap) else os.path.join(project, "package-lock.json")
    with open(lock_path) as f:
        lock = json.load(f)
    if "packages" not in lock:
        raise SystemExit(f"{lock_path}: lockfileVersion {lock.get('lockfileVersion')} has no 'packages' map; "
                         "regenerate it with npm 7 or later")
    found = []
    for key, entry in lock["packages"].items():
        if key == "" or entry.get("dev"):
            continue  # the project itself; development-only packages
        location = entry.get("resolved") if entry.get("link") else key
        package_dir = os.path.join(project, location or key)
        manifest = {}
        if os.path.isfile(os.path.join(package_dir, "package.json")):
            with open(os.path.join(package_dir, "package.json")) as f:
                manifest = json.load(f)
        licence = _declared(manifest) or entry.get("license") or ""
        if isinstance(licence, str) and SEE_FILE.match(licence.strip()):
            licence = _licence_file(package_dir, licence)
        name = manifest.get("name") or key.rsplit("node_modules/", 1)[-1]
        found.append((f"{name}@{manifest.get('version') or entry.get('version', '?')}", licence))
    return found


def main(argv: list[str]) -> int:
    mode, source = argv[1], argv[2]
    found = python_entries(source) if mode == "python" else node_entries(source)
    bad, unknown = [], []
    for package, licence in found:
        text = " ".join(licence) if isinstance(licence, list) else licence
        if text.strip().upper().rstrip("*") in UNKNOWN:
            unknown.append(package)
        elif not acceptable(licence):
            bad.append(f"{package}: {text}")
    for package in unknown:
        print(f"warning: no recognised licence declared: {package}")
    for line in bad:
        print(f"GPL/AGPL licence: {line}")
    print(f"{len(bad)} GPL/AGPL, {len(unknown)} undeclared, of {len(found)} packages")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
