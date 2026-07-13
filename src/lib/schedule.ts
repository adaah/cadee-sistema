import { liftN } from 'ramda';

export function getSpplitedCode(code: string): string[] {
  if (!code || typeof code !== 'string') return [];
  const match = code.toUpperCase().match(/^([2-7]+)([MTN]+)([1-9]+)$/);
  if (!match) return [code];

  const [, days, shifts, slots] = match;
  const daysArr = days.split('');
  const shiftsArr = shifts.split('');
  const slotsArr = slots.split('');

  const cartesian = liftN(3)((d: string, s: string, t: string) => `${d}${s}${t}`);
  return cartesian(daysArr, shiftsArr, slotsArr) as string[];
}

const DAY_MAP: Record<string, string> = {
  '2': 'Segunda',
  '3': 'Terça',
  '4': 'Quarta',
  '5': 'Quinta',
  '6': 'Sexta',
  '7': 'Sábado',
};

const HORARIOS_MANHA = ['07:00', '07:55', '08:50', '09:45', '10:40', '11:35'];
const HORARIOS_TARDE = ['13:00', '13:55', '14:50', '15:45', '16:40', '17:35'];
const HORARIOS_NOITE = ['18:30', '19:25', '20:20', '21:15'];

export interface ParsedTimeSlot {
  dia: string;
  horarioInicio: string;
  horarioFim: string;
}

export function parseTimeCodes(timeCodes: string[]): ParsedTimeSlot[] {
  const horarios: ParsedTimeSlot[] = [];

  for (const code of timeCodes) {
    const discreteCodes = getSpplitedCode(code);
    for (const discreteCode of discreteCodes) {
      const match = discreteCode.match(/^([2-7])([MTN])([1-6])$/i);
      if (!match) continue;

      const [, dayNum, shift, slotStr] = match;
      const day = DAY_MAP[dayNum];
      const slot = parseInt(slotStr, 10) - 1;

      let horarioInicio: string | undefined;
      let horarioFim: string | undefined;

      if (shift === 'M') {
        horarioInicio = HORARIOS_MANHA[slot];
        horarioFim = slot < HORARIOS_MANHA.length - 1 ? HORARIOS_MANHA[slot + 1] : '12:00';
      } else if (shift === 'T') {
        horarioInicio = HORARIOS_TARDE[slot];
        horarioFim = slot < HORARIOS_TARDE.length - 1 ? HORARIOS_TARDE[slot + 1] : '18:00';
      } else if (shift === 'N') {
        horarioInicio = HORARIOS_NOITE[slot];
        horarioFim = slot < HORARIOS_NOITE.length - 1 ? HORARIOS_NOITE[slot + 1] : '22:00';
      }

      if (day && horarioInicio && horarioFim) {
        horarios.push({ dia: day, horarioInicio, horarioFim });
      }
    }
  }

  return horarios;
}

export function formatTimeCodes(timeCodes: string[]): string[] {
  return parseTimeCodes(timeCodes).map(
    (h) => `${h.dia} ${h.horarioInicio} - ${h.horarioFim}`
  );
}
