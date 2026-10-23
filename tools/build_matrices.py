#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_DOC_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"

REQUIRED_HEADERS = [
    "design_id",
    "block_type",
    "block_order",
    "target_object",
    "target_label_ka",
    "accepted_labels_ka_optional",
    "mooney_file",
    "target_clear_file",
    "cue_validity",
    "cue_object",
    "cue_label_ka",
    "cue_clear_file",
    "notes",
    "row_check",
]

REQUIRED_VALUE_COLUMNS = [
    "design_id",
    "block_type",
    "block_order",
    "target_object",
    "target_label_ka",
    "mooney_file",
    "target_clear_file",
    "cue_validity",
    "cue_object",
    "cue_label_ka",
]


def qname(ns: str, tag: str) -> str:
    return f"{{{ns}}}{tag}"


def column_index(cell_reference: str) -> int:
    match = re.match(r"([A-Z]+)", cell_reference.upper())
    if not match:
        raise ValueError(f"Invalid cell reference: {cell_reference}")
    total = 0
    for char in match.group(1):
        total = total * 26 + (ord(char) - ord("A") + 1)
    return total - 1


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def parse_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    name = "xl/sharedStrings.xml"
    if name not in zf.namelist():
        return []
    root = ET.fromstring(zf.read(name))
    out: list[str] = []
    for si in root.findall(qname(NS_MAIN, "si")):
        parts = [node.text or "" for node in si.iter(qname(NS_MAIN, "t"))]
        out.append("".join(parts))
    return out


def workbook_sheets(zf: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall(qname(NS_PKG_REL, "Relationship"))
    }
    sheets: list[tuple[str, str]] = []
    sheets_node = workbook.find(qname(NS_MAIN, "sheets"))
    if sheets_node is None:
        return sheets
    for sheet in sheets_node.findall(qname(NS_MAIN, "sheet")):
        name = sheet.attrib.get("name", "")
        rid = sheet.attrib.get(qname(NS_DOC_REL, "id"), "")
        target = rel_map.get(rid, "")
        if target.startswith("/"):
            path = target.lstrip("/")
        else:
            path = str(Path("xl") / target)
        path = str(Path(path))
        sheets.append((name, path))
    return sheets


def read_sheet_rows(xlsx_path: Path, requested_sheet: str | None) -> tuple[str, list[list[str]]]:
    with zipfile.ZipFile(xlsx_path) as zf:
        shared = parse_shared_strings(zf)
        sheets = workbook_sheets(zf)
        if not sheets:
            raise ValueError("Workbook contains no worksheets.")

        available = [name for name, _ in sheets]
        if requested_sheet:
            selected = next(((n, p) for n, p in sheets if n == requested_sheet), None)
            if selected is None:
                raise ValueError(
                    f"Sheet {requested_sheet!r} not found. Available sheets: {', '.join(available)}"
                )
        else:
            preferred = ["Blank Copy", "Sheet1"]
            selected = None
            for preferred_name in preferred:
                selected = next(((n, p) for n, p in sheets if n == preferred_name), None)
                if selected:
                    break
            if selected is None:
                selected = sheets[0]

        sheet_name, sheet_path = selected
        root = ET.fromstring(zf.read(sheet_path))
        sheet_data = root.find(qname(NS_MAIN, "sheetData"))
        if sheet_data is None:
            return sheet_name, []

        rows: list[list[str]] = []
        for row_node in sheet_data.findall(qname(NS_MAIN, "row")):
            cells: dict[int, str] = {}
            for cell in row_node.findall(qname(NS_MAIN, "c")):
                ref = cell.attrib.get("r", "")
                idx = column_index(ref)
                cell_type = cell.attrib.get("t", "")
                value = ""
                if cell_type == "inlineStr":
                    inline = cell.find(qname(NS_MAIN, "is"))
                    if inline is not None:
                        value = "".join(node.text or "" for node in inline.iter(qname(NS_MAIN, "t")))
                else:
                    value_node = cell.find(qname(NS_MAIN, "v"))
                    raw = value_node.text if value_node is not None and value_node.text is not None else ""
                    if cell_type == "s" and raw:
                        value = shared[int(raw)]
                    elif cell_type == "b":
                        value = "TRUE" if raw == "1" else "FALSE"
                    else:
                        value = raw
                cells[idx] = clean(value)

            if cells:
                width = max(cells) + 1
                row = [""] * width
                for idx, value in cells.items():
                    row[idx] = value
                rows.append(row)
            else:
                rows.append([])

        return sheet_name, rows


