//! File I/O for documents: whole-file reads, a per-session write allowlist and atomic writes.

use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;

const PDF_HEADER_WINDOW: usize = 1024;

/// Error returned to the frontend; `code` drives the user-facing message.
#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct FileError {
    pub code: FileErrorCode,
    pub detail: String,
}

#[derive(Debug, Serialize, PartialEq, Eq, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum FileErrorCode {
    NotFound,
    NotPdf,
    NotAllowed,
    ReadOnly,
    Locked,
    Io,
}

impl FileError {
    fn new(code: FileErrorCode, detail: impl Into<String>) -> Self {
        Self { code, detail: detail.into() }
    }

    fn from_io(err: &io::Error, path: &Path) -> Self {
        let detail = format!("{}: {err}", path.display());
        let code = match err.kind() {
            io::ErrorKind::NotFound => FileErrorCode::NotFound,
            io::ErrorKind::PermissionDenied => FileErrorCode::ReadOnly,
            _ if is_sharing_violation(err) => FileErrorCode::Locked,
            _ => FileErrorCode::Io,
        };
        Self::new(code, detail)
    }
}

fn is_sharing_violation(err: &io::Error) -> bool {
    // ERROR_SHARING_VIOLATION (32), ERROR_LOCK_VIOLATION (33), ERROR_USER_MAPPED_FILE (1224)
    matches!(err.raw_os_error(), Some(32) | Some(33) | Some(1224))
}

/// Paths the webview may write to: files it opened this session or picked in "Save as".
#[derive(Default)]
pub struct Allowlist(Mutex<HashSet<PathBuf>>);

impl Allowlist {
    pub fn allow(&self, path: &Path) {
        self.0.lock().unwrap().insert(normalize(path));
    }

    pub fn is_allowed(&self, path: &Path) -> bool {
        self.0.lock().unwrap().contains(&normalize(path))
    }
}

/// Canonical form used for allowlist comparison. Falls back to the parent's canonical path
/// for files that do not exist yet; Windows paths compare case-insensitively.
pub fn normalize(path: &Path) -> PathBuf {
    let resolved = fs::canonicalize(path).unwrap_or_else(|_| match (path.parent(), path.file_name()) {
        (Some(parent), Some(name)) => fs::canonicalize(parent).map(|p| p.join(name)).unwrap_or_else(|_| path.to_path_buf()),
        _ => path.to_path_buf(),
    });
    if cfg!(windows) {
        PathBuf::from(resolved.to_string_lossy().to_lowercase())
    } else {
        resolved
    }
}

/// Reads the whole file and releases the handle, so other programs can still write to it.
pub fn read_pdf(path: &Path) -> Result<Vec<u8>, FileError> {
    let mut bytes = Vec::new();
    File::open(path)
        .and_then(|mut f| f.read_to_end(&mut bytes))
        .map_err(|e| FileError::from_io(&e, path))?;
    // The webview may only pull PDFs, never arbitrary files; PDF readers accept junk before the header.
    let window = &bytes[..bytes.len().min(PDF_HEADER_WINDOW)];
    if !window.windows(5).any(|w| w == b"%PDF-") {
        return Err(FileError::new(FileErrorCode::NotPdf, path.display().to_string()));
    }
    Ok(bytes)
}

/// Writes `bytes` to a temp file next to `path`, flushes it to disk, then atomically
/// replaces the original. On any failure the original stays untouched.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), FileError> {
    if let Ok(meta) = fs::metadata(path) {
        if meta.permissions().readonly() {
            return Err(FileError::new(FileErrorCode::ReadOnly, path.display().to_string()));
        }
    }
    let dir = path.parent().filter(|p| !p.as_os_str().is_empty()).unwrap_or(Path::new("."));
    let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    let tmp = dir.join(format!(".{name}.{}.tmp", std::process::id()));

    let result = (|| {
        let mut file = OpenOptions::new().write(true).create_new(true).open(&tmp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        replace_file(&tmp, path)
    })();

    result.map_err(|e| {
        let _ = fs::remove_file(&tmp);
        FileError::from_io(&e, path)
    })
}

