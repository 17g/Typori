use serde::{Deserialize, Serialize};
use std::fs;

/// ディレクトリ内のファイルまたはディレクトリのエントリ情報
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

/// 起動時ワークスペース初期化結果の情報
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkspaceInitResult {
    pub current_dir: String,
    pub entries: Vec<FileEntry>,
    pub initial_file_path: Option<String>,
    pub initial_file_content: Option<String>,
    pub initial_file_error: Option<String>,
}

/// 指定されたパスのファイルをUTF-8文字列として読み込みます。
#[tauri::command]
pub fn open_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

/// 指定されたパスにテキストを書き込みます。親ディレクトリが存在しない場合は作成します。
#[tauri::command]
pub fn save_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories for '{}': {}", path, e))?;
        }
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write file '{}': {}", path, e))
}

/// 指定されたディレクトリ直下のファイルおよびディレクトリ一覧を返します。
/// ディレクトリが先、ファイルが後、名前順にソートされます。
#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let dir_path = std::path::Path::new(&path);
    if !dir_path.exists() {
        return Err(format!("Directory '{}' does not exist", path));
    }
    if !dir_path.is_dir() {
        return Err(format!("Path '{}' is not a directory", path));
    }

    let read_entries = fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

    let mut result = Vec::new();
    for entry in read_entries {
        let entry = entry.map_err(|e| format!("Failed to process entry in '{}': {}", path, e))?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);

        result.push(FileEntry {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
        });
    }

    result.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(result)
}

/// カレントワーキングディレクトリの絶対パスを返します。
#[tauri::command]
pub fn get_current_dir() -> Result<String, String> {
    std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("Failed to get current directory: {}", e))
}

/// 指定されたパスの親ディレクトリのパスを返します。親が存在しない場合は None を返します。
#[tauri::command]
pub fn get_parent_dir(path: String) -> Result<Option<String>, String> {
    let p = std::path::Path::new(&path);
    Ok(p.parent().map(|parent| parent.to_string_lossy().to_string()))
}

/// 指定されたパスに新しいファイルを作成します。すでにファイルが存在する場合はエラーを返します。
#[tauri::command]
pub fn create_file(path: String, initial_content: Option<String>) -> Result<FileEntry, String> {
    let file_path = std::path::Path::new(&path);
    if file_path.exists() {
        return Err(format!("File '{}' already exists", path));
    }
    if let Some(parent) = file_path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories for '{}': {}", path, e))?;
        }
    }
    let content = initial_content.unwrap_or_default();
    fs::write(file_path, content)
        .map_err(|e| format!("Failed to create file '{}': {}", path, e))?;

    let name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled.md".to_string());

    Ok(FileEntry {
        name,
        path: file_path.to_string_lossy().to_string(),
        is_dir: false,
    })
}

const IGNORED_SEARCH_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    "target",
    ".idea",
    ".vscode",
    "dist",
    "build",
    ".agent",
    ".gemini",
];

fn search_dir_recursive(
    dir: &std::path::Path,
    query_lower: &str,
    results: &mut Vec<FileEntry>,
    max_results: usize,
) {
    if results.len() >= max_results {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    let mut dirs_to_visit = Vec::new();

    for entry in entries.flatten() {
        if results.len() >= max_results {
            break;
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);

        if is_dir && IGNORED_SEARCH_DIRS.contains(&name.as_str()) {
            continue;
        }

        if name.to_lowercase().contains(query_lower) {
            results.push(FileEntry {
                name: name.clone(),
                path: path.to_string_lossy().to_string(),
                is_dir,
            });
        }

        if is_dir {
            dirs_to_visit.push(path);
        }
    }

    for sub_dir in dirs_to_visit {
        if results.len() >= max_results {
            break;
        }
        search_dir_recursive(&sub_dir, query_lower, results, max_results);
    }
}

/// 指定されたディレクトリ配下を再帰的に走査し、名前に query が含まれるファイルおよびディレクトリを検索します。
/// 大文字小文字は区別しません（case-insensitive）。
/// .git, node_modules, target などの除外対象ディレクトリはスキップされます。
#[tauri::command]
pub fn search_files(
    root_path: String,
    query: String,
    max_results: Option<usize>,
) -> Result<Vec<FileEntry>, String> {
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() {
        return Ok(Vec::new());
    }

    let root = std::path::Path::new(&root_path);
    if !root.exists() {
        return Err(format!("Directory '{}' does not exist", root_path));
    }
    if !root.is_dir() {
        return Err(format!("Path '{}' is not a directory", root_path));
    }

    let max_count = max_results.unwrap_or(200);
    let mut results = Vec::new();
    let query_lower = trimmed_query.to_lowercase();

    search_dir_recursive(root, &query_lower, &mut results, max_count);

    results.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(results)
}

/// 保存された画像の情報
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SavedImage {
    pub file_name: String,
    pub relative_path: String,
    pub absolute_path: String,
}

/// 拡張子から画像ファイルかどうかを判定します。
pub fn is_image_extension(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico" | "avif" | "tiff"
    )
}

/// 衝突を避けるためのユニークなファイルパスを生成します。
pub fn get_unique_file_path(dir: &std::path::Path, file_name: &str) -> (std::path::PathBuf, String) {
    let path = std::path::Path::new(file_name);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png");

    let mut candidate = dir.join(file_name);
    let mut candidate_name = file_name.to_string();
    let mut counter = 1;

    while candidate.exists() {
        candidate_name = format!("{}_{}.{}", stem, counter, ext);
        candidate = dir.join(&candidate_name);
        counter += 1;
    }

    (candidate, candidate_name)
}

/// 指定された画像ファイルを開いているドキュメントの assets フォルダにコピーして保存します。
#[tauri::command]
pub fn save_image_file(
    source_path: String,
    document_path: Option<String>,
    workspace_dir: Option<String>,
) -> Result<SavedImage, String> {
    let src = std::path::Path::new(&source_path);
    if !src.exists() || !src.is_file() {
        return Err(format!("Source image file '{}' does not exist", source_path));
    }

    let file_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| format!("Invalid file name for '{}'", source_path))?;

    let base_dir = if let Some(doc) = document_path {
        let p = std::path::PathBuf::from(doc);
        p.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| std::path::PathBuf::from("."))
    } else if let Some(ws) = workspace_dir {
        std::path::PathBuf::from(ws)
    } else {
        std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
    };

    let assets_dir = base_dir.join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir)
            .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    }

    let (dest_path, unique_name) = get_unique_file_path(&assets_dir, file_name);

    fs::copy(src, &dest_path)
        .map_err(|e| format!("Failed to copy image to '{}': {}", dest_path.display(), e))?;

    let relative_path = format!("assets/{}", unique_name);
    let absolute_path = dest_path.to_string_lossy().to_string();

    Ok(SavedImage {
        file_name: unique_name,
        relative_path,
        absolute_path,
    })
}

