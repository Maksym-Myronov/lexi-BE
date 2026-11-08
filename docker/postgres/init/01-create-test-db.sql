-- Runs once when the volume is empty. lexi_dev is created by POSTGRES_DB;
-- this adds a separate database for automated tests.
CREATE DATABASE lexi_test OWNER lexi;
