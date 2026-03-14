-- Create entities_pairs table for PostgreSQL
-- Run: node database/run-sql.mjs database/entities_pairs/create-entities-pairs-table.sql

CREATE TABLE IF NOT EXISTS entities_pairs (
  pair_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entities_pair_type  INTEGER NOT NULL,
  parent_entity_id    BIGINT NOT NULL,
  child_entity_id     BIGINT NOT NULL,
  sort_order          INTEGER NOT NULL
);

COMMENT ON TABLE entities_pairs IS 'Entity pair relationships with parent/child links and ordering.';
COMMENT ON COLUMN entities_pairs.pair_id IS 'Primary key (auto-generated).';
COMMENT ON COLUMN entities_pairs.entities_pair_type IS 'Type of entity pair relationship.';
COMMENT ON COLUMN entities_pairs.parent_entity_id IS 'Reference to parent entity.';
COMMENT ON COLUMN entities_pairs.child_entity_id IS 'Reference to child entity.';
COMMENT ON COLUMN entities_pairs.sort_order IS 'Display/sequence order (Order field).';

CREATE INDEX IF NOT EXISTS idx_entities_pairs_entities_pair_type ON entities_pairs(entities_pair_type);
CREATE INDEX IF NOT EXISTS idx_entities_pairs_parent_entity_id ON entities_pairs(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_pairs_child_entity_id ON entities_pairs(child_entity_id);
