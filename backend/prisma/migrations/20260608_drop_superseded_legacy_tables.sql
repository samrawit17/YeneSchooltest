-- Drop empty tables that were superseded by the active data model:
-- ChatRoom/ChatParticipant/ChatMessage -> Conversation/ConversationParticipant/Message/MessageRead
-- Timetable -> TimetableSlot
-- ExamSeating -> ExamSeatingPlan/ExamSectionAssignment/ExamSectionStudent
DO $$
DECLARE
  legacy_table text;
  row_count bigint;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY[
    'ChatMessage',
    'ChatParticipant',
    'ChatRoom',
    'Timetable',
    'ExamSeating'
  ]
  LOOP
    IF to_regclass(format('public.%I', legacy_table)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %I', legacy_table) INTO row_count;

      IF row_count > 0 THEN
        RAISE EXCEPTION
          'Refusing to drop legacy table %. It still contains % row(s). Migrate or archive those rows first.',
          legacy_table,
          row_count;
      END IF;

      EXECUTE format('DROP TABLE %I', legacy_table);
    END IF;
  END LOOP;
END $$;