def parse_order(raw: str, excel_row: int, errors: list[str]) -> int | None:
    value = clean(raw)
    try:
        parsed = int(float(value))
    except (TypeError, ValueError):
        errors.append(f"Row {excel_row}: block_order must be 1 or 2, got {value!r}.")
        return None
    if parsed not in (1, 2):
        errors.append(f"Row {excel_row}: block_order must be 1 or 2, got {parsed}.")
        return None
    return parsed


def split_labels(raw: str, primary: str) -> list[str]:
    labels: list[str] = []
    for candidate in [primary, *clean(raw).split(";")]:
        label = clean(candidate)
        if label and label not in labels:
            labels.append(label)
    return labels


def safe_token(value: str) -> str:
    token = re.sub(r"[^A-Za-z0-9_-]+", "_", clean(value)).strip("_")
    return token or "item"


def validate_and_parse(rows: list[list[str]]) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    if not rows:
        return [], ["The selected sheet is empty."], warnings

    headers = [clean(value) for value in rows[0]]
    while headers and not headers[-1]:
        headers.pop()

    missing_headers = [header for header in REQUIRED_HEADERS if header not in headers]
    if missing_headers:
        errors.append("Missing required columns: " + ", ".join(missing_headers))
        return [], errors, warnings

    header_index = {header: headers.index(header) for header in REQUIRED_HEADERS}
    assignments: list[dict[str, Any]] = []

    for zero_idx, row in enumerate(rows[1:], start=2):
        def value(column: str) -> str:
            idx = header_index[column]
            return clean(row[idx] if idx < len(row) else "")

        # Ignore completely blank authoritative input rows. row_check is formula-generated and ignored.
        if not any(value(column) for column in REQUIRED_HEADERS[:-1]):
            continue

        for column in REQUIRED_VALUE_COLUMNS:
            if not value(column):
                errors.append(f"Row {zero_idx}: {column} is required.")

        block_type = value("block_type").lower()
        validity = value("cue_validity").lower()
        order = parse_order(value("block_order"), zero_idx, errors)

        if block_type not in {"picture", "text"}:
            errors.append(f"Row {zero_idx}: block_type must be 'picture' or 'text'.")
        if validity not in {"correct", "incorrect"}:
            errors.append(f"Row {zero_idx}: cue_validity must be 'correct' or 'incorrect'.")

        target = value("target_object")
        cue = value("cue_object")
        if validity == "correct" and target and cue and target != cue:
            errors.append(
                f"Row {zero_idx}: correct cue must use the same cue_object as target_object "
                f"({target!r} != {cue!r})."
            )
        if validity == "incorrect" and target and cue and target == cue:
            errors.append(
                f"Row {zero_idx}: incorrect cue must use a different cue_object from target_object ({target!r})."
            )
        if block_type == "picture" and not value("cue_clear_file"):
            errors.append(f"Row {zero_idx}: cue_clear_file is required for a picture block.")
        if block_type == "text" and value("cue_clear_file"):
            warnings.append(
                f"Row {zero_idx}: cue_clear_file is ignored because this is a text block."
            )

        assignments.append(
            {
                "source_row": zero_idx,
                "source_order": len(assignments),
                "design_id": value("design_id"),
                "block_type": block_type,
                "block_order": order,
                "target_object": target,
                "target_label_ka": value("target_label_ka"),
                "target_accepted_labels_ka": split_labels(
                    value("accepted_labels_ka_optional"), value("target_label_ka")
                ),
                "mooney_file": value("mooney_file"),
                "target_clear_file": value("target_clear_file"),
                "cue_validity": validity,
                "cue_object": cue,
                "cue_label_ka": value("cue_label_ka"),
                "cue_clear_file": value("cue_clear_file"),
                "notes": value("notes"),
            }
        )

    by_design: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for assignment in assignments:
        by_design[assignment["design_id"]].append(assignment)

    if not by_design:
        errors.append("No populated matrix rows were found.")
        return assignments, errors, warnings

    for design_id, items in by_design.items():
        block_types = {item["block_type"] for item in items}
        if block_types != {"picture", "text"}:
            errors.append(
                f"Design {design_id!r}: must contain both picture and text blocks; found {sorted(block_types)}."
            )

        block_orders: dict[str, set[int | None]] = defaultdict(set)
        for item in items:
            block_orders[item["block_type"]].add(item["block_order"])
        for block_type, orders in block_orders.items():
            if len(orders) != 1:
                errors.append(
                    f"Design {design_id!r}: all {block_type} rows must use the same block_order; found {sorted(str(x) for x in orders)}."
                )
        if block_types == {"picture", "text"}:
            picture_order = next(iter(block_orders["picture"]))
            text_order = next(iter(block_orders["text"]))
            if picture_order == text_order:
                errors.append(
                    f"Design {design_id!r}: picture and text blocks cannot share block_order {picture_order}."
                )

        seen_targets: set[str] = set()
        for item in items:
            target = item["target_object"]
            if target in seen_targets:
                errors.append(
                    f"Design {design_id!r}: target_object {target!r} appears more than once in the same matrix."
                )
            seen_targets.add(target)

    return assignments, errors, warnings


