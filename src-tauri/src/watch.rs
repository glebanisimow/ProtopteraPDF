//! Watches the open document for external changes (one watch per window), debounced.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

const DEBOUNCE: Duration = Duration::from_millis(300);
pub const FILE_CHANGED_EVENT: &str = "file-changed";

/// File identity after our own save, so the watcher can ignore the change we just made.
type Stamp = Option<(u64, SystemTime)>;

struct Entry {
    path: PathBuf,
    own_write: Arc<Mutex<Stamp>>,
    _watcher: RecommendedWatcher,
}

#[derive(Default)]
pub struct Watches(Mutex<HashMap<String, Entry>>);

#[derive(Clone, Serialize)]
struct FileChanged {
    path: String,
    exists: bool,
}

fn stamp(path: &Path) -> Stamp {
    fs::metadata(path).ok().and_then(|m| Some((m.len(), m.modified().ok()?)))
}

impl Watches {
    /// Starts watching `path` for window `label`, replacing any previous watch of that window.
    pub fn watch(&self, app: &AppHandle, label: &str, path: &Path) -> notify::Result<()> {
        let own_write = Arc::new(Mutex::new(None));
        let (tx, rx) = mpsc::channel::<notify::Result<notify::Event>>();
        // Watch the folder: editors often save by replacing the file, which drops a file-level watch.
        let dir = path.parent().unwrap_or(Path::new("."));
        let mut watcher = notify::recommended_watcher(tx)?;
        watcher.watch(dir, RecursiveMode::NonRecursive)?;

        let target = path.to_path_buf();
        let name = target.file_name().map(|n| n.to_ascii_lowercase());
        let own = own_write.clone();
        let app = app.clone();
        let label_owned = label.to_string();
        std::thread::spawn(move || {
            let mut pending = false;
            loop {
                match rx.recv_timeout(DEBOUNCE) {
                    Ok(Ok(event)) => {
                        pending |= event.paths.iter().any(|p| p.file_name().map(|n| n.to_ascii_lowercase()) == name);
                    }
                    Ok(Err(_)) => {}
                    Err(RecvTimeoutError::Timeout) if pending => {
                        pending = false;
                        let current = stamp(&target);
                        if current.is_some() && *own.lock().unwrap() == current {
                            continue;
                        }
                        let payload = FileChanged { path: target.to_string_lossy().into_owned(), exists: current.is_some() };
                        let _ = app.emit_to(&label_owned, FILE_CHANGED_EVENT, payload);
                    }
                    Err(RecvTimeoutError::Timeout) => {}
                    // The watcher (and its sender) was dropped: the window closed or switched files.
                    Err(RecvTimeoutError::Disconnected) => break,
                }
            }
        });

        let entry = Entry { path: path.to_path_buf(), own_write, _watcher: watcher };
        self.0.lock().unwrap().insert(label.to_string(), entry);
        Ok(())
    }

    /// Records the file state right after our own save so the resulting event is ignored.
    pub fn mark_own_write(&self, label: &str, path: &Path) {
        if let Some(entry) = self.0.lock().unwrap().get(label) {
            if entry.path == path {
                *entry.own_write.lock().unwrap() = stamp(path);
            }
        }
    }

    pub fn unwatch(&self, label: &str) {
        self.0.lock().unwrap().remove(label);
    }
}
