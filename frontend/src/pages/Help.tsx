import { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Target,
  Repeat,
  BarChart3,
  FileUp,
  Shield,
  Tags,
} from 'lucide-react';

interface HelpSection {
  icon: typeof LayoutDashboard;
  title: string;
  color: string;
  items: { question: string; answer: string }[];
}

const SECTIONS: HelpSection[] = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    color: '#2563eb',
    items: [
      {
        question: 'O que é o Saldo Disponível?',
        answer:
          'É a soma do saldo atual de todas as suas contas cadastradas (Carteira, Conta Corrente, etc). Clique no ícone de olho para esconder o valor, útil quando estiver em um local público.',
      },
      {
        question: 'O que significa "Saldo Previsto"?',
        answer:
          'É uma projeção: seu saldo atual, somado com o que você ainda vai receber, menos o que ainda vai pagar. Ajuda a ver como ficarão suas finanças depois que as contas pendentes forem resolvidas.',
      },
      {
        question: 'Por que aparece um aviso amarelo às vezes?',
        answer:
          'O aviso "Vencendo nos próximos 7 dias" mostra lançamentos pendentes com vencimento próximo, para você não esquecer de pagar ou cobrar.',
      },
    ],
  },
  {
    icon: ArrowLeftRight,
    title: 'Lançamentos',
    color: '#0ea5a3',
    items: [
      {
        question: 'Qual a diferença entre Receita e Despesa?',
        answer:
          'Receita é dinheiro entrando (salário, venda, recebimento). Despesa é dinheiro saindo (conta, compra, pagamento). Escolha o tipo certo ao criar o lançamento — isso afeta como ele soma no saldo.',
      },
      {
        question: 'Como funciona o parcelamento?',
        answer:
          'Ao criar um lançamento, defina o número de parcelas. O sistema cria automaticamente um lançamento por mês, cada um com seu próprio vencimento, e mostra "(1/3)", "(2/3)" etc na descrição.',
      },
      {
        question: 'O que significa cada status?',
        answer:
          'Pendente: ainda não foi pago/recebido, não afeta o saldo. Pago/Recebido: já aconteceu de verdade, atualiza o saldo da conta. Cancelado: não vai acontecer, fica registrado mas ignorado nos cálculos.',
      },
      {
        question: 'Como edito ou excluo um lançamento?',
        answer: 'Clique em qualquer linha da lista para abrir as opções de edição e exclusão.',
      },
    ],
  },
  {
    icon: Wallet,
    title: 'Contas',
    color: '#2563eb',
    items: [
      {
        question: 'O que cadastrar como "Conta"?',
        answer:
          'Qualquer lugar onde seu dinheiro fica guardado: conta corrente do banco, carteira física, dinheiro em espécie, poupança, ou até investimentos. Cada lançamento fica vinculado a uma conta.',
      },
      {
        question: 'O saldo pode ficar negativo?',
        answer:
          'Sim — isso normalmente indica que você registrou mais despesas pagas do que o saldo inicial cobria. Vale revisar se os valores estão corretos.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Cartões de Crédito',
    color: '#7c3aed',
    items: [
      {
        question: 'Como funciona o dia de fechamento e vencimento?',
        answer:
          'O dia de fechamento é quando a fatura "para de aceitar" novas compras naquele ciclo. Compras feitas depois do fechamento entram na fatura do mês seguinte. O vencimento é o prazo final para pagar.',
      },
      {
        question: 'Como pago uma fatura?',
        answer:
          'Abra o cartão, clique na fatura desejada, e use o botão "Pagar fatura com...", escolhendo de qual conta o dinheiro vai sair. Isso gera automaticamente uma despesa e debita o saldo da conta escolhida.',
      },
    ],
  },
  {
    icon: Target,
    title: 'Metas',
    color: '#0ea5a3',
    items: [
      {
        question: 'Como registro um aporte em uma meta?',
        answer:
          'Clique em "Registrar aporte" na meta desejada. Você pode opcionalmente escolher uma conta — se escolher, o valor sai do saldo dessa conta e entra no progresso da meta (dinheiro guardado de verdade).',
      },
      {
        question: 'O que significa "Precisa de RX/mês"?',
        answer:
          'É o cálculo automático de quanto você precisa guardar por mês para bater o prazo definido na meta, considerando quanto já falta e quantos meses restam.',
      },
    ],
  },
  {
    icon: Repeat,
    title: 'Automações',
    color: '#2563eb',
    items: [
      {
        question: 'Para que servem as automações?',
        answer:
          'Para lançamentos que se repetem todo mês (aluguel, internet, salário). Você cadastra uma vez, e o sistema cria o lançamento automaticamente no dia escolhido, todo mês, sem precisar digitar de novo.',
      },
      {
        question: 'Como pauso uma automação sem excluir?',
        answer: 'Clique no botão de status ("Ativa"/"Pausada") na lista para ligar ou desligar.',
      },
    ],
  },
  {
    icon: BarChart3,
    title: 'Relatórios',
    color: '#0ea5a3',
    items: [
      {
        question: 'O que mostra o gráfico comparativo?',
        answer:
          'Receitas e despesas dos últimos 6 meses, lado a lado, para você visualizar tendências (se está gastando mais, ganhando mais, etc).',
      },
      {
        question: 'Como vejo um mês específico?',
        answer:
          'Use os botões "Anterior" e "Próximo" para navegar entre os meses e ver o detalhamento completo daquele período.',
      },
    ],
  },
  {
    icon: FileUp,
    title: 'Importar/Exportar',
    color: '#7c3aed',
    items: [
      {
        question: 'Quais formatos posso importar?',
        answer:
          'CSV, Excel (.xlsx) e OFX (extrato bancário). O sistema detecta o formato automaticamente pelo conteúdo do arquivo, não pela extensão do nome.',
      },
      {
        question: 'A importação salva direto?',
        answer:
          'Não — primeiro você vê uma pré-visualização de tudo que será importado. Nada é gravado até você escolher a conta e clicar em "Confirmar importação".',
      },
    ],
  },
  {
    icon: Shield,
    title: 'Segurança',
    color: '#2563eb',
    items: [
      {
        question: 'Para que serve o 2FA?',
        answer:
          'Autenticação de dois fatores: além da senha, você precisa digitar um código gerado por um app autenticador (Google Authenticator, Authy) para entrar. Adiciona uma camada extra de proteção.',
      },
      {
        question: 'O que é o backup completo?',
        answer:
          'Um arquivo com todos os seus dados (contas, categorias, lançamentos, cartões, metas, automações) em formato JSON, para guardar como cópia de segurança fora do sistema.',
      },
    ],
  },
  {
    icon: Tags,
    title: 'Categorias',
    color: '#0ea5a3',
    items: [
      {
        question: 'Categorias de receita e despesa são diferentes?',
        answer:
          'Sim, cada categoria pertence a um tipo (Receita ou Despesa) e só aparece como opção quando você está criando um lançamento daquele mesmo tipo.',
      },
    ],
  },
];

export default function Help() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
          <HelpCircle size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Central de Ajuda</h1>
          <p className="text-sm text-slate-500">Como usar cada parte do Fingest</p>
        </div>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="card">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: section.color }}
                >
                  <Icon size={16} />
                </span>
                <h2 className="font-semibold">{section.title}</h2>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {section.items.map((item, i) => {
                  const key = `${section.title}-${i}`;
                  const open = openKey === key;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setOpenKey(open ? null : key)}
                        className="w-full flex items-center justify-between gap-3 py-3 text-left text-sm font-medium"
                      >
                        {item.question}
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {open && (
                        <p className="text-sm text-slate-500 pb-3 pr-6">{item.answer}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
