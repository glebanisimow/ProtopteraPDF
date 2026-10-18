// All user-facing strings. Sentence case, no caps, same verb across a flow.
export const t = {
  appName: 'ProtopteraPDF',
  empty: {
    title: 'Откройте PDF',
    hint: 'Или перетащите файл в окно',
    open: 'Открыть файл',
    recent: 'Недавние файлы',
    forget: 'Убрать из списка',
  },
  toolbar: {
    label: 'Панель инструментов',
    open: 'Открыть',
    sidebar: 'Боковая панель',
    back: 'Назад',
    forward: 'Вперёд',
    prevPage: 'Предыдущая страница',
    nextPage: 'Следующая страница',
    page: 'Страница',
    goToPage: 'Перейти к странице',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    zoom: 'Масштаб',
    zoomMenu: 'Варианты масштаба',
    fitWidth: 'По ширине',
    fitPage: 'Страница целиком',
    automatic: 'Автоматически',
    spread: 'Разворот',
    rotate: 'Повернуть',
    search: 'Найти',
    invert: 'Инверсия страниц',
    fullscreen: 'Полный экран',
    theme: {
      system: 'Тема: как в системе',
      light: 'Тема: светлая',
      dark: 'Тема: тёмная',
    },
  },
  sidebar: {
    thumbnails: 'Миниатюры',
    outline: 'Оглавление',
    noOutline: 'В документе нет оглавления',
    expand: 'Развернуть',
    collapse: 'Свернуть',
  },
  search: {
    label: 'Поиск в документе',
    placeholder: 'Найти в документе',
    prev: 'Предыдущее',
    next: 'Следующее',
    matchCase: 'Учитывать регистр',
    wholeWord: 'Слово целиком',
    close: 'Закрыть поиск',
    searching: 'Ищу…',
    none: 'Не найдено',
    count: (current: number, total: number) => `${current} из ${total}`,
  },
  links: {
    confirmTitle: 'Открыть ссылку?',
    confirm: (url: string) => `Ссылка откроется в браузере:\n${url}`,
    open: 'Открыть',
    cancel: 'Отмена',
    blocked: 'Ссылка заблокирована: такие ссылки могут запустить программу или скрипт.',
    remote: 'Ссылка ведёт в другой файл. Откройте его вручную.',
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
    pageNotFound: 'Такой страницы нет. Введите номер или метку страницы.',
    zoomInvalid: 'Введите масштаб в процентах, например 150.',
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
