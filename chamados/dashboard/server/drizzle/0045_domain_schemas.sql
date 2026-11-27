-- UM SCHEMA POR ASSUNTO, como no shared-api, no admin-console e no paralegal. As tabelas do
-- Chamados moravam todas em `chamados`; agora quem abre o banco acha a tabela pela tela que a usa. O
-- mapa está em `src/lib/db/schema/schemas.schema.ts`.
--
-- Escrita à mão (`drizzle-kit generate --custom`): o gerador perguntaria, tabela por tabela, se
-- ela foi criada ou movida, e só "movida" preserva os dados. `ALTER ... SET SCHEMA` leva junto
-- linhas, índices, constraints, sequências e gatilhos — nenhum dado é copiado.
--
-- Cada passo confere antes de agir: a migration roda num banco novo (as anteriores acabaram de
-- criar tudo em `chamados`) ou num banco que já está em produção.

CREATE SCHEMA IF NOT EXISTS "tickets";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "inventory";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "maintenance";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "software";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "tasks";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "messaging";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "access";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "audit";--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "dashboard";--> statement-breakpoint
COMMENT ON SCHEMA "tickets" IS 'Chamados: abertura, áreas, tipos de problema, anexos, computadores e itens ligados, vínculos, ordens de serviço, quem acompanha e o histórico de cada chamado.';--> statement-breakpoint
COMMENT ON SCHEMA "inventory" IS 'Parque de TI e estoque: computadores, amostras, alertas, transferências, responsáveis, rede, itens de estoque, peças e movimentações.';--> statement-breakpoint
COMMENT ON SCHEMA "maintenance" IS 'Manutenções dos computadores: as feitas, os orçamentos e a agenda preventiva.';--> statement-breakpoint
COMMENT ON SCHEMA "software" IS 'Projetos de software, a ligação com o GitHub (conexões, branches, commits, tags, webhooks), a agenda e a linha do tempo.';--> statement-breakpoint
COMMENT ON SCHEMA "tasks" IS 'Tarefas da equipe de TI: as tarefas, as situações, as etapas, as pessoas e os vínculos.';--> statement-breakpoint
COMMENT ON SCHEMA "messaging" IS 'WhatsApp: conexões, modelos, conversas, mensagens recebidas e enviadas.';--> statement-breakpoint
COMMENT ON SCHEMA "access" IS 'Quem administra o sistema além do Admin Console: superadministradores e papéis internos.';--> statement-breakpoint
COMMENT ON SCHEMA "audit" IS 'Histórico do que se fez no Chamados.';--> statement-breakpoint
COMMENT ON SCHEMA "dashboard" IS 'Dashboards montados e os filtros salvos deles.';--> statement-breakpoint

-- O schema novo recebe as mesmas permissões que o `chamados` dava. Em Prod e Homo a API entra com
-- um usuário que não é o do migrador: sem `USAGE` no schema novo, toda consulta dela voltaria
-- "permission denied". As permissões das TABELAS vão junto com elas no `SET SCHEMA`; as do schema
-- e as padrão (de tabela que ainda vai nascer) não, e são copiadas aqui.
DO $$
DECLARE
  target text;
  granted record;