/// バイナリデータから画像を開いているドキュメントの assets フォルダに保存します。
#[tauri::command]
pub fn save_image_binary(
    file_name: String,
    data: Vec<u8>,
    document_path: Option<String>,
    workspace_dir: Option<String>,
) -> Result<SavedImage, String> {
    let base_dir = if let Some(doc) = document_path {
        let p = std::path::PathBuf::from(doc);
        p.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| std::path::PathBuf::from("."))
    } else if let Some(ws) = workspace_dir {
        std::path::PathBuf::from(ws)
    } else {
        std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
    };

    let assets_dir = base_dir.join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir)
            .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    }

    let (dest_path, unique_name) = get_unique_file_path(&assets_dir, &file_name);

    fs::write(&dest_path, data)
        .map_err(|e| format!("Failed to write image to '{}': {}", dest_path.display(), e))?;

    let relative_path = format!("assets/{}", unique_name);
    let absolute_path = dest_path.to_string_lossy().to_string();

    Ok(SavedImage {
        file_name: unique_name,
        relative_path,
        absolute_path,
    })
}

/// 指定されたファイルのバイナリデータを読み込みます。
#[tauri::command]
pub fn read_file_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read binary file '{}': {}", path, e))
}

/// 相対パスとドキュメントパスから画像の絶対パスを解決します。
#[tauri::command]
pub fn resolve_image_path(
    image_src: String,
    document_path: Option<String>,
    workspace_dir: Option<String>,
) -> Result<String, String> {
    let p = std::path::Path::new(&image_src);
    if p.is_absolute() {
        return Ok(image_src);
    }

    let base_dir = if let Some(doc) = document_path {
        let p = std::path::PathBuf::from(doc);
        p.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| std::path::PathBuf::from("."))
    } else if let Some(ws) = workspace_dir {
        std::path::PathBuf::from(ws)
    } else {
        std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
    };

    let normalized = image_src.trim_start_matches("./").trim_start_matches(".\\");
    let mut full = base_dir;
    for part in normalized.split(['/', '\\']) {
        if !part.is_empty() && part != "." {
            full.push(part);
        }
    }
    Ok(full.to_string_lossy().to_string())
}

/// Markdown文字列から最初の見出しテキスト（H1など）を抽出します。見つからない場合はNoneを返します。
pub fn extract_title_from_markdown(markdown: &str) -> Option<String> {
    for line in markdown.lines() {
        let trimmed = line.trim();
        if let Some(heading) = trimmed.strip_prefix("# ") {
            let t = heading.trim();
            if !t.is_empty() {
                return Some(t.to_string());
            }
        }
    }
    None
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// 数値文字参照（&#106; や &#x6a; など）をデコードします。
fn decode_html_numeric_entities(val: &str) -> String {
    let mut out = String::with_capacity(val.len());
    let mut chars = val.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch == '&' && chars.peek() == Some(&'#') {
            chars.next(); // skip '#'
            let is_hex = chars.peek() == Some(&'x') || chars.peek() == Some(&'X');
            if is_hex {
                chars.next(); // skip 'x'
            }
            let mut num_str = String::new();
            while let Some(&c) = chars.peek() {
                if (is_hex && c.is_ascii_hexdigit()) || (!is_hex && c.is_ascii_digit()) {
                    num_str.push(c);
                    chars.next();
                } else {
                    break;
                }
            }
            if chars.peek() == Some(&';') {
                chars.next(); // skip ';'
            }
            if !num_str.is_empty() {
                let code_point = if is_hex {
                    u32::from_str_radix(&num_str, 16).ok()
                } else {
                    num_str.parse::<u32>().ok()
                };
                if let Some(cp) = code_point.and_then(char::from_u32) {
                    out.push(cp);
                    continue;
                }
            }
        }
        out.push(ch);
    }
    out
}

/// URI属性値が危険なスキーム（javascript:, vbscript:, data:text/html）であるかを判定します。
fn is_dangerous_uri_scheme(val: &str) -> bool {
    let decoded = decode_html_numeric_entities(val);
    let normalized: String = decoded
        .chars()
        .filter(|c| !c.is_whitespace() && !c.is_control())
        .collect();
    let lower = normalized.to_lowercase();
    lower.starts_with("javascript:")
        || lower.starts_with("vbscript:")
        || lower.starts_with("data:text/html")
}

/// 危険なHTML要素タグ（script, iframe, object, embed, form, base, meta）をすべて除去します。
fn remove_dangerous_tags(input: &str, dangerous_tags: &[&str]) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.char_indices().peekable();
    let lower = input.to_lowercase();

    while let Some((start, ch)) = chars.next() {
        if ch == '<' {
            // コメント <!-- ... --> はそのまま保持
            if input[start..].starts_with("<!--") {
                if let Some(end_idx) = input[start..].find("-->") {
                    let end_pos = start + end_idx + 3;
                    result.push_str(&input[start..end_pos]);
                    while let Some(&(idx, _)) = chars.peek() {
                        if idx < end_pos {
                            chars.next();
                        } else {
                            break;
                        }
                    }
                    continue;
                }
            }

            // 閉じタグ </tag> のチェック
            let is_close_tag = input[start..].starts_with("</");
            let tag_name_start = if is_close_tag { start + 2 } else { start + 1 };

            // タグ名の切り出し
            let tag_name_len = input[tag_name_start..]
                .find(|c: char| !c.is_ascii_alphanumeric() && c != '-')
                .unwrap_or(input.len() - tag_name_start);
            let tag_name = &lower[tag_name_start..tag_name_start + tag_name_len];

            if dangerous_tags.contains(&tag_name) {
                // 危険なタグを発見
                let is_self_closing_or_single = tag_name == "base" || tag_name == "meta" || tag_name == "embed";

                if is_close_tag {
                    // 単体で現れた </script> などの閉じタグ
                    if let Some(tag_end) = input[start..].find('>') {
                        let end_pos = start + tag_end + 1;
                        while let Some(&(idx, _)) = chars.peek() {
                            if idx < end_pos {
                                chars.next();
                            } else {
                                break;
                            }
                        }
                        continue;
                    }
                } else if is_self_closing_or_single {
                    // 単独タグは次の '>' まで除去
                    if let Some(tag_end) = input[start..].find('>') {
                        let end_pos = start + tag_end + 1;
                        while let Some(&(idx, _)) = chars.peek() {
                            if idx < end_pos {
                                chars.next();
                            } else {
                                break;
                            }
                        }
                        continue;
                    }
                } else {
                    // 開始タグ: </tag_name> までを探してブロックごと除去
                    let close_tag_lower = format!("</{}", tag_name);

                    if let Some(tag_end) = input[start..].find('>') {
                        let after_start_tag = start + tag_end + 1;
                        let start_tag_content = &input[start..after_start_tag];
                        if start_tag_content.trim_end().ends_with("/>") {
                            while let Some(&(idx, _)) = chars.peek() {
                                if idx < after_start_tag {
                                    chars.next();
                                } else {
                                    break;
                                }
                            }
                            continue;
                        }

                        // 対応する終了タグを探す
                        if let Some(close_idx) = lower[after_start_tag..].find(&close_tag_lower) {
                            let close_pos = after_start_tag + close_idx;
                            if let Some(close_end) = input[close_pos..].find('>') {
                                let end_pos = close_pos + close_end + 1;
                                while let Some(&(idx, _)) = chars.peek() {
                                    if idx < end_pos {
                                        chars.next();
                                    } else {
                                        break;
                                    }
                                }
                                continue;
                            }
                        }

                        // 終了タグが見つからない場合は開始タグのみを除去
                        while let Some(&(idx, _)) = chars.peek() {
                            if idx < after_start_tag {
                                chars.next();
                            } else {
                                break;
                            }
                        }
                        continue;
                    }
                }
            }
        }
        result.push(ch);
    }

    result
}

