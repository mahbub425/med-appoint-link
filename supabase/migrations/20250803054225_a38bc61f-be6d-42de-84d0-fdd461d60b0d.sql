-- Disable email confirmation by updating auth configuration
-- This allows users to sign up without email verification

-- Insert or update auth configuration to disable email confirmation
INSERT INTO auth.config (parameter, value) 
VALUES ('MAILER_AUTOCONFIRM', 'true')
ON CONFLICT (parameter) DO UPDATE SET value = 'true';

-- Also set DISABLE_SIGNUP to false to ensure signup works
INSERT INTO auth.config (parameter, value) 
VALUES ('DISABLE_SIGNUP', 'false')
ON CONFLICT (parameter) DO UPDATE SET value = 'false';