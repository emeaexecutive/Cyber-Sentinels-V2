#!/usr/bin/env python3
"""Render the Cyber Sentinels whitepaper as a public, designed PDF."""

from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from build_whitepaper import blocks

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs" / "whitepaper" / "CYBER_SENTINELS_WHITEPAPER_V1.md"
OUTPUT = ROOT / "public" / "documents" / "cyber-sentinels-operational-trust-whitepaper-v1.pdf"

INK = colors.HexColor("#081018")
CHARCOAL = colors.HexColor("#111B24")
CYAN = colors.HexColor("#11D9E8")
PALE_CYAN = colors.HexColor("#DDFBFF")
SOFT_GREY = colors.HexColor("#647481")
LIGHT = colors.HexColor("#EFF5F6")
WHITE = colors.white
GREEN = colors.HexColor("#0B866E")
AMBER = colors.HexColor("#B96E00")
RED = colors.HexColor("#A63A43")


def font_setup() -> tuple[str, str, str]:
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    mono = Path("C:/Windows/Fonts/consola.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("CS Sans", str(regular)))
        pdfmetrics.registerFont(TTFont("CS Sans Bold", str(bold)))
        if mono.exists():
            pdfmetrics.registerFont(TTFont("CS Mono", str(mono)))
        return "CS Sans", "CS Sans Bold", "CS Mono" if mono.exists() else "Courier"
    return "Helvetica", "Helvetica-Bold", "Courier"


REGULAR, BOLD, MONO = font_setup()

styles = getSampleStyleSheet()
BODY = ParagraphStyle("CS Body", fontName=REGULAR, fontSize=8.6, leading=12.2, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=5.5)
SMALL = ParagraphStyle("CS Small", parent=BODY, fontSize=7.4, leading=10, textColor=SOFT_GREY, spaceAfter=3)
H1 = ParagraphStyle("CS H1", fontName=BOLD, fontSize=21, leading=24, textColor=INK, spaceAfter=7)
H2 = ParagraphStyle("CS H2", fontName=BOLD, fontSize=11.5, leading=14, textColor=CHARCOAL, spaceBefore=6, spaceAfter=3)
H3 = ParagraphStyle("CS H3", fontName=BOLD, fontSize=9.6, leading=12, textColor=CHARCOAL, spaceBefore=5, spaceAfter=2)
KICKER = ParagraphStyle("CS Kicker", fontName=BOLD, fontSize=6.8, leading=8, textColor=CYAN, tracking=1.5, spaceAfter=3)
QUOTE = ParagraphStyle("CS Quote", fontName=BOLD, fontSize=10.2, leading=14, textColor=CHARCOAL, alignment=TA_LEFT)
TABLE_TEXT = ParagraphStyle("CS Table", fontName=REGULAR, fontSize=6.7, leading=8.3, textColor=INK)
TABLE_BOLD = ParagraphStyle("CS Table Bold", parent=TABLE_TEXT, fontName=BOLD)
TABLE_HEAD = ParagraphStyle("CS Table Head", parent=TABLE_TEXT, fontName=BOLD, textColor=WHITE)
TABLE_WHITE_BOLD = ParagraphStyle("CS Table White Bold", parent=TABLE_TEXT, fontName=BOLD, textColor=WHITE)


def markup(text: str) -> str:
    safe = html.escape(text, quote=False)
    safe = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", safe)
    safe = re.sub(r"`(.+?)`", rf'<font name="{MONO}">\1</font>', safe)
    return safe


class WhitepaperDoc(BaseDocTemplate):
    def afterInit(self):
        self.title = "Cyber Sentinels: Operational Trust Infrastructure for Autonomous Systems"
        self.author = "Cyber Sentinels"
        self.subject = "Technical Whitepaper, Version 1.0"
        self.keywords = "operational trust, AI agents, authority, evidence, receipt, Replay"


def cover_page(canvas, doc) -> None:
    width, height = letter
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(CYAN)
    canvas.rect(0.7 * inch, 0, 0.07 * inch, height, fill=1, stroke=0)
    canvas.rect(0.95 * inch, height - 1.18 * inch, 5.9 * inch, 0.025 * inch, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#0D2530"))
    canvas.circle(width - 0.9 * inch, height - 0.9 * inch, 1.35 * inch, fill=1, stroke=0)
    canvas.setFillColor(CYAN)
    canvas.setFont(BOLD, 11)
    canvas.drawString(0.98 * inch, height - 0.95 * inch, "CYBER SENTINELS")
    canvas.setFillColor(WHITE)
    canvas.setFont(BOLD, 31)
    for idx, line in enumerate(("Operational Trust", "Infrastructure for", "Autonomous Systems")):
        canvas.drawString(0.98 * inch, height - (2.2 + idx * 0.47) * inch, line)
    canvas.setFillColor(PALE_CYAN)
    canvas.setFont(REGULAR, 14)
    canvas.drawString(0.98 * inch, height - 4.08 * inch, "The control layer between autonomous intelligence")
    canvas.drawString(0.98 * inch, height - 4.34 * inch, "and real-world action.")
    canvas.setFillColor(CYAN)
    canvas.setFont(BOLD, 8.5)
    canvas.drawString(0.98 * inch, 1.32 * inch, "TECHNICAL WHITEPAPER  ·  VERSION 1.0  ·  2026")
    canvas.setFillColor(WHITE)
    canvas.setFont(REGULAR, 8)
    canvas.drawString(0.98 * inch, 0.92 * inch, "www.cybersentinels.com")
    canvas.restoreState()


def interior_page(canvas, doc) -> None:
    width, height = letter
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.rect(0, height - 0.46 * inch, width, 0.46 * inch, fill=1, stroke=0)
    canvas.setFillColor(CYAN)
    canvas.rect(0, height - 0.46 * inch, 0.72 * inch, 0.46 * inch, fill=1, stroke=0)
    canvas.setFillColor(WHITE)
    canvas.setFont(BOLD, 6.7)
    canvas.drawString(0.92 * inch, height - 0.29 * inch, "CYBER SENTINELS  ·  OPERATIONAL TRUST INFRASTRUCTURE")
    canvas.setFillColor(SOFT_GREY)
    canvas.setFont(REGULAR, 7)
    canvas.drawString(0.72 * inch, 0.37 * inch, "TECHNICAL WHITEPAPER  ·  VERSION 1.0")
    canvas.drawRightString(width - 0.72 * inch, 0.37 * inch, f"{doc.page:02d}")
    canvas.restoreState()


def quote_box(text: str):
    table = Table([[Paragraph(markup(text), QUOTE)]], colWidths=[6.65 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_CYAN),
        ("BOX", (0, 0), (-1, -1), 0.6, CYAN),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def section_header(number: str, title: str):
    return [
        Spacer(1, 0.08 * inch),
        Table([[Paragraph(number, ParagraphStyle("Num", fontName=BOLD, fontSize=15, textColor=INK, alignment=TA_CENTER)), Paragraph("OPERATIONAL TRUST INFRASTRUCTURE", KICKER)]], colWidths=[0.65 * inch, 6 * inch], style=TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), CYAN),
            ("BACKGROUND", (1, 0), (1, 0), INK),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (1, 0), (1, 0), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])),
        Spacer(1, 0.16 * inch),
        Paragraph(markup(title), H1),
        HRFlowable(width="100%", thickness=1.5, color=CYAN, spaceBefore=0, spaceAfter=9),
    ]