BEGIN
  FOREACH target IN ARRAY ARRAY['tickets', 'inventory', 'maintenance', 'software', 'tasks', 'messaging', 'access', 'audit', 'dashboard'] LOOP
    FOR granted IN
      SELECT acl.grantee, acl.privilege_type
        FROM pg_namespace n, aclexplode(n.nspacl) acl
       WHERE n.nspname = 'chamados' AND acl.grantee <> n.nspowner
    LOOP
      EXECUTE format(
        'GRANT %s ON SCHEMA %I TO %s',
        granted.privilege_type,
        target,
        CASE WHEN granted.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(granted.grantee)) END
      );
    END LOOP;

    -- Só dá para mexer nas permissões padrão de um papel do qual o migrador faz parte.
    FOR granted IN
      SELECT d.defaclrole, d.defaclobjtype, acl.grantee, acl.privilege_type
        FROM pg_default_acl d
        JOIN pg_namespace n ON n.oid = d.defaclnamespace
       CROSS JOIN aclexplode(d.defaclacl) acl
       WHERE n.nspname = 'chamados'
         AND d.defaclobjtype IN ('r', 'S', 'f', 'T')
         AND pg_has_role(current_user, d.defaclrole, 'MEMBER')
    LOOP
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT %s ON %s TO %s',
        pg_get_userbyid(granted.defaclrole),
        target,
        granted.privilege_type,
        CASE granted.defaclobjtype
          WHEN 'r' THEN 'TABLES'
          WHEN 'S' THEN 'SEQUENCES'
          WHEN 'f' THEN 'FUNCTIONS'
          ELSE 'TYPES'
        END,
        CASE WHEN granted.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(granted.grantee)) END
      );
    END LOOP;
  END LOOP;
END $$;--> statement-breakpoint

-- Tipos, tabelas e funções de gatilho. O gatilho aponta para a função pelo identificador
-- interno: os dois continuam ligados depois da troca de schema.
DO $$
DECLARE
  moved record;
BEGIN
  FOR moved IN
    SELECT * FROM (VALUES
      ('tickets', 'tickets'),
      ('ticket_areas', 'tickets'),
      ('ticket_attachments', 'tickets'),
      ('ticket_computers', 'tickets'),
      ('ticket_histories', 'tickets'),
      ('ticket_problem_types', 'tickets'),
      ('ticket_relations', 'tickets'),
      ('ticket_service_orders', 'tickets'),
      ('ticket_stock_items', 'tickets'),
      ('ticket_watchers', 'tickets'),
      ('computers', 'inventory'),
      ('computer_alerts', 'inventory'),
      ('computer_responsible_history', 'inventory'),
      ('computer_samples', 'inventory'),
      ('computer_transfers', 'inventory'),
      ('network_events', 'inventory'),
      ('inventory_items', 'inventory'),
      ('inventory_item_events', 'inventory'),
      ('inventory_movements', 'inventory'),
      ('parts', 'inventory'),
      ('part_movements', 'inventory'),
      ('maintenances', 'maintenance'),
      ('maintenance_quotes', 'maintenance'),
      ('maintenance_schedules', 'maintenance'),
      ('software_projects', 'software'),
      ('software_branches', 'software'),
      ('software_commits', 'software'),
      ('software_tags', 'software'),
      ('software_schedule_events', 'software'),
      ('software_timeline_events', 'software'),
      ('github_connections', 'software'),
      ('github_oauth_states', 'software'),
      ('github_webhook_events', 'software'),
      ('tasks', 'tasks'),
      ('task_links', 'tasks'),
      ('task_people', 'tasks'),
      ('task_stages', 'tasks'),
      ('task_steps', 'tasks'),
      ('whatsapp_connections', 'messaging'),
      ('whatsapp_templates', 'messaging'),
      ('whatsapp_messages', 'messaging'),
      ('whatsapp_conversations', 'messaging'),
      ('whatsapp_inbound_messages', 'messaging'),
      ('super_admins', 'access'),
      ('internal_roles', 'access'),
      ('history', 'audit'),
      ('dashboard_boards', 'dashboard'),
      ('saved_filters', 'dashboard')
    ) AS t(name, target)
  LOOP
    -- Só tabela de verdade: numa segunda passada, o que está em `chamados` já é a view abaixo.
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'chamados' AND c.relname = moved.name AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I SET SCHEMA %I', 'chamados', moved.name, moved.target);
    END IF;
  END LOOP;

  FOR moved IN
    SELECT * FROM (VALUES
      ('refuse_ticket_record_change', 'tickets'),
      ('record_computer_responsible', 'inventory')
    ) AS t(name, target)
  LOOP
    IF to_regprocedure(format('%I.%I()', 'chamados', moved.name)) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %I.%I() SET SCHEMA %I', 'chamados', moved.name, moved.target);
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

