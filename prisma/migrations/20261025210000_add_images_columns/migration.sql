-- AlterTable
ALTER TABLE `questions` ADD COLUMN IF NOT EXISTS `images` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `question_options` ADD COLUMN IF NOT EXISTS `image_url` LONGTEXT NULL,
    MODIFY COLUMN `text` TEXT NULL;