#[cfg(windows)]
fn replace_file(from: &Path, to: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH};

    let wide = |p: &Path| p.as_os_str().encode_wide().chain(Some(0)).collect::<Vec<u16>>();
    let (from_w, to_w) = (wide(from), wide(to));
    // SAFETY: both buffers are NUL-terminated UTF-16 strings that outlive the call.
    let ok = unsafe { MoveFileExW(from_w.as_ptr(), to_w.as_ptr(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH) };
    if ok == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_file(from: &Path, to: &Path) -> io::Result<()> {
    fs::rename(from, to)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PDF: &[u8] = b"%PDF-1.7\n%test\n";

    #[test]
    fn allowlist_matches_case_and_dots() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("Doc.pdf");
        fs::write(&file, PDF).unwrap();
        let list = Allowlist::default();
        assert!(!list.is_allowed(&file));
        list.allow(&file);
        assert!(list.is_allowed(&dir.path().join(".").join("Doc.pdf")));
        if cfg!(windows) {
            assert!(list.is_allowed(&dir.path().join("DOC.PDF")));
        }
        assert!(!list.is_allowed(&dir.path().join("other.pdf")));
    }

    #[test]
    fn allowlist_accepts_not_yet_existing_file() {
        let dir = tempfile::tempdir().unwrap();
        let list = Allowlist::default();
        let target = dir.path().join("new.pdf");
        list.allow(&target);
        assert!(list.is_allowed(&target));
    }

    #[test]
    fn read_rejects_non_pdf() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("secret.txt");
        fs::write(&file, b"hello").unwrap();
        assert_eq!(read_pdf(&file).unwrap_err().code, FileErrorCode::NotPdf);
        let fake = dir.path().join("fake.pdf");
        fs::write(&fake, b"not a pdf").unwrap();
        assert_eq!(read_pdf(&fake).unwrap_err().code, FileErrorCode::NotPdf);
    }

    #[test]
    fn read_returns_bytes() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.pdf");
        fs::write(&file, PDF).unwrap();
        assert_eq!(read_pdf(&file).unwrap(), PDF);
        assert_eq!(read_pdf(&dir.path().join("missing.pdf")).unwrap_err().code, FileErrorCode::NotFound);
    }

    #[test]
    fn atomic_write_replaces_and_leaves_no_temp() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("a.pdf");
        fs::write(&file, PDF).unwrap();
        write_atomic(&file, b"%PDF-2.0 new").unwrap();
        assert_eq!(fs::read(&file).unwrap(), b"%PDF-2.0 new");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }

    #[test]
    fn atomic_write_keeps_readonly_original() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("ro.pdf");
        fs::write(&file, PDF).unwrap();
        let mut perms = fs::metadata(&file).unwrap().permissions();
        perms.set_readonly(true);
        fs::set_permissions(&file, perms.clone()).unwrap();
        assert_eq!(write_atomic(&file, b"%PDF-new").unwrap_err().code, FileErrorCode::ReadOnly);
        assert_eq!(fs::read(&file).unwrap(), PDF);
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
        #[allow(clippy::permissions_set_readonly_false)]
        perms.set_readonly(false);
        fs::set_permissions(&file, perms).unwrap();
    }

    #[cfg(windows)]
    #[test]
    fn atomic_write_reports_locked_file_and_keeps_original() {
        use std::os::windows::fs::OpenOptionsExt;
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("locked.pdf");
        fs::write(&file, PDF).unwrap();
        // Share mode 0: no other handle may read, write or delete, like an exclusive editor.
        let _lock = OpenOptions::new().read(true).share_mode(0).open(&file).unwrap();
        let err = write_atomic(&file, b"%PDF-new").unwrap_err();
        assert!(matches!(err.code, FileErrorCode::Locked | FileErrorCode::ReadOnly), "{err:?}");
        drop(_lock);
        assert_eq!(fs::read(&file).unwrap(), PDF);
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
}
