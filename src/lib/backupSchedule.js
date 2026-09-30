import {
  AUTO_BACKUP_DAYS,
  AUTO_BACKUP_HOUR,
  AUTO_BACKUP_TIME_ZONE,
  AUTO_BACKUP_WINDOW_MINUTES,
} from "../config/security";

function pad(valor) {
  return String(valor).padStart(2, "0");
}

export function obterPartesFusoHorario(
  data = new Date(),
  fusoHorario = AUTO_BACKUP_TIME_ZONE,
) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(data);

  return Object.fromEntries(
    partes
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, Number(parte.value)]),
  );
}

export function montarChaveCiclo(partes) {
  return `${partes.year}-${pad(partes.month)}-${pad(partes.day)}-${pad(
    AUTO_BACKUP_HOUR,
  )}00-${AUTO_BACKUP_TIME_ZONE}`;
}

export function montarChaveMes(partes) {
  return `${partes.year}-${pad(partes.month)}`;
}

// Retorna o ciclo de backup vigente, ou null quando estamos fora da janela
// agendada (dias 1 e 15, das 03:00 as 04:00 no fuso de Sao Paulo).
export function obterCicloBackupAutomatico(agora = new Date()) {
  const partes = obterPartesFusoHorario(agora);
  const minutosDesdeHoraAgendada =
    (partes.hour - AUTO_BACKUP_HOUR) * 60 + partes.minute;
  const dentroDaJanela =
    AUTO_BACKUP_DAYS.includes(partes.day) &&
    minutosDesdeHoraAgendada >= 0 &&
    minutosDesdeHoraAgendada < AUTO_BACKUP_WINDOW_MINUTES;

  if (!dentroDaJanela) return null;

  const agendadoEm = agora.getTime() - (partes.minute * 60 + partes.second) * 1000;

  return {
    cycleKey: montarChaveCiclo(partes),
    dayKey: `${partes.year}-${pad(partes.month)}-${pad(partes.day)}`,
    monthKey: montarChaveMes(partes),
    scheduledAt: agendadoEm,
    scheduledLabel: `${pad(partes.day)}/${pad(partes.month)}/${partes.year} ${pad(
      AUTO_BACKUP_HOUR,
    )}:00`,
    timeZone: AUTO_BACKUP_TIME_ZONE,
  };
}

export function proximoBackupAgendado(agora = new Date()) {
  const partes = obterPartesFusoHorario(agora);
  const diasOrdenados = [...AUTO_BACKUP_DAYS].sort((a, b) => a - b);
  const proximoDia = diasOrdenados.find(
    (dia) => dia > partes.day || (dia === partes.day && partes.hour < AUTO_BACKUP_HOUR),
  );

  if (proximoDia) {
    return `${pad(proximoDia)}/${pad(partes.month)}/${partes.year} as ${pad(
      AUTO_BACKUP_HOUR,
    )}:00`;
  }

  const mesSeguinte = partes.month === 12 ? 1 : partes.month + 1;
  const anoSeguinte = partes.month === 12 ? partes.year + 1 : partes.year;

  return `${pad(diasOrdenados[0])}/${pad(mesSeguinte)}/${anoSeguinte} as ${pad(
    AUTO_BACKUP_HOUR,
  )}:00`;
}
