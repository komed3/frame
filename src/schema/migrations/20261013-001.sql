-- Frame: Migration 001 – Initial schema
-- Database: SQLite
-- Apply once to a new, empty database.

PRAGMA foreign_keys = ON;

BEGIN IMMEDIATE;

-- ============================================================
-- 1. Users and authentication
-- ============================================================

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  pw_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK ( is_admin IN ( 0, 1 ) ),
  created_at TEXT NOT NULL DEFAULT ( strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) ),
  disabled_at TEXT
);
