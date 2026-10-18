// All user-facing strings. Sentence case, no caps, same verb across a flow.
export const t = {
  appName: 'ProtopteraPDF',
  empty: {
    title: 'Откройте PDF',
    hint: 'Или перетащите файл в окно',
    open: 'Открыть файл',
  },
  toolbar: {
    label: 'Панель инструментов',
    open: 'Открыть',
    sidebar: 'Боковая панель',
    theme: {
      system: 'Тема: как в системе',
      light: 'Тема: светлая',
      dark: 'Тема: тёмная',
    },
    fullscreen: 'Полный экран',
  },
  status: {
    loading: 'Открываю…',
    pages: (n: number) => `${n} ${plural(n, 'страница', 'страницы', 'страниц')}`,
  },
  banner: {
    changedOnDisk: 'Файл изменён на диске',
    reload: 'Перезагрузить',
    keep: 'Оставить',
    dismiss: 'Закрыть',
    deletedOnDisk: 'Файл удалён или перемещён. Документ остаётся открытым.',
  },
  errors: {
    'not-found': 'Файл не найден. Проверьте, не перемещён ли он.',
    'not-pdf': 'Это не PDF-файл. Откройте файл в формате PDF.',
    'not-allowed': 'Сюда нельзя сохранить без выбора в диалоге. Используйте «Сохранить как».',
    'read-only': 'Файл только для чтения. Сохраните копию через «Сохранить как».',
    locked: 'Файл занят другой программой. Закройте её или сохраните копию через «Сохранить как».',
    io: 'Не удалось прочитать или записать файл. Проверьте диск и права доступа.',
    engine: 'Не удалось запустить движок PDF. Перезапустите приложение.',
    open: 'Не удалось открыть документ: файл повреждён или не поддерживается.',
  },
} as const;

export type FileErrorCode = 'not-found' | 'not-pdf' | 'not-allowed' | 'read-only' | 'locked' | 'io';

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
