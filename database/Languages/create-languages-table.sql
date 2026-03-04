-- Create languages table
CREATE TABLE IF NOT EXISTS languages (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  language_name  VARCHAR(100) NOT NULL,
  direction      SMALLINT NOT NULL DEFAULT 0 CHECK (direction IN (0, 1))
);

-- Create index on language_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_languages_name ON languages(language_name);

-- Insert default languages (English and Hebrew)
INSERT INTO languages (language_name, direction) VALUES ('English', 0)
ON CONFLICT DO NOTHING;

INSERT INTO languages (language_name, direction) VALUES ('עברית', 1)
ON CONFLICT DO NOTHING;

-- Comment on table
COMMENT ON TABLE languages IS 'Available languages for the application. direction: 0=LTR, 1=RTL';
COMMENT ON COLUMN languages.direction IS '0 = Left-to-Right (LTR), 1 = Right-to-Left (RTL)';