/// 単一タグ内の属性を走査し、インラインイベント属性および危険なURIスキーム属性を除去します。
fn sanitize_single_tag(inner: &str) -> String {
    let trimmed = inner.trim_start();
    if trimmed.is_empty() {
        return inner.to_string();
    }

    let tag_name_len = trimmed
        .find(|c: char| c.is_whitespace() || c == '/' || c == '>')
        .unwrap_or(trimmed.len());
    let tag_name = &trimmed[..tag_name_len];
    let rest = &trimmed[tag_name_len..];

    let mut out = String::with_capacity(inner.len());
    out.push_str(tag_name);

    let mut attr_chars = rest.char_indices().peekable();
    while let Some((_, ch)) = attr_chars.next() {
        if ch.is_whitespace() {
            continue;
        }

        // 属性名
        let mut attr_name = String::new();
        attr_name.push(ch);
        while let Some(&(_, c)) = attr_chars.peek() {
            if c.is_whitespace() || c == '=' || c == '/' || c == '>' {
                break;
            }
            attr_name.push(c);
            attr_chars.next();
        }

        // 空白スキップ
        while let Some(&(_, c)) = attr_chars.peek() {
            if c.is_whitespace() {
                attr_chars.next();
            } else {
                break;
            }
        }

        let mut attr_val: Option<String> = None;
        let mut quote_char: Option<char> = None;

        if let Some(&(_, '=')) = attr_chars.peek() {
            attr_chars.next(); // skip '='
            while let Some(&(_, c)) = attr_chars.peek() {
                if c.is_whitespace() {
                    attr_chars.next();
                } else {
                    break;
                }
            }

            if let Some(&(_, q @ ('"' | '\''))) = attr_chars.peek() {
                quote_char = Some(q);
                attr_chars.next(); // skip quote
                let mut val = String::new();
                for (_, c) in attr_chars.by_ref() {
                    if c == q {
                        break;
                    }
                    val.push(c);
                }
                attr_val = Some(val);
            } else {
                let mut val = String::new();
                while let Some(&(_, c)) = attr_chars.peek() {
                    if c.is_whitespace() || c == '/' || c == '>' {
                        break;
                    }
                    val.push(c);
                    attr_chars.next();
                }
                attr_val = Some(val);
            }
        }

        let attr_name_lower = attr_name.to_lowercase();
        // 1) on* イベントハンドラ (onload, onerror, onclick など)
        if attr_name_lower.starts_with("on")
            && attr_name_lower.len() > 2
            && attr_name_lower.chars().nth(2).is_some_and(|c| c.is_ascii_alphabetic())
        {
            continue;
        }

        // 2) 危険な URI スキーム (href, src, xlink:href, action 内の javascript:, vbscript:, data:text/html)
        if (attr_name_lower == "href"
            || attr_name_lower == "src"
            || attr_name_lower == "xlink:href"
            || attr_name_lower == "action")
            && attr_val.as_ref().is_some_and(|v| is_dangerous_uri_scheme(v))
        {
            continue;
        }

        out.push(' ');
        out.push_str(&attr_name);
        if let Some(val) = attr_val {
            out.push('=');
            let q = quote_char.unwrap_or('"');
            out.push(q);
            out.push_str(&val);
            out.push(q);
        }
    }

    out
}

/// HTML 内の全タグの属性をサニタイズします。
fn sanitize_tag_attributes(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut i = 0;
    let bytes = input.as_bytes();
    let len = bytes.len();

    while i < len {
        if bytes[i] == b'<' {
            if input[i..].starts_with("<!--") {
                if let Some(end_idx) = input[i..].find("-->") {
                    result.push_str(&input[i..i + end_idx + 3]);
                    i += end_idx + 3;
                    continue;
                }
            }

            if input[i..].starts_with("</") {
                if let Some(end_idx) = input[i..].find('>') {
                    result.push_str(&input[i..i + end_idx + 1]);
                    i += end_idx + 1;
                    continue;
                }
            }

            if let Some(end_idx) = input[i..].find('>') {
                let tag_str = &input[i + 1..i + end_idx];
                let is_self_closing = tag_str.trim_end().ends_with('/');
                let inner = if is_self_closing {
                    let t = tag_str.trim_end();
                    &t[..t.len() - 1]
                } else {
                    tag_str
                };

                let sanitized_tag = sanitize_single_tag(inner);
                result.push('<');
                result.push_str(&sanitized_tag);
                if is_self_closing {
                    result.push_str(" />");
                } else {
                    result.push('>');
                }
                i += end_idx + 1;
                continue;
            }
        }
        result.push(bytes[i] as char);
        i += 1;
    }

    result
}

/// エクスポートHTMLやPDF印刷用HTMLに含まれる危険なタグ・属性を無害化・サニタイズします (HIGH-02)。
///
/// - 危険なタグ (<script>, <iframe>, <object>, <embed>, <form>, <base>, <meta>) を再帰的に除去
/// - インラインイベントハンドラ属性 (on[a-zA-Z]+) を除去
/// - 危険なURIスキーム (javascript:, vbscript:, data:text/html) を含む属性を除去
/// - GFM標準要素（見出し、表、チェックボックス、画像、コードブロック、安全なリンク等）を完全に保持
pub fn sanitize_exported_html(html: &str) -> String {
    let mut sanitized = html.to_string();

    const DANGEROUS_TAGS: &[&str] = &[
        "script", "iframe", "object", "embed", "form", "base", "meta",
    ];

    loop {
        let prev_len = sanitized.len();
        sanitized = remove_dangerous_tags(&sanitized, DANGEROUS_TAGS);
        if sanitized.len() == prev_len {
            break;
        }
    }

    sanitize_tag_attributes(&sanitized)
}