def event_common(assignment: dict[str, Any], block_id: str, cue_type: str) -> dict[str, Any]:
    return {
        "block_id": block_id,
        "block_type": assignment["block_type"],
        "cue_type": cue_type,
        "cue_validity": assignment["cue_validity"],
        "target_object": assignment["target_object"],
        "target_label_ka": assignment["target_label_ka"],
        "target_accepted_labels_ka": assignment["target_accepted_labels_ka"],
        "target_clear_file": assignment["target_clear_file"],
        "cue_object": assignment["cue_object"],
        "cue_label_ka": assignment["cue_label_ka"],
        "source_excel_row": assignment["source_row"],
        "notes": assignment["notes"] or None,
    }


def build_event(
    assignment: dict[str, Any],
    block_id: str,
    assignment_number: int,
    phase: str,
    trial_number: int,
) -> dict[str, Any]:
    block_type = assignment["block_type"]
    validity = assignment["cue_validity"]
    cue_type = f"{block_type}_{validity}"
    prefix = "p" if block_type == "picture" else "t"
    event = event_common(assignment, block_id, cue_type)
    event.update(
        {
            "event_id": f"{prefix}{assignment_number:03d}_{phase}",
            "trial_number": trial_number,
            "phase": phase,
        }
    )

    if phase in {"pre", "post"}:
        event.update(
            {
                "event_type": "image_response",
                "image_kind": "mooney",
                "stimulus_src": assignment["mooney_file"],
                "cue_text_ka": assignment["cue_label_ka"] if block_type == "text" else None,
                "cue_response_required": True,
                "displayed_object": assignment["target_object"],
                "expected_label_ka": assignment["target_label_ka"],
                "expected_accepted_labels_ka": assignment["target_accepted_labels_ka"],
            }
        )
    elif block_type == "picture":
        event.update(
            {
                "event_type": "image_response",
                "image_kind": "clear",
                "stimulus_src": assignment["cue_clear_file"],
                "cue_text_ka": None,
                "cue_response_required": True,
                "displayed_object": assignment["cue_object"],
                "expected_label_ka": assignment["cue_label_ka"],
                "expected_accepted_labels_ka": [assignment["cue_label_ka"]],
            }
        )
    else:
        event.update(
            {
                "event_type": "passive_word_cue",
                "image_kind": None,
                "stimulus_src": None,
                "cue_text_ka": assignment["cue_label_ka"],
                "cue_response_required": False,
                "displayed_object": assignment["cue_object"],
                "expected_label_ka": None,
                "expected_accepted_labels_ka": [],
            }
        )
    return event