def markdown_table(lines: list[str], compact=False):
    rows = [[c.strip() for c in line.strip().strip("|").split("|")] for line in lines]
    if len(rows) > 1 and all(re.fullmatch(r":?-{3,}:?", c) for c in rows[1]):
        rows.pop(1)
    data = []
    for r_idx, row in enumerate(rows):
        data.append([Paragraph(markup(value), TABLE_HEAD if r_idx == 0 else (TABLE_BOLD if c_idx == 0 else TABLE_TEXT)) for c_idx, value in enumerate(row)])
    cols = len(data[0])
    widths = [1.27 * inch] + [(5.38 / (cols - 1)) * inch] * (cols - 1) if cols > 1 else [6.65 * inch]
    table = Table(data, colWidths=widths, repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CAD5D8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4 if compact else 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 if compact else 5),
    ]
    for idx in range(1, len(data)):
        commands.append(("BACKGROUND", (0, idx), (-1, idx), LIGHT if idx % 2 else WHITE))
    table.setStyle(TableStyle(commands))
    return table


def lifecycle():
    labels = ["01<br/><b>ACTOR</b>", "02<br/><b>IDENTITY</b>", "03<br/><b>AUTHORITY</b>", "04<br/><b>TRUST DECISION</b>", "05<br/><b>CONTROL</b>", "06<br/><b>EVIDENCE</b>"]
    details = ["Human<br/>AI agent<br/>Service", "Credential<br/>Key proof<br/>Provider", "Delegator<br/>Scope<br/>Expiry", "Policy<br/>Context<br/>Memory", "ALLOW<br/>REVIEW<br/>DENY", "Receipt<br/>Replay<br/>Memory"]
    label_style = ParagraphStyle("LifeHead", fontName=BOLD, fontSize=6.8, leading=8.5, textColor=WHITE, alignment=TA_CENTER)
    detail_style = ParagraphStyle("LifeText", fontName=REGULAR, fontSize=6.5, leading=8, textColor=INK, alignment=TA_CENTER)
    table = Table([[Paragraph(x, label_style) for x in labels], [Paragraph(x, detail_style) for x in details]], colWidths=[1.108 * inch] * 6)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("BACKGROUND", (0, 1), (-1, 1), LIGHT),
        ("BACKGROUND", (0, 0), (0, 0), CYAN), ("TEXTCOLOR", (0, 0), (0, 0), INK),
        ("BACKGROUND", (-1, 0), (-1, 0), CYAN), ("TEXTCOLOR", (-1, 0), (-1, 0), INK),
        ("BOX", (0, 0), (-1, -1), 0.5, CYAN), ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#74848D")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def authority_hero():
    rows = [
        ["CHIEF FINANCIAL OFFICER", "Accountable delegator"],
        ["↓ delegates", ""],
        ["FINANCE AUTOMATION SERVICE", "Bounded service authority"],
        ["↓ delegates", ""],
        ["PAYMENTS AGENT", "Verified Ed25519 identity"],
        ["↓ requests", ""],
        ["payment.create · €14,500", "Treasury API · autonomous threshold €10,000"],
    ]
    data = []
    for left, right in rows:
        style = TABLE_WHITE_BOLD if not left.startswith("↓") else SMALL
        data.append([Paragraph(markup(left), style), Paragraph(markup(right), TABLE_TEXT)])
    table = Table(data, colWidths=[2.45 * inch, 4.2 * inch])
    commands = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8)]
    for idx, (left, _) in enumerate(rows):
        if left.startswith("↓"):
            commands += [("SPAN", (0, idx), (1, idx)), ("ALIGN", (0, idx), (1, idx), "CENTER"), ("TOPPADDING", (0, idx), (1, idx), 2), ("BOTTOMPADDING", (0, idx), (1, idx), 2)]
        else:
            commands += [("BACKGROUND", (0, idx), (0, idx), INK), ("TEXTCOLOR", (0, idx), (0, idx), WHITE), ("BACKGROUND", (1, idx), (1, idx), LIGHT), ("TOPPADDING", (0, idx), (-1, idx), 6), ("BOTTOMPADDING", (0, idx), (-1, idx), 6)]
    table.setStyle(TableStyle(commands))
    result = Table([[Paragraph("REVIEW", ParagraphStyle("Review", fontName=BOLD, fontSize=12, textColor=WHITE, alignment=TA_CENTER)), Paragraph("Human approval required: amount exceeds delegated autonomous threshold.", TABLE_BOLD)]], colWidths=[1.35 * inch, 5.3 * inch])
    result.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), AMBER), ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FFF4D8")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    return KeepTogether([quote_box("CONCEPTUAL OPERATIONAL REPRESENTATION"), Spacer(1, 7), table, Spacer(1, 7), result, Spacer(1, 7)])