/// Markdown文字列をスタンドアロンのHTMLドキュメント（CSSスタイル内蔵）に変換します。
#[tauri::command]
pub fn convert_markdown_to_html(
    markdown: String,
    title: Option<String>,
    theme: Option<String>,
) -> Result<String, String> {
    use pulldown_cmark::{html, Options, Parser};

    let doc_title = title
        .filter(|t| !t.trim().is_empty())
        .or_else(|| extract_title_from_markdown(&markdown))
        .unwrap_or_else(|| "Typori Document".to_string());

    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    let parser = Parser::new_ext(&markdown, options);
    let mut body_html = String::new();
    html::push_html(&mut body_html, parser);

    let sanitized_body = sanitize_exported_html(&body_html);

    let theme_mode = theme.unwrap_or_else(|| "light".to_string());
    let is_dark = theme_mode.to_lowercase() == "dark";

    let css = if is_dark {
        r#"
:root {
  --bg-color: #0d1117;
  --text-color: #c9d1d9;
  --heading-color: #f0f6fc;
  --link-color: #58a6ff;
  --border-color: #30363d;
  --code-bg: #161b22;
  --code-border: #30363d;
  --blockquote-border: #388bfd;
  --blockquote-bg: #161b22;
  --blockquote-text: #8b949e;
  --table-border: #30363d;
  --table-th-bg: #161b22;
  --table-even-bg: #0d1117;
  --table-odd-bg: #161b22;
  --hr-color: #30363d;
  --checkbox-accent: #1f6feb;
}
"#
    } else {
        r#"
:root {
  --bg-color: #ffffff;
  --text-color: #24292f;
  --heading-color: #1f2328;
  --link-color: #0969da;
  --border-color: #d0d7de;
  --code-bg: #f6f8fa;
  --code-border: #d0d7de;
  --blockquote-border: #0969da;
  --blockquote-bg: #f6f8fa;
  --blockquote-text: #57606a;
  --table-border: #d0d7de;
  --table-th-bg: #f6f8fa;
  --table-even-bg: #ffffff;
  --table-odd-bg: #f6f8fa;
  --hr-color: #d0d7de;
  --checkbox-accent: #0969da;
}
"#
    };

    let full_html = format!(
        r#"<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{}</title>
  <style>
{}
    * {{
      box-sizing: border-box;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 16px;
      line-height: 1.6;
      word-wrap: break-word;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 0;
    }}
    .markdown-container {{
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 24px;
    }}
    h1, h2, h3, h4, h5, h6 {{
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      color: var(--heading-color);
    }}
    h1 {{
      font-size: 2em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid var(--border-color);
    }}
    h2 {{
      font-size: 1.5em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid var(--border-color);
    }}
    h3 {{ font-size: 1.25em; }}
    h4 {{ font-size: 1em; }}
    h5 {{ font-size: 0.875em; }}
    h6 {{ font-size: 0.85em; color: var(--blockquote-text); }}
    p {{
      margin-top: 0;
      margin-bottom: 16px;
    }}
    a {{
      color: var(--link-color);
      text-decoration: none;
    }}
    a:hover {{
      text-decoration: underline;
    }}
    ul, ol {{
      margin-top: 0;
      margin-bottom: 16px;
      padding-left: 2em;
    }}
    li + li {{
      margin-top: 0.25em;
    }}
    li input[type="checkbox"] {{
      margin-right: 0.4em;
      accent-color: var(--checkbox-accent);
      vertical-align: middle;
    }}
    ul.contains-task-list, ul:has(input[type="checkbox"]) {{
      list-style-type: none;
      padding-left: 1.2em;
    }}
    blockquote {{
      margin: 0 0 16px 0;
      padding: 0 1em;
      color: var(--blockquote-text);
      border-left: 0.25em solid var(--blockquote-border);
      background-color: var(--blockquote-bg);
      border-radius: 0 4px 4px 0;
    }}
    hr {{
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: var(--hr-color);
      border: 0;
    }}
    table {{
      border-spacing: 0;
      border-collapse: collapse;
      margin-top: 0;
      margin-bottom: 16px;
      width: 100%;
      overflow: auto;
      display: block;
    }}
    table th, table td {{
      padding: 8px 14px;
      border: 1px solid var(--table-border);
    }}
    table th {{
      font-weight: 600;
      background-color: var(--table-th-bg);
    }}
    table tr:nth-child(2n) {{
      background-color: var(--table-odd-bg);
    }}
    code {{
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      background-color: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 6px;
    }}
    pre {{
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      background-color: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 6px;
      margin-top: 0;
      margin-bottom: 16px;
    }}
    pre code {{
      padding: 0;
      background-color: transparent;
      border: 0;
      font-size: 100%;
    }}
    img {{
      max-width: 100%;
      box-sizing: content-box;
      border-radius: 4px;
    }}
    .typori-mermaid-svg {{
      display: flex;
      justify-content: center;
      margin: 20px 0;
      overflow-x: auto;
    }}
    .typori-mermaid-svg svg {{
      max-width: 100%;
      height: auto;
    }}
    .typori-mermaid-error-container {{
      margin: 16px 0;
    }}
    .typori-mermaid-error {{
      color: #ef4444;
      font-size: 13px;
      margin-bottom: 8px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
      border-left: 3px solid #ef4444;
    }}
    @page {{
      margin: 15mm 20mm;
      size: auto;
    }}
    @media print {{
      body {{
        background-color: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }}
      h1, h2, h3, h4, h5, h6 {{
        page-break-after: avoid;
        break-after: avoid;
      }}
      img, tr {{
        break-inside: avoid;
        page-break-inside: avoid;
      }}
      .markdown-container {{
        max-width: 100% !important;
        padding: 0 !important;
      }}
      pre, blockquote, table, .typori-mermaid-svg, .typori-mermaid-error-container {{
        page-break-inside: avoid;
        break-inside: avoid;
      }}
      .typori-mermaid-svg svg {{
        max-width: 100% !important;
      }}
    }}
  </style>
</head>
<body>
  <div class="markdown-container">
    {}
  </div>
</body>
</html>
"#,
        escape_html(&doc_title),
        css,
        sanitized_body
    );

    Ok(full_html)
}

/// 指定パスにMarkdownをHTMLとしてエクスポートします。親ディレクトリが存在しない場合は作成します。
#[tauri::command]
pub fn export_to_html(
    path: String,
    markdown: String,
    title: Option<String>,
    theme: Option<String>,
) -> Result<(), String> {
    let html_content = convert_markdown_to_html(markdown, title, theme)?;

    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directories for '{}': {}", path, e))?;
        }
    }

    fs::write(&path, html_content)
        .map_err(|e| format!("Failed to export HTML to '{}': {}", path, e))
}

