-- Add new columns for route metrics
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS completion_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS efficiency DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS special_houses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS houses_per_hour DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;

-- Add comment to explain the metrics
COMMENT ON COLUMN routes.completion_rate IS 'Percentage of houses completed on the route';
COMMENT ON COLUMN routes.efficiency IS 'Overall route efficiency (60% completion, 40% speed)';
COMMENT ON COLUMN routes.special_houses IS 'Count of houses with special notes or status';
COMMENT ON COLUMN routes.houses_per_hour IS 'Average number of houses serviced per hour';
COMMENT ON COLUMN routes.start_time IS 'When the route was started';
COMMENT ON COLUMN routes.end_time IS 'When the route was completed'; 