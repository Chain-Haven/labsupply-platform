-- Storage bucket for Certificate of Analysis PDFs attached to lots
INSERT INTO storage.buckets (id, name, public)
VALUES ('lot-coas', 'lot-coas', false)
ON CONFLICT (id) DO NOTHING;
