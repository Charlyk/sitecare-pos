// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keyring::Entry;
use serialport;
use escpos::{
    driver::SerialPortDriver,
    printer::Printer,
    printer_options::PrinterOptions,
    utils::{Protocol, JustifyMode},
};
use serde::Deserialize;
use std::time::Duration;

#[tauri::command]
fn store_token(token: String) -> Result<(), String> {
    Entry::new("sitecare-pos", "auth_token")
        .map_err(|e| e.to_string())?
        .set_password(&token)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_token() -> Result<Option<String>, String> {
    let entry = Entry::new("sitecare-pos", "auth_token")
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_token() -> Result<(), String> {
    let entry = Entry::new("sitecare-pos", "auth_token")
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // idempotent — no error if already absent
        Err(e) => Err(e.to_string()),
    }
}

// ─── Data structs for print commands ─────────────────────────────────────────

#[derive(Deserialize)]
struct OrderItem {
    name: String,
    qty: u32,
    price: f64,
    mods: Vec<String>,
}

#[derive(Deserialize)]
struct PrintOrderData {
    daily_order_number: u32,
    placed_at: String,
    order_type: String,
    source: Option<String>,
    table: Option<String>,
    customer_name: Option<String>,
    delivery_address: Option<String>,
    notes: Option<String>,
    items: Vec<OrderItem>,
    subtotal: f64,
    tax: f64,
    delivery_fee: f64,
    discount: f64,
    total: f64,
    payment: Option<String>,
    restaurant_name: String,
    restaurant_address: Option<String>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn strip_diacritics(s: &str) -> String {
    s.chars().map(|c| match c {
        'ă' | 'Ă' => 'a',
        'â' | 'Â' => 'a',
        'î' | 'Î' => 'i',
        'ș' | 'Ș' | 'ş' | 'Ş' => 's',
        'ț' | 'Ț' | 'ţ' | 'Ţ' => 't',
        other => other,
    }).collect()
}

fn chars_per_line(paper_width: &str) -> u8 {
    match paper_width {
        "58mm" => 32,
        _ => 48,   // 80mm or unknown defaults to 48
    }
}

/// Validates a port name against the OS-enumerated list of available ports.
/// Prevents port path injection (T-05-02 — ASVS V5 input validation).
fn validate_port(port: &str) -> Result<(), String> {
    let available = serialport::available_ports()
        .map_err(|e| e.to_string())?;
    if available.iter().any(|p| p.port_name == port) {
        Ok(())
    } else {
        Err(format!("Port '{}' is not in the list of available ports", port))
    }
}

// ─── Print commands ───────────────────────────────────────────────────────────

/// Returns a list of available serial port names from the OS.
/// Synchronous — no I/O write, just an OS query.
#[tauri::command]
fn list_serial_ports() -> Result<Vec<String>, String> {
    serialport::available_ports()
        .map_err(|e| e.to_string())
        .map(|ports| ports.into_iter().map(|p| p.port_name).collect())
}

/// Opens the named serial port as a connection test.
/// Returns Ok(()) on success — does NOT write to store in Rust.
/// JS side writes config to plugin-store after this command resolves.
#[tauri::command]
async fn save_printer_config(port: String, baud: u32) -> Result<(), String> {
    validate_port(&port)?;
    tauri::async_runtime::spawn_blocking(move || {
        serialport::new(&port, baud)
            .timeout(Duration::from_millis(2000))
            .open()
            .map_err(|e| format!("Cannot open {}: {}", port, e))?;
        // Port drops immediately — open success confirms connectivity
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Sends a short test receipt: restaurant name, "TEST PRINT", ruler line, cut.
#[tauri::command]
async fn test_print(
    port: String,
    baud: u32,
    paper_width: String,
    restaurant_name: String,
) -> Result<(), String> {
    validate_port(&port)?;
    let chars = chars_per_line(&paper_width);
    let rname = strip_diacritics(&restaurant_name);
    tauri::async_runtime::spawn_blocking(move || {
        let driver = SerialPortDriver::open(&port, baud, Some(Duration::from_millis(2000)))
            .map_err(|e| e.to_string())?;
        let opts = PrinterOptions::new(None, None, chars);
        let ruler: String = "-".repeat(chars as usize);
        Printer::new(driver, Protocol::default(), Some(opts))
            .init()
            .map_err(|e| e.to_string())?
            .justify(JustifyMode::CENTER)
            .map_err(|e| e.to_string())?
            .bold(true)
            .map_err(|e| e.to_string())?
            .writeln(&rname.to_uppercase())
            .map_err(|e| e.to_string())?
            .bold(false)
            .map_err(|e| e.to_string())?
            .writeln("TEST PRINT")
            .map_err(|e| e.to_string())?
            .writeln(&ruler)
            .map_err(|e| e.to_string())?
            .feed()
            .map_err(|e| e.to_string())?
            .print_cut()
            .map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Sends a full ESC/POS receipt matching ThermalTicket layout.
/// kind: "kitchen" | "customer"
#[tauri::command]
async fn print_receipt(
    port: String,
    baud: u32,
    paper_width: String,
    order: PrintOrderData,
    kind: String,
) -> Result<(), String> {
    validate_port(&port)?;
    let chars = chars_per_line(&paper_width) as usize;
    tauri::async_runtime::spawn_blocking(move || {
        let driver = SerialPortDriver::open(&port, baud, Some(Duration::from_millis(2000)))
            .map_err(|e| e.to_string())?;
        let opts = PrinterOptions::new(None, None, chars as u8);
        let ruler: String = "-".repeat(chars);
        let mut printer = Printer::new(driver, Protocol::default(), Some(opts));
        let mut p = printer
            .init()
            .map_err(|e| e.to_string())?;

        // --- HEADER ---
        let rname = strip_diacritics(&order.restaurant_name);
        p = p
            .justify(JustifyMode::CENTER)
            .map_err(|e| e.to_string())?
            .bold(true)
            .map_err(|e| e.to_string())?
            .writeln(&rname.to_uppercase())
            .map_err(|e| e.to_string())?
            .bold(false)
            .map_err(|e| e.to_string())?;
        if let Some(addr) = &order.restaurant_address {
            p = p.writeln(&strip_diacritics(addr)).map_err(|e| e.to_string())?;
        }
        p = p
            .justify(JustifyMode::LEFT)
            .map_err(|e| e.to_string())?
            .writeln(&ruler)
            .map_err(|e| e.to_string())?;

        // --- KITCHEN BANNER (kitchen ticket only) ---
        if kind == "kitchen" {
            p = p
                .justify(JustifyMode::CENTER)
                .map_err(|e| e.to_string())?
                .bold(true)
                .map_err(|e| e.to_string())?
                .writeln("*** BON BUCATARIE ***")
                .map_err(|e| e.to_string())?
                .bold(false)
                .map_err(|e| e.to_string())?
                .justify(JustifyMode::LEFT)
                .map_err(|e| e.to_string())?;
        }

        // --- IDENTIFIER BLOCK ---
        // "Comanda #<N>    <time>" — left/right aligned by padding
        let order_label = format!("Comanda #{}", order.daily_order_number);
        // Truncate placed_at to HH:MM (chars 11-15 of ISO-8601)
        let time_str = if order.placed_at.len() >= 16 {
            order.placed_at[11..16].to_string()
        } else {
            order.placed_at.clone()
        };
        let padding = chars.saturating_sub(order_label.len() + time_str.len());
        let id_line = format!("{}{}{}", order_label, " ".repeat(padding), time_str);
        p = p.writeln(&id_line).map_err(|e| e.to_string())?;

        // Order type + source
        let type_label = strip_diacritics(match order.order_type.as_str() {
            "dinein" => "La masa",
            "delivery" => "Livrare",
            "pickup" => "Ridicare",
            _ => &order.order_type,
        });
        let source_label = order.source.as_deref().unwrap_or("counter").to_uppercase();
        let src_padding = chars.saturating_sub(type_label.len() + source_label.len());
        let type_line = format!("{}{}{}", type_label.to_uppercase(), " ".repeat(src_padding), source_label);
        p = p.writeln(&type_line).map_err(|e| e.to_string())?;

        if let Some(ref cname) = order.customer_name {
            let safe = strip_diacritics(cname);
            let truncated = &safe[..safe.len().min(40)];
            p = p.writeln(&format!("Client: {}", truncated)).map_err(|e| e.to_string())?;
        }
        if order.order_type == "delivery" {
            if let Some(ref addr) = order.delivery_address {
                let safe = strip_diacritics(addr);
                let truncated = &safe[..safe.len().min(40)];
                p = p.writeln(truncated).map_err(|e| e.to_string())?;
            }
        }
        p = p.writeln(&ruler).map_err(|e| e.to_string())?;

        // --- ITEMS ---
        for item in &order.items {
            let safe_name = strip_diacritics(&item.name);
            let truncated_name = &safe_name[..safe_name.len().min(40)];
            if kind == "customer" {
                // "2x PIZZA          70.00" — name left, price right
                let price_str = format!("{:.2}", item.price * item.qty as f64);
                let item_label = format!("{}x {}", item.qty, truncated_name.to_uppercase());
                let item_padding = chars.saturating_sub(item_label.len() + price_str.len());
                let item_line = format!("{}{}{}", item_label, " ".repeat(item_padding), price_str);
                p = p
                    .bold(true)
                    .map_err(|e| e.to_string())?
                    .writeln(&item_line)
                    .map_err(|e| e.to_string())?
                    .bold(false)
                    .map_err(|e| e.to_string())?;
            } else {
                // Kitchen: qty x name only, no price
                let item_line = format!("{}x {}", item.qty, truncated_name.to_uppercase());
                p = p
                    .bold(true)
                    .map_err(|e| e.to_string())?
                    .writeln(&item_line)
                    .map_err(|e| e.to_string())?
                    .bold(false)
                    .map_err(|e| e.to_string())?;
            }
            // Modifiers as sub-lines
            for m in &item.mods {
                let safe_mod = strip_diacritics(m);
                p = p.writeln(&format!("  -> {}", safe_mod)).map_err(|e| e.to_string())?;
            }
        }

        // --- NOTES ---
        if let Some(ref notes) = order.notes {
            let safe_notes = strip_diacritics(notes);
            p = p
                .writeln(&ruler)
                .map_err(|e| e.to_string())?
                .bold(true)
                .map_err(|e| e.to_string())?
                .writeln("NOTE:")
                .map_err(|e| e.to_string())?
                .bold(false)
                .map_err(|e| e.to_string())?
                .writeln(&safe_notes)
                .map_err(|e| e.to_string())?;
        }

        // --- TOTALS (customer ticket only) ---
        if kind == "customer" {
            p = p.writeln(&ruler).map_err(|e| e.to_string())?;

            let sub_line = format!("Subtotal{}{:.2}", " ".repeat(chars.saturating_sub(8 + 5)), order.subtotal);
            p = p.writeln(&sub_line).map_err(|e| e.to_string())?;

            if order.tax > 0.0 {
                let tax_line = format!("TVA 19%{}{:.2}", " ".repeat(chars.saturating_sub(7 + 5)), order.tax);
                p = p.writeln(&tax_line).map_err(|e| e.to_string())?;
            }
            if order.delivery_fee > 0.0 {
                let fee_line = format!("Livrare{}{:.2}", " ".repeat(chars.saturating_sub(7 + 5)), order.delivery_fee);
                p = p.writeln(&fee_line).map_err(|e| e.to_string())?;
            }
            if order.discount > 0.0 {
                let disc_line = format!("Discount{}-{:.2}", " ".repeat(chars.saturating_sub(8 + 6)), order.discount);
                p = p.writeln(&disc_line).map_err(|e| e.to_string())?;
            }

            let total_str = format!("{:.2}", order.total);
            let total_label = "TOTAL RON";
            let total_pad = chars.saturating_sub(total_label.len() + total_str.len());
            let total_line = format!("{}{}{}", total_label, " ".repeat(total_pad), total_str);
            p = p
                .bold(true)
                .map_err(|e| e.to_string())?
                .writeln(&total_line)
                .map_err(|e| e.to_string())?
                .bold(false)
                .map_err(|e| e.to_string())?;

            let payment_str = order.payment.as_deref().unwrap_or("cash").to_uppercase();
            let plata_label = "Plata";
            let plata_pad = chars.saturating_sub(plata_label.len() + payment_str.len());
            let plata_line = format!("{}{}{}", plata_label, " ".repeat(plata_pad), payment_str);
            p = p.writeln(&plata_line).map_err(|e| e.to_string())?;
        }

        // --- FOOTER ---
        p.writeln(&ruler)
            .map_err(|e| e.to_string())?
            .justify(JustifyMode::CENTER)
            .map_err(|e| e.to_string())?
            .writeln("Multumim! / Thank you!")
            .map_err(|e| e.to_string())?
            .writeln("sitecare.ro")
            .map_err(|e| e.to_string())?
            .feed()
            .map_err(|e| e.to_string())?
            .print_cut()    // sends all buffered bytes + GS V auto-cut; NEVER call print() before print_cut()
            .map_err(|e| e.to_string())?;

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

// ─── App entry point ──────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_window_state::Builder::default().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_token, get_token, delete_token,
            list_serial_ports, save_printer_config, test_print, print_receipt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
