-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "CardState" AS ENUM ('NEW', 'LEARNING', 'REVIEW', 'RELEARNING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('PICK_TRANSLATION', 'PICK_WORD', 'FLIP_CARD', 'LISTEN_AND_TYPE', 'TYPE_WORD', 'FILL_GAP', 'WRITE_SENTENCE');

-- CreateEnum
CREATE TYPE "AiRequestKind" AS ENUM ('LOOKUP', 'EXAMPLES', 'SENTENCE_CHECK');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "native_language" TEXT NOT NULL DEFAULT 'uk',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bratislava',
    "daily_new_limit" INTEGER NOT NULL DEFAULT 10,
    "max_reviews_per_day" INTEGER NOT NULL DEFAULT 200,
    "autoplay_audio" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_limits" (
    "role" "Role" NOT NULL,
    "lookups_per_day" INTEGER,
    "sentence_checks_per_day" INTEGER,
    "max_new_cards_per_day" INTEGER,

    CONSTRAINT "role_limits_pkey" PRIMARY KEY ("role")
);

-- CreateTable
CREATE TABLE "words" (
    "id" UUID NOT NULL,
    "lemma" TEXT NOT NULL,
    "forms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_language" TEXT NOT NULL,
    "part_of_speech" TEXT NOT NULL,
    "ipa" TEXT,
    "cefr" TEXT,
    "data" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "word_id" UUID NOT NULL,
    "meaning_index" INTEGER NOT NULL,
    "custom_translation" TEXT,
    "note" TEXT,
    "context_sentence" TEXT,
    "state" "CardState" NOT NULL DEFAULT 'NEW',
    "state_before_suspend" "CardState",
    "step_index" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_logs" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reviewed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" "Rating" NOT NULL,
    "exercise_type" "ExerciseType" NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "state_before" "CardState" NOT NULL,
    "interval_before" DOUBLE PRECISION NOT NULL,
    "interval_after" DOUBLE PRECISION NOT NULL,
    "ease_after" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "AiRequestKind" NOT NULL,
    "word" TEXT NOT NULL,
    "cache_hit" BOOLEAN NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "words_forms_idx" ON "words" USING GIN ("forms");

-- CreateIndex
CREATE UNIQUE INDEX "words_lemma_target_language_key" ON "words"("lemma", "target_language");

-- CreateIndex
CREATE UNIQUE INDEX "decks_user_id_name_key" ON "decks"("user_id", "name");

-- CreateIndex
CREATE INDEX "cards_user_id_state_due_at_idx" ON "cards"("user_id", "state", "due_at");

-- CreateIndex
CREATE INDEX "cards_deck_id_idx" ON "cards"("deck_id");

-- CreateIndex
CREATE UNIQUE INDEX "cards_user_id_word_id_meaning_index_key" ON "cards"("user_id", "word_id", "meaning_index");

-- CreateIndex
CREATE INDEX "review_logs_user_id_reviewed_at_idx" ON "review_logs"("user_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "review_logs_card_id_idx" ON "review_logs"("card_id");

-- CreateIndex
CREATE INDEX "ai_requests_user_id_kind_created_at_idx" ON "ai_requests"("user_id", "kind", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_word_id_fkey" FOREIGN KEY ("word_id") REFERENCES "words"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
