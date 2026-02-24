ALTER TABLE `users` ADD `role` text;
UPDATE `users`
SET `role` = CASE lower(trim(`type`))
  WHEN 'admin' THEN 'admin'
  WHEN 'candidate' THEN 'candidate'
  WHEN 'user' THEN 'candidate'
  WHEN 'employer' THEN 'employer'
  WHEN 'company' THEN 'employer'
  ELSE NULL
END
WHERE `role` IS NULL;