-- VIEWS DE COMPATIBILIDADE, primeira das duas etapas.
--
-- O deploy migra o banco ANTES de trocar os containers: durante a troca, a versão anterior ainda
-- atende e procura `chamados.<tabela>`. Cada view é a tabela inteira (`SELECT *` de uma tabela só), e
-- o Postgres deixa ler e gravar por ela como na tabela — gatilhos e valores padrão continuam
-- valendo, porque quem grava é a tabela de baixo.
--
-- A segunda etapa é uma migration que derruba estas views, num deploy seguinte, quando nenhuma
-- réplica da versão anterior estiver mais no ar. Até lá, código novo NUNCA lê nem grava por elas.
DO $$
DECLARE
  moved record;
  granted record;
BEGIN
  FOR moved IN
    SELECT n.nspname AS target, c.relname AS name, c.oid AS table_oid, c.relowner
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname IN ('access', 'audit', 'dashboard', 'inventory', 'maintenance', 'messaging', 'software', 'tasks', 'tickets')
       AND c.relkind IN ('r', 'p')
       AND c.relname IN ('tickets', 'ticket_areas', 'ticket_attachments', 'ticket_computers', 'ticket_histories', 'ticket_problem_types', 'ticket_relations', 'ticket_service_orders', 'ticket_stock_items', 'ticket_watchers', 'computers', 'computer_alerts', 'computer_responsible_history', 'computer_samples', 'computer_transfers', 'network_events', 'inventory_items', 'inventory_item_events', 'inventory_movements', 'parts', 'part_movements', 'maintenances', 'maintenance_quotes', 'maintenance_schedules', 'software_projects', 'software_branches', 'software_commits', 'software_tags', 'software_schedule_events', 'software_timeline_events', 'github_connections', 'github_oauth_states', 'github_webhook_events', 'tasks', 'task_links', 'task_people', 'task_stages', 'task_steps', 'whatsapp_connections', 'whatsapp_templates', 'whatsapp_messages', 'whatsapp_conversations', 'whatsapp_inbound_messages', 'super_admins', 'internal_roles', 'history', 'dashboard_boards', 'saved_filters')
  LOOP
    IF to_regclass(format('%I.%I', 'chamados', moved.name)) IS NULL THEN
      EXECUTE format('CREATE VIEW %I.%I AS SELECT * FROM %I.%I', 'chamados', moved.name, moved.target, moved.name);

      -- Quem podia ler e gravar a tabela pode ler e gravar a view.
      FOR granted IN
        SELECT acl.grantee, acl.privilege_type
          FROM pg_class c, aclexplode(c.relacl) acl
         WHERE c.oid = moved.table_oid
           AND acl.grantee <> moved.relowner
           AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
      LOOP
        EXECUTE format(
          'GRANT %s ON %I.%I TO %s',
          granted.privilege_type,
          'chamados',
          moved.name,
          CASE WHEN granted.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(granted.grantee)) END
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint

-- O GATILHO DO RESPONSÁVEL escrevia em "chamados"."computer_responsible_history" pelo nome. Mudou
-- de schema junto com a tabela, mas o corpo dele ainda dizia o schema antigo — e a view de
-- compatibilidade some numa migration seguinte. Ele passa a escrever direto em `inventory`.
CREATE OR REPLACE FUNCTION "inventory"."record_computer_responsible"()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."responsible_id" IS NOT DISTINCT FROM OLD."responsible_id" THEN
    RETURN NEW;
  END IF;

  UPDATE "inventory"."computer_responsible_history"
     SET "ended_at" = now()
   WHERE "computer_id" = NEW."id" AND "ended_at" IS NULL;

  IF NEW."responsible_id" IS NOT NULL THEN
    INSERT INTO "inventory"."computer_responsible_history" ("computer_id", "responsible_id", "started_at")
    VALUES (NEW."id", NEW."responsible_id", now());
  END IF;

  RETURN NEW;
END;
$function$;
