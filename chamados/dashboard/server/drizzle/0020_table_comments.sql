-- A DESCRIÇÃO DO SCHEMA E DE CADA TABELA — o que aparece ao lado do nome no DBeaver.
-- Escrita à mão (`generate --custom`): o `drizzle-kit` não gera COMMENT. Não muda dado nenhum.
COMMENT ON SCHEMA "chamados" IS 'Central de Chamados do Grupo Azuos: chamados, inventário de TI, manutenção, sistemas e o bot de WhatsApp.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."tickets" IS 'Chamados de suporte dos três módulos. Nada se apaga: o que sai da fila sai pelo status.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_histories" IS 'Linha do tempo de cada chamado: quem, quando, o quê. Um gatilho recusa edição e exclusão.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_attachments" IS 'Arquivos de cada chamado (PDF, imagem, vídeo), com o arquivo no Storage.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_areas" IS 'Áreas participantes de um chamado, além da área em que ele nasceu.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_watchers" IS 'Pessoas vinculadas a um chamado além de quem abriu: veem, respondem e reabrem.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_relations" IS 'Chamados ligados entre si: duplicados, desdobramentos e o mesmo incidente.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_computers" IS 'Máquinas de cada chamado; um atendimento pode passar por várias.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_stock_items" IS 'Itens de estoque reservados ou baixados por um chamado, da TI ou da Manutenção.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_problem_types" IS 'Tipos de problema cadastrados na hora, além da lista fixa. O nome não se edita.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."ticket_service_orders" IS 'Ordens de serviço emitidas, uma por documento. Guarda a impressão digital do PDF, não o arquivo.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."computers" IS 'Computadores da empresa. O cadastro nasce no sistema e gera o token do agente.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."computer_samples" IS 'Série de uso de cada máquina (CPU, memória, disco, rede) para o gráfico das últimas horas.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."computer_alerts" IS 'Períodos em que uma máquina passou do limite, por quanto tempo e o provável causador.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."computer_transfers" IS 'Cada mudança de departamento de uma máquina: de onde, para onde, quem e quando.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."maintenances" IS 'Histórico de manutenção: o que já foi feito em cada equipamento.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."maintenance_schedules" IS 'Manutenção agendada, uma por máquina. A linha some quando é cumprida ou cancelada.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."maintenance_quotes" IS 'Orçamentos da Manutenção com empresas de fora, com o documento e a decisão. Valor em centavos.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."parts" IS 'Peças de reposição da TI. O saldo é escrito só pelo sistema, junto da movimentação.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."part_movements" IS 'Extrato das peças da TI: cada entrada e saída, com o saldo depois dela.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."inventory_items" IS 'Inventário da Manutenção: mobiliário, mercadinho, limpeza e eletrodoméstico, com o saldo.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."inventory_movements" IS 'Extrato do depósito da Manutenção: entradas, saídas e descartes. Linha não se corrige.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."inventory_item_events" IS 'Ocorrências de cada produto do inventário: defeito, troca, manutenção e observação.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."network_events" IS 'Quedas, lentidão e trocas de link avisadas pelo UniFi, com o corpo do aviso inteiro.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."software_projects" IS 'Sistemas e projetos de software da equipe, com o repositório do GitHub.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."software_schedule_events" IS 'Eventos da Agenda do módulo Sistema.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."software_timeline_events" IS 'Linha do tempo dos sistemas: PRs, issues, merges, releases e deploys do GitHub.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."github_connections" IS 'Conta do GitHub que cada pessoa conectou ao sistema.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."github_oauth_states" IS 'Estados temporários do login com o GitHub, para conferir a volta da autorização.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."history" IS 'Histórico do sistema: tudo que mudou dado, por quem, quando e de onde. Escrito sozinho, só cresce.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."internal_roles" IS 'Quem tem acesso a qual módulo (Infraestrutura, Sistema, Manutenção). O nível vem do admin-console.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."super_admins" IS 'Super-admins: veem tudo e liberam módulos. Só nascem pelo comando superadmin:promote.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."whatsapp_connections" IS 'Número de WhatsApp que cada pessoa vinculou. As chaves da conexão ficam no bot, não aqui.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."whatsapp_templates" IS 'Textos do bot que o super-admin editou. Sem linha, vale o texto original do código.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."whatsapp_messages" IS 'Mensagens que o bot mandou: limite diário, rastro e fila de saída. O texto some depois de enviado.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."whatsapp_conversations" IS 'Conversas do bot no meio do caminho (como o /acesso). Vencem sozinhas em expires_at.';--> statement-breakpoint
COMMENT ON TABLE "chamados"."whatsapp_inbound_messages" IS 'Caixa de entrada do bot: o identificador de cada mensagem recebida, para não ler a mesma duas vezes.';--> statement-breakpoint
DO $$
BEGIN
  IF to_regnamespace('drizzle') IS NOT NULL THEN
    COMMENT ON SCHEMA "drizzle" IS 'Controle das migrations: quais arquivos de drizzle/ já rodaram neste banco. Não se edita à mão.';
  END IF;
  IF to_regclass('drizzle.__chamados_migrations') IS NOT NULL THEN
    COMMENT ON TABLE "drizzle"."__chamados_migrations" IS 'Uma linha por migration já aplicada.';
  END IF;
END $$;
