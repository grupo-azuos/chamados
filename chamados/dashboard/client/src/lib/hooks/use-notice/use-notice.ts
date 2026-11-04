import { toast } from 'svelte-sonner';

/**
 * O AVISO DE RODAPÉ — "Chamado aberto.", "Manutenção registrada.". Quem desenha é o
 * `AzuosToaster`, montado uma vez na casca; aqui só se pede o aviso.
 *
 * O tempo é o MESMO para todos (5 s, no `AzuosToaster`), e por isso não é parâmetro: quem avisa
 * diz só o quê e se é falha. A falha (`danger`) sai em vermelho e é anunciada na hora pelo leitor
 * de tela, porque a pessoa precisa saber que algo não foi feito.
 */
export type NoticeTone = 'neutral' | 'danger';

export type NoticeModel = {
  show: (message: string, tone?: NoticeTone) => void;
  dismiss: () => void;
};

export function useNotice(): NoticeModel {
  return {
    show: (message, tone = 'neutral') => {
      if (tone === 'danger') {
        toast.error(message);
        return;
      }
      toast(message);
    },
    dismiss: () => {
      toast.dismiss();
    },
  };
}
