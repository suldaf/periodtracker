WITH attr_map AS (
  SELECT source_attr.id::text AS source_id, target_attr.id::text AS target_id
  FROM oky_id.help_center_attribute source_attr
  INNER JOIN oky_id.help_center_attribute target_attr
    ON target_attr.emoji = source_attr.emoji
    AND target_attr.lang = 'id'
  WHERE source_attr.lang <> 'id'
)
UPDATE oky_id.help_center help_center
SET "primaryAttributeId" = attr_map.target_id::integer
FROM attr_map
WHERE help_center."primaryAttributeId"::text = attr_map.source_id;

WITH attr_map AS (
  SELECT source_attr.id::text AS source_id, target_attr.id::text AS target_id
  FROM oky_id.help_center_attribute source_attr
  INNER JOIN oky_id.help_center_attribute target_attr
    ON target_attr.emoji = source_attr.emoji
    AND target_attr.lang = 'id'
  WHERE source_attr.lang <> 'id'
),
mapped_other_attributes AS (
  SELECT
    help_center.id,
    string_agg(COALESCE(attr_map.target_id, split_attr.attr_id), ',' ORDER BY split_attr.ordinality) AS other_attributes
  FROM oky_id.help_center help_center
  CROSS JOIN LATERAL unnest(string_to_array(help_center."otherAttributes", ',')) WITH ORDINALITY AS split_attr(attr_id, ordinality)
  LEFT JOIN attr_map
    ON btrim(split_attr.attr_id) = attr_map.source_id
  WHERE help_center."otherAttributes" IS NOT NULL
    AND help_center."otherAttributes" <> ''
  GROUP BY help_center.id
)
UPDATE oky_id.help_center help_center
SET "otherAttributes" = mapped_other_attributes.other_attributes
FROM mapped_other_attributes
WHERE help_center.id = mapped_other_attributes.id;