def build_payload(assignments: list[dict[str, Any]], source_name: str, sheet_name: str) -> dict[str, Any]:
    by_design: dict[str, list[dict[str, Any]]] = defaultdict(list)
    design_sequence: list[str] = []
    for assignment in assignments:
        design_id = assignment["design_id"]
        if design_id not in by_design:
            design_sequence.append(design_id)
        by_design[design_id].append(assignment)

    matrices: list[dict[str, Any]] = []
    for design_id in design_sequence:
        items = by_design[design_id]
        ordered_block_types = sorted(
            {item["block_type"] for item in items},
            key=lambda block_type: next(
                item["block_order"] for item in items if item["block_type"] == block_type
            ),
        )
        events: list[dict[str, Any]] = []
        assignment_counter = 0
        trial_counter = 0

        for block_type in ordered_block_types:
            block_items = [item for item in items if item["block_type"] == block_type]
            block_items.sort(key=lambda item: item["source_order"])
            block_order = block_items[0]["block_order"]
            block_id = f"{block_type}_block_{block_order}"
            numbered: list[tuple[int, dict[str, Any]]] = []
            for item in block_items:
                assignment_counter += 1
                numbered.append((assignment_counter, item))

            # Interleave objects by phase: every pre, then every cue, then every post.
            for phase in ("pre", "cue", "post"):
                for assignment_number, item in numbered:
                    trial_counter += 1
                    events.append(
                        build_event(item, block_id, assignment_number, phase, trial_counter)
                    )

        matrices.append(
            {
                "design_id": design_id,
                "block_order": ordered_block_types,
                "source_assignment_count": len(items),
                "events": events,
            }
        )

    return {
        "version": "generated_from_peer_excel",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_workbook": source_name,
        "source_sheet": sheet_name,
        "matrix_count": len(matrices),
        "matrices": matrices,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Peer-filled .xlsx workbook")
    parser.add_argument(
        "--sheet",
        default=None,
        help='Authoritative sheet name. Default: "Blank Copy", then "Sheet1", then first sheet.',
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/design_matrices.json"),
        help="Output JSON path (default: data/design_matrices.json)",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("data/matrix_build_report.txt"),
        help="Validation/build report path",
    )
    args = parser.parse_args()

    if not args.input.exists():
        print(f"ERROR: input workbook not found: {args.input}", file=sys.stderr)
        return 2
    if args.input.suffix.lower() != ".xlsx":
        print("ERROR: input must be an .xlsx file.", file=sys.stderr)
        return 2

    try:
        sheet_name, rows = read_sheet_rows(args.input, args.sheet)
        assignments, errors, warnings = validate_and_parse(rows)
    except (ValueError, KeyError, zipfile.BadZipFile, ET.ParseError) as exc:
        print(f"ERROR: could not read workbook: {exc}", file=sys.stderr)
        return 2

    report_lines = [
        "Mooney matrix build report",
        f"Input: {args.input}",
        f"Authoritative sheet: {sheet_name}",
        f"Populated assignments: {len(assignments)}",
        "",
    ]
    if warnings:
        report_lines.append("WARNINGS")
        report_lines.extend(f"- {warning}" for warning in warnings)
        report_lines.append("")
    if errors:
        report_lines.append("FAILED")
        report_lines.extend(f"- {error}" for error in errors)
        report_text = "\n".join(report_lines) + "\n"
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(report_text, encoding="utf-8")
        print(report_text, file=sys.stderr)
        print(f"No JSON was generated. Fix the workbook and run the command again.", file=sys.stderr)
        return 1

    payload = build_payload(assignments, args.input.name, sheet_name)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    report_lines.extend(
        [
            "PASSED",
            f"Matrices generated: {payload['matrix_count']}",
            f"Events generated: {sum(len(matrix['events']) for matrix in payload['matrices'])}",
            f"Output: {args.output}",
        ]
    )
    report_text = "\n".join(report_lines) + "\n"
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report_text, encoding="utf-8")
    print(report_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
