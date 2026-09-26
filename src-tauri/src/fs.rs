use std::fs;

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
}
