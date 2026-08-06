import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES: { name: string; type: TransactionType; color: string; icon: string }[] = [
  { name: 'Moradia', type: 'DESPESA', color: '#F59E0B', icon: 'home' },
  { name: 'Alimentação', type: 'DESPESA', color: '#EF4444', icon: 'utensils' },
  { name: 'Transporte', type: 'DESPESA', color: '#3B82F6', icon: 'car' },
  { name: 'Educação', type: 'DESPESA', color: '#8B5CF6', icon: 'book' },
  { name: 'Saúde', type: 'DESPESA', color: '#10B981', icon: 'heart' },
  { name: 'Lazer', type: 'DESPESA', color: '#EC4899', icon: 'smile' },
  { name: 'Compras', type: 'DESPESA', color: '#F97316', icon: 'shopping-bag' },
  { name: 'Internet', type: 'DESPESA', color: '#06B6D4', icon: 'wifi' },
  { name: 'Telefone', type: 'DESPESA', color: '#0EA5E9', icon: 'phone' },
  { name: 'Energia', type: 'DESPESA', color: '#FACC15', icon: 'zap' },
  { name: 'Água', type: 'DESPESA', color: '#38BDF8', icon: 'droplet' },
  { name: 'Impostos', type: 'DESPESA', color: '#64748B', icon: 'file-text' },
  { name: 'Outros', type: 'DESPESA', color: '#94A3B8', icon: 'more-horizontal' },
  { name: 'Salário', type: 'RECEITA', color: '#22C55E', icon: 'briefcase' },
  { name: 'Freelancer', type: 'RECEITA', color: '#14B8A6', icon: 'code' },
  { name: 'Dividendos', type: 'RECEITA', color: '#A855F7', icon: 'trending-up' },
  { name: 'Investimentos', type: 'RECEITA', color: '#6366F1', icon: 'bar-chart-2' },
  { name: 'Outros', type: 'RECEITA', color: '#94A3B8', icon: 'more-horizontal' },
];

async function main() {
  const email = 'admin@fingest.local';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Usuário demo já existe, pulando seed.');
    return;
  }

  const argon2 = await import('argon2');
  const passwordHash = await argon2.hash('MudarSenha123!');

  const user = await prisma.user.create({
    data: {
      name: 'Usuário',
      email,
      passwordHash,
      accounts: {
        create: [
          { name: 'Carteira', type: 'DINHEIRO', initialBalance: 0, currentBalance: 0 },
          { name: 'Conta Corrente', type: 'CORRENTE', initialBalance: 0, currentBalance: 0 },
        ],
      },
    },
  });

  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
  });

  console.log(`Usuário demo criado: ${email} / senha: MudarSenha123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