/// 指定パスにPDF印刷用としてMarkdownをHTMLファイルとして書き出します。親ディレクトリが存在しない場合は作成します。
#[tauri::command]
pub fn export_to_pdf_html(
    path: String,
    markdown: String,
    title: Option<String>,
    theme: Option<String>,
) -> Result<(), String> {
    export_to_html(path, markdown, title, theme)
}

/// 起動時ワークスペース初期化の内部処理ロジック。
/// CLI引数またはカスタムパスからワークスペースディレクトリと初期対象ファイルを決定し、
/// ディレクトリエントリ一覧とファイル内容を1回で集約して返却します。
pub fn init_workspace_internal(
    args: &[String],
    custom_path: Option<String>,
) -> Result<WorkspaceInitResult, String> {
    let mut target_file_path: Option<String> = None;
    let mut target_dir: Option<String> = None;

    if let Some(cp) = custom_path.filter(|s| !s.trim().is_empty()) {
        let p = std::path::Path::new(&cp);
        if p.is_dir() {
            target_dir = Some(cp);
        } else {
            if let Some(parent) = p.parent() {
                if !parent.as_os_str().is_empty() {
                    target_dir = Some(parent.to_string_lossy().to_string());
                }
            }
            target_file_path = Some(cp);
        }
    } else {
        // CLI引数のチェック（第1引数以降を走査）
        for arg in args.iter().skip(1) {
            let lower = arg.to_lowercase();
            if lower.ends_with(".md") || lower.ends_with(".txt") || lower.ends_with(".markdown") {
                let p = std::path::Path::new(arg);
                target_file_path = Some(arg.clone());
                if let Some(parent) = p.parent() {
                    if !parent.as_os_str().is_empty() {
                        target_dir = Some(parent.to_string_lossy().to_string());
                    }
                }
                break;
            }
        }
    }

    let cwd = match target_dir {
        Some(dir) => dir,
        None => std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to get current directory: {}", e))?,
    };

    let entries = read_dir(cwd.clone())?;

    let (initial_file_content, initial_file_error) = match target_file_path.as_deref() {
        Some(path) => {
            let path_obj = std::path::Path::new(path);
            let read_target = if path_obj.exists() {
                path_obj.to_path_buf()
            } else if path_obj.is_relative() {
                let joined = std::path::Path::new(&cwd).join(path_obj);
                if joined.exists() {
                    joined
                } else if let Some(fname) = path_obj.file_name() {
                    std::path::Path::new(&cwd).join(fname)
                } else {
                    path_obj.to_path_buf()
                }
            } else {
                path_obj.to_path_buf()
            };

            match fs::read_to_string(&read_target) {
                Ok(content) => {
                    let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
                    (Some(normalized), None)
                }
                Err(e) => (None, Some(format!("Failed to read file '{}': {}", path, e))),
            }
        }
        None => (None, None),
    };

    Ok(WorkspaceInitResult {
        current_dir: cwd,
        entries,
        initial_file_path: target_file_path,
        initial_file_content,
        initial_file_error,
    })
}

