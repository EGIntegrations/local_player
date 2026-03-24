use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add scoped library and dedupe track paths",
            sql: include_str!("migration_v2.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
