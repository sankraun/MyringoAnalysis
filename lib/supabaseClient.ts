import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vdhbvnruhwctssqaqtot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkaGJ2bnJ1aHdjdHNzcWFxdG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMjM0NDAsImV4cCI6MjA4MDU5OTQ0MH0.IQ5e9yJ0YNzJmwrJUySrclEM2h9BejYCCb78HP50BOc';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * DATABASE SETUP
 * 
 * Please run the contents of the `schema.sql` file in your Supabase SQL Editor.
 * This will create the 'patients' table, enable Row Level Security policies,
 * and configure the necessary Storage buckets ('audiograms', 'edited_images').
 */
