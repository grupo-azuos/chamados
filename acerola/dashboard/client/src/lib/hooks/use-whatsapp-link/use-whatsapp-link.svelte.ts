import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { formatLinkedPhone } from '@template/shared/domain/whatsapp-phone.util';
import { type WhatsappConnection } from '@template/shared/schemas/whatsapp-connection.schema';
import QRCode from 'qrcode';
import { onDestroy } from 'svelte';
import { writable } from 'svelte/store';

import { readError } from '$lib/api/http-client';
import { whatsappIntegrationApi } from '$lib/api/whatsapp-integration.api';
import { mirrorStore } from '$lib/hooks/use-mirror-store/use-mirror-store.svelte';

/** Em que passo o diálogo de vínculo está. */
export type WhatsappLinkStep = 'closed' | 'risks' | 'qr';

/* O tempo que o botão de confirmar fica travado: é o tempo de LER os riscos, e não de clicar
   por reflexo num diálogo que parece com todos os outros. */
export const RISK_READING_SECONDS = 10;

/* Com o QR code na tela a situação é consultada de perto: o código troca a cada poucos
   segundos, e a leitura pelo celular tem que fechar o diálogo logo. Fora disso, de longe. */
const PAIRING_POLL_MS = 2000;
const IDLE_POLL_MS = 60_000;
const QR_IMAGE_SIZE = 280;

/**
 * O vínculo de WhatsApp de quem está logado: situação, o diálogo em dois passos (riscos, depois
 * QR code) e desvincular.
 */
export function useWhatsappLinkModel(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['whatsapp-connection', userId];

  let step = $state<WhatsappLinkStep>('closed');
  let secondsLeft = $state(0);
  let isUnlinkOpen = $state(false);
  let qrImage = $state<string | null>(null);
  let countdown: ReturnType<typeof setInterval> | undefined;

  const query = mirrorStore(
    createQuery(
      writable({
        queryKey,
        queryFn: whatsappIntegrationApi.status,
        staleTime: 0,
        retry: false,
        refetchInterval: IDLE_POLL_MS,
      }),
    ),
  );

  const linkMutation = mirrorStore(
    createMutation({
      mutationFn: whatsappIntegrationApi.link,
      onSuccess: (connection: WhatsappConnection) => {
        queryClient.setQueryData(queryKey, connection);
        step = 'qr';
      },
    }),
  );
  const unlinkMutation = mirrorStore(
    createMutation({
      mutationFn: whatsappIntegrationApi.unlink,
      onSuccess: async () => {
        isUnlinkOpen = false;
        await queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  function stopCountdown(): void {
    clearInterval(countdown);
    countdown = undefined;
  }

  function startCountdown(): void {
    stopCountdown();
    secondsLeft = RISK_READING_SECONDS;
    countdown = setInterval(() => {
      secondsLeft = Math.max(0, secondsLeft - 1);
      if (secondsLeft === 0) stopCountdown();
    }, 1000);
  }

  function close(): void {
    stopCountdown();
    step = 'closed';
    linkMutation.current.reset();
  }

  onDestroy(stopCountdown);

  /* A consulta acelera só enquanto o QR code está na tela. É um relógio próprio, e não a opção
     de intervalo da consulta: trocar aquela opção depois de criada a consulta não tinha efeito,
     e o QR code nunca chegava. */
  $effect(() => {
    if (step !== 'qr') return;

    const poll = setInterval(() => void query.current.refetch(), PAIRING_POLL_MS);

    return () => clearInterval(poll);
  });

  /* O conteúdo do QR code vira imagem aqui: o componente só desenha o que recebe. */
  $effect(() => {
    const qr = query.current.data?.qr ?? null;
    if (!qr) {
      qrImage = null;

      return;
    }

    void QRCode.toDataURL(qr, { margin: 1, width: QR_IMAGE_SIZE }).then(
      (image) => (qrImage = image),
    );
  });

  /* O celular leu o código: o vínculo fechou, e o diálogo fecha sozinho. */
  $effect(() => {
    if (step === 'qr' && query.current.data?.state === 'connected') close();
  });

  return {
    get data() {
      const connection = query.current.data;

      return {
        phone: formatLinkedPhone(connection?.phone),
        qrImage,
        sentToday: connection?.sentToday ?? 0,
        dailyLimit: connection?.dailyLimit ?? 0,
      };
    },
    get state() {
      const connection = query.current.data;

      return {
        isLoading: query.current.isPending,
        canLink: Boolean(connection?.canLink),
        isConfigured: Boolean(connection?.isConfigured),
        linkState: connection?.state ?? 'disconnected',
        step,
        secondsLeft,
        isLinking: linkMutation.current.isPending,
        linkError: readError(linkMutation.current.error),
        isUnlinkOpen,
        isUnlinking: unlinkMutation.current.isPending,
        unlinkError: readError(unlinkMutation.current.error),
        error: readError(query.current.error),
      };
    },
    actions: {
      /** Abre o diálogo pelos riscos — sempre, mesmo retomando um vínculo começado. */
      onOpen: () => {
        step = 'risks';
        startCountdown();
      },
      onConfirmRisks: () => {
        if (secondsLeft > 0 || linkMutation.current.isPending) return;

        linkMutation.current.mutate();
      },
      onClose: close,
      onAskUnlink: () => {
        unlinkMutation.current.reset();
        isUnlinkOpen = true;
      },
      onConfirmUnlink: () => {
        if (!unlinkMutation.current.isPending) unlinkMutation.current.mutate();
      },
      onCancelUnlink: () => (isUnlinkOpen = false),
    },
  };
}
