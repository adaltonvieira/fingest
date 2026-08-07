export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(value: string | Date): string {
  // Datas de lançamentos representam um "dia de calendário", não um instante exato.
  // Usamos os componentes UTC para evitar que o fuso horário local desloque o dia exibido
  // (ex: meia-noite UTC vira 21h do dia anterior em horários UTC-3, como no Brasil).
  const date = new Date(value);
  const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Intl.DateTimeFormat('pt-BR').format(utcDate);
}
