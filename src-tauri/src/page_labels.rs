//! Page labels (/PageLabels, ISO 32000-1 §12.4.2). PDFium has FPDF_GetPageLabel, but EmbedPDF
//! does not expose it, so the catalog's number tree is read here with lopdf.

use std::path::Path;

use lopdf::{Dictionary, Document, Object};

const MAX_TREE_DEPTH: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Style {
    Decimal,
    UpperRoman,
    LowerRoman,
    UpperAlpha,
    LowerAlpha,
    /// No numeric part: the label is the prefix alone.
    None,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Range {
    pub start_index: u32,
    pub style: Style,
    pub prefix: String,
    pub first: u32,
}

/// Label for a 0-based page index. Pages before the first range fall back to their 1-based number.
pub fn label_for(ranges: &[Range], page_index: u32) -> String {
    let Some(range) = ranges.iter().rev().find(|r| r.start_index <= page_index) else {
        return (page_index + 1).to_string();
    };
    let n = range.first.saturating_add(page_index - range.start_index);
    let number = match range.style {
        Style::Decimal => n.to_string(),
        Style::UpperRoman => roman(n),
        Style::LowerRoman => roman(n).to_lowercase(),
        Style::UpperAlpha => alpha(n),
        Style::LowerAlpha => alpha(n).to_lowercase(),
        Style::None => String::new(),
    };
    format!("{}{}", range.prefix, number)
}

fn roman(mut n: u32) -> String {
    const TABLE: [(u32, &str); 13] = [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ];
    let mut out = String::new();
    for (value, digits) in TABLE {
        while n >= value {
            out.push_str(digits);
            n -= value;
        }
    }
    out
}

/// A..Z, then AA..ZZ, then AAA..: the letter repeats, unlike spreadsheet columns.
fn alpha(n: u32) -> String {
    if n == 0 {
        return String::new();
    }
    let letter = char::from(b'A' + ((n - 1) % 26) as u8);
    let count = ((n - 1) / 26 + 1) as usize;
    std::iter::repeat_n(letter, count).collect()
}

/// Reads labels for every page. `None` when the file has no /PageLabels or cannot be parsed.
pub fn read_labels(path: &Path) -> Option<Vec<String>> {
    let doc = Document::load(path).ok()?;
    let ranges = read_ranges(&doc)?;
    let page_count = doc.get_pages().len() as u32;
    Some((0..page_count).map(|i| label_for(&ranges, i)).collect())
}

fn read_ranges(doc: &Document) -> Option<Vec<Range>> {
    let root = doc.catalog().ok()?.get(b"PageLabels").ok()?;
    let mut pairs = Vec::new();
    collect_nums(doc, root, &mut pairs, 0);
    let mut ranges: Vec<Range> = pairs.into_iter().filter_map(|(start, dict)| parse_range(doc, start, &dict)).collect();
    if ranges.is_empty() {
        return None;
    }
    ranges.sort_by_key(|r| r.start_index);
    Some(ranges)
}

fn resolve<'a>(doc: &'a Document, obj: &'a Object) -> Option<&'a Object> {
    match obj {
        Object::Reference(id) => doc.get_object(*id).ok(),
        other => Some(other),
    }
}

fn collect_nums(doc: &Document, node: &Object, out: &mut Vec<(u32, Dictionary)>, depth: usize) {
    if depth > MAX_TREE_DEPTH {
        return;
    }
    let Some(Object::Dictionary(dict)) = resolve(doc, node) else { return };
    if let Some(Object::Array(nums)) = dict.get(b"Nums").ok().and_then(|o| resolve(doc, o)) {
        for pair in nums.chunks(2) {
            let [key, value] = pair else { continue };
            let Some(start) = resolve(doc, key).and_then(|k| k.as_i64().ok()).filter(|k| *k >= 0) else { continue };
            if let Some(Object::Dictionary(range)) = resolve(doc, value) {
                out.push((start as u32, range.clone()));
            }
        }
    }
    if let Some(Object::Array(kids)) = dict.get(b"Kids").ok().and_then(|o| resolve(doc, o)) {
        for kid in kids {
            collect_nums(doc, kid, out, depth + 1);
        }
    }
}

fn parse_range(doc: &Document, start_index: u32, dict: &Dictionary) -> Option<Range> {
    let style = match dict.get(b"S").ok().and_then(|o| resolve(doc, o)).and_then(|o| o.as_name().ok()) {
        Some(b"D") => Style::Decimal,
        Some(b"R") => Style::UpperRoman,
        Some(b"r") => Style::LowerRoman,
        Some(b"A") => Style::UpperAlpha,
        Some(b"a") => Style::LowerAlpha,
        _ => Style::None,
    };
    let prefix = match dict.get(b"P").ok().and_then(|o| resolve(doc, o)) {
        Some(Object::String(bytes, _)) => decode_text_string(bytes),
        _ => String::new(),
    };
    let first = dict
        .get(b"St")
        .ok()
        .and_then(|o| resolve(doc, o))
        .and_then(|o| o.as_i64().ok())
        .filter(|n| *n >= 1)
        .map_or(1, |n| n.min(u32::MAX as i64) as u32);
    Some(Range { start_index, style, prefix, first })
}

/// PDF text strings: UTF-16BE with a BOM, UTF-8 with a BOM (PDF 2.0), otherwise PDFDocEncoding,
/// which matches Latin-1 for printable characters.
fn decode_text_string(bytes: &[u8]) -> String {
    if let Some(utf16) = bytes.strip_prefix(&[0xFE, 0xFF]) {
        let units: Vec<u16> = utf16.chunks_exact(2).map(|c| u16::from_be_bytes([c[0], c[1]])).collect();
        return String::from_utf16_lossy(&units);
    }
    if let Some(utf8) = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]) {
        return String::from_utf8_lossy(utf8).into_owned();
    }
    bytes.iter().map(|&b| char::from(b)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use lopdf::{dictionary, Stream, StringFormat};

    fn range(start_index: u32, style: Style, prefix: &str, first: u32) -> Range {
        Range { start_index, style, prefix: prefix.into(), first }
    }

    #[test]
    fn alpha_doubles_letters() {
        assert_eq!(alpha(1), "A");
        assert_eq!(alpha(26), "Z");
        assert_eq!(alpha(27), "AA");
        assert_eq!(alpha(28), "BB");
        assert_eq!(alpha(52), "ZZ");
        assert_eq!(alpha(53), "AAA");
    }

    #[test]
    fn roman_numerals() {
        assert_eq!(roman(1), "I");
        assert_eq!(roman(4), "IV");
        assert_eq!(roman(9), "IX");
        assert_eq!(roman(14), "XIV");
        assert_eq!(roman(1994), "MCMXCIV");
    }

    #[test]
    fn labels_follow_ranges() {
        // Classic book: i..iv front matter, then 1.., then appendix A-1, A-2.
        let ranges = vec![
            range(0, Style::LowerRoman, "", 1),
            range(4, Style::Decimal, "", 1),
            range(10, Style::Decimal, "A-", 1),
        ];
        assert_eq!(label_for(&ranges, 0), "i");
        assert_eq!(label_for(&ranges, 3), "iv");
        assert_eq!(label_for(&ranges, 4), "1");
        assert_eq!(label_for(&ranges, 9), "6");
        assert_eq!(label_for(&ranges, 11), "A-2");
    }

    #[test]
    fn start_value_prefix_only_and_fallback() {
        let ranges = vec![range(2, Style::UpperAlpha, "", 26), range(5, Style::None, "Cover", 1)];
        assert_eq!(label_for(&ranges, 0), "1"); // before first range
        assert_eq!(label_for(&ranges, 2), "Z");
        assert_eq!(label_for(&ranges, 3), "AA");
        assert_eq!(label_for(&ranges, 5), "Cover");
        assert_eq!(label_for(&ranges, 6), "Cover");
    }

    #[test]
    fn decodes_text_strings() {
        assert_eq!(decode_text_string(b"Ap-"), "Ap-");
        assert_eq!(decode_text_string(&[0xFE, 0xFF, 0x04, 0x1F, 0x00, 0x2D]), "П-");
    }

    /// Builds a small PDF with `pages` pages and the given /PageLabels tree root.
    fn write_pdf(dir: &Path, pages: usize, labels: Option<Object>) -> std::path::PathBuf {
        let mut doc = Document::with_version("1.7");
        let pages_id = doc.new_object_id();
        let kids: Vec<Object> = (0..pages)
            .map(|_| {
                let content = doc.add_object(Stream::new(dictionary! {}, Vec::new()));
                doc.add_object(dictionary! {
                    "Type" => "Page",
                    "Parent" => pages_id,
                    "MediaBox" => vec![0.into(), 0.into(), 100.into(), 100.into()],
                    "Contents" => content,
                })
                .into()
            })
            .collect();
        doc.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => pages as i64 }));
        let mut catalog = dictionary! { "Type" => "Catalog", "Pages" => pages_id };
        if let Some(labels) = labels {
            let id = doc.add_object(labels);
            catalog.set("PageLabels", id);
        }
        let catalog_id = doc.add_object(catalog);
        doc.trailer.set("Root", catalog_id);
        let path = dir.join("book.pdf");
        doc.save(&path).unwrap();
        path
    }

    #[test]
    fn reads_labels_from_file_with_kids_and_utf16_prefix() {
        let dir = tempfile::tempdir().unwrap();
        let leaf_a = Object::Dictionary(dictionary! {
            "Nums" => vec![0.into(), Object::Dictionary(dictionary! { "S" => "r" })],
        });
        let prefix = Object::String(vec![0xFE, 0xFF, 0x04, 0x1F, 0x00, 0x2D], StringFormat::Hexadecimal);
        let leaf_b = Object::Dictionary(dictionary! {
            "Nums" => vec![4.into(), Object::Dictionary(dictionary! { "S" => "D", "P" => prefix, "St" => 10 })],
        });
        let root = Object::Dictionary(dictionary! { "Kids" => vec![leaf_a, leaf_b] });
        let path = write_pdf(dir.path(), 6, Some(root));
        let labels = read_labels(&path).unwrap();
        assert_eq!(labels, ["i", "ii", "iii", "iv", "П-10", "П-11"]);
    }

    #[test]
    fn no_page_labels_returns_none() {
        let dir = tempfile::tempdir().unwrap();
        let path = write_pdf(dir.path(), 3, None);
        assert_eq!(read_labels(&path), None);
    }
}
