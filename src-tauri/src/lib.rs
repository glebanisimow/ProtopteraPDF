mod files;
mod watch;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use files::{Allowlist, FileError, FileErrorCode};
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_dialog::DialogExt;
use watch::Watches;

const PATH_HEADER: &str = "x-path";
const NAME_HEADER: &str = "x-name";

/// Document path each window should open on startup (from argv or a second launch).
#[derive(Default)]
struct InitialPaths(Mutex<HashMap<String, PathBuf>>);

static WINDOW_SEQ: AtomicU32 = AtomicU32::new(1);

fn io_error(detail: impl Into<String>) -> FileError {
    FileError { code: FileErrorCode::Io, detail: detail.into() }
}

/// Decodes a percent-encoded header value (JS `encodeURIComponent`).
fn percent_decode(value: &str) -> Option<String> {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = std::str::from_utf8(bytes.get(i + 1..i + 3)?).ok()?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

fn header(request: &Request<'_>, name: &str) -> Option<String> {
    request.headers().get(name).and_then(|v| v.to_str().ok()).and_then(percent_decode)
}

fn raw_body<'a>(request: &'a Request<'_>) -> Result<&'a [u8], FileError> {
    match request.body() {
        InvokeBody::Raw(bytes) => Ok(bytes),
        InvokeBody::Json(_) => Err(io_error("expected raw binary body")),
    }
}

/// Picks a file argument from argv (skips the executable and flags).
fn path_from_args(args: &[String], cwd: &Path) -> Option<PathBuf> {
    args.iter().skip(1).find(|a| !a.starts_with('-')).map(|a| cwd.join(a))
}

fn open_window(app: &AppHandle, path: Option<PathBuf>) -> tauri::Result<WebviewWindow> {
    let label = format!("doc-{}", WINDOW_SEQ.fetch_add(1, Ordering::Relaxed));
    if let Some(path) = path {
        app.state::<InitialPaths>().0.lock().unwrap().insert(label.clone(), path);
    }
    WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("ProtopteraPDF")
        .inner_size(1100.0, 820.0)
        .min_inner_size(480.0, 360.0)
        .build()
}

#[tauri::command]
fn take_initial_path(window: WebviewWindow, initial: State<'_, InitialPaths>) -> Option<String> {
    initial.0.lock().unwrap().remove(window.label()).map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
async fn pick_pdf(app: AppHandle) -> Option<String> {
    let picked = app.dialog().file().add_filter("PDF", &["pdf"]).blocking_pick_file()?;
    picked.into_path().ok().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
async fn open_document(
    app: AppHandle,
    window: WebviewWindow,
    path: String,
    allowlist: State<'_, Allowlist>,
    watches: State<'_, Watches>,
) -> Result<Response, FileError> {
    let path = PathBuf::from(path);
    let bytes = files::read_pdf(&path)?;
    allowlist.allow(&path);
    // A failed watch only disables auto-reload; the document still opens.
    let _ = watches.watch(&app, window.label(), &path);
    Ok(Response::new(bytes))
}

#[tauri::command]
async fn save_document(
    window: WebviewWindow,
    request: Request<'_>,
    allowlist: State<'_, Allowlist>,
    watches: State<'_, Watches>,
) -> Result<(), FileError> {
    let path = PathBuf::from(header(&request, PATH_HEADER).ok_or_else(|| io_error("missing x-path header"))?);
    if !allowlist.is_allowed(&path) {
        return Err(FileError { code: FileErrorCode::NotAllowed, detail: path.display().to_string() });
    }
    files::write_atomic(&path, raw_body(&request)?)?;
    watches.mark_own_write(window.label(), &path);
    Ok(())
}

/// Asks for a target in a native dialog, writes there and returns the chosen path (None if cancelled).
#[tauri::command]
async fn save_document_as(
    app: AppHandle,
    window: WebviewWindow,
    request: Request<'_>,
    allowlist: State<'_, Allowlist>,
    watches: State<'_, Watches>,
) -> Result<Option<String>, FileError> {
    let bytes = raw_body(&request)?;
    let mut dialog = app.dialog().file().add_filter("PDF", &["pdf"]).set_parent(&window);
    if let Some(name) = header(&request, NAME_HEADER) {
        dialog = dialog.set_file_name(name);
    }
    let Some(picked) = dialog.blocking_save_file() else { return Ok(None) };
    let path = picked.into_path().map_err(|e| io_error(e.to_string()))?;
    allowlist.allow(&path);
    files::write_atomic(&path, bytes)?;
    let _ = watches.watch(&app, window.label(), &path);
    watches.mark_own_write(window.label(), &path);
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn open_in_new_window(app: AppHandle, path: String) -> Result<(), String> {
    open_window(&app, Some(PathBuf::from(path))).map(|_| ()).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            match path_from_args(&args, Path::new(&cwd)) {
                Some(path) => {
                    let _ = open_window(app, Some(path));
                }
                None => {
                    if let Some(w) = app.webview_windows().values().next() {
                        let _ = w.unminimize();
                        let _ = w.set_focus();
                    }
                }
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(Allowlist::default())
        .manage(Watches::default())
        .manage(InitialPaths::default())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            let cwd = std::env::current_dir().unwrap_or_default();
            open_window(app.handle(), path_from_args(&args, &cwd))?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                window.state::<Watches>().unwatch(window.label());
            }
        })
        .invoke_handler(tauri::generate_handler![
            take_initial_path,
            pick_pdf,
            open_document,
            save_document,
            save_document_as,
            open_in_new_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running ProtopteraPDF");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percent_decode_handles_unicode_paths() {
        assert_eq!(percent_decode("C%3A%5C%D0%94%D0%BE%D0%BA%20a.pdf").as_deref(), Some("C:\\Док a.pdf"));
        assert_eq!(percent_decode("bad%2"), None);
    }

    #[test]
    fn argv_skips_exe_and_flags() {
        let args = vec!["app.exe".into(), "--flag".into(), "a.pdf".into()];
        assert_eq!(path_from_args(&args, Path::new("C:\\x")), Some(PathBuf::from("C:\\x").join("a.pdf")));
        assert_eq!(path_from_args(&["app.exe".into()], Path::new(".")), None);
    }
}