/// 起動時のワークスペースを一括で初期化します。
/// CLI引数または指定パスを解析し、カレントディレクトリの特定、ディレクトリエントリ一覧の走査、
/// および初期対象ファイルの読み込みを1回のIPC呼び出しで集約して返却します。
#[tauri::command]
pub fn init_workspace(custom_path: Option<String>) -> Result<WorkspaceInitResult, String> {
    let args: Vec<String> = std::env::args().collect();
    init_workspace_internal(&args, custom_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn get_temp_file_path(prefix: &str) -> std::path::PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("{}_{}.md", prefix, timestamp))
    }

    fn create_temp_file(content: &str) -> std::path::PathBuf {
        let path = get_temp_file_path("typori_test_open_file");
        fs::write(&path, content).expect("Failed to write temporary test file");
        path
    }

    #[test]
    fn test_open_file_success() {
        let expected_content = "# Hello Typori\n\nThis is test markdown content.";
        let file_path = create_temp_file(expected_content);
        let path_str = file_path.to_str().unwrap().to_string();

        let result = open_file(path_str);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), expected_content);

        // クリーンアップ
        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_open_file_not_found() {
        let non_existent_path = std::env::temp_dir().join("typori_non_existent_file_99999.md");
        let result = open_file(non_existent_path.to_str().unwrap().to_string());
        assert!(result.is_err());
        let err_msg = result.unwrap_err();
        assert!(err_msg.contains("Failed to read file"));
    }

    #[test]
    fn test_save_file_success() {
        let file_path = get_temp_file_path("typori_test_save_file");
        let path_str = file_path.to_str().unwrap().to_string();
        let content = "# Saved Content\nTesting save_file function.";

        let result = save_file(path_str.clone(), content.to_string());
        assert!(result.is_ok());

        let read_back = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_back, content);

        // クリーンアップ
        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_save_file_overwrite() {
        let file_path = get_temp_file_path("typori_test_save_overwrite");
        let path_str = file_path.to_str().unwrap().to_string();
        fs::write(&file_path, "initial content").unwrap();

        let new_content = "updated content";
        let result = save_file(path_str.clone(), new_content.to_string());
        assert!(result.is_ok());

        let read_back = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_back, new_content);

        // クリーンアップ
        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_save_file_creates_nested_directories() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir_path = std::env::temp_dir().join(format!("typori_test_dir_{}", timestamp));
        let file_path = dir_path.join("nested").join("test.md");
        let path_str = file_path.to_str().unwrap().to_string();
        let content = "nested directory content";

        let result = save_file(path_str.clone(), content.to_string());
        assert!(result.is_ok());

        let read_back = fs::read_to_string(&file_path).unwrap();
        assert_eq!(read_back, content);

        // クリーンアップ
        let _ = fs::remove_dir_all(dir_path);
    }

    #[test]
    fn test_read_dir_success() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir_path = std::env::temp_dir().join(format!("typori_test_read_dir_{}", timestamp));
        fs::create_dir_all(&dir_path).unwrap();

        // テスト用ファイル・ディレクトリ作成
        let sub_dir = dir_path.join("sub_directory");
        fs::create_dir(&sub_dir).unwrap();
        let file_b = dir_path.join("b_test.md");
        fs::write(&file_b, "b").unwrap();
        let file_a = dir_path.join("a_test.md");
        fs::write(&file_a, "a").unwrap();

        let path_str = dir_path.to_str().unwrap().to_string();
        let result = read_dir(path_str);
        assert!(result.is_ok());

        let entries = result.unwrap();
        assert_eq!(entries.len(), 3);

        // ディレクトリが先、その後ファイル名昇順
        assert_eq!(entries[0].name, "sub_directory");
        assert!(entries[0].is_dir);

        assert_eq!(entries[1].name, "a_test.md");
        assert!(!entries[1].is_dir);

        assert_eq!(entries[2].name, "b_test.md");
        assert!(!entries[2].is_dir);

        // クリーンアップ
        let _ = fs::remove_dir_all(dir_path);
    }

    #[test]
    fn test_read_dir_empty() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir_path = std::env::temp_dir().join(format!("typori_test_read_empty_{}", timestamp));
        fs::create_dir_all(&dir_path).unwrap();

        let path_str = dir_path.to_str().unwrap().to_string();
        let result = read_dir(path_str);
        assert!(result.is_ok());
        let entries = result.unwrap();
        assert!(entries.is_empty());

        // クリーンアップ
        let _ = fs::remove_dir_all(dir_path);
    }

    #[test]
    fn test_read_dir_not_found() {
        let non_existent_path = std::env::temp_dir().join("typori_non_existent_dir_99999");
        let result = read_dir(non_existent_path.to_str().unwrap().to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_read_dir_not_a_directory() {
        let file_path = create_temp_file("test");
        let path_str = file_path.to_str().unwrap().to_string();

        let result = read_dir(path_str);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("is not a directory"));

        // クリーンアップ
        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_get_current_dir() {
        let result = get_current_dir();
        assert!(result.is_ok());
        let current_dir = result.unwrap();
        assert!(!current_dir.is_empty());
        assert!(std::path::Path::new(&current_dir).exists());
    }

    #[test]
    fn test_get_parent_dir() {
        let temp_dir = std::env::temp_dir();
        let child = temp_dir.join("child");
        let parent = get_parent_dir(child.to_str().unwrap().to_string());
        assert!(parent.is_ok());
        let expected = child.parent().map(|p| p.to_string_lossy().to_string());
        assert_eq!(parent.unwrap(), expected);
    }

    #[test]
    fn test_create_file_success() {
        let file_path = get_temp_file_path("typori_test_create_file");
        let path_str = file_path.to_str().unwrap().to_string();
        let initial_content = "# New Note\nInitial text.";

        let result = create_file(path_str.clone(), Some(initial_content.to_string()));
        assert!(result.is_ok());

        let entry = result.unwrap();
        assert_eq!(entry.path, path_str);
        assert!(!entry.is_dir);

        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, initial_content);

        // クリーンアップ
        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_create_file_already_exists() {
        let file_path = create_temp_file("existing");
        let path_str = file_path.to_str().unwrap().to_string();

        let result = create_file(path_str, Some("conflict".to_string()));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("already exists"));

        // クリーンアップ
        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_create_file_creates_parent_dirs() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir_path = std::env::temp_dir().join(format!("typori_test_create_dir_{}", timestamp));
        let file_path = dir_path.join("subfolder").join("new_note.md");
        let path_str = file_path.to_str().unwrap().to_string();

        let result = create_file(path_str.clone(), None);
        assert!(result.is_ok());

        assert!(file_path.exists());
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "");

        // クリーンアップ
        let _ = fs::remove_dir_all(dir_path);
    }

    #[test]
    fn test_is_image_extension() {
        assert!(is_image_extension("png"));
        assert!(is_image_extension("PNG"));
        assert!(is_image_extension("jpg"));
        assert!(is_image_extension("jpeg"));
        assert!(is_image_extension("gif"));
        assert!(is_image_extension("webp"));
        assert!(is_image_extension("svg"));
        assert!(!is_image_extension("txt"));
        assert!(!is_image_extension("md"));
        assert!(!is_image_extension("rs"));
    }

    #[test]
    fn test_get_unique_file_path() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("typori_test_unique_{}", timestamp));
        fs::create_dir_all(&dir).unwrap();

        let (path1, name1) = get_unique_file_path(&dir, "sample.png");
        assert_eq!(name1, "sample.png");
        fs::write(&path1, "fake image 1").unwrap();

        let (path2, name2) = get_unique_file_path(&dir, "sample.png");
        assert_eq!(name2, "sample_1.png");
        fs::write(&path2, "fake image 2").unwrap();

        let (_path3, name3) = get_unique_file_path(&dir, "sample.png");
        assert_eq!(name3, "sample_2.png");

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn test_save_image_file_and_resolve() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let base_dir = std::env::temp_dir().join(format!("typori_test_img_{}", timestamp));
        let doc_path = base_dir.join("notes").join("my_doc.md");
        let src_img = base_dir.join("download.png");
        fs::create_dir_all(doc_path.parent().unwrap()).unwrap();
        fs::write(&src_img, "mock_png_binary_data").unwrap();

        let res = save_image_file(
            src_img.to_str().unwrap().to_string(),
            Some(doc_path.to_str().unwrap().to_string()),
            None,
        );
        assert!(res.is_ok());
        let saved = res.unwrap();
        assert_eq!(saved.file_name, "download.png");
        assert_eq!(saved.relative_path, "assets/download.png");
        assert!(std::path::Path::new(&saved.absolute_path).exists());

        // resolve_image_path
        let resolved = resolve_image_path(
            saved.relative_path.clone(),
            Some(doc_path.to_str().unwrap().to_string()),
            None,
        );
        assert!(resolved.is_ok());
        assert_eq!(resolved.unwrap(), saved.absolute_path);

        // read_file_binary
        let bin_res = read_file_binary(saved.absolute_path);
        assert!(bin_res.is_ok());
        assert_eq!(bin_res.unwrap(), b"mock_png_binary_data");

        let _ = fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_save_image_binary() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let base_dir = std::env::temp_dir().join(format!("typori_test_bin_{}", timestamp));
        let doc_path = base_dir.join("doc.md");
        fs::create_dir_all(&base_dir).unwrap();
        fs::write(&doc_path, "# Title").unwrap();

        let binary_data = vec![137, 80, 78, 71, 13, 10, 26, 10]; // PNG header
        let res = save_image_binary(
            "pasted.png".to_string(),
            binary_data.clone(),
            Some(doc_path.to_str().unwrap().to_string()),
            None,
        );
        assert!(res.is_ok());
        let saved = res.unwrap();
        assert_eq!(saved.file_name, "pasted.png");
        assert_eq!(saved.relative_path, "assets/pasted.png");

        let read_back = fs::read(&saved.absolute_path).unwrap();
        assert_eq!(read_back, binary_data);

        let _ = fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_search_files() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let base_dir = std::env::temp_dir().join(format!("typori_test_search_{}", timestamp));
        fs::create_dir_all(base_dir.join("sub1").join("nested")).unwrap();
        fs::create_dir_all(base_dir.join("sub2")).unwrap();
        fs::create_dir_all(base_dir.join("target")).unwrap(); // should be ignored

        fs::write(base_dir.join("Hello_World.md"), "# Hello").unwrap();
        fs::write(base_dir.join("sub1").join("hello_note.txt"), "hello").unwrap();
        fs::write(base_dir.join("sub1").join("nested").join("deep_hello.md"), "deep").unwrap();
        fs::write(base_dir.join("sub2").join("other.md"), "other").unwrap();
        fs::write(base_dir.join("target").join("hello_in_target.md"), "target").unwrap();

        // 1. 空のクエリ
        let empty_res = search_files(base_dir.to_str().unwrap().to_string(), "".to_string(), None);
        assert!(empty_res.is_ok());
        assert_eq!(empty_res.unwrap().len(), 0);

        // 2. 大文字小文字を区別しない検索 ("hello")
        let res = search_files(
            base_dir.to_str().unwrap().to_string(),
            "HELLO".to_string(),
            None,
        );
        assert!(res.is_ok());
        let entries = res.unwrap();
        let names: Vec<String> = entries.into_iter().map(|e| e.name).collect();
        assert!(names.contains(&"Hello_World.md".to_string()));
        assert!(names.contains(&"hello_note.txt".to_string()));
        assert!(names.contains(&"deep_hello.md".to_string()));
        // target ディレクトリ配下は除外されること
        assert!(!names.contains(&"hello_in_target.md".to_string()));
        // other.md はマッチしないこと
        assert!(!names.contains(&"other.md".to_string()));

        // 3. 件数上限 (max_results)
        let limited_res = search_files(
            base_dir.to_str().unwrap().to_string(),
            "hello".to_string(),
            Some(2),
        );
        assert!(limited_res.is_ok());
        assert_eq!(limited_res.unwrap().len(), 2);

        // 4. 存在しないディレクトリ
        let not_found_res = search_files("non_existent_dir_12345".to_string(), "hello".to_string(), None);
        assert!(not_found_res.is_err());

        let _ = fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_extract_title_from_markdown() {
        assert_eq!(
            extract_title_from_markdown("# My Title\nSome text"),
            Some("My Title".to_string())
        );
        assert_eq!(
            extract_title_from_markdown("No title\n## Sub heading"),
            None
        );
        assert_eq!(
            extract_title_from_markdown("  #   Indented Title  \n"),
            Some("Indented Title".to_string())
        );
    }

    #[test]
    fn test_convert_markdown_to_html() {
        let md = "# Sample Document\n\nThis is a **bold** paragraph with a [link](https://example.com).\n\n| Col1 | Col2 |\n|---|---|\n| A | B |\n\n- [x] Task 1\n- [ ] Task 2";
        let res = convert_markdown_to_html(md.to_string(), None, Some("light".to_string()));
        assert!(res.is_ok());
        let html = res.unwrap();
        assert!(html.contains("<title>Sample Document</title>"));
        assert!(html.contains("<h1>Sample Document</h1>"));
        assert!(html.contains("<strong>bold</strong>"));
        assert!(html.contains("<a href=\"https://example.com\">link</a>"));
        assert!(html.contains("<table>"));
        assert!(html.contains("<th>Col1</th>"));
        assert!(html.contains("type=\"checkbox\""));
        assert!(html.contains("@page"));
        assert!(html.contains("@media print"));
    }

    #[test]
    fn test_export_to_html_file() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let file_path = std::env::temp_dir().join(format!("typori_test_export_{}.html", timestamp));
        let path_str = file_path.to_str().unwrap().to_string();

        let md = "# Export Test\nContent to be exported.";
        let res = export_to_html(
            path_str.clone(),
            md.to_string(),
            Some("Custom Export Title".to_string()),
            Some("dark".to_string()),
        );
        assert!(res.is_ok());
        assert!(file_path.exists());

        let read_html = fs::read_to_string(&file_path).unwrap();
        assert!(read_html.contains("<title>Custom Export Title</title>"));
        assert!(read_html.contains("<h1>Export Test</h1>"));
        assert!(read_html.contains("--bg-color: #0d1117"));

        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_export_to_pdf_html() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let file_path = std::env::temp_dir().join(format!("typori_test_pdf_export_{}.html", timestamp));
        let path_str = file_path.to_str().unwrap().to_string();

        let md = "# PDF Export Test\nPDF printable content.";
        let res = export_to_pdf_html(
            path_str.clone(),
            md.to_string(),
            Some("PDF Test Document".to_string()),
            Some("light".to_string()),
        );
        assert!(res.is_ok());
        assert!(file_path.exists());

        let read_html = fs::read_to_string(&file_path).unwrap();
        assert!(read_html.contains("<title>PDF Test Document</title>"));
        assert!(read_html.contains("<h1>PDF Export Test</h1>"));
        assert!(read_html.contains("@page"));
        assert!(read_html.contains("@media print"));

        let _ = fs::remove_file(file_path);
    }

    #[test]
    fn test_init_workspace_internal_default_no_args() {
        let args: Vec<String> = vec!["typori".to_string()];
        let res = init_workspace_internal(&args, None);
        assert!(res.is_ok());
        let ws = res.unwrap();
        assert!(!ws.current_dir.is_empty());
        assert!(ws.initial_file_path.is_none());
        assert!(ws.initial_file_content.is_none());
        assert!(ws.initial_file_error.is_none());
    }

    #[test]
    fn test_init_workspace_internal_cli_markdown_file() {
        let temp_dir = std::env::temp_dir();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let test_dir = temp_dir.join(format!("typori_ws_test_{}", timestamp));
        fs::create_dir_all(&test_dir).unwrap();

        let file_path = test_dir.join("test_doc.md");
        fs::write(&file_path, "# Header\r\nLine 2").unwrap();

        let args: Vec<String> = vec![
            "typori".to_string(),
            file_path.to_string_lossy().to_string(),
        ];
        let res = init_workspace_internal(&args, None);
        assert!(res.is_ok());
        let ws = res.unwrap();
        assert_eq!(
            std::path::Path::new(&ws.current_dir),
            std::path::Path::new(&test_dir)
        );
        assert_eq!(
            ws.initial_file_path,
            Some(file_path.to_string_lossy().to_string())
        );
        assert_eq!(ws.initial_file_content, Some("# Header\nLine 2".to_string()));
        assert!(ws.initial_file_error.is_none());
        assert!(ws.entries.iter().any(|e| e.name == "test_doc.md"));

        let _ = fs::remove_dir_all(&test_dir);
    }

    #[test]
    fn test_init_workspace_internal_file_not_found() {
        let temp_dir = std::env::temp_dir();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let non_existent_file = temp_dir.join(format!("typori_nonexistent_{}.md", timestamp));
        let args: Vec<String> = vec![
            "typori".to_string(),
            non_existent_file.to_string_lossy().to_string(),
        ];
        let res = init_workspace_internal(&args, None);
        assert!(res.is_ok());
        let ws = res.unwrap();
        assert_eq!(
            ws.initial_file_path,
            Some(non_existent_file.to_string_lossy().to_string())
        );
        assert!(ws.initial_file_content.is_none());
        assert!(ws.initial_file_error.is_some());
        assert!(ws
            .initial_file_error
            .unwrap()
            .contains("Failed to read file"));
    }

    #[test]
    fn test_init_workspace_internal_custom_path_directory() {
        let temp_dir = std::env::temp_dir();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let test_dir = temp_dir.join(format!("typori_ws_custom_dir_{}", timestamp));
        fs::create_dir_all(&test_dir).unwrap();

        let sub_file = test_dir.join("sample.txt");
        fs::write(&sub_file, "sample text").unwrap();

        let res = init_workspace_internal(
            &["typori".to_string()],
            Some(test_dir.to_string_lossy().to_string()),
        );
        assert!(res.is_ok());
        let ws = res.unwrap();
        assert_eq!(
            std::path::Path::new(&ws.current_dir),
            std::path::Path::new(&test_dir)
        );
        assert!(ws.initial_file_path.is_none());
        assert!(ws.initial_file_content.is_none());
        assert!(ws.entries.iter().any(|e| e.name == "sample.txt"));

        let _ = fs::remove_dir_all(&test_dir);
    }

    #[test]
    fn test_sanitize_exported_html_removes_dangerous_tags() {
        let input = r#"
            <h1>Heading</h1>
            <script>alert("XSS")</script>
            <p>Paragraph</p>
            <script src="https://evil.example.com/bad.js"></script>
            <iframe><p>Nested iframe</p></iframe>
            <object data="evil.swf"></object>
            <embed src="evil.swf" />
            <form action="http://evil.com"><input type="text"/></form>
            <base href="http://evil.com/" />
            <meta http-equiv="refresh" content="0;url=http://evil.com" />
            <script><script>nested()</script></script>
            <div>Clean content</div>
        "#;

        let sanitized = sanitize_exported_html(input);
        assert!(!sanitized.contains("<script"));
        assert!(!sanitized.contains("</script>"));
        assert!(!sanitized.contains("alert"));
        assert!(!sanitized.contains("<iframe"));
        assert!(!sanitized.contains("<object"));
        assert!(!sanitized.contains("<embed"));
        assert!(!sanitized.contains("<form"));
        assert!(!sanitized.contains("<base"));
        assert!(!sanitized.contains("<meta"));
        assert!(sanitized.contains("<h1>Heading</h1>"));
        assert!(sanitized.contains("<p>Paragraph</p>"));
        assert!(sanitized.contains("<div>Clean content</div>"));
    }

    #[test]
    fn test_sanitize_exported_html_removes_event_handlers() {
        let input = r#"<img src="valid.png" onload="alert(1)" onerror="steal()" onclick="doEvil()"/>"#;
        let sanitized = sanitize_exported_html(input);
        assert!(!sanitized.contains("onload"));
        assert!(!sanitized.contains("onerror"));
        assert!(!sanitized.contains("onclick"));
        assert!(sanitized.contains("src=\"valid.png\""));
    }

    #[test]
    fn test_sanitize_exported_html_blocks_dangerous_schemes() {
        let input = r#"
            <a href="javascript:alert(1)">Bad Link 1</a>
            <a href="  javascript:alert(2)">Bad Link 2</a>
            <a href="&#106;&#97;vascript:alert(3)">Bad Link 3</a>
            <a href="vbscript:msgbox(1)">Bad Link 4</a>
            <a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Bad Link 5</a>
            <img src="javascript:alert(4)" alt="bad image" />
            <a href="https://example.com/safe">Safe Link</a>
            <img src="./images/test.png" alt="safe image" />
        "#;

        let sanitized = sanitize_exported_html(input);
        assert!(!sanitized.contains("javascript:"));
        assert!(!sanitized.contains("&#106;&#97;vascript:"));
        assert!(!sanitized.contains("vbscript:"));
        assert!(!sanitized.contains("data:text/html"));
        assert!(sanitized.contains("href=\"https://example.com/safe\""));
        assert!(sanitized.contains("src=\"./images/test.png\""));
        assert!(sanitized.contains("Bad Link 1"));
    }

    #[test]
    fn test_sanitize_exported_html_preserves_gfm_elements() {
        let input = r##"
            <h2>Table Test</h2>
            <table>
                <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
                <tbody><tr><td>Data 1</td><td>Data 2</td></tr></tbody>
            </table>
            <ul class="contains-task-list">
                <li><input type="checkbox" disabled="" checked="" /> Done task</li>
                <li><input type="checkbox" disabled="" /> Todo task</li>
            </ul>
            <div class="typori-mermaid-svg">
                <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>
            </div>
            <pre><code class="language-rust">fn main() { println!("Hello"); }</code></pre>
        "##;

        let sanitized = sanitize_exported_html(input);
        assert!(sanitized.contains("<h2>Table Test</h2>"));
        assert!(sanitized.contains("<table>"));
        assert!(sanitized.contains("<th>Col 1</th>"));
        assert!(sanitized.contains("<td>Data 1</td>"));
        assert!(sanitized.contains("type=\"checkbox\""));
        assert!(sanitized.contains("disabled=\"\""));
        assert!(sanitized.contains("checked=\"\""));
        assert!(sanitized.contains("class=\"typori-mermaid-svg\""));
        assert!(sanitized.contains("<svg viewBox=\"0 0 100 100\">"));
        assert!(sanitized.contains("<code class=\"language-rust\">"));
    }

    #[test]
    fn test_convert_markdown_to_html_security_sanitization() {
        let markdown = r#"
# Safe Document

This is safe content with a [link](https://example.com).

<script>alert("markdown-xss")</script>
<img src="x" onerror="evil()" />
<a href="javascript:alert(1)">Click me</a>

- [x] Task 1
- [ ] Task 2
"#;

        let result = convert_markdown_to_html(markdown.to_string(), Some("Security Test".to_string()), None);
        assert!(result.is_ok());
        let html = result.unwrap();

        assert!(!html.contains("<script>"));
        assert!(!html.contains("alert(\"markdown-xss\")"));
        assert!(!html.contains("onerror"));
        assert!(!html.contains("javascript:alert(1)"));
        assert!(html.contains("Safe Document"));
        assert!(html.contains("https://example.com"));
        assert!(html.contains("Task 1"));
    }
}



