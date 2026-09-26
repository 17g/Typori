use std::fs;

/// 指定されたパスのファイルをUTF-8文字列として読み込みます。
#[tauri::command]
pub fn open_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn create_temp_file(content: &str) -> std::path::PathBuf {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("typori_test_open_file_{}.md", timestamp));
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
}
