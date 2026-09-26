use serde::{Deserialize, Serialize};
use std::fs;

/// ディレクトリ内のファイルまたはディレクトリのエントリ情報
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
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
}