def decision_cards():
    style = ParagraphStyle("Decision", fontName=BOLD, fontSize=8, leading=11, textColor=WHITE, alignment=TA_CENTER)
    data = [[Paragraph("ALLOW<br/><font size='6'>Authorized for this context</font>", style), Paragraph("REVIEW<br/><font size='6'>Accountable intervention required</font>", style), Paragraph("DENY<br/><font size='6'>Not authorized</font>", style)]]
    table = Table(data, colWidths=[2.216 * inch] * 3)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), GREEN), ("BACKGROUND", (1, 0), (1, 0), AMBER), ("BACKGROUND", (2, 0), (2, 0), RED), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return table


def receipt():
    rows = [("TRANSACTION", "tx_…72d"), ("AGENT", "agent:payments"), ("ACTION", "payment.create"), ("RESOURCE", "treasury-api"), ("AUTHORITY", "grant v3 · current"), ("DECISION", "REVIEW"), ("REASON", "AMOUNT_EXCEEDS_AUTONOMOUS_THRESHOLD"), ("EVIDENCE", "identity · authority · policy · context"), ("REPLAY", "replay_…91f")]
    data = [[Paragraph("DECISION RECEIPT", TABLE_HEAD), Paragraph("Persisted · integrity-linked", TABLE_HEAD)]] + [[Paragraph(label, TABLE_BOLD), Paragraph(value, TABLE_TEXT)] for label, value in rows]
    table = Table(data, colWidths=[1.5 * inch, 5.15 * inch])
    commands = [("BACKGROUND", (0, 0), (-1, 0), INK), ("TEXTCOLOR", (0, 0), (-1, 0), WHITE), ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5D9")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4), ("LEFTPADDING", (0, 0), (-1, -1), 7)]
    for idx in range(1, len(data)): commands.append(("BACKGROUND", (0, idx), (-1, idx), LIGHT if idx % 2 else WHITE))
    table.setStyle(TableStyle(commands)); return table


def timeline():
    events = [("10:21:03", "AGENT AUTHENTICATED"), ("10:21:04", "AUTHORITY RESOLVED"), ("10:21:04", "POLICY EVALUATED"), ("10:21:05", "REVIEW"), ("10:22:14", "HUMAN APPROVAL"), ("10:22:15", "FRESH EVALUATION · ALLOW")]
    data = [[Paragraph(a, TABLE_BOLD), Paragraph(b, TABLE_BOLD)] for a, b in events]
    table = Table(data, colWidths=[1.3 * inch, 5.35 * inch])
    commands = [("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CAD5D8")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("LEFTPADDING", (0, 0), (-1, -1), 8)]
    for idx in range(len(data)): commands += [("BACKGROUND", (0, idx), (0, idx), CYAN if idx in (0, len(data)-1) else INK), ("TEXTCOLOR", (0, idx), (0, idx), INK if idx in (0, len(data)-1) else WHITE), ("BACKGROUND", (1, idx), (1, idx), PALE_CYAN if idx in (0, len(data)-1) else LIGHT)]
    table.setStyle(TableStyle(commands)); return table


def render_content(content: str, section_number: int | None = None):
    flow = []
    for kind, value in blocks(content):
        if kind == "paragraph": flow.append(Paragraph(markup(str(value)), BODY))
        elif kind == "h3": flow.append(Paragraph(markup(str(value)), H2))
        elif kind == "quote": flow += [quote_box(str(value).replace("**", "").replace("`", "")), Spacer(1, 5)]
        elif kind == "bullet":
            flow.append(ListFlowable([ListItem(Paragraph(markup(str(value)), BODY), leftIndent=8)], bulletType="bullet", start="circle", leftIndent=14, bulletFontName=BOLD, bulletFontSize=5, spaceAfter=1))
        elif kind == "table": flow += [markdown_table(value, compact=section_number == 18), Spacer(1, 5)]
        elif kind == "code" and section_number != 7:
            code_style = ParagraphStyle("Code", fontName=MONO, fontSize=6.7, leading=8.5, textColor=WHITE)
            flow.append(Table([[Paragraph("<br/>".join(html.escape(x) for x in value), code_style)]], colWidths=[6.65 * inch], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), INK), ("BOX", (0, 0), (-1, -1), 0.5, CYAN), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)])))
    return flow


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    exec_match = re.search(r"## Executive abstract\n(.*?)(?=\n---\n\n## 1\.)", source, re.S)
    section_matches = list(re.finditer(r"^## (\d+)\. (.+)$", source, re.M))
    if not exec_match or len(section_matches) != 20:
        raise SystemExit("Expected one executive abstract and exactly 20 numbered sections.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = WhitepaperDoc(str(OUTPUT), pagesize=letter, leftMargin=0.72 * inch, rightMargin=0.72 * inch, topMargin=0.62 * inch, bottomMargin=0.62 * inch, title="Cyber Sentinels: Operational Trust Infrastructure for Autonomous Systems", author="Cyber Sentinels", creator="Cyber Sentinels", subject="Technical Whitepaper, Version 1.0")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="whitepaper", frames=[frame], onPage=lambda c, d: cover_page(c, d) if d.page == 1 else interior_page(c, d))])

    story = [Spacer(1, 9.3 * inch), PageBreak()]
    story += section_header("00", "Executive abstract")
    story += [quote_box("WHO is acting? · WHAT was delegated? · IS authority still valid? · SHOULD this action execute? · CAN the enterprise prove why?"), Spacer(1, 8)]
    story += render_content(exec_match.group(1).strip())

    combined_sections = {6, 10, 13, 20}
    for idx, match in enumerate(section_matches):
        number = int(match.group(1)); title = match.group(2).strip()
        end = section_matches[idx + 1].start() if idx + 1 < len(section_matches) else source.find("\n---\n\n## Verification references", match.end())
        content = source[match.end():end if end != -1 else len(source)].strip()
        if number in combined_sections:
            story += [Spacer(1, 6), Paragraph(f"{number:02}  ·  {markup(title)}", H2), HRFlowable(width="100%", thickness=0.7, color=CYAN, spaceBefore=0, spaceAfter=6)]
        else:
            story.append(PageBreak()); story += section_header(f"{number:02}", title)
        if number == 3: story += [lifecycle(), Spacer(1, 7)]
        if number == 7: story += [authority_hero()]
        if number == 8: story += [decision_cards(), Spacer(1, 7)]
        if number == 11: story += [receipt(), Spacer(1, 7)]
        if number == 12: story += [timeline(), Spacer(1, 7)]
        story += render_content(content, section_number=number)
        if number == 20:
            story += [Spacer(1, 5), Paragraph("VERIFICATION REFERENCES", KICKER)]
            for reference in ("/api/health", "/api/ready", "/api/v1/openapi.json", "/developers/docs"):
                story.append(Paragraph(f"www.cybersentinels.com{reference}", SMALL))

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
