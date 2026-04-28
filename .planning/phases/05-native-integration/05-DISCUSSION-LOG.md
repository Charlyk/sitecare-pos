# Phase 5: Native Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 5-Native Integration
**Areas discussed:** Connection scope, Printer count, Receipt content, Save + test flow

---

## Connection Scope

### Q1 — Connection type
| Option | Description | Selected |
|--------|-------------|----------|
| TCP/IP only | Socket to IP:port, simplest to implement | |
| USB only | serialport crate + COM port, requires driver | |
| Both TCP and USB | Two send paths in Rust | |

**User's choice:** USB primary  
**Notes:** User clarified that most Romanian restaurants use Windows machines with USB-connected thermal printers. Printer management software is predominantly Windows-based, so USB/COM port is the real-world connection type for this market.

### Q2 — Port selection UX
| Option | Description | Selected |
|--------|-------------|----------|
| Enumerate + pick | serialport::available_ports() dropdown | ✓ |
| Manual entry only | Staff types COM3 themselves | |
| Enumerate + manual override | Dropdown + free-text fallback | |

**User's choice:** Enumerate + pick  
**Notes:** Non-technical staff — auto-detection is important to avoid support issues.

### Q3 — TCP/IP in Phase 5?
| Option | Description | Selected |
|--------|-------------|----------|
| Include TCP in Phase 5 | Low-cost addition once USB works | |
| Defer TCP to later | Keep scope tight | ✓ |

**User's choice:** Defer TCP  

---

## Printer Count

### Q1 — Single or multiple printers
| Option | Description | Selected |
|--------|-------------|----------|
| One printer (v1) | All print actions go to single configured printer | ✓ |
| Multiple printers with roles | Kitchen, customer, bar with role-based routing | |

**User's choice:** One printer

### Q2 — Config storage
| Option | Description | Selected |
|--------|-------------|----------|
| tauri-plugin-store | Already installed, consistent with auth token pattern | ✓ |
| Separate JSON config file | Explicit file path, adds fs plugin dependency | |

**User's choice:** tauri-plugin-store

### Q3 — Printer Setup UI
| Option | Description | Selected |
|--------|-------------|----------|
| Redesign for single printer | Clean form: port picker, paper width, name | ✓ |
| Keep list layout, limit to one | Preserves multi-printer extensibility | |

**User's choice:** Redesign for single printer

---

## Receipt Content

### Q1 — Header
| Option | Description | Selected |
|--------|-------------|----------|
| Restaurant name + address from API | From restaurantSettings, professional | ✓ |
| App name only | Static, simpler | |
| Configurable header text | Field in Printer Setup form | |

**User's choice:** Restaurant name + address from API

### Q2 — Body fields (multi-select)
| Option | Selected |
|--------|----------|
| Order number + date/time | ✓ |
| Customer name | ✓ |
| Items: name + qty + price | ✓ |
| Item modifiers/options | ✓ |

**User's choice:** All four fields selected

### Q3 — Footer
| Option | Description | Selected |
|--------|-------------|----------|
| Thank-you message only | Bilingual: Mulțumim! / Thank you! | ✓ |
| Thank-you + QR code | Adds QR ESC/POS complexity | |
| Nothing | Totals are last | |

**User's choice:** Thank-you message only

---

## Save + Test Flow

### Q1 — Save behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Save + test on click | Opens port, pings printer, shows status chip | ✓ |
| Save without testing | Persists immediately, no live test | |

**User's choice:** Save + test on click

### Q2 — Test Print content
| Option | Description | Selected |
|--------|-------------|----------|
| Test slip with restaurant name | Short: name, 'Test Print', timestamp, ruler line | ✓ |
| Same format as real receipt with placeholder data | Full receipt layout confirmation | |

**User's choice:** Test receipt with restaurant name

### Q3 — Print job failure handling
| Option | Description | Selected |
|--------|-------------|----------|
| Error toast, no retry | Consistent with app error pattern | ✓ |
| Auto-retry once | Retry once before error | |
| Queue and retry when reconnected | Complex state management | |

**User's choice:** Error toast, no retry

---

## Claude's Discretion

- **Baud rate**: Most Epson/Star thermal printers default to 9600 baud. Research whether to hard-code or expose as advanced option.
- **Paper cut command**: Treat auto-cut as always-on in v1 (prototype had a toggle but it's not a v1 requirement).
- **Receipt language**: Use app's current `lang` store value (RO by default).
- **ESC/POS crate**: Choose between `escpos-rs` and raw byte arrays based on Windows/serialport integration quality.

## Deferred Ideas

- TCP/IP printer support — low-cost to add after USB; future follow-up
- Multi-printer with roles (kitchen, customer, bar) — prototype shows 3; deferred
- Auto-print on new order — SSE-triggered; render toggle greyed-out in v1
- QR code on receipt — deferred
- Print job queue with reconnect retry — error toast is sufficient for v1
