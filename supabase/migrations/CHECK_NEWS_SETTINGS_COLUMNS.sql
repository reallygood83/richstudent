-- Check if auto_generate_explanation column exists in news_settings table

SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name = 'news_settings'
ORDER BY
    ordinal_position;
