type CalendarPost = {
  id: string;
  title: string;
  status: string;
  siteName: string;
  date: string;
};

const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

function ymd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const weekday = first.getDay();
  const saturdayIndex = (weekday + 1) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - saturdayIndex);
  return start;
}

export function CalendarMonth({ posts }: { posts: CalendarPost[] }) {
  const now = new Date();
  const start = startOfMonthGrid(now.getFullYear(), now.getMonth());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div className="grid grid-cols-7 border-b border-ink/10 bg-paper-deep text-center text-xs font-medium">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-3">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const key = ymd(date);
          const inMonth = date.getMonth() === now.getMonth();
          const items = posts.filter((post) => ymd(new Date(post.date)) === key);
          return (
            <div
              key={key}
              className={`min-h-28 border-b border-l border-ink/5 p-2 ${inMonth ? "" : "bg-paper/50 text-ink-soft"}`}
            >
              <div className="text-xs">{date.getDate()}</div>
              <div className="mt-1 space-y-1">
                {items.map((post) => (
                  <div
                    key={post.id}
                    className={`rounded-md px-1.5 py-1 text-[11px] leading-4 ${
                      post.status === "future"
                        ? "bg-gold/15 text-gold-deep"
                        : post.status === "publish"
                          ? "bg-leaf/10 text-leaf"
                          : "bg-ink/5"
                    }`}
                    title={`${post.siteName} · ${post.status}`}
                  >
                    {post.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
